import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { sendPdfEmail } from "./utils/email.js";
import { getStripeClient } from "./utils/stripe.js";
import {
  createDocumentHash,
  createDownloadToken,
  type PdfSourcePayload,
  sanitizeFilename,
  verifyDownloadToken,
} from "./utils/downloadAuth.js";

dotenv.config();

const app = express();
const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || "https://cvperfect.online").replace(/\/+$/, "");
const emailedDownloadKeys = new Set<string>();
const checkoutPdfPayloads = new Map<
  string,
  { documentHash: string; payload: PdfSourcePayload; savedAt: number }
>();
const CHECKOUT_PAYLOAD_TTL_MS = 3 * 60 * 60 * 1000;

function cleanupCheckoutPayloads() {
  const oldestAllowed = Date.now() - CHECKOUT_PAYLOAD_TTL_MS;

  for (const [sessionId, entry] of checkoutPdfPayloads.entries()) {
    if (entry.savedAt < oldestAllowed) {
      checkoutPdfPayloads.delete(sessionId);
    }
  }
}

function buildPdfPayload(source: Record<string, unknown>): PdfSourcePayload | null {
  if (!source.cvData || typeof source.cvData !== "object") {
    return null;
  }

  return {
    templateName: typeof source.templateName === "string" ? source.templateName : "CV",
    color: typeof source.color === "string" ? source.color : "#1a56db",
    lang: typeof source.lang === "string" ? source.lang : "ro",
    photoDataUrl: typeof source.photoDataUrl === "string" ? source.photoDataUrl : "",
    cvData: source.cvData as PdfSourcePayload["cvData"],
  };
}

async function emailPdfOnce({
  session,
  documentHash,
  filename,
  pdfBuffer,
  cvData,
  lang,
}: {
  session: any;
  documentHash: string;
  filename: string;
  pdfBuffer: Buffer;
  cvData: PdfSourcePayload["cvData"];
  lang?: string | null;
}) {
  const customerEmail =
    session.customer_details?.email ||
    (typeof session.customer_email === "string" ? session.customer_email : null);
  const customerName =
    session.customer_details?.name ||
    (typeof cvData?.nume === "string" ? cvData.nume : null);
  const emailKey = `${session.id}:${documentHash}`;

  if (!customerEmail || emailedDownloadKeys.has(emailKey)) {
    return;
  }

  emailedDownloadKeys.add(emailKey);
  const emailResult = await sendPdfEmail({
    to: customerEmail,
    filename,
    pdfBuffer,
    customerName,
    lang: typeof lang === "string" ? lang : null,
  });

  if (emailResult.status === "sent") {
    console.log("PDF email sent:", { sessionId: session.id, to: customerEmail });
    return;
  }

  console.warn("PDF email not sent:", {
    sessionId: session.id,
    to: customerEmail,
    reason: emailResult.reason,
  });

  if (emailResult.status === "failed") {
    emailedDownloadKeys.delete(emailKey);
  }
}

async function generatePaidPdfFromPayload({
  session,
  documentHash,
  payload,
}: {
  session: any;
  documentHash: string;
  payload: PdfSourcePayload;
}) {
  const { generatePdf } = await import("./utils/pdf.js");
  const pdfBuffer = await generatePdf(payload);
  const filename = sanitizeFilename(
    `CV_${String(payload.cvData?.nume || payload.templateName || "CV")}_${String(
      payload.lang || "ro"
    ).toUpperCase()}.pdf`
  );

  await emailPdfOnce({
    session,
    documentHash,
    filename,
    pdfBuffer,
    cvData: payload.cvData,
    lang: payload.lang,
  });

  return { pdfBuffer, filename };
}

app.use(cors());

// Healthcheck simplu pentru Render
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Webhook-ul Stripe are nevoie de raw body
app.post(
  "/api/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
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
      const sessionId = typeof session.id === "string" ? session.id : null;
      const documentHash =
        typeof session.metadata?.documentHash === "string"
          ? session.metadata.documentHash
          : null;
      const storedPayload = sessionId ? checkoutPdfPayloads.get(sessionId) : null;

      if (
        sessionId &&
        documentHash &&
        storedPayload?.documentHash === documentHash &&
        session.payment_status === "paid"
      ) {
        try {
          await generatePaidPdfFromPayload({
            session,
            documentHash,
            payload: storedPayload.payload,
          });
        } catch (error) {
          console.error("Webhook PDF email error:", error);
        }
      }
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
    const pdfPayload = buildPdfPayload(req.body ?? {});

    if (
      typeof documentHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(documentHash)
    ) {
      return res.status(400).json({ error: "Missing or invalid documentHash" });
    }

    if (pdfPayload && createDocumentHash(pdfPayload) !== documentHash) {
      return res.status(400).json({ error: "The PDF payload does not match documentHash" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
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

    cleanupCheckoutPayloads();

    if (pdfPayload) {
      checkoutPdfPayloads.set(session.id, {
        documentHash,
        payload: pdfPayload,
        savedAt: Date.now(),
      });
    }

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

    const pdfPayload = {
      templateName,
      color,
      lang,
      cvData,
      photoDataUrl,
    } as PdfSourcePayload;
    const { pdfBuffer, filename } = await generatePaidPdfFromPayload({
      session,
      documentHash,
      payload: pdfPayload,
    });

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

app.post("/download-session-pdf", async (req, res) => {
  try {
    const { downloadToken } = req.body ?? {};

    if (typeof downloadToken !== "string") {
      return res.status(400).json({ error: "Missing download token" });
    }

    const tokenPayload = verifyDownloadToken(downloadToken);

    if (!tokenPayload) {
      return res
        .status(403)
        .json({ error: "Invalid or expired download token" });
    }

    cleanupCheckoutPayloads();

    const storedPayload = checkoutPdfPayloads.get(tokenPayload.sessionId);

    if (!storedPayload || storedPayload.documentHash !== tokenPayload.documentHash) {
      return res.status(404).json({
        error: "The paid CV snapshot is no longer available on the server.",
      });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(tokenPayload.sessionId);

    if (session.payment_status !== "paid") {
      return res.status(403).json({ error: "Payment not confirmed" });
    }

    if (session.metadata?.documentHash !== tokenPayload.documentHash) {
      return res.status(403).json({
        error: "The stored CV does not match the paid checkout session.",
      });
    }

    const { pdfBuffer, filename } = await generatePaidPdfFromPayload({
      session,
      documentHash: tokenPayload.documentHash,
      payload: storedPayload.payload,
    });

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Download session PDF error:", error);
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
