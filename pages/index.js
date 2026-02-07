import { useMemo, useState } from "react";

export default function Index() {
  // Playground inputs
  const [apiKey, setApiKey] = useState("CHANGE_ME_123"); // demo
  const [systemPrompt, setSystemPrompt] = useState(
    "Sen KIMO AI miyyasan. Do'stona, aqlli va tushunarli javob ber."
  );
  const [userPrompt, setUserPrompt] = useState("Salom KIMO, menga 5 ta biznes g'oya ber.");
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(0.95);

  // Advanced: JSON messages override
  const [useRawMessages, setUseRawMessages] = useState(false);
  const [rawMessages, setRawMessages] = useState(() =>
    JSON.stringify(
      [
        { role: "system", content: "Sen KIMO AI miyyasan. Do'stona, aqlli va tushunarli javob ber." },
        { role: "user", content: "Salom KIMO, menga 5 ta biznes g'oya ber." }
      ],
      null,
      2
    )
  );

  // Result
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const endpoint = "/api/completations/kimo-ai";

  // Build request body (2 xil rejim)
  const requestBody = useMemo(() => {
    if (useRawMessages) {
      try {
        const parsed = JSON.parse(rawMessages);
        return {
          model: "M2", // beraversin, backend fixed model ishlatadi
          messages: parsed,
          temperature,
          max_tokens: maxTokens,
          top_p: topP
        };
      } catch {
        return null;
      }
    }

    return {
      model: "M2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP
    };
  }, [useRawMessages, rawMessages, systemPrompt, userPrompt, temperature, maxTokens, topP]);

  const curlExample = useMemo(() => {
    const body = requestBody ? JSON.stringify(requestBody, null, 2) : "{ ... }";
    return `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || "YOUR_API_KEY"}" \\
  -d '${body.replace(/'/g, "\\'")}'`;
  }, [requestBody, endpoint, apiKey]);

  async function runTest() {
    setError("");
    setResult(null);

    if (!requestBody) {
      setError("Raw Messages JSON noto'g'ri. JSON formatni to'g'rilang.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Xatolik yuz berdi");
        setResult(data);
        return;
      }

      setResult(data);
    } catch (e) {
      setError(e?.message || "Network xatolik");
    } finally {
      setLoading(false);
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
  }

  const answerText =
    result?.choices?.[0]?.message?.content ||
    result?.choices?.[0]?.text ||
    "";

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.h1}>KIMO MIYYA API</div>
            <div style={S.sub}>
              Bu sahifa — KIMO AI “miyya” endpointini ishlatish bo‘yicha{" "}
              <span style={{ color: "#00ff88" }}>documentation + playground</span>.
            </div>
          </div>

          <div style={S.chipRow}>
            <span style={S.chip}>Next.js 12+ API Route</span>
            <span style={S.chip2}>Endpoint: {endpoint}</span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div style={S.grid}>
          {/* LEFT: DOCS */}
          <section style={S.card}>
            <div style={S.cardTitle}>1) Nima bu “miyya”?</div>
            <div style={S.p}>
              Bu endpoint — bitta joyda KIMO’ning “aqli” (system prompt, format, qoidalar) turadi.
              Boshqa ilovalar (web, mobile, bot) hammasi shu endpointga so‘rov yuboradi.
            </div>

            <div style={S.hr} />

            <div style={S.cardTitle}>2) Qanday so‘rov yuboriladi?</div>
            <div style={S.p}>
              Siz <code>POST</code> qilib yuborasiz:
            </div>

            <pre style={S.code}>
{`POST ${endpoint}
Headers:
  Content-Type: application/json
  x-api-key: <KIMO_PUBLIC_API_KEY>

Body (OpenAI-style):
{
  "model": "M2",
  "messages": [
    { "role": "system", "content": "Sizning qo'shimcha promptingiz" },
    { "role": "user", "content": "Foydalanuvchi xabari" }
  ],
  "temperature": 0.8,
  "max_tokens": 1024,
  "top_p": 0.95
}`}
            </pre>

            <div style={S.note}>
              <b>Muhim:</b> Backend <i>har doim</i> faqat bitta modelga yuboradi:{" "}
              <code>meta-llama/llama-4-maverick-17b-128e-instruct</code>.
              Siz body’da <code>model</code> nima bersangiz ham — u ignore qilinadi.
            </div>

            <div style={S.hr} />

            <div style={S.cardTitle}>3) “Prompt orqali ma’lumot berish” nima?</div>
            <div style={S.p}>
              Siz <code>system</code> xabarda AI’ga qoida/rol/format berasiz.
              Masalan:
            </div>
            <pre style={S.code}>
{`{ "role": "system", "content": "Sen mening marketing yordamchimsan. Juda qisqa va aniq yoz." }`}
            </pre>
            <div style={S.p}>
              Keyin <code>user</code> xabarda vazifani berasiz:
            </div>
            <pre style={S.code}>
{`{ "role": "user", "content": "Instagram uchun 5 ta caption yoz." }`}
            </pre>

            <div style={S.hr} />

            <div style={S.cardTitle}>4) Rasm yuborish (ixtiyoriy)</div>
            <div style={S.p}>
              Agar keyinroq rasm bilan ham ishlatmoqchi bo‘lsang, OpenAI-style content array ishlatasan:
            </div>

            <pre style={S.code}>
{`{
  "role": "user",
  "content": [
    { "type": "text", "text": "Bu rasmda nima bor?" },
    { "type": "image_url", "image_url": { "url": "data:image/png;base64,...." } }
  ]
}`}
            </pre>

            <div style={S.note2}>
              <b>Eslatma:</b> backendda bodyParser limit 25mb qilib qo‘yilgan, shuning uchun base64 rasm ham sig‘adi.
            </div>
          </section>

          {/* RIGHT: PLAYGROUND */}
          <section style={S.card}>
            <div style={S.cardTitle}>Playground (test qilib ko‘ring)</div>

            <div style={S.row}>
              <label style={S.label}>x-api-key</label>
              <input
                style={S.input}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="KIMO_PUBLIC_API_KEY"
              />
            </div>

            <div style={S.toggleRow}>
              <button
                onClick={() => setUseRawMessages(false)}
                style={{ ...S.tab, ...(useRawMessages ? {} : S.tabActive) }}
              >
                Oddiy (System + User)
              </button>
              <button
                onClick={() => setUseRawMessages(true)}
                style={{ ...S.tab, ...(useRawMessages ? S.tabActive : {}) }}
              >
                Advanced (Raw Messages JSON)
              </button>
            </div>

            {!useRawMessages ? (
              <>
                <div style={S.row}>
                  <label style={S.label}>System Prompt (AI ga qoida/rol)</label>
                  <textarea
                    style={S.textarea}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div style={S.row}>
                  <label style={S.label}>User Prompt (vazifa/savol)</label>
                  <textarea
                    style={S.textarea}
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <div style={S.row}>
                <label style={S.label}>messages JSON (to‘liq nazorat)</label>
                <textarea
                  style={S.textareaMono}
                  value={rawMessages}
                  onChange={(e) => setRawMessages(e.target.value)}
                  rows={14}
                />
                <div style={S.small}>
                  JSON xato bo‘lsa: test ishlamaydi. To‘g‘ri formatda bo‘lishi shart.
                </div>
              </div>
            )}

            <div style={S.split}>
              <div style={S.rowSmall}>
                <label style={S.label}>temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  style={S.input}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                />
              </div>
              <div style={S.rowSmall}>
                <label style={S.label}>max_tokens</label>
                <input
                  type="number"
                  min="64"
                  max="6096"
                  style={S.input}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                />
              </div>
              <div style={S.rowSmall}>
                <label style={S.label}>top_p</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  style={S.input}
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={S.btnRow}>
              <button onClick={runTest} disabled={loading} style={S.btn}>
                {loading ? "Yuborilmoqda..." : "Test yuborish"}
              </button>

              <button
                onClick={() => copy(JSON.stringify(requestBody || {}, null, 2))}
                style={S.btnGhost}
                disabled={!requestBody}
              >
                Body nusxalash
              </button>

              <button onClick={() => copy(curlExample)} style={S.btnGhost}>
                cURL nusxalash
              </button>
            </div>

            <div style={S.hr} />

            <div style={S.cardTitle}>Request preview</div>
            <pre style={S.code}>
              {requestBody ? JSON.stringify(requestBody, null, 2) : "Raw JSON xato. Request yasab bo'lmadi."}
            </pre>

            <div style={S.hr} />

            <div style={S.cardTitle}>Response</div>

            {error && <div style={S.err}>❌ {error}</div>}

            {result ? (
              <>
                {answerText && (
                  <div style={S.answerBox}>
                    <div style={S.answerTitle}>AI Javob</div>
                    <div style={S.answer}>{answerText}</div>
                    <button onClick={() => copy(answerText)} style={S.copyMini}>
                      Javobni nusxalash
                    </button>
                  </div>
                )}

                <pre style={S.code}>{JSON.stringify(result, null, 2)}</pre>
              </>
            ) : (
              <div style={S.small}>
                Hali test qilinmagan. Tepadan prompt yozib “Test yuborish” bosing.
              </div>
            )}
          </section>
        </div>

        {/* Footer tips */}
        <div style={S.footerCard}>
          <div style={S.cardTitle}>Real ishlatish (hamma uchun “miyya”)</div>
          <div style={S.p}>
            Kimdir (boshqa developer) sizning API’ni ishlatmoqchi bo‘lsa, unga faqat 3 narsa kerak:
          </div>
          <ul style={S.ul}>
            <li><code>POST {endpoint}</code></li>
            <li><code>x-api-key</code> header</li>
            <li><code>messages</code> array (system + user yoki to‘liq raw)</li>
          </ul>
         
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "#fff",
    padding: 18,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
  },
  wrap: { maxWidth: 1180, margin: "0 auto" },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: 18,
    background: "#111",
    border: "1px solid #222",
    borderRadius: 16,
    marginBottom: 14,
    boxShadow: "0 18px 60px rgba(0,0,0,.45)"
  },
  h1: { fontSize: 22, fontWeight: 900, letterSpacing: 0.2 },
  sub: { opacity: 0.8, marginTop: 6, lineHeight: 1.5 },

  chipRow: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  chip: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #222",
    background: "#0f0f0f",
    opacity: 0.95
  },
  chip2: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,255,136,.35)",
    background: "rgba(0,255,136,.09)",
    color: "#00ff88"
  },

  grid: { display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 14 },
  card: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 18px 60px rgba(0,0,0,.45)"
  },
  footerCard: {
    marginTop: 14,
    background: "#111",
    border: "1px solid #222",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 18px 60px rgba(0,0,0,.45)"
  },

  cardTitle: { fontWeight: 900, marginBottom: 10, fontSize: 14 },
  p: { opacity: 0.9, lineHeight: 1.65, fontSize: 13 },
  hr: { height: 1, background: "#222", margin: "14px 0" },

  code: {
    background: "#0c0c0c",
    border: "1px solid #222",
    borderRadius: 12,
    padding: 12,
    overflowX: "auto",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#d7d7d7"
  },

  note: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,255,136,.28)",
    background: "rgba(0,255,136,.06)",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#c9ffe7"
  },
  note2: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,220,0,.25)",
    background: "rgba(255,220,0,.06)",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#fff2b3"
  },

  row: { display: "grid", gap: 8, marginBottom: 12 },
  rowSmall: { display: "grid", gap: 6 },
  label: { fontSize: 12, opacity: 0.85 },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    outline: "none",
    fontSize: 13
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    outline: "none",
    fontSize: 13,
    lineHeight: 1.5,
    resize: "vertical"
  },
  textareaMono: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    outline: "none",
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    resize: "vertical"
  },

  toggleRow: { display: "flex", gap: 10, marginBottom: 12 },
  tab: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    opacity: 0.85
  },
  tabActive: {
    border: "1px solid rgba(0,255,136,.35)",
    background: "rgba(0,255,136,.08)",
    color: "#00ff88",
    opacity: 1
  },

  split: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },

  btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,255,136,.35)",
    background: "rgba(0,255,136,.12)",
    color: "#00ff88",
    fontWeight: 900,
    cursor: "pointer"
  },
  btnGhost: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    opacity: 0.9
  },

  err: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,68,68,.35)",
    background: "rgba(255,68,68,.08)",
    color: "#ffb5b5",
    marginBottom: 10,
    fontSize: 12
  },

  answerBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,255,136,.28)",
    background: "rgba(0,255,136,.06)"
  },
  answerTitle: { fontWeight: 900, marginBottom: 8, color: "#00ff88", fontSize: 12 },
  answer: { whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13, opacity: 0.95 },
  copyMini: {
    marginTop: 10,
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 12
  },

  ul: { marginTop: 8, paddingLeft: 18, lineHeight: 1.7, opacity: 0.9, fontSize: 13 },
  small: { fontSize: 12, opacity: 0.75, lineHeight: 1.5, marginTop: 6 }
};
