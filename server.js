// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(bodyParser.json());

// Enable CORS for frontend connections
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Milo AI Buddy API");
});

app.post("/api/ask-milo", async (req, res) => {
  const { prompt } = req.body;

  // Validate input
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini";

    if (!azureEndpoint || !azureApiKey) {
      return res.status(500).json({ 
        error: "Azure OpenAI configuration is missing. Please check environment variables." 
      });
    }

    const response = await fetch(
      `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-10-21`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": azureApiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are Milo, a friendly and caring AI buddy who talks to children. \
Use simple words, short sentences, and a playful, kind tone. \
Always encourage the child to share their thoughts and feelings, but never give medical or harmful advice. \
If a child shares something serious, respond gently and suggest they talk to a parent, teacher, or trusted adult. \
Never use scary, violent, or inappropriate words. \
Do not use any emojis, emoticons, or special symbols in your responses - only use regular text and words. \
Speak as if you are a supportive friend about the same age as the child, but always remain respectful and safe." },
            { role: "user", content: prompt },
        ],
          max_tokens: 200,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.json({ reply });
  } catch (error) {
    console.error("Error calling Azure OpenAI:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
});

// Raw OpenAI API endpoint - forwards requests directly to Azure OpenAI
app.post("/api/openai-raw", async (req, res) => {
  try {
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini";

    if (!azureEndpoint || !azureApiKey) {
      return res.status(500).json({ 
        error: "Azure OpenAI configuration is missing. Please check environment variables." 
      });
    }

    // Forward the entire request body to Azure OpenAI
    const response = await fetch(
      `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-10-21`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": azureApiKey,
        },
        body: JSON.stringify(req.body),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ 
        error: `Azure OpenAI API error: ${response.status} ${response.statusText}`,
        details: errorData 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error calling Azure OpenAI raw endpoint:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});