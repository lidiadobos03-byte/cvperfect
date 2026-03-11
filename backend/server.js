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
