import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import Stripe from "stripe";

dotenv.config();

const app = express();

app.use(cors());

let stripeClient = null;

function getEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-02-25.clover",
    });
  }
  return stripeClient;
}

// Healthcheck simplu pentru Render
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Webhook-ul Stripe are nevoie de raw body
app.post(
  "/api/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send("Missing webhook signature");
    }

    let event;

    try {
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gestionăm evenimentul
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("💰 Payment completed:", session);
      // aici poți salva în DB, trimite email etc.
    }

    res.json({ received: true });
  }
);

// Pentru restul API-ului folosim JSON normal
app.use(express.json({ limit: "1mb" }));

// ─── POST /create-checkout ────────────────────────────────────────────────────
app.post("/create-checkout", async (req, res) => {
  try {
    const stripe = getStripeClient();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ron",
            product_data: {
              name: "CVPerfect — PDF CV",
            },
            unit_amount: 1900,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/?payment=cancel`,
      metadata: {
        templateName: req.body?.templateName || "CV",
        lang: req.body?.lang || "ro",
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ error: "Stripe session error" });
  }
});

// ─── GET /verify-payment?session_id=xxx ──────────────────────────────────────
app.get("/verify-payment", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid";
    res.json({ paid });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Verify payment error" });
  }
});

// ─── POST /ai ────────────────────────────────────────────────────────────────
app.post("/ai", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Missing ANTHROPIC_API_KEY" });
    }

    const { systemPrompt, userPrompt } = req.body || {};
    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: "Missing prompts" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620",
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", errText);
      return res.status(500).json({ error: "AI provider error" });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "";
    res.json({ text });
  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({ error: "AI error" });
  }
});

// Exemplu de endpoint
app.get("/", (_req, res) => {
  res.send("Server running");
});

// Fallback pentru rute inexistente
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Handler simplu de erori
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
