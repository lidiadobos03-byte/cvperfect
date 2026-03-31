import type { Metadata } from "next";
import LegalPage, {
  legalListStyle,
  legalParagraphStyle,
  legalSectionStyle,
  legalSectionTitleStyle,
} from "../LegalPage";

export const metadata: Metadata = {
  title: "Politica de confidențialitate | CVPerfect.online",
  description:
    "Politica de confidențialitate pentru utilizatorii CVPerfect.online: ce date sunt prelucrate, în ce scop și ce drepturi ai.",
  alternates: {
    canonical: "/politica-confidentialitate",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Confidențialitate"
      title="Politica de confidențialitate"
      intro="CVPerfect.online este un serviciu de creare și export PDF pentru CV-uri. Mai jos găsești informațiile esențiale despre ce date pot fi prelucrate atunci când folosești platforma și cum sunt acestea utilizate."
      updatedAt="31 martie 2026"
    >
      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>1. Ce acoperă această politică</h2>
        <p style={legalParagraphStyle}>
          Politica se aplică utilizării site-ului CVPerfect.online, inclusiv
          editării CV-ului în interfața web, inițierii plății pentru PDF și
          descărcării documentului generat.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>2. Ce date pot fi prelucrate</h2>
        <ul style={legalListStyle}>
          <li>datele pe care le completezi în CV și fotografia încărcată opțional;</li>
          <li>date tehnice necesare funcționării site-ului și securității serviciului;</li>
          <li>identificatori de plată, stare plată și hash-ul documentului folosit pentru protejarea exportului;</li>
          <li>date păstrate local în browser pentru reluarea fluxului de cumpărare.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>3. Cum folosim datele</h2>
        <ul style={legalListStyle}>
          <li>pentru a-ți afișa și actualiza CV-ul în editor;</li>
          <li>pentru a pregăti checkout-ul și a verifica plata;</li>
          <li>pentru a genera PDF-ul pe server după confirmarea plății;</li>
          <li>pentru suport tehnic, securitate și prevenirea utilizării nepermise.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>4. Plăți și terți</h2>
        <p style={legalParagraphStyle}>
          Plățile sunt procesate prin Stripe. Asta înseamnă că informațiile
          necesare tranzacției sunt gestionate în cadrul infrastructurii Stripe,
          iar politica lor proprie se aplică datelor de plată pe care le
          introduci în formularul de checkout.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>5. Stocare locală și retenție</h2>
        <p style={legalParagraphStyle}>
          În implementarea actuală, anumite date ale documentului și ale fluxului
          de cumpărare pot fi salvate local în browserul tău pentru a permite
          reluarea descărcării după plata reușită. Aceste date pot rămâne
          disponibile până la finalizarea fluxului sau până când ștergi manual
          datele site-ului din browser.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>6. Cât timp păstrăm datele</h2>
        <p style={legalParagraphStyle}>
          Datele sunt păstrate doar atât cât este necesar pentru furnizarea
          serviciului, pentru confirmarea plății, pentru generarea fișierului și
          pentru respectarea obligațiilor legale sau financiare aplicabile.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>7. Drepturile utilizatorului</h2>
        <p style={legalParagraphStyle}>
          Ai dreptul să soliciți acces, rectificare, ștergere, restricționare,
          portabilitate sau opoziție, în măsura prevăzută de legislația
          aplicabilă. Pentru astfel de solicitări, folosește datele de contact
          comunicate de operatorul site-ului.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>8. Actualizări</h2>
        <p style={legalParagraphStyle}>
          Putem actualiza această politică atunci când schimbăm fluxurile de
          plată, infrastructura sau modul de prelucrare a datelor. Versiunea
          afișată pe site este versiunea aplicabilă la data publicării ei.
        </p>
      </section>
    </LegalPage>
  );
}
