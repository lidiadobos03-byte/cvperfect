interface SendPdfEmailOptions {
  to: string;
  filename: string;
  pdfBuffer: Buffer;
  customerName?: string | null;
  lang?: string | null;
}

type EmailResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function getEmailFromAddress(): string | null {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    null
  );
}

function getSubject(lang?: string | null): string {
  return lang === "ro"
    ? "CVPerfect - PDF-ul tau este gata"
    : "CVPerfect - Your PDF is ready";
}

function getBody(customerName?: string | null, lang?: string | null): string {
  const greetingName = customerName?.trim();

  if (lang === "ro") {
    return [
      greetingName ? `Buna, ${greetingName},` : "Buna,",
      "",
      "Multumim pentru achizitia facuta pe CVPerfect.",
      "Am atasat PDF-ul CV-ului tau la acest email.",
      "",
      "Daca ai nevoie sa il descarci din nou, revino pe pagina CVPerfect din acelasi browser folosit la plata.",
      "",
      "Cu drag,",
      "Echipa CVPerfect",
    ].join("\n");
  }

  return [
    greetingName ? `Hi ${greetingName},` : "Hi,",
    "",
    "Thank you for your purchase on CVPerfect.",
    "Your CV PDF is attached to this email.",
    "",
    "If you need to download it again, return to CVPerfect from the same browser used for payment.",
    "",
    "Best,",
    "The CVPerfect team",
  ].join("\n");
}

export async function sendPdfEmail({
  to,
  filename,
  pdfBuffer,
  customerName,
  lang,
}: SendPdfEmailOptions): Promise<EmailResult> {
  const recipient = normalizeEmail(to);

  if (!recipient) {
    return { status: "skipped", reason: "missing recipient email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = getEmailFromAddress();

  if (!apiKey || !from) {
    return {
      status: "skipped",
      reason: "missing RESEND_API_KEY or EMAIL_FROM",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: getSubject(lang),
        text: getBody(customerName, lang),
        attachments: [
          {
            filename,
            content: pdfBuffer.toString("base64"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return {
        status: "failed",
        reason: `Resend returned ${response.status}: ${errorBody.slice(0, 300)}`,
      };
    }

    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "unknown email error",
    };
  }
}
