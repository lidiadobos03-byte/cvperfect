/**
 * CVPerfect Backend — server.js
 * Node.js + Express + Stripe
 * 
 * ENV variables needed on Render:
 *   STRIPE_SECRET_KEY      → sk_live_... (sau sk_test_... pentru teste)
 *   STRIPE_WEBHOOK_SECRET  → whsec_... (din Stripe Dashboard > Webhooks)
 *   FRONTEND_URL           → https://cvperfect.online
 *   PORT                   → 4000 (Render îl setează automat)
 */

const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Node 18+ are fetch built-in, dar node-fetch e fallback
let fetch;
try { fetch = globalThis.fetch; } catch { fetch = require("node-fetch"); }

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://cvperfect.online";

// ─── In-memory token store (simplu, fără DB) ──────────────────────────────────
// În producție reală → Redis sau PostgreSQL
// Token = sessionId Stripe → { paid: true, usedAt: null, createdAt: Date }
const paidSessions = new Map();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

// ─── Webhook TREBUIE raw body (înainte de express.json()) ─────────────────────
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log(`✅ Plată confirmată: ${session.id} — ${session.amount_total / 100} RON`);
    
    // Marchează sesiunea ca plătită
    paidSessions.set(session.id, {
      paid: true,
      email: session.customer_email || "",
      amount: session.amount_total,
      createdAt: new Date().toISOString(),
      usedDownloads: 0
    });
  }

  res.json({ received: true });
});

// ─── JSON parser pentru restul rutelor ───────────────────────────────────────
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "CVPerfect API", timestamp: new Date().toISOString() });
});

// ─── POST /ai — Proxy către Anthropic (rezolvă CORS din browser) ─────────────
// Body: { systemPrompt: "...", userPrompt: "..." }
// Returnează: { text: "..." }
app.post("/ai", async (req, res) => {
  const { systemPrompt, userPrompt } = req.body;
  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: "systemPrompt și userPrompt sunt obligatorii" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content?.[0]?.text || "";
    res.json({ text });
  } catch (err) {
    console.error("❌ Eroare AI:", err.message);
    res.status(500).json({ error: "Eroare AI. Încearcă din nou." });
  }
});

// ─── POST /create-checkout ────────────────────────────────────────────────────
// Body: { templateName: "Casier", lang: "ro" }
// Returnează: { url: "https://checkout.stripe.com/..." }
app.post("/create-checkout", async (req, res) => {
  try {
    const { templateName = "CV", lang = "ro" } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ron",
            unit_amount: 1900, // 19 RON în bani (cea mai mică unitate)
            product_data: {
              name: `CV Perfect — ${templateName} (${lang.toUpperCase()})`,
              description: "Descarcă CV-ul tău profesional în format PDF, optimizat ATS, standard european.",
              images: ["https://cvperfect.online/og-image.png"], // adaugă imaginea ta
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${FRONTEND_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}?payment=cancelled`,
      locale: "ro", // interfața Stripe în română
      metadata: {
        templateName,
        lang,
        source: "cvperfect.online"
      },
      // Colectează emailul clientului
      customer_creation: "always",
    });

    console.log(`🛒 Checkout creat: ${session.id} pentru ${templateName} (${lang})`);
    res.json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error("❌ Eroare creare checkout:", err.message);
    res.status(500).json({ error: "Eroare la procesarea plății. Încearcă din nou." });
  }
});

// ─── GET /verify-payment?session_id=xxx ──────────────────────────────────────
// Frontend-ul apelează asta după redirect de la Stripe
// Returnează: { paid: true/false, downloadToken: "..." }
app.get("/verify-payment", async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "session_id lipsește" });
  }

  try {
    // Verifică mai întâi în memory store (pus de webhook)
    if (paidSessions.has(session_id)) {
      const sessionData = paidSessions.get(session_id);
      
      // Generează un token unic pentru download
      const downloadToken = Buffer.from(`${session_id}:${Date.now()}`).toString("base64");
      
      return res.json({
        paid: true,
        downloadToken,
        email: sessionData.email,
        message: "Plată confirmată! Poți descărca CV-ul."
      });
    }

    // Fallback: verifică direct la Stripe (pentru cazul când webhook-ul întârzie)
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === "paid") {
      // Marchează în store
      paidSessions.set(session_id, {
        paid: true,
        email: session.customer_email || "",
        amount: session.amount_total,
        createdAt: new Date().toISOString(),
        usedDownloads: 0
      });

      const downloadToken = Buffer.from(`${session_id}:${Date.now()}`).toString("base64");
      
      return res.json({
        paid: true,
        downloadToken,
        email: session.customer_email,
        message: "Plată confirmată! Poți descărca CV-ul."
      });
    }

    // Nu e plătit încă
    res.json({ paid: false, message: "Plata nu a fost confirmată." });

  } catch (err) {
    console.error("❌ Eroare verificare plată:", err.message);
    res.status(500).json({ error: "Eroare la verificare. Contactează support@cvperfect.online" });
  }
});

// ─── GET /stats (opțional, pentru tine să vezi vânzările) ────────────────────
app.get("/stats", (req, res) => {
  const total = paidSessions.size;
  const revenue = total * 19;
  res.json({
    totalSales: total,
    revenueRON: revenue,
    sessions: Array.from(paidSessions.entries()).map(([id, data]) => ({
      id: id.slice(0, 20) + "...",
      ...data
    }))
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   CVPerfect Backend — Running! 🚀     ║
  ║   Port: ${PORT}                           ║
  ║   Stripe: ${process.env.STRIPE_SECRET_KEY ? "✅ OK" : "❌ Lipsă cheie"}                ║
  ║   AI:     ${process.env.ANTHROPIC_API_KEY ? "✅ OK" : "❌ Lipsă cheie"}                ║
  ╚════════════════════════════════════════╝
  `);
});
