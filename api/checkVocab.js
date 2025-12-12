import axios from "axios";

export default async function handler(req, res) {
  const { german, correct, userAnswer } = req.body;

  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        messages: [{
          role: "user",
          content: `Is this English translation correct?

German: "${german}"
Correct: "${correct}"
User: "${userAnswer}"

Reply ONLY with "CORRECT" or "WRONG".`
        }]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01"
        }
      }
    );

    const text = response.data.content[0].text.trim().toUpperCase();
    const isCorrect = text.includes("CORRECT");

    res.json({ isCorrect, aiResponse: text });
  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "AI check failed" });
  }
}
