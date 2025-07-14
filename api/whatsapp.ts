import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const GPT_MODEL = "gpt-3.5-turbo";
const VERIFY_TOKEN = "digital";
const OPENAI_API_KEY = "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";
const WHATSAPP_TOKEN = "EAAJmzvNnx3gBAA1ny8WaAbzZA5ZBozDmmrxXJAhFMKllyM8ZCGsD6XcqUZAHq4XxAZAlqwRE6gmH0FM5AwIvEwrMjblwl0epTfL4oZCgCOHKFGYkUEiT83vQlGZAfq0RcfqUHaBrNPbZCF78PYFv9rrD7zJPBLah5G1bykl9HfNdOtvn7XoUgsY1Qyn60eQgtdcZD";
const WHATSAPP_PHONE_ID = "716952258170209";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Invalid verify token");
    }
  }

  if (req.method === "POST") {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];

    if (!changes?.value?.messages) return res.sendStatus(200);

    const message = changes.value.messages[0];
    const sender = message?.from;
    const text = message?.text?.body;

    if (!sender || !text) return res.sendStatus(200);

    try {
      const gptRes = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: GPT_MODEL,
          messages: [{ role: "user", content: text }],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      const resposta = gptRes.data.choices?.[0]?.message?.content;

      await axios.post(
        `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: sender,
          type: "text",
          text: { body: resposta },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.sendStatus(200);
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
      return res.status(500).send("Erro interno no servidor");
    }
  }

  return res.status(405).send("Método não permitido");
}
