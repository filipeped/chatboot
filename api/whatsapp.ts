// Local: api/whatsapp.ts
// ATENÇÃO: ESTE CÓDIGO CONTÉM CHAVES SECRETAS. NÃO É SEGURO.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// ===================================================================
// SUAS CHAVES ESTÃO AQUI. QUALQUER UM PODE VÊ-LAS E USÁ-LAS.
const GPT_MODEL = "gpt-3.5-turbo";
const OPENAI_API_KEY = "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"; // SUA NOVA CHAVE DA OPENAI
const WHATSAPP_TOKEN = "EAAKoZBjZCnMPgBPFOw2q29IoxQGT1gDEaAdHUS47wK7nfc9hNLWCm5E3q6aiJAdeKoWjqpJI7k91EI8ZC3TNbWh3SW9BvuIK6aU2bBNZAO7FxQ9YMEZCseAjd8TlR5uAqVoWwmfXHXZBvKWdVXqSO0wNc1qXDQnUZCqyeZBGaqN6ZBqjPZCXZAVwuQnWeZBHTRdeesKMisq9aM7IYrCV7wFp4ipQ0Br1e0nbU59UXAjgUBddxuiKHgOIZCT0r9Ify0bIZD"; // SEU TOKEN DO WHATSAPP
const WHATSAPP_PHONE_ID = "716952258170209";
const VERIFY_TOKEN = "digital";
// ===================================================================


export default async (req: VercelRequest, res: VercelResponse) => {
  // 1. Configuração do Webhook do WhatsApp
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado com sucesso!");
      return res.status(200).send(challenge);
    } else {
      console.error("Falha na verificação do webhook.");
      return res.status(403).send("Token de verificação inválido");
    }
  }

  // 2. Recebendo e respondendo mensagens
  if (req.method === "POST") {
    try {
      const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      
      if (!message) {
        return res.status(200).send('OK');
      }

      const sender = message.from;
      const text = message.text?.body;

      if (!sender || !text) {
        return res.status(200).send('OK');
      }

      // 3. Chamada para a API da OpenAI
      const gptResponse = await axios.post(
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

      const resposta = gptResponse.data.choices?.[0]?.message?.content;

      if (!resposta) {
        console.error("A OpenAI não retornou uma resposta.");
        return res.status(200).send('OK');
      }

      // 4. Envio da resposta via API do WhatsApp
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
            "Content-Type": "application/json",
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          },
        }
        );

      return res.status(200).send('OK');
    } catch (e: any) {
      console.error("Erro no processamento da mensagem:", e.response?.data || e.message);
      return res.status(500).send("Erro interno no servidor");
    }
  }

  // Se o método não for GET ou POST
  return res.status(405).send("Método não permitido");
};
