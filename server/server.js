import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Gemini API setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const corsOptions = {
  origin: "https://mail-mind2.vercel.app",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Automatic retry for temporary API errors
async function generateWithRetry(request, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(request);
    } catch (error) {
      const message = error.message || "";
      const status = error.status || error.code;

      const shouldRetry =
        status === 429 ||
        status === 503 ||
        /high demand|overloaded/i.test(message);

      if (!shouldRetry || attempt === maxAttempts) {
        throw error;
      }

      console.log(`AI retry attempt ${attempt}...`);

      await new Promise(resolve =>
        setTimeout(resolve, attempt * 2000)
      );
    }
  }
}

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "MailMind Backend is running!"
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend is healthy"
  });
});

// AI Email Classification
app.post("/api/ai/classify", async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        error: "Subject and message are required"
      });
    }

    const response = await generateWithRetry({
      model: "gemini-3.8-flash",
      contents: `
You are an intelligent email management assistant.

Analyze the following email:

Subject: ${subject}
Message: ${message}

Classify it into exactly one category:
- Assistant to Reply
- Client to Reply
- No Reply Needed
- Needs Review

Also provide:
1. A short summary.
2. Important dates or actions.
3. A suggested professional reply.

Return ONLY valid JSON in this format:

{
  "category": "Assistant to Reply",
  "summary": "Short email summary",
  "importantDates": ["Important date or action"],
  "suggestedReply": "Suggested reply"
}
      `
    });

    const resultText = response.text;
    console.log("Gemini Raw Response:", resultText);
    const cleanedText = resultText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleanedText);

    res.json(result);

  } catch (error) {
    console.error("Gemini Error:", error.message);

    res.status(500).json({
      error: "AI classification failed. Please try again later."
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MailMind server running on port ${PORT}`);
});