// pages/api/completations/kimo-ai.js

export const config = {
  api: { bodyParser: { sizeLimit: "25mb" } }, // rasm/base64 bo'lsa ham sig'adi
};

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const KIMO_PUBLIC_API_KEY = process.env.KIMO_PUBLIC_API_KEY;

// Faqat shu model ishlaydi (vision ham shu model orqali)
const FIXED_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct";

// ✅ CORS: faqat shu originlarga ruxsat
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://kimo-base.netlify.app",
  "https://www.dachago.uz",
  "https://dachago.uz",


]);

function setCors(req, res) {
  const origin = req.headers.origin;

  // Origin bo'lsa va whitelistda bo'lsa — shuni qaytaramiz
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Vary: Origin — cache muammosini oldini oladi
  res.setHeader("Vary", "Origin");

  // Preflight uchun kerak
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-key, Authorization"
  );

  // (ixtiyoriy) agar cookie/session ishlatsang true qilinadi
  // res.setHeader("Access-Control-Allow-Credentials", "true");

  // Preflight cache (tezlashadi)
  res.setHeader("Access-Control-Max-Age", "86400");
}

// KIMO "miyya" system prompt
function buildSystemPrompt({ extra = "", vision = false } = {}) {
const base = `Sen DachaGo AI’san.

QAT’IY QOIDA:
- Sen FAQAT dachago.uz sayti ichidagi ma’lumotlarni bilasan va aytasan.
- Tashqi dunyo, umumiy bilim, boshqa saytlar, shaxslar, AI modellar, texnologiyalar haqida GAPIRMAYSAN.
- Agar savol dachago.uz ichida bo‘lmasa — quyidagicha javob berasan:

"Bu ma’lumot dachago.uz saytida mavjud emas."

RUXSAT ETILGAN BO‘LIMLAR:
- Dachalar (ijara/sotuv)
- Hududlar: Amirsoy, Chorvoq, Chimyon, Oqtosh, Parkent, Sijjak
- Narxlar (UZS)
- Blog maqolalari
- Savol-javob (FAQ)
- Bron qilish tartibi
- To‘lov usullari (Payme, Click, Paynet, naqd)
- Aloqa va telefon raqamlar

TAQIQLANADI:
- Maslahat berish (saytdan tashqari)
- Taxmin qilish
- “Odatda”, “ko‘pincha”, “boshqa joylarda” kabi gaplar
- Uydirma javob

USLUB:
- Qisqa
- Aniq
- Faqat fakt

`;


  const visionRules = vision
    ? `

**RASMLI SO'ROVLAR (VISION):**
- Rasmni diqqat bilan tahlil qil: obyektlar, matnlar, ranglar, muhit, odamlar, holat.
- Agar rasmda matn bo'lsa, uni o'qib yozib ber (aniq bo'lmasa, taxmin va noaniqlikni ayt).
- Foydalanuvchi nimani xohlayotganini rasm + matn asosida bajargin.
- Agar rasm sifati yomon bo'lsa: <y>aniq ko'rinmaydi</y> deb ayt va nima kerakligini so'ra.`
    : "";

  return base + visionRules + (extra ? `\n\n${extra}` : "");
}

// Messages ichida rasm bormi?
function hasImage(messages = []) {
  for (const m of messages || []) {
    if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part?.type === "image_url") return true;
      }
    }
    if (m?.imageBase64 || m?.image) return true;
  }
  return false;
}

// OpenAI/Groq formatini normalize qilish (image_url ni ham support)
function normalizeMessages(messages = []) {
  return (messages || []).map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }

    if (Array.isArray(m.content)) {
      const fixedParts = m.content
        .map((p) => {
          if (p?.type === "text") {
            return { type: "text", text: String(p.text ?? "") };
          }

          if (p?.type === "image_url") {
            const url =
              p?.image_url?.url ||
              p?.url ||
              (typeof p?.image_url === "string" ? p.image_url : null);

            if (!url) return null;

            return { type: "image_url", image_url: { url } };
          }

          return null;
        })
        .filter(Boolean);

      return { role: m.role, content: fixedParts };
    }

    if (m?.imageBase64 && m?.imageType) {
      return {
        role: m.role || "user",
        content: [
          { type: "text", text: String(m.content ?? "") || "Rasmni tahlil qiling" },
          {
            type: "image_url",
            image_url: { url: `data:${m.imageType};base64,${m.imageBase64}` },
          },
        ],
      };
    }

    return { role: m.role, content: String(m.content ?? "") };
  });
}

// Minimal response (OpenAI chat.completions ko'rinishida)
function toOpenAIResponse({ id, model, content }) {
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export default async function handler(req, res) {
  // ✅ Har doim CORS qo'yamiz
  setCors(req, res);

  // ✅ Preflight (OPTIONS) so'rovni yakunlab yuboramiz
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") return res.status(200).send("OK");

  // API key check (ixtiyoriy)
  if (KIMO_PUBLIC_API_KEY) {
    const key = req.headers["x-api-key"];
    if (!key || key !== KIMO_PUBLIC_API_KEY) {
      return res.status(401).json({ error: "Unauthorized (x-api-key)" });
    }
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY in env" });
  }

  try {
    const {
      messages = [],
      temperature = 0.8,
      max_tokens = 2048,
      top_p = 0.95,
    } = req.body || {};

    const normalized = normalizeMessages(messages);
    const vision = hasImage(normalized);

    const last = normalized.slice(-15);

    const finalMessages = [
      { role: "system", content: buildSystemPrompt({ vision }) },
      ...last,
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: FIXED_MODEL,
        messages: finalMessages,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const msg = data?.error?.message || "Groq error";
      return res.status(500).json({ error: msg, raw: data });
    }

    const aiText = data?.choices?.[0]?.message?.content ?? "";

    return res.status(200).json(
      toOpenAIResponse({
        id: data.id || "kimo_" + Date.now(),
        model: FIXED_MODEL,
        content: aiText,
      })
    );
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
