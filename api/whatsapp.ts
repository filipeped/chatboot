// Local: api/whatsapp.ts
// ATENÇÃO: ESTE CÓDIGO CONTÉM CHAVES SECRETAS. NÃO É SEGURO.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// ===================================================================
// SUAS CHAVES ESTÃO AQUI. QUALQUER UM PODE VÊ-LAS E USÁ-LAS.
const GPT_MODEL = "gpt-3.5-turbo";
const OPENAI_API_KEY = "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";
const WHATSAPP_TOKEN = "EAAJmzvNnx3gBAA1ny8WaAbzZA5ZBozDmmrxXJAhFMKllyM8ZCGsD6XcqUZAHq4XxAZAlqwRE6gmH0FM5AwIvEwrMjblwl0epTfL4oZCgCOHKFGYkUEiT83vQlGZAfq0RcfqUHaBrNPbZCF78PYFv9rrD7zJPBLah5G1bykl9HfNdOtvn7XoUgsY1Qyn60eQgtdcZD";
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
        return res.sendStatus(200);
      }

      const sender = message.from;
      const text = message.text?.body;

      if (!sender || !text) {
        return res.sendStatus(200);
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
        return res.sendStatus(200);
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

      return res.sendStatus(200);
    } catch (e: any) {
      console.error("Erro no processamento da mensagem:", e.response?.data || e.message);
      return res.status(500).send("Erro interno no servidor");
    }
  }

  return res.status(405).send("Método não permitido");
};
