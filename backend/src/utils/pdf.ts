import { existsSync } from "fs";
import PDFDocument from "pdfkit";
import { normalizePdfPayload, type PdfSourcePayload } from "./downloadAuth.js";

const PAGE_MARGIN = 42;
const SECTION_SPACING = 12;
type FontFamily = "sans" | "serif" | "mono";
type ThemeVariant =
  | "classic"
  | "executive"
  | "soft"
  | "sidebar"
  | "serif"
  | "minimal";

interface PdfTheme {
  variant: ThemeVariant;
  fontFamily: FontFamily;
  sectionMode: "line" | "pill" | "boxed";
  tagMode: "row" | "pill";
  headerMode: "solid" | "dark" | "soft" | "centered-soft" | "centered-minimal";
  headerHeight: number;
}

const REGULAR_FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/Library/Fonts/Arial Unicode.ttf",
];

const BOLD_FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  "/Library/Fonts/Arial Bold.ttf",
];

function resolveFont(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

const REGULAR_FONT = resolveFont(REGULAR_FONT_CANDIDATES);
const BOLD_FONT = resolveFont(BOLD_FONT_CANDIDATES);

const TEMPLATE_VARIANTS: Record<string, ThemeVariant> = {
  "nordic-slate": "classic",
  "cobalt-line": "classic",
  "ocean-brief": "classic",
  "executive-pulse": "executive",
  "amber-board": "executive",
  "charcoal-deck": "executive",
  "soft-column": "soft",
  "mint-balance": "soft",
  "sage-panel": "soft",
  "atlas-sidebar": "sidebar",
  "ruby-rail": "sidebar",
  "violet-edge": "sidebar",
  "ivory-serif": "serif",
  "linen-story": "serif",
  "sandstone-classic": "serif",
  "mono-grid": "minimal",
  "graph-paper": "minimal",
  "neon-brief": "minimal",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lightenColor(hex: string, amount = 0.82) {
  const match = hex.trim().match(/^#?([0-9a-f]{6})$/i);

  if (!match) {
    return "#f8fafc";
  }

  const raw = match[1];
  const channels = [0, 2, 4].map((offset) =>
    parseInt(raw.slice(offset, offset + 2), 16)
  );
  const mixed = channels
    .map((channel) =>
      Math.round(channel + (255 - channel) * clamp(amount, 0, 1))
    )
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");

  return `#${mixed}`;
}

function getPdfTheme(templateName: string): PdfTheme {
  const variant = TEMPLATE_VARIANTS[templateName] || "classic";

  switch (variant) {
    case "executive":
      return {
        variant,
        fontFamily: "sans",
        sectionMode: "boxed",
        tagMode: "pill",
        headerMode: "dark",
        headerHeight: 128,
      };
    case "soft":
      return {
        variant,
        fontFamily: "sans",
        sectionMode: "pill",
        tagMode: "pill",
        headerMode: "soft",
        headerHeight: 122,
      };
    case "sidebar":
      return {
        variant,
        fontFamily: "sans",
        sectionMode: "line",
        tagMode: "row",
        headerMode: "dark",
        headerHeight: 124,
      };
    case "serif":
      return {
        variant,
        fontFamily: "serif",
        sectionMode: "boxed",
        tagMode: "pill",
        headerMode: "centered-soft",
        headerHeight: 150,
      };
    case "minimal":
      return {
        variant,
        fontFamily: "sans",
        sectionMode: "pill",
        tagMode: "pill",
        headerMode: "centered-minimal",
        headerHeight: 144,
      };
    case "classic":
    default:
      return {
        variant: "classic",
        fontFamily: "sans",
        sectionMode: "line",
        tagMode: "row",
        headerMode: "solid",
        headerHeight: 124,
      };
  }
}

function useFont(doc: any, bold: boolean, size: number, family: FontFamily = "sans") {
  if (family === "serif") {
    doc.font(bold ? "Times-Bold" : "Times-Roman");
    doc.fontSize(size);
    return;
  }

  if (family === "mono") {
    doc.font(bold ? "Courier-Bold" : "Courier");
    doc.fontSize(size);
    return;
  }

  if (bold && BOLD_FONT) {
    doc.font("CVPerfectBold");
  } else if (!bold && REGULAR_FONT) {
    doc.font("CVPerfectRegular");
  } else {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
  }

  doc.fontSize(size);
}

function ensureSpace(doc: any, y: number, height: number): number {
  const limit = doc.page.height - PAGE_MARGIN;

  if (y + height <= limit) {
    return y;
  }

  doc.addPage();
  return PAGE_MARGIN;
}

function textHeight(
  doc: any,
  text: string,
  width: number,
  size: number,
  family: FontFamily = "sans"
) {
  useFont(doc, false, size, family);
  return doc.heightOfString(text || " ", { width, lineGap: 2 });
}

function drawSectionTitle(
  doc: any,
  title: string,
  color: string,
  y: number,
  theme: PdfTheme
): number {
  y = ensureSpace(doc, y, 30);

  if (theme.sectionMode === "pill") {
    useFont(doc, true, 10.8, theme.fontFamily);
    const labelWidth = doc.widthOfString(title.toUpperCase()) + 22;
    doc
      .roundedRect(PAGE_MARGIN, y, labelWidth, 22, 11)
      .fill(color);
    useFont(doc, true, 10.8, theme.fontFamily);
    doc.fillColor("#ffffff").text(title.toUpperCase(), PAGE_MARGIN + 11, y + 6);
    return y + 30;
  }

  if (theme.sectionMode === "boxed") {
    useFont(doc, true, 11, theme.fontFamily);
    const labelWidth = doc.widthOfString(title.toUpperCase()) + 24;
    doc
      .roundedRect(PAGE_MARGIN, y, labelWidth, 24, 6)
      .lineWidth(1)
      .strokeColor(color)
      .stroke();
    doc.fillColor(color).text(title.toUpperCase(), PAGE_MARGIN + 12, y + 6);
    return y + 32;
  }

  useFont(doc, true, 12, theme.fontFamily);
  doc.fillColor(color).text(title.toUpperCase(), PAGE_MARGIN, y, {
    width: doc.page.width - PAGE_MARGIN * 2,
  });
  doc
    .moveTo(PAGE_MARGIN, y + 16)
    .lineTo(doc.page.width - PAGE_MARGIN, y + 16)
    .lineWidth(1)
    .strokeColor(color)
    .stroke();
  return y + 24;
}

function drawParagraph(
  doc: any,
  text: string,
  y: number,
  theme: PdfTheme,
  options?: { size?: number }
) {
  const content = text.trim();

  if (!content) {
    return y;
  }

  const width = doc.page.width - PAGE_MARGIN * 2;
  const size = options?.size ?? 11;
  const height = textHeight(doc, content, width, size, theme.fontFamily);
  y = ensureSpace(doc, y, height);
  useFont(doc, false, size, theme.fontFamily);
  doc.fillColor("#374151").text(content, PAGE_MARGIN, y, { width, lineGap: 2 });
  return doc.y + 6;
}

function drawBulletList(doc: any, items: string[], y: number, theme: PdfTheme) {
  for (const item of items) {
    const content = item.trim();

    if (!content) {
      continue;
    }

    const width = doc.page.width - PAGE_MARGIN * 2 - 14;
    const height = textHeight(doc, content, width, 10.8, theme.fontFamily) + 2;
    y = ensureSpace(doc, y, height + 4);
    doc.fillColor("#1f2937").circle(PAGE_MARGIN + 3, y + 7, 1.8).fill();
    useFont(doc, false, 10.8, theme.fontFamily);
    doc.fillColor("#4b5563").text(content, PAGE_MARGIN + 12, y, {
      width,
      lineGap: 2,
    });
    y = doc.y + 4;
  }

  return y;
}

function drawExperienceBlock(
  doc: any,
  item: Record<string, unknown>,
  color: string,
  y: number,
  theme: PdfTheme
) {
  const role = String(item.rol || "").trim();
  const company = String(item.firma || "").trim();
  const period = String(item.perioada || "").trim();
  const bullets = String(item.desc || "")
    .split(" • ")
    .map((entry) => entry.trim())
    .filter(Boolean);

  y = ensureSpace(doc, y, 54);
  const width = doc.page.width - PAGE_MARGIN * 2;
  useFont(doc, true, 12, theme.fontFamily);
  doc.fillColor("#111827").text([role, company].filter(Boolean).join(" — "), PAGE_MARGIN, y, {
    width: width - 120,
  });
  useFont(doc, false, 10.5, theme.fontFamily);
  doc.fillColor(color).text(period, PAGE_MARGIN, y, { width, align: "right" });
  y = Math.max(doc.y, y + 16);

  if (company && role) {
    useFont(doc, true, 10.8, theme.fontFamily);
    doc.fillColor(color).text(company, PAGE_MARGIN, y - 2, { width });
    y = doc.y + 2;
  }

  y = drawBulletList(doc, bullets, y, theme);
  return y + 4;
}

function drawEducationBlock(
  doc: any,
  item: Record<string, unknown>,
  color: string,
  y: number,
  theme: PdfTheme
) {
  const diploma = String(item.diploma || "").trim();
  const institution = String(item.institutie || "").trim();
  const period = String(item.perioada || "").trim();
  const line = [diploma, institution].filter(Boolean).join(" — ");

  y = ensureSpace(doc, y, 36);
  const width = doc.page.width - PAGE_MARGIN * 2;
  useFont(doc, true, 11.4, theme.fontFamily);
  doc.fillColor("#111827").text(line || institution || diploma, PAGE_MARGIN, y, {
    width: width - 120,
  });
  useFont(doc, false, 10.5, theme.fontFamily);
  doc.fillColor(color).text(period, PAGE_MARGIN, y, { width, align: "right" });
  return Math.max(doc.y, y + 16) + 6;
}

function drawSimpleTagList(
  doc: any,
  title: string,
  items: string[],
  color: string,
  y: number,
  theme: PdfTheme
) {
  if (!items.length) {
    return y;
  }

  y = drawSectionTitle(doc, title, color, y, theme);
  const softFill = lightenColor(color, 0.88);

  for (const item of items) {
    y = ensureSpace(doc, y, 22);
    doc
      .roundedRect(PAGE_MARGIN, y, doc.page.width - PAGE_MARGIN * 2, 20, 8)
      .fill(theme.tagMode === "pill" ? softFill : "#f8fafc");
    useFont(doc, false, 10.6, theme.fontFamily);
    doc.fillColor("#374151").text(item, PAGE_MARGIN + 10, y + 5, {
      width: doc.page.width - PAGE_MARGIN * 2 - 20,
    });
    y += 26;
  }

  return y + 4;
}

function parseImageBuffer(photoDataUrl: string): Buffer | null {
  const match = photoDataUrl.match(/^data:image\/(?:png|jpeg|jpg);base64,(.+)$/i);

  if (!match) {
    return null;
  }

  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

function drawHeader(
  doc: any,
  normalized: ReturnType<typeof normalizePdfPayload>,
  theme: PdfTheme,
  accentColor: string,
  photoBuffer: Buffer | null
) {
  const pageWidth = doc.page.width;
  const lightFill = lightenColor(accentColor, 0.9);
  const serifFill = lightenColor(accentColor, 0.93);
  const photoSize =
    theme.headerMode === "centered-soft" || theme.headerMode === "centered-minimal"
      ? photoBuffer
        ? 64
        : 0
      : photoBuffer
        ? 72
        : 0;

  if (theme.headerMode === "solid") {
    const textX = PAGE_MARGIN + (photoBuffer ? photoSize + 18 : 0);
    const textAreaWidth = pageWidth - textX - PAGE_MARGIN;

    doc.rect(0, 0, pageWidth, theme.headerHeight).fill(accentColor);

    if (photoBuffer) {
      try {
        doc.save();
        doc.circle(PAGE_MARGIN + photoSize / 2, 26 + photoSize / 2, photoSize / 2).clip();
        doc.image(photoBuffer, PAGE_MARGIN, 26, { fit: [photoSize, photoSize] });
        doc.restore();
        doc.circle(PAGE_MARGIN + photoSize / 2, 26 + photoSize / 2, photoSize / 2).lineWidth(2).strokeOpacity(0.3).stroke("#ffffff");
      } catch {
        // Ignore invalid images and continue without the photo.
      }
    }

    useFont(doc, true, 24, theme.fontFamily);
    doc.fillColor("#ffffff").text(
      normalized.cvData.nume || normalized.templateName || "CVPerfect",
      textX,
      28,
      { width: textAreaWidth }
    );
    useFont(doc, false, 13, theme.fontFamily);
    doc.fillColor("#e0f2fe").text(normalized.cvData.titlu || "Curriculum Vitae", textX, 60, {
      width: textAreaWidth,
    });

    const contactLine = [
      normalized.cvData.email,
      normalized.cvData.telefon,
      normalized.cvData.oras,
      normalized.cvData.linkedin,
    ]
      .filter(Boolean)
      .join(" • ");

    if (contactLine) {
      useFont(doc, false, 10.5, theme.fontFamily);
      doc.fillColor("#f8fafc").text(contactLine, textX, 90, {
        width: textAreaWidth,
      });
    }

    return;
  }

  if (theme.headerMode === "dark" || theme.headerMode === "soft") {
    const background = theme.headerMode === "dark" ? "#0f172a" : lightFill;
    const primary = theme.headerMode === "dark" ? "#ffffff" : "#0f172a";
    const secondary = theme.headerMode === "dark" ? "#cbd5e1" : "#475569";
    const textX = PAGE_MARGIN + (photoBuffer ? photoSize + 18 : 0);
    const textAreaWidth = pageWidth - textX - PAGE_MARGIN;

    doc.rect(0, 0, pageWidth, theme.headerHeight).fill(background);
    doc.rect(0, theme.headerHeight - 8, pageWidth, 8).fill(accentColor);

    if (photoBuffer) {
      try {
        doc.save();
        doc.circle(PAGE_MARGIN + photoSize / 2, 24 + photoSize / 2, photoSize / 2).clip();
        doc.image(photoBuffer, PAGE_MARGIN, 24, { fit: [photoSize, photoSize] });
        doc.restore();
      } catch {
        // Ignore invalid images and continue without the photo.
      }
    }

    useFont(doc, true, 23, theme.fontFamily);
    doc.fillColor(primary).text(
      normalized.cvData.nume || normalized.templateName || "CVPerfect",
      textX,
      28,
      { width: textAreaWidth }
    );
    useFont(doc, false, 12.8, theme.fontFamily);
    doc.fillColor(secondary).text(normalized.cvData.titlu || "Curriculum Vitae", textX, 58, {
      width: textAreaWidth,
    });

    const contactLine = [
      normalized.cvData.email,
      normalized.cvData.telefon,
      normalized.cvData.oras,
      normalized.cvData.linkedin,
    ]
      .filter(Boolean)
      .join(" • ");

    if (contactLine) {
      useFont(doc, false, 10.3, theme.fontFamily);
      doc.fillColor(secondary).text(contactLine, textX, 88, {
        width: textAreaWidth,
      });
    }

    return;
  }

  const centeredFill =
    theme.headerMode === "centered-soft" ? serifFill : "#ffffff";
  doc.rect(0, 0, pageWidth, theme.headerHeight).fill(centeredFill);
  doc.rect(0, 0, pageWidth, 6).fill(accentColor);

  let y = 18;

  if (photoBuffer) {
    try {
      doc.save();
      doc.circle(pageWidth / 2, y + photoSize / 2, photoSize / 2).clip();
      doc.image(photoBuffer, pageWidth / 2 - photoSize / 2, y, {
        fit: [photoSize, photoSize],
      });
      doc.restore();
    } catch {
      // Ignore invalid images and continue without the photo.
    }
    y += photoSize + 10;
  }

  useFont(doc, true, 24, theme.fontFamily);
  doc.fillColor("#111827").text(
    normalized.cvData.nume || normalized.templateName || "CVPerfect",
    PAGE_MARGIN,
    y,
    {
      width: pageWidth - PAGE_MARGIN * 2,
      align: "center",
    }
  );
  y = doc.y + 2;

  useFont(doc, false, 12.8, theme.fontFamily);
  doc.fillColor("#4b5563").text(
    normalized.cvData.titlu || "Curriculum Vitae",
    PAGE_MARGIN,
    y,
    {
      width: pageWidth - PAGE_MARGIN * 2,
      align: "center",
    }
  );
  y = doc.y + 8;

  const contactLine = [
    normalized.cvData.email,
    normalized.cvData.telefon,
    normalized.cvData.oras,
    normalized.cvData.linkedin,
  ]
    .filter(Boolean)
    .join(" • ");

  if (contactLine) {
    useFont(doc, false, 10.2, theme.fontFamily);
    doc.fillColor("#64748b").text(contactLine, PAGE_MARGIN, y, {
      width: pageWidth - PAGE_MARGIN * 2,
      align: "center",
    });
  }
}

export async function generatePdf(payload: PdfSourcePayload): Promise<Buffer> {
  const normalized = normalizePdfPayload(payload);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (REGULAR_FONT) {
      doc.registerFont("CVPerfectRegular", REGULAR_FONT);
    }

    if (BOLD_FONT) {
      doc.registerFont("CVPerfectBold", BOLD_FONT);
    }

    const accentColor = normalized.color;
    const textWidth = doc.page.width - PAGE_MARGIN * 2;
    const photoBuffer = parseImageBuffer(normalized.photoDataUrl);
    const theme = getPdfTheme(normalized.templateName);

    drawHeader(doc, normalized, theme, accentColor, photoBuffer);

    const labels =
      normalized.lang === "en"
        ? {
            profile: "Professional Profile",
            experience: "Professional Experience",
            education: "Education",
            skills: "Skills",
            languages: "Languages",
            certifications: "Certifications",
          }
        : {
            profile: "Profil Profesional",
            experience: "Experiență Profesională",
            education: "Educație",
            skills: "Competențe",
            languages: "Limbi Străine",
            certifications: "Certificări",
          };

    let y = theme.headerHeight + 26;

    y = drawSectionTitle(doc, labels.profile, accentColor, y, theme);
    y = drawParagraph(doc, normalized.cvData.despre, y, theme);

    if (normalized.cvData.experienta.length) {
      y = drawSectionTitle(doc, labels.experience, accentColor, y + SECTION_SPACING, theme);
      for (const item of normalized.cvData.experienta) {
        y = drawExperienceBlock(doc, item, accentColor, y, theme);
      }
    }

    if (normalized.cvData.educatie.length) {
      y = drawSectionTitle(doc, labels.education, accentColor, y + SECTION_SPACING, theme);
      for (const item of normalized.cvData.educatie) {
        y = drawEducationBlock(doc, item, accentColor, y, theme);
      }
    }

    y = drawSimpleTagList(doc, labels.skills, normalized.cvData.competente, accentColor, y + SECTION_SPACING, theme);
    y = drawSimpleTagList(doc, labels.languages, normalized.cvData.limbi, accentColor, y, theme);
    y = drawSimpleTagList(
      doc,
      labels.certifications,
      normalized.cvData.certificari,
      accentColor,
      y,
      theme
    );

    useFont(doc, false, 9.5, theme.fontFamily);
    doc.fillColor("#94a3b8").text("Generated securely by CVPerfect", PAGE_MARGIN, doc.page.height - 28, {
      width: textWidth,
      align: "center",
    });

    doc.end();
  });
}
