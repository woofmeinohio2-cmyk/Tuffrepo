
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "10mb" }));

// Capri connection check
app.get("/api/health", (req, res) => {
  res.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: MODEL
  });
});

// Securely send messages to OpenAI
app.post("/api/openai", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured."
    });
  }

  try {
    const { instructions, input } = req.body || {};

    if (!input) {
      return res.status(400).json({
        error: "Message input is missing."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          instructions,
          input,
          stream: true
        })
      }
    );
if (!response.ok) {
  const errorText = await response.text();

  console.error(
    "OpenAI API error:",
    response.status,
    errorText
  );

  return res.status(response.status).send(errorText);
}
   
    

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    Readable.fromWeb(response.body).pipe(res);

  } catch (error) {
    console.error("OpenAI connection error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: "The AI connection failed."
      });
    } else {
      res.end();
    }
  }
});

// Display the Study Labs website
app.use(express.static(__dirname));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Study Labs is running on port ${PORT}`);
});
