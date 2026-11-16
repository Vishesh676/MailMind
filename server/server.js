import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "https://mail-mind2.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/mail-mind2-[a-z0-9-]+-mail-mind1\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("MailMind Backend is running!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "MailMind API is running" });
});

app.post("/api/ai/classify", async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        error: "Subject and message are required",
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OpenRouter API key is missing",
      });
    }

    console.log("Sending request to OpenRouter...");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mail-mind2.vercel.app",
          "X-Title": "MailMind",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [
            {
              role: "system",
              content: `You are MailMind, an AI email assistant.
Analyze the email and return ONLY valid JSON with these fields:
{
  "category": "Assistant to Reply" or "Client to Reply" or "No Reply Needed" or "Needs Review",
  "summary": "Short email summary",
  "importantDates": ["Important dates or deadlines"],
  "suggestedReply": "A professional suggested email reply"
}
Choose Needs Review if classification is uncertain.
Do not invent dates or facts.`,
            },
            {
              role: "user",
              content: `Subject: ${subject}\n\nEmail: ${message}`,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter request failed",
      });
    }

    const aiText = data.choices?.[0]?.message?.content;

    if (!aiText) {
      throw new Error("AI returned an empty response");
    }

    const cleanedText = aiText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleanedText);

    console.log("OpenRouter response received");

    return res.status(200).json(result);
  } catch (error) {
    console.error("AI classification error:", error);

    return res.status(500).json({
      error: error.message || "AI classification failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`MailMind server running on port ${PORT}`);
});