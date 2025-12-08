import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post("/chatbot", async (req, res) => {
    try {
        const userMessage = req.body.message;

        const completion = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userMessage }]
        });

        res.json({ reply: completion.choices[0].message.content });

    } catch (error) {
        console.log("❌ API ERROR:", error);
        res.status(500).json({ reply: "⚠️ Error: Server tidak merespon." });
    }
});

app.listen(3000, () =>
    console.log("🚀 Server berjalan di http://localhost:3000/chatbot")
);
