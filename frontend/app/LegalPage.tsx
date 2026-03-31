import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  children: ReactNode;
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #f8fbff 0%, #f1f5f9 45%, #ffffff 100%)",
    padding: "40px 20px 72px",
  },
  shell: {
    maxWidth: 920,
    margin: "0 auto",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#1d4ed8",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
    padding: "32px 28px",
  },
  eyebrow: {
    display: "inline-flex",
    padding: "6px 12px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: "clamp(2rem, 4vw, 2.75rem)",
    lineHeight: 1.05,
    color: "#0f172a",
    letterSpacing: "-0.03em",
  },
  intro: {
    margin: "16px 0 10px",
    fontSize: 16,
    lineHeight: 1.75,
    color: "#475569",
  },
  meta: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
  },
  divider: {
    border: 0,
    borderTop: "1px solid #e2e8f0",
    margin: "24px 0 0",
  },
  content: {
    marginTop: 28,
    display: "grid",
    gap: 18,
  },
  section: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: "20px 18px",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: 18,
    color: "#0f172a",
    fontWeight: 800,
  },
  paragraph: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.75,
    color: "#334155",
  },
  list: {
    margin: "10px 0 0",
    paddingLeft: 20,
    color: "#334155",
    fontSize: 15,
    lineHeight: 1.75,
  },
};

export const legalSectionStyle = styles.section;
export const legalSectionTitleStyle = styles.sectionTitle;
export const legalParagraphStyle = styles.paragraph;
export const legalListStyle = styles.list;

export default function LegalPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  children,
}: LegalPageProps) {
  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <Link href="/" style={styles.backLink}>
          ← Back to CVPerfect
        </Link>

        <article style={styles.card}>
          <div style={styles.eyebrow}>{eyebrow}</div>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.intro}>{intro}</p>
          <p style={styles.meta}>Last updated: {updatedAt}</p>
          <hr style={styles.divider} />

          <div style={styles.content}>{children}</div>
        </article>
      </div>
    </main>
  );
}
