import type { Metadata } from "next";
import LegalPage, {
  legalListStyle,
  legalParagraphStyle,
  legalSectionStyle,
  legalSectionTitleStyle,
} from "../LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | CVPerfect.online",
  description:
    "Privacy Policy for CVPerfect.online users: what data may be processed, why it is used, and what rights you have.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="CVPerfect.online is a CV creation and PDF export service. Below you can find the essential information about what data may be processed when you use the platform and how that data is used."
      updatedAt="March 31, 2026"
    >
      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>1. What this policy covers</h2>
        <p style={legalParagraphStyle}>
          This policy applies to the use of CVPerfect.online, including CV
          editing in the web interface, payment initiation for PDF export, and
          download of the generated document.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>2. What data may be processed</h2>
        <ul style={legalListStyle}>
          <li>the information you add to the CV and the photo you optionally upload;</li>
          <li>technical data required for site functionality and service security;</li>
          <li>payment identifiers, payment status, and the document hash used to protect export access;</li>
          <li>data stored locally in the browser so the purchase flow can resume.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>3. How we use data</h2>
        <ul style={legalListStyle}>
          <li>to display and update your CV in the editor;</li>
          <li>to prepare checkout and verify payment;</li>
          <li>to generate the PDF on the server after payment confirmation;</li>
          <li>for technical support, security, and prevention of unauthorized use.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>4. Payments and third parties</h2>
        <p style={legalParagraphStyle}>
          Payments are processed through Stripe. This means the information
          needed for the transaction is handled inside Stripe&apos;s infrastructure,
          and Stripe&apos;s own policy applies to the payment information you enter
          in the checkout form.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>5. Local storage and retention</h2>
        <p style={legalParagraphStyle}>
          In the current implementation, some document data and purchase-flow
          data may be stored locally in your browser to allow download recovery
          after a successful payment. That data may remain available until the
          flow is completed or until you manually clear the site data from your
          browser.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>6. How long data is kept</h2>
        <p style={legalParagraphStyle}>
          Data is kept only for as long as necessary to provide the service,
          confirm payment, generate the file, and comply with applicable legal
          or financial obligations.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>7. Your rights</h2>
        <p style={legalParagraphStyle}>
          You may request access, rectification, erasure, restriction,
          portability, or objection to processing to the extent allowed under
          applicable law. For such requests, use the contact details provided by
          the site operator.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>8. Updates</h2>
        <p style={legalParagraphStyle}>
          We may update this policy when payment flows, infrastructure, or data
          processing practices change. The version shown on the site is the
          version that applies as of its publication date.
        </p>
      </section>
    </LegalPage>
  );
}
