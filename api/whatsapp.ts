import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// ATENÇÃO: Mova estas chaves para Variáveis de Ambiente na Vercel!
const GPT_MODEL = "gpt-3.5-turbo";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Este é o seu "digital"

export default async (req: VercelRequest, res: VercelResponse) => {
  // Configuração do Webhook do WhatsApp (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado com sucesso!");
      return res.status(200).send(challenge);
    } else {
      console.error("Falha na verificação do webhook. Tokens não correspondem.");
      return res.status(403).send("Token de verificação inválido");
    }
  }

  // Recebendo mensagens do WhatsApp (POST)
  if (req.method === "POST") {
    try {
      const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      
      // Se não for uma mensagem válida, ignora.
      if (!message) {
        return res.sendStatus(200);
      }

      const sender = message.from;
      const text = message.text?.body;

      // Se não houver texto na mensagem, ignora.
      if (!sender || !text) {
        return res.sendStatus(200);
      }

      // Chamada para a API da OpenAI
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
        return res.sendStatus(200); // Não trava o fluxo se a API falhar
      }

      // Envio da resposta via API do WhatsApp
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
      // Usar 'any' ou 'unknown' para o erro e depois verificar
      console.error("Erro no processamento da mensagem:", e.response?.data || e.message);
      return res.status(500).send("Erro interno no servidor");
    }
  }

  // Se o método não for GET ou POST
  return res.status(405).send("Método não permitido");
};
