```ts
// Local: api/whatsapp.ts

import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'

// ==================== CONFIGURAÇÕES ==================== //
const GPT_MODEL = "gpt-3.5-turbo"
const OPENAI_API_KEY = "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"
const WHATSAPP_TOKEN = "EAAKoZBjZCnMPgBPKWylpo0jmt0AmbH80ssc12Vu0fFXTRXQdbDaJS5fLkmeuo6AXwYvUBjJ3wbnbc1FGaH4EkrD20IUZAfxqlvoAX87VDTYll7lR3oFFZAZBWSOPT6e73v413qZCCyiQKIYUx1ciO1cOPduZAZCOEQK8yCnred0nQjZCNmM6DeZBmkqkfmDfxFVFC9KM04VfKla3ox9U1IQbxfI2dBsSJLZCnVL3Rt1WHZBpJQlTUKxddyRSV1gyxwZDZD"
const WHATSAPP_PHONE_ID = "629572463582145"
const VERIFY_TOKEN = "digital"
// ======================================================= //

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"]
    const token = req.query["hub.verify_token"]
    const challenge = req.query["hub.challenge"]

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado com sucesso!")
      return res.status(200).send(challenge)
    } else {
      console.warn("❌ Token de verificação inválido.")
      return res.status(403).send("Token inválido")
    }
  }

  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]
      const change = entry?.changes?.[0]
      const message = change?.value?.messages?.[0]

      console.log("📩 Mensagem recebida:", JSON.stringify(message, null, 2))

      if (!message) return res.status(200).send("No message")

      const sender = message.from
      const text = message.text?.body

      if (!sender || !text) return res.status(200).send("No text")

      // GPT Response
      const gpt = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: GPT_MODEL,
          messages: [{ role: "user", content: text }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      )

      const reply = gpt.data.choices?.[0]?.message?.content || "Desculpe, não consegui responder."

      // Send back via WhatsApp
      await axios.post(
        `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: sender,
          type: "text",
          text: { body: reply },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      )

      console.log("✅ Resposta enviada com sucesso")
      return res.status(200).send("OK")
    } catch (err: any) {
      console.error("❌ Erro geral:", err.response?.data || err.message)
      return res.status(500).send("Erro interno")
    }
  }

  return res.status(405).send("Método não permitido")
}
```
