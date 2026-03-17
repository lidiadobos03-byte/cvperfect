import crypto from "crypto";

const DOWNLOAD_TOKEN_TTL_MS = 30 * 60 * 1000;

type UnknownRecord = Record<string, unknown>;

export interface CvItem {
  firma?: string;
  perioada?: string;
  rol?: string;
  desc?: string;
  institutie?: string;
  diploma?: string;
}

export interface CvData {
  nume?: string;
  titlu?: string;
  email?: string;
  telefon?: string;
  oras?: string;
  linkedin?: string;
  despre?: string;
  experienta?: CvItem[];
  educatie?: CvItem[];
  competente?: string[];
  limbi?: string[];
  certificari?: string[];
}

export interface PdfSourcePayload {
  templateName?: string;
  color?: string;
  lang?: string;
  photoDataUrl?: string | null;
  cvData: CvData;
}

export interface DownloadTokenPayload {
  sessionId: string;
  documentHash: string;
  expiresAt: number;
}

function normalizeString(value: unknown, maxLength = 4000): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeColor(value: unknown): string {
  const candidate = normalizeString(value, 16).toLowerCase();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(candidate)
    ? candidate
    : "#1a56db";
}

function normalizeLang(value: unknown): string {
  return normalizeString(value, 8).toLowerCase() === "en" ? "en" : "ro";
}

function normalizeStringList(
  value: unknown,
  maxItems = 32,
  maxLength = 240
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, maxItems)
    .map((entry) => normalizeString(entry, maxLength))
    .filter(Boolean);
}

function normalizeObjectList(
  value: unknown,
  keys: readonly string[],
  maxItems = 24,
  maxLength = 2400
): UnknownRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, maxItems).map((entry) => {
    const source = typeof entry === "object" && entry !== null ? entry : {};
    const normalized: UnknownRecord = {};

    for (const key of keys) {
      normalized[key] = normalizeString((source as UnknownRecord)[key], maxLength);
    }

    return normalized;
  });
}

function normalizePhotoDataUrl(value: unknown): string {
  const dataUrl = normalizeString(value, 5_000_000);

  if (!dataUrl) {
    return "";
  }

  return /^data:image\/(png|jpeg|jpg);base64,[a-z0-9+/=]+$/i.test(dataUrl)
    ? dataUrl
    : "";
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as UnknownRecord).sort(([left], [right]) =>
      left.localeCompare(right)
    );

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableSerialize(entryValue)}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value ?? null);
}

function getDownloadTokenSecret(): string {
  const secret =
    process.env.DOWNLOAD_TOKEN_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.STRIPE_SECRET_KEY;

  if (!secret) {
    throw new Error("Missing DOWNLOAD_TOKEN_SECRET or Stripe secret");
  }

  return secret;
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getDownloadTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function normalizePdfPayload(payload: PdfSourcePayload) {
  return {
    templateName: normalizeString(payload.templateName, 160),
    color: normalizeColor(payload.color),
    lang: normalizeLang(payload.lang),
    photoDataUrl: normalizePhotoDataUrl(payload.photoDataUrl),
    cvData: {
      nume: normalizeString(payload.cvData?.nume, 160),
      titlu: normalizeString(payload.cvData?.titlu, 160),
      email: normalizeString(payload.cvData?.email, 160),
      telefon: normalizeString(payload.cvData?.telefon, 80),
      oras: normalizeString(payload.cvData?.oras, 120),
      linkedin: normalizeString(payload.cvData?.linkedin, 200),
      despre: normalizeString(payload.cvData?.despre, 8000),
      experienta: normalizeObjectList(
        payload.cvData?.experienta,
        ["firma", "perioada", "rol", "desc"],
        24,
        3000
      ),
      educatie: normalizeObjectList(
        payload.cvData?.educatie,
        ["institutie", "perioada", "diploma"],
        16,
        1200
      ),
      competente: normalizeStringList(payload.cvData?.competente, 32, 240),
      limbi: normalizeStringList(payload.cvData?.limbi, 16, 160),
      certificari: normalizeStringList(payload.cvData?.certificari, 24, 240),
    },
  };
}

export function createDocumentHash(payload: PdfSourcePayload): string {
  const normalized = normalizePdfPayload(payload);

  return crypto
    .createHash("sha256")
    .update(stableSerialize(normalized))
    .digest("hex");
}

export function createDownloadToken(
  sessionId: string,
  documentHash: string
): DownloadTokenPayload & { token: string } {
  const payload: DownloadTokenPayload = {
    sessionId,
    documentHash,
    expiresAt: Date.now() + DOWNLOAD_TOKEN_TTL_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return {
    ...payload,
    token: `${encodedPayload}.${signature}`,
  };
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<DownloadTokenPayload>;

    if (
      typeof decoded.sessionId !== "string" ||
      typeof decoded.documentHash !== "string" ||
      typeof decoded.expiresAt !== "number"
    ) {
      return null;
    }

    if (decoded.expiresAt < Date.now()) {
      return null;
    }

    return {
      sessionId: decoded.sessionId,
      documentHash: decoded.documentHash,
      expiresAt: decoded.expiresAt,
    };
  } catch {
    return null;
  }
}

export function sanitizeFilename(name: string): string {
  const sanitized = normalizeString(name, 160)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || "CV";
}
