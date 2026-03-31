import type { Metadata } from "next";
import LegalPage, {
  legalListStyle,
  legalParagraphStyle,
  legalSectionStyle,
  legalSectionTitleStyle,
} from "../LegalPage";

export const metadata: Metadata = {
  title: "GDPR | CVPerfect.online",
  description:
    "GDPR information about data categories, processing purposes, recipients, and user rights for CVPerfect.online.",
  alternates: {
    canonical: "/gdpr",
  },
};

export default function GdprPage() {
  return (
    <LegalPage
      eyebrow="GDPR"
      title="GDPR Information"
      intro="This page explains, in a short and practical way, how personal data is handled when you use CVPerfect.online to edit your CV, start a payment, and download a secure PDF."
      updatedAt="March 31, 2026"
    >
      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>1. Categories of personal data</h2>
        <p style={legalParagraphStyle}>
          Depending on how you use the service, we may process the data you add
          to your CV, including your name, email address, phone number, city,
          LinkedIn profile, professional summary, experience, education, skills,
          languages, certifications, and photo if you choose to upload one.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>2. Purposes of processing</h2>
        <ul style={legalListStyle}>
          <li>editing and customizing the CV directly in the browser;</li>
          <li>starting and verifying payment for PDF export;</li>
          <li>generating and delivering the secure PDF after payment confirmation;</li>
          <li>preventing abuse, fraud, and technical failures;</li>
          <li>complying with applicable legal obligations.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>3. Legal bases</h2>
        <ul style={legalListStyle}>
          <li>performance of the service you request;</li>
          <li>legitimate interest in securing the platform and preventing misuse;</li>
          <li>legal obligations related to financial records and compliance;</li>
          <li>your consent where you choose to provide optional data.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>4. Recipients and service providers</h2>
        <p style={legalParagraphStyle}>
          Stripe is used for payment processing. The technical infrastructure
          may also involve hosting providers and other services required to keep
          the application running. Card details are not stored by CVPerfect.online
          in the current implementation; they are processed by Stripe according
          to Stripe&apos;s own policies and security standards.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>5. Storage and retention</h2>
        <p style={legalParagraphStyle}>
          In the current flow, CV editing happens mainly inside your browser.
          For checkout, a technical document identifier is sent to the server,
          and for PDF generation the data needed to render the file is sent as
          part of that request. The current codebase does not show a dedicated
          database for archiving CVs, but some purchase-session data may remain
          temporarily in the browser, including in `localStorage`, until the
          download is completed or until you clear the site data yourself.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>6. Your rights</h2>
        <ul style={legalListStyle}>
          <li>the right of access;</li>
          <li>the right to rectification;</li>
          <li>the right to erasure, where legally applicable;</li>
          <li>the right to restriction of processing;</li>
          <li>the right to object;</li>
          <li>the right to data portability;</li>
          <li>the right to lodge a complaint with the competent authority.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>7. How to exercise your rights</h2>
        <p style={legalParagraphStyle}>
          For requests related to personal data, use the contact channel shared
          by the operator of CVPerfect.online during the commercial relationship
          or in the contact details displayed on the site. Where required by
          law, we may ask for minimal information to verify identity before
          responding.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>8. Security measures</h2>
        <p style={legalParagraphStyle}>
          Reasonable technical and organizational measures are used to limit
          unauthorized access, protect the payment flow, and reduce the risk of
          improper modification or disclosure of data.
        </p>
      </section>
    </LegalPage>
  );
}
