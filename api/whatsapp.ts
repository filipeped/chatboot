import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Verificação do Webhook (GET)
  if (req.method === "GET") {
    const VERIFY_TOKEN = "chatboot";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Token inválido");
    }
  }

  // ✅ Mensagem recebida (POST)
  if (req.method === "POST") {
    const { messages } = req.body.entry?.[0]?.changes?.[0]?.value || {};
    const msg = messages?.[0]?.text?.body;
    const from = messages?.[0]?.from;

    if (!msg || !from) return res.status(200).end("No message");

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: msg }]
      })
    });

    const gptData = await gptRes.json();
    const reply = gptData.choices?.[0]?.message?.content || "Não consegui entender. Pode repetir?";

    await fetch(`https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      })
    });

    return res.status(200).end("Mensagem enviada");
  }

  // Outros métodos não permitidos
  return res.status(405).send("Method Not Allowed");
}
