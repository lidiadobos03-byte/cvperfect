const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://cvperfect.online";

app.use(cors({ origin: "*" }));
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => res.json({ received: true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CVPerfect API v2",
    ai: !!process.env.ANTHROPIC_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY
  });
});

app.post("/ai", async (req, res) => {
  const { systemPrompt, userPrompt } = req.body || {};
  if (!systemPrompt || !userPrompt) return res.status(400).json({ error: "systemPrompt si userPrompt obligatorii" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY lipsa pe server" });
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
    res.json({ text: data.content?.[0]?.text || "" });
  } catch (err) {
    console.error("AI error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const paidSessions = new Map();

app.post("/create-checkout", async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "STRIPE_SECRET_KEY lipsa" });
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const { templateName = "CV", lang = "ro" } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "ron", unit_amount: 1900, product_data: { name: `CV Perfect — ${templateName} (${lang.toUpperCase()})` } }, quantity: 1 }],
      mode: "payment",
      success_url: `${FRONTEND_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}?payment=cancelled`,
      locale: "ro",
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/verify-payment", async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: "session_id lipsa" });
  try {
    if (paidSessions.has(session_id)) return res.json({ paid: true, downloadToken: Buffer.from(`${session_id}:${Date.now()}`).toString("base64") });
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === "paid") {
      paidSessions.set(session_id, { paid: true });
      return res.json({ paid: true, downloadToken: Buffer.from(`${session_id}:${Date.now()}`).toString("base64") });
    }
    res.json({ paid: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/stats", (req, res) => res.json({ totalSales: paidSessions.size, revenueRON: paidSessions.size * 19 }));

app.listen(PORT, () => {
  console.log("CVPerfect API v2 pornit pe portul " + PORT);
  console.log("AI: " + (process.env.ANTHROPIC_API_KEY ? "OK" : "LIPSESTE ANTHROPIC_API_KEY"));
  console.log("Stripe: " + (process.env.STRIPE_SECRET_KEY ? "OK" : "LIPSESTE STRIPE_SECRET_KEY"));
});
