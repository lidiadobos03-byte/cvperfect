import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { getStripeClient } from "./utils/stripe.js";
import {
  createDocumentHash,
  createDownloadToken,
  sanitizeFilename,
  verifyDownloadToken,
} from "./utils/downloadAuth.js";

dotenv.config();

const app = express();
const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || "https://cvperfect.online").replace(/\/+$/, "");

app.use(cors());

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
    } catch (err: any) {
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
app.use(express.json({ limit: "10mb" }));

// ─── POST /create-checkout ────────────────────────────────────────────────────
app.post("/create-checkout", async (req, res) => {
  try {
    const stripe = getStripeClient();
    const frontendUrl = getFrontendUrl();
    const documentHash = req.body?.documentHash;

    if (
      typeof documentHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(documentHash)
    ) {
      return res.status(400).json({ error: "Missing or invalid documentHash" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
        documentHash,
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

    if (!paid) {
      return res.json({ paid: false });
    }

    const documentHash = session.metadata?.documentHash;

    if (!documentHash) {
      return res.json({
        paid: true,
        requiresNewCheckout: true,
        error: "This checkout session does not contain a secure document hash.",
      });
    }

    const tokenData = createDownloadToken(session.id, documentHash);

    res.json({
      paid: true,
      sessionId: session.id,
      documentHash,
      downloadToken: tokenData.token,
      expiresAt: tokenData.expiresAt,
      templateName: session.metadata?.templateName || "CV",
      lang: session.metadata?.lang || "ro",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Verify payment error" });
  }
});

app.post("/download-pdf", async (req, res) => {
  try {
    const { downloadToken, templateName, lang, color, cvData, photoDataUrl } =
      req.body ?? {};

    if (typeof downloadToken !== "string") {
      return res.status(400).json({ error: "Missing download token" });
    }

    const tokenPayload = verifyDownloadToken(downloadToken);

    if (!tokenPayload) {
      return res
        .status(403)
        .json({ error: "Invalid or expired download token" });
    }

    const documentHash = createDocumentHash({
      templateName,
      color,
      lang,
      cvData,
      photoDataUrl,
    });

    if (documentHash !== tokenPayload.documentHash) {
      return res.status(403).json({
        error: "This token only works for the paid CV snapshot.",
      });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(tokenPayload.sessionId);

    if (session.payment_status !== "paid") {
      return res.status(403).json({ error: "Payment not confirmed" });
    }

    if (session.metadata?.documentHash !== documentHash) {
      return res.status(403).json({
        error: "The current CV does not match the paid checkout session.",
      });
    }

    const { generatePdf } = await import("./utils/pdf.js");
    const pdfBuffer = await generatePdf({
      templateName,
      color,
      lang,
      cvData,
      photoDataUrl,
    });
    const filename = sanitizeFilename(
      `CV_${String(cvData?.nume || templateName || "CV")}_${String(
        lang || "ro"
      ).toUpperCase()}.pdf`
    );

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Download PDF error:", error);
    res.status(500).json({ error: "Could not generate PDF" });
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
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
