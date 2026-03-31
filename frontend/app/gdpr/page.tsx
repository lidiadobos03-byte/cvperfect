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
    "Informații GDPR despre categoriile de date, scopurile prelucrării, destinatari și drepturile utilizatorilor CVPerfect.online.",
  alternates: {
    canonical: "/gdpr",
  },
};

export default function GdprPage() {
  return (
    <LegalPage
      eyebrow="GDPR"
      title="Informații GDPR"
      intro="Această pagină explică, pe scurt și clar, cum sunt tratate datele personale atunci când folosești CVPerfect.online pentru editarea CV-ului, inițierea plății și descărcarea PDF-ului securizat."
      updatedAt="31 martie 2026"
    >
      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>1. Categorii de date personale</h2>
        <p style={legalParagraphStyle}>
          În funcție de cum folosești serviciul, putem prelucra datele introduse
          de tine în CV, inclusiv nume, adresă de email, telefon, oraș,
          profil LinkedIn, rezumat profesional, experiență, educație,
          competențe, limbi, certificări și fotografie, dacă alegi să o încarci.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>2. Scopurile prelucrării</h2>
        <ul style={legalListStyle}>
          <li>editarea și personalizarea CV-ului direct în browser;</li>
          <li>inițierea și verificarea plății pentru exportul PDF;</li>
          <li>generarea și livrarea PDF-ului securizat după confirmarea plății;</li>
          <li>prevenirea abuzului, a fraudelor și rezolvarea erorilor tehnice;</li>
          <li>respectarea obligațiilor legale aplicabile.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>3. Temeiuri legale</h2>
        <ul style={legalListStyle}>
          <li>executarea serviciului solicitat de tine;</li>
          <li>interesul legitim de a securiza platforma și de a preveni utilizările abuzive;</li>
          <li>obligații legale privind evidențele financiare și conformitatea;</li>
          <li>consimțământul tău, acolo unde alegi să furnizezi date opționale.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>4. Destinatari și furnizori implicați</h2>
        <p style={legalParagraphStyle}>
          Pentru procesarea plăților este folosit Stripe. Infrastructura tehnică
          poate implica furnizori de hosting și servicii necesare funcționării
          aplicației. Datele cardului nu sunt stocate de CVPerfect.online în
          codul actual al aplicației; ele sunt procesate de Stripe conform
          propriilor sale politici și standarde de securitate.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>5. Stocare și retenție</h2>
        <p style={legalParagraphStyle}>
          În fluxul actual, editarea CV-ului se face în principal în browserul
          tău. Pentru checkout se transmite către server un identificator tehnic
          al documentului, iar pentru generarea PDF-ului sunt transmise datele
          necesare randării fișierului. Codul curent nu arată o bază de date
          dedicată pentru arhivarea CV-urilor, însă anumite date legate de
          sesiunea de cumpărare pot rămâne temporar în browser, inclusiv în
          `localStorage`, până la finalizarea descărcării sau până când ștergi
          datele site-ului.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>6. Drepturile tale</h2>
        <ul style={legalListStyle}>
          <li>dreptul de acces la date;</li>
          <li>dreptul la rectificare;</li>
          <li>dreptul la ștergere, în condițiile legii;</li>
          <li>dreptul la restricționarea prelucrării;</li>
          <li>dreptul la opoziție;</li>
          <li>dreptul la portabilitatea datelor;</li>
          <li>dreptul de a depune o plângere la autoritatea competentă.</li>
        </ul>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>7. Exercitarea drepturilor</h2>
        <p style={legalParagraphStyle}>
          Pentru solicitări privind datele personale, folosește canalul de
          contact comunicat de operatorul site-ului CVPerfect.online în cadrul
          relației comerciale sau în datele de contact afișate pe site. Dacă
          legislația o cere, este posibil să solicităm informații minime pentru
          verificarea identității înainte de a răspunde.
        </p>
      </section>

      <section style={legalSectionStyle}>
        <h2 style={legalSectionTitleStyle}>8. Măsuri de securitate</h2>
        <p style={legalParagraphStyle}>
          Sunt folosite măsuri tehnice și organizatorice rezonabile pentru a
          limita accesul neautorizat, pentru a proteja fluxul de plată și pentru
          a reduce riscul modificării sau divulgării nepermise a datelor.
        </p>
      </section>
    </LegalPage>
  );
}
