
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("MailMind Backend is running!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "MailMind API is running" });
});

app.post("/api/ai/classify", (req, res) => {
  try {
    const { subject = "", message = "" } = req.body || {};
    const text = `${subject} ${message}`.toLowerCase();

    if (!subject.trim() || !message.trim()) {
      return res.status(400).json({
        error: "Subject and message are required"
      });
    }

    const noReplyWords = [
      "thank you", "thanks", "newsletter",
      "no reply needed", "successfully delivered"
    ];

    const clientWords = [
      "client", "customer", "please confirm",
      "your approval", "your feedback"
    ];

    const reviewWords = [
      "urgent", "legal", "contract", "payment",
      "invoice", "deadline"
    ];

    let category = "Assistant to Reply";

    if (noReplyWords.some(word => text.includes(word))) {
      category = "No Reply Needed";
    } else if (reviewWords.some(word => text.includes(word))) {
      category = "Needs Review";
    } else if (clientWords.some(word => text.includes(word))) {
      category = "Client to Reply";
    }

    const dateMatches = message.match(
      /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\b/gi
    ) || [];

    const summary = `Email regarding ${subject}. Review the message and take the appropriate action.`;

    const suggestedReply =
      category === "No Reply Needed"
        ? "No reply is required for this email."
        : "Thank you for your email. I have received your message and will review it. I will get back to you shortly.";

    return res.json({
      category,
      summary,
      importantDates: dateMatches,
      suggestedReply
    });
  } catch (error) {
    return res.status(500).json({
      error: "Email analysis failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`MailMind server running on port ${PORT}`);
});
