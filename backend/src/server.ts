import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { sendPdfEmail } from "./utils/email.js";
import { getStripeClient } from "./utils/stripe.js";
import {
  getSupabaseAdmin,
  getSupabaseUserFromAuthorization,
  isSupabaseConfigured,
} from "./utils/supabase.js";
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

function getResumeTitle(payload: PdfSourcePayload): string {
  return (
    (typeof payload.cvData?.nume === "string" && payload.cvData.nume.trim()) ||
    (typeof payload.cvData?.titlu === "string" && payload.cvData.titlu.trim()) ||
    payload.templateName ||
    "CV"
  ).slice(0, 160);
}

function getCustomerEmailFromSession(session: any): string | null {
  return (
    session.customer_details?.email ||
    (typeof session.customer_email === "string" ? session.customer_email : null)
  );
}

function getCustomerNameFromSession(session: any): string | null {
  return session.customer_details?.name || null;
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

async function savePendingPurchaseSnapshot({
  userId,
  resumeId,
  session,
  documentHash,
  payload,
}: {
  userId: string | null;
  resumeId: string | null;
  session: any;
  documentHash: string;
  payload: PdfSourcePayload;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase || !userId) {
    return;
  }

  const { error } = await supabase.from("cv_purchases").upsert(
    {
      user_id: userId,
      resume_id: resumeId,
      stripe_session_id: session.id,
      document_hash: documentHash,
      pdf_payload: payload,
      title: getResumeTitle(payload),
      template_name: payload.templateName || "CV",
      lang: payload.lang || "ro",
      customer_email: typeof session.customer_email === "string" ? session.customer_email : null,
      amount_total: session.amount_total ?? 1900,
      currency: session.currency || "ron",
      payment_status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_session_id" }
  );

  if (error) {
    console.warn("Could not save pending purchase snapshot:", error.message);
  }
}

async function markPurchasePaidAndEmail(session: any, documentHash: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase || !documentHash || typeof session.id !== "string") {
    return false;
  }

  const { data: purchase, error } = await supabase
    .from("cv_purchases")
    .select("*")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (error) {
    console.warn("Could not read purchase from Supabase:", error.message);
    return false;
  }

  if (!purchase?.pdf_payload || purchase.document_hash !== documentHash) {
    return false;
  }

  const paidAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("cv_purchases")
    .update({
      payment_status: session.payment_status || "paid",
      paid_at: purchase.paid_at || paidAt,
      amount_total: session.amount_total ?? purchase.amount_total,
      currency: session.currency || purchase.currency,
      customer_email: getCustomerEmailFromSession(session) || purchase.customer_email,
      customer_name: getCustomerNameFromSession(session) || purchase.customer_name,
      updated_at: paidAt,
    })
    .eq("stripe_session_id", session.id);

  if (updateError) {
    console.warn("Could not mark purchase as paid:", updateError.message);
  }

  if (session.payment_status === "paid") {
    await generatePaidPdfFromPayload({
      session,
      documentHash,
      payload: purchase.pdf_payload as PdfSourcePayload,
    });
  }

  return true;
}

async function findStoredPdfPayload(sessionId: string, documentHash: string) {
  const memoryPayload = checkoutPdfPayloads.get(sessionId);

  if (memoryPayload?.documentHash === documentHash) {
    return memoryPayload.payload;
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("cv_purchases")
    .select("document_hash, pdf_payload")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.warn("Could not read stored PDF payload:", error.message);
    return null;
  }

  if (data?.document_hash !== documentHash || !data.pdf_payload) {
    return null;
  }

  return data.pdf_payload as PdfSourcePayload;
}

async function requireAccountUser(
  req: express.Request,
  res: express.Response
) {
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: "Account storage is not configured" });
    return null;
  }

  const user = await getSupabaseUserFromAuthorization(req.headers.authorization);

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  return user;
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

      await markPurchasePaidAndEmail(session, documentHash);

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
    const accountUser = await getSupabaseUserFromAuthorization(req.headers.authorization);
    const resumeId =
      accountUser && typeof req.body?.resumeId === "string" ? req.body.resumeId : null;

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
      customer_email: accountUser?.email || undefined,
      metadata: {
        templateName: req.body?.templateName || "CV",
        lang: req.body?.lang || "ro",
        documentHash,
        accountUserId: accountUser?.id || "",
        resumeId: resumeId || "",
      },
    });

    cleanupCheckoutPayloads();

    if (pdfPayload) {
      checkoutPdfPayloads.set(session.id, {
        documentHash,
        payload: pdfPayload,
        savedAt: Date.now(),
      });

      await savePendingPurchaseSnapshot({
        userId: accountUser?.id || null,
        resumeId,
        session,
        documentHash,
        payload: pdfPayload,
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

    const storedPayload = await findStoredPdfPayload(
      tokenPayload.sessionId,
      tokenPayload.documentHash
    );

    if (!storedPayload) {
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
      payload: storedPayload,
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

app.get("/account/purchases", async (req, res) => {
  try {
    const user = await requireAccountUser(req, res);
    if (!user) return;

    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ error: "Account storage is not configured" });

    const { data, error } = await supabase
      .from("cv_purchases")
      .select(
        "id, resume_id, title, template_name, lang, amount_total, currency, paid_at, created_at, stripe_session_id, document_hash"
      )
      .eq("user_id", user.id)
      .eq("payment_status", "paid")
      .order("paid_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Account purchases error:", error);
      return res.status(500).json({ error: "Could not load purchases" });
    }

    res.json({ purchases: data || [] });
  } catch (error) {
    console.error("Account purchases error:", error);
    res.status(500).json({ error: "Could not load purchases" });
  }
});

app.post("/account/download-purchase-pdf", async (req, res) => {
  try {
    const user = await requireAccountUser(req, res);
    if (!user) return;

    const purchaseId = req.body?.purchaseId;
    if (typeof purchaseId !== "string") {
      return res.status(400).json({ error: "Missing purchaseId" });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ error: "Account storage is not configured" });

    const { data: purchase, error } = await supabase
      .from("cv_purchases")
      .select("*")
      .eq("id", purchaseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Purchase download lookup error:", error);
      return res.status(500).json({ error: "Could not load purchase" });
    }

    if (!purchase?.pdf_payload) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    if (purchase.payment_status !== "paid") {
      return res.status(403).json({ error: "Payment not confirmed" });
    }

    const pdfPayload = purchase.pdf_payload as PdfSourcePayload;
    const documentHash = createDocumentHash(pdfPayload);

    if (documentHash !== purchase.document_hash) {
      return res.status(409).json({ error: "Stored CV snapshot is invalid" });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id);

    if (session.payment_status !== "paid") {
      return res.status(403).json({ error: "Payment not confirmed" });
    }

    const { generatePdf } = await import("./utils/pdf.js");
    const pdfBuffer = await generatePdf(pdfPayload);
    const filename = sanitizeFilename(
      `CV_${String(pdfPayload.cvData?.nume || pdfPayload.templateName || "CV")}_${String(
        pdfPayload.lang || "ro"
      ).toUpperCase()}.pdf`
    );

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Account purchase download error:", error);
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
