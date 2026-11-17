import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "Backend is running",
    provider: "Groq",
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
  });
});

app.post("/api/ai/classify", async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        error: "Subject and message are required",
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content: `You are an intelligent email assistant.
Analyze the email and return ONLY valid JSON with these fields:
category: one of "Assistant to Reply", "Client to Reply", "No Reply Needed", "Needs Review".
summary: short email summary.
importantDates: array of important dates or deadlines.
suggestedReply: a professional suggested reply.

If the email is uncertain, use "Needs Review".`,
            },
            {
              role: "user",
              content: `Subject: ${subject}\n\nMessage: ${message}`,
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Groq AI request failed",
        details: data,
      });
    }

    const result = JSON.parse(data.choices[0].message.content);

    res.json(result);
  } catch (error) {
    console.error("AI Error:", error);

    res.status(500).json({
      error: "AI analysis failed",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Groq backend running on port ${PORT}`);
});