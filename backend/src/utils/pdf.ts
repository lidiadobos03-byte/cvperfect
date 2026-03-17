import { existsSync } from "fs";
import PDFDocument from "pdfkit";
import { normalizePdfPayload, type PdfSourcePayload } from "./downloadAuth.js";

const PAGE_MARGIN = 42;
const HEADER_HEIGHT = 124;
const SECTION_SPACING = 12;

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

function useFont(doc: any, bold: boolean, size: number) {
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

function textHeight(doc: any, text: string, width: number, size: number) {
  useFont(doc, false, size);
  return doc.heightOfString(text || " ", { width, lineGap: 2 });
}

function drawSectionTitle(doc: any, title: string, color: string, y: number): number {
  y = ensureSpace(doc, y, 26);
  useFont(doc, true, 12);
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

function drawParagraph(doc: any, text: string, y: number, options?: { size?: number }) {
  const content = text.trim();

  if (!content) {
    return y;
  }

  const width = doc.page.width - PAGE_MARGIN * 2;
  const size = options?.size ?? 11;
  const height = textHeight(doc, content, width, size);
  y = ensureSpace(doc, y, height);
  useFont(doc, false, size);
  doc.fillColor("#374151").text(content, PAGE_MARGIN, y, { width, lineGap: 2 });
  return doc.y + 6;
}

function drawBulletList(doc: any, items: string[], y: number) {
  for (const item of items) {
    const content = item.trim();

    if (!content) {
      continue;
    }

    const width = doc.page.width - PAGE_MARGIN * 2 - 14;
    const height = textHeight(doc, content, width, 10.8) + 2;
    y = ensureSpace(doc, y, height + 4);
    doc.fillColor("#1f2937").circle(PAGE_MARGIN + 3, y + 7, 1.8).fill();
    useFont(doc, false, 10.8);
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
  y: number
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
  useFont(doc, true, 12);
  doc.fillColor("#111827").text([role, company].filter(Boolean).join(" — "), PAGE_MARGIN, y, {
    width: width - 120,
  });
  useFont(doc, false, 10.5);
  doc.fillColor(color).text(period, PAGE_MARGIN, y, { width, align: "right" });
  y = Math.max(doc.y, y + 16);

  if (company && role) {
    useFont(doc, true, 10.8);
    doc.fillColor(color).text(company, PAGE_MARGIN, y - 2, { width });
    y = doc.y + 2;
  }

  y = drawBulletList(doc, bullets, y);
  return y + 4;
}

function drawEducationBlock(
  doc: any,
  item: Record<string, unknown>,
  color: string,
  y: number
) {
  const diploma = String(item.diploma || "").trim();
  const institution = String(item.institutie || "").trim();
  const period = String(item.perioada || "").trim();
  const line = [diploma, institution].filter(Boolean).join(" — ");

  y = ensureSpace(doc, y, 36);
  const width = doc.page.width - PAGE_MARGIN * 2;
  useFont(doc, true, 11.4);
  doc.fillColor("#111827").text(line || institution || diploma, PAGE_MARGIN, y, {
    width: width - 120,
  });
  useFont(doc, false, 10.5);
  doc.fillColor(color).text(period, PAGE_MARGIN, y, { width, align: "right" });
  return Math.max(doc.y, y + 16) + 6;
}

function drawSimpleTagList(
  doc: any,
  title: string,
  items: string[],
  color: string,
  y: number
) {
  if (!items.length) {
    return y;
  }

  y = drawSectionTitle(doc, title, color, y);

  for (const item of items) {
    y = ensureSpace(doc, y, 22);
    doc.roundedRect(PAGE_MARGIN, y, doc.page.width - PAGE_MARGIN * 2, 20, 8).fill("#f8fafc");
    useFont(doc, false, 10.6);
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
    const photoSize = photoBuffer ? 72 : 0;
    const textX = PAGE_MARGIN + (photoBuffer ? photoSize + 18 : 0);
    const textAreaWidth = doc.page.width - textX - PAGE_MARGIN;

    doc.rect(0, 0, doc.page.width, HEADER_HEIGHT).fill(accentColor);

    if (photoBuffer) {
      try {
        doc.save();
        doc.circle(PAGE_MARGIN + photoSize / 2, 26 + photoSize / 2, photoSize / 2).clip();
        doc.image(photoBuffer, PAGE_MARGIN, 26, { fit: [photoSize, photoSize] });
        doc.restore();
        doc
          .circle(PAGE_MARGIN + photoSize / 2, 26 + photoSize / 2, photoSize / 2)
          .lineWidth(2)
          .strokeOpacity(0.3)
          .stroke("#ffffff");
      } catch {
        // Ignore invalid images and continue without the photo.
      }
    }

    useFont(doc, true, 24);
    doc.fillColor("#ffffff").text(
      normalized.cvData.nume || normalized.templateName || "CVPerfect",
      textX,
      28,
      { width: textAreaWidth }
    );
    useFont(doc, false, 13);
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
      useFont(doc, false, 10.5);
      doc.fillColor("#f8fafc").text(contactLine, textX, 90, {
        width: textAreaWidth,
      });
    }

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

    let y = HEADER_HEIGHT + 26;

    y = drawSectionTitle(doc, labels.profile, accentColor, y);
    y = drawParagraph(doc, normalized.cvData.despre, y);

    if (normalized.cvData.experienta.length) {
      y = drawSectionTitle(doc, labels.experience, accentColor, y + SECTION_SPACING);
      for (const item of normalized.cvData.experienta) {
        y = drawExperienceBlock(doc, item, accentColor, y);
      }
    }

    if (normalized.cvData.educatie.length) {
      y = drawSectionTitle(doc, labels.education, accentColor, y + SECTION_SPACING);
      for (const item of normalized.cvData.educatie) {
        y = drawEducationBlock(doc, item, accentColor, y);
      }
    }

    y = drawSimpleTagList(doc, labels.skills, normalized.cvData.competente, accentColor, y + SECTION_SPACING);
    y = drawSimpleTagList(doc, labels.languages, normalized.cvData.limbi, accentColor, y);
    y = drawSimpleTagList(
      doc,
      labels.certifications,
      normalized.cvData.certificari,
      accentColor,
      y
    );

    useFont(doc, false, 9.5);
    doc.fillColor("#94a3b8").text("Generated securely by CVPerfect", PAGE_MARGIN, doc.page.height - 28, {
      width: textWidth,
      align: "center",
    });

    doc.end();
  });
}
