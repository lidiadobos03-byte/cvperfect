import { STARTER_ROLE_SEED_EN } from "./starterSeedData";

export const UI_LANGUAGE_STORAGE_KEY = "cvperfect.uiLang";

export function normalizeUiLang(value) {
  return value === "en" ? "en" : "ro";
}

const STARTER_ROLE_EN = {
  1: { job: "Cashier", title: "Cashier / Sales Assistant" },
  2: { job: "Secretary", title: "Secretary / Administrative Assistant" },
  3: { job: "Retail Assistant", title: "Retail Assistant / Sales Associate" },
  4: { job: "HR Specialist", title: "HR Specialist / Recruiter" },
  5: { job: "Data Entry Operator", title: "Data Entry Operator / Data Specialist" },
  6: { job: "Executive Assistant", title: "Executive Assistant / Office Manager" },
  7: { job: "Registered Nurse", title: "Registered Nurse" },
  8: { job: "Doctor", title: "Internal Medicine Specialist" },
  9: { job: "Teacher", title: "Math & Computer Science Teacher" },
  10: { job: "Call Center Agent", title: "Call Center Agent / Customer Support" },
  11: { job: "Customer Support", title: "Customer Support Specialist / Help Desk" },
  12: { job: "Manager", title: "Operations Manager / General Manager" },
  13: { job: "Designer", title: "Graphic Designer / Brand Identity Designer" },
  14: { job: "Web Developer", title: "Full-Stack Web Developer" },
  15: { job: "Laravel Developer", title: "Senior Laravel / PHP Developer" },
  16: { job: "PHP Developer", title: "PHP Backend Developer" },
  17: { job: "Software Engineer", title: "Software Engineer / Programmer" },
  18: { job: "Social Media Manager", title: "Social Media Manager / Digital Content Creator" },
};

const DESIGN_TAGLINES_EN = {
  "nordic-slate": "Clean and confident with a sharp ATS rhythm",
  "executive-pulse": "Dark premium contrast for leadership roles",
  "soft-column": "Warm, airy, and easy to scan",
  "atlas-sidebar": "Bold sidebar layout with strong hierarchy",
  "ivory-serif": "Editorial, elegant, and breathable",
  "mono-grid": "Modern minimal with focus on information",
  "cobalt-line": "Clear accents and strong section rhythm",
  "amber-board": "Boardroom energy for senior profiles",
  "mint-balance": "Friendly, modern, and highly readable",
  "ruby-rail": "Firm structure with vivid contrast",
  "linen-story": "Warm classic tone with editorial feel",
  "graph-paper": "Clean, technical, with zero visual noise",
  "ocean-brief": "Modern business style with calm accents",
  "charcoal-deck": "Elegant and serious for fast decisions",
  "sage-panel": "Airy, calm, fresh, and modern",
  "violet-edge": "Bolder look with a clear visual edge",
  "sandstone-classic": "Premium classic for consultants and advisors",
  "neon-brief": "Sharp, tech-first, and direct",
};

const VARIANT_LABELS = {
  ro: {
    classic: "ATS Clean",
    executive: "Executive",
    soft: "Soft Modern",
    sidebar: "Sidebar Bold",
    serif: "Editorial",
    minimal: "Minimal",
    fallback: "Modern",
  },
  en: {
    classic: "ATS Clean",
    executive: "Executive",
    soft: "Soft Modern",
    sidebar: "Sidebar Bold",
    serif: "Editorial",
    minimal: "Minimal",
    fallback: "Modern",
  },
};

const UI_COPY = {
  ro: {
    common: {
      languageToggle: "RO / EN",
      yourRole: "Rolul tău",
      role: "Rol",
      starter: "Starter",
      customRole: "Rol custom",
      photo: "Foto",
      preview: "Preview",
      edit: "Editează",
      viewCv: "Vezi CV",
      editPanel: "Editează",
      langBadge: "RO",
      romanianLabel: "Română",
      englishLabel: "English",
    },
    errors: {
      paymentInit: "Eroare la inițierea plății.",
      paymentRetry: "Eroare la inițierea plății. Încearcă din nou.",
      paymentVerify: "Nu s-a putut verifica plata.",
      legacyCheckout: "Checkout-ul vechi nu poate genera PDF-ul securizat. Repornește plata din editor.",
      serverConnection: "Nu s-a putut conecta la server. Verifică conexiunea.",
      invalidPhotoType: "Te rog încarcă o fotografie PNG sau JPEG.",
      photoRead: "Nu am putut citi fotografia selectată.",
      pdfGeneration: "Eroare la generarea PDF-ului.",
      paymentPrepare: "Nu s-a putut pregăti plata.",
    },
    paywall: {
      title: "Descarcă CV-ul tău",
      readySuffix: "este gata de descărcat.",
      priceLabel: "Preț descărcare",
      oneTime: "plată unică · fără abonament",
      benefits: [
        "✅ PDF profesional format A4 european",
        "✅ Optimizat ATS — trecut prin filtre HR",
        "✅ PDF generat securizat pe server după plată",
        "✅ Plată securizată prin Stripe 🔒",
      ],
      openingStripe: "⏳ Se deschide Stripe...",
      preparingPayment: "⏳ Pregătim plata...",
      payNow: "💳 Plătește 19 RON & Descarcă",
      checkoutReady: "Conexiunea de plată este pregătită. Poți continua imediat.",
      wakeUp: "Prima deschidere poate dura puțin dacă backend-ul se trezește din standby.",
      secureFooter: "🔒 Plată securizată prin Stripe · Visa, Mastercard, Google Pay",
    },
    banners: {
      paymentConfirmed: "🎉 Plată confirmată! Poți descărca PDF-ul securizat pentru documentul salvat.",
      paymentLocked: "🎉 Plata este confirmată, dar PDF-ul se deblochează doar pentru versiunea CV-ului pe care ai achitat-o.",
      checkingPayment: "⏳ Se verifică plata...",
      editMode: "✏️ Mod editare — Click pe orice câmp din CV pentru a-l modifica live",
    },
    header: {
      backDesigns: "← Designuri",
      backJob: "↺ Job",
      addPhotoShort: "📷 Foto",
      changePhotoShort: "🔄 Foto",
      preview: "👁 Preview",
      edit: "✏️ Editează",
      save: "💾 Salvează",
      saved: "✓ Salvat!",
      pdfLoading: "⏳...",
      stripeLoading: "⏳ Stripe...",
      pdfPaid: "⬇️ PDF Securizat ✓",
      pdfLocked: "🔒 PDF — 19 RON",
    },
    rolePage: {
      pill: "✦ Public global · 18 designuri · EN implicit, RO opțional",
      titleLead: "Scrie jobul tău",
      titleAccent: "în 3 Minute",
      subtitle: "Platforma pornește în engleză pentru public global, iar dacă vrei poți comuta și pe română.",
      stats: [
        { value: "18", label: "Designuri" },
        { value: "🔎", label: "Rol liber" },
        { value: "PDF", label: "Export Real" },
      ],
      searchPlaceholder: "Scrie jobul tău: casier, electrician, barista...",
      noResults: "Nu s-au găsit roluri starter pentru",
    },
    designsPage: {
      selectedRole: "Rol selectat",
      title: "Alege unul dintre cele 18 designuri",
      subtitle: "Conținutul rămâne legat de rolul tău, iar aici schimbi doar stilul vizual: layout, ritm, accent și personalitate.",
      changeJob: "← Schimbă jobul",
      customRoleBadge: "Rol custom",
    },
    editor: {
      photoAdded: "✓ Fotografie adăugată",
      addPhoto: "📷 Adaugă fotografia ta",
      exitEdit: "👁 Ieși din editare",
      editCv: "✏️ Editează CV-ul",
      generatingPdf: "⏳ Generare PDF...",
      connectingStripe: "⏳ Se conectează la Stripe...",
      downloadPaid: "⬇️ Descarcă PDF securizat ✓",
      downloadLocked: "🔒 Descarcă PDF — 19 RON",
      contactDetails: "Date de Contact",
      contactFields: {
        nume: "Nume",
        titlu: "Titlu profesional",
        email: "Email",
        telefon: "Telefon",
        oras: "Oraș",
        linkedin: "LinkedIn",
      },
      otherDesigns: "Alte Designuri",
      allDesigns: "+ Toate cele 18 designuri",
      photoPreviewAlt: "previzualizare fotografie",
    },
    footer: {
      privacy: "Politica de confidențialitate",
      tagline: "CV-uri pentru public global · 18 designuri · Export PDF · ATS optimizat",
    },
    document: {
      sections: {
        profil: "Profil Profesional",
        exp: "Experiență Profesională",
        edu: "Educație",
        comp: "Competențe",
        limbi: "Limbi Străine",
        cert: "Certificări",
      },
      photoPlaceholder: "Foto",
      photoAlt: "foto",
      profilePlaceholder: "Profil profesional...",
      achievementsPlaceholder: "Realizări separate cu •",
      delete: "Șterge",
      deleteExperience: "Șterge experiența",
      addExperience: "+ Adaugă experiență",
      degreePlaceholder: "Diplomă / Curs",
      institutionPlaceholder: "Instituție",
      periodPlaceholder: "Perioadă",
      addEducation: "+ Adaugă educație",
      addSkill: "+ Adaugă competență",
      addLanguage: "+ Adaugă limbă",
      addCertification: "+ Adaugă certificare",
    },
    roleCard: {
      useRole: "Folosește rolul",
      chooseRole: "Alege rolul →",
    },
    customRoleCard: {
      badge: "Rol custom",
      createFor: "Creează CV pentru",
      subtitle: "Păstrăm cele 18 designuri și îți deschidem un CV curat, gata de completat pentru jobul tău.",
      continue: "Continuă către designuri",
    },
    designCard: {
      optionsCount: "18 opțiuni",
      previewName: "Prenume Nume",
      previewProfile: ["Profil", "Skills"],
      previewSections: ["Exp", "Educație"],
      previewFallback: "Preview",
      choose: "Alege designul",
      preview: "Previzualizează designul →",
    },
  },
  en: {
    common: {
      languageToggle: "RO / EN",
      yourRole: "Your role",
      role: "Role",
      starter: "Starter",
      customRole: "Custom role",
      photo: "Photo",
      preview: "Preview",
      edit: "Edit",
      viewCv: "View CV",
      editPanel: "Edit",
      langBadge: "EN",
      romanianLabel: "Romanian",
      englishLabel: "English",
    },
    errors: {
      paymentInit: "Could not start the payment flow.",
      paymentRetry: "Could not start the payment flow. Please try again.",
      paymentVerify: "Could not verify the payment.",
      legacyCheckout: "This older checkout session cannot unlock the secure PDF anymore. Please restart payment from the editor.",
      serverConnection: "Could not reach the server. Please check your connection.",
      invalidPhotoType: "Please upload a PNG or JPEG photo.",
      photoRead: "We could not read the selected photo.",
      pdfGeneration: "PDF generation failed.",
      paymentPrepare: "Could not prepare the payment flow.",
    },
    paywall: {
      title: "Download your CV",
      readySuffix: "is ready to download.",
      priceLabel: "Download price",
      oneTime: "one-time payment · no subscription",
      benefits: [
        "✅ Professional European A4 PDF",
        "✅ ATS-friendly layout built for HR screening",
        "✅ Secure server-side PDF generated after payment",
        "✅ Secure payment powered by Stripe 🔒",
      ],
      openingStripe: "⏳ Opening Stripe...",
      preparingPayment: "⏳ Preparing payment...",
      payNow: "💳 Pay 19 RON & Download",
      checkoutReady: "The payment connection is ready. You can continue right away.",
      wakeUp: "The first checkout can take a moment if the backend is waking up from standby.",
      secureFooter: "🔒 Secure payment via Stripe · Visa, Mastercard, Google Pay",
    },
    banners: {
      paymentConfirmed: "🎉 Payment confirmed! You can now download the secure PDF for the saved document.",
      paymentLocked: "🎉 Payment is confirmed, but the PDF only unlocks for the exact CV version you paid for.",
      checkingPayment: "⏳ Verifying payment...",
      editMode: "✏️ Edit mode — click any field in the CV to update it live",
    },
    header: {
      backDesigns: "← Designs",
      backJob: "↺ Role",
      addPhotoShort: "📷 Photo",
      changePhotoShort: "🔄 Photo",
      preview: "👁 Preview",
      edit: "✏️ Edit",
      save: "💾 Save",
      saved: "✓ Saved!",
      pdfLoading: "⏳...",
      stripeLoading: "⏳ Stripe...",
      pdfPaid: "⬇️ Secure PDF ✓",
      pdfLocked: "🔒 PDF — 19 RON",
    },
    rolePage: {
      pill: "✦ Built for global audiences · 18 designs · EN default, RO optional",
      titleLead: "Type your role",
      titleAccent: "in 3 Minutes",
      subtitle: "The experience starts in English for a global audience, with Romanian available as an optional switch.",
      stats: [
        { value: "18", label: "Designs" },
        { value: "🔎", label: "Custom role" },
        { value: "PDF", label: "Real PDF" },
      ],
      searchPlaceholder: "Type your role: cashier, electrician, barista...",
      noResults: "No starter roles found for",
    },
    designsPage: {
      selectedRole: "Selected role",
      title: "Choose one of the 18 designs",
      subtitle: "Your content stays linked to the role, while this step changes only the visual style: layout, rhythm, emphasis, and personality.",
      changeJob: "← Change role",
      customRoleBadge: "Custom role",
    },
    editor: {
      photoAdded: "✓ Photo added",
      addPhoto: "📷 Add your photo",
      exitEdit: "👁 Exit edit mode",
      editCv: "✏️ Edit CV",
      generatingPdf: "⏳ Generating PDF...",
      connectingStripe: "⏳ Connecting to Stripe...",
      downloadPaid: "⬇️ Download secure PDF ✓",
      downloadLocked: "🔒 Download PDF — 19 RON",
      contactDetails: "Contact Details",
      contactFields: {
        nume: "Name",
        titlu: "Professional title",
        email: "Email",
        telefon: "Phone",
        oras: "City",
        linkedin: "LinkedIn",
      },
      otherDesigns: "Other Designs",
      allDesigns: "+ All 18 designs",
      photoPreviewAlt: "photo preview",
    },
    footer: {
      privacy: "Privacy Policy",
      tagline: "Global-ready CVs · 18 designs · PDF export · ATS-friendly",
    },
    document: {
      sections: {
        profil: "Professional Profile",
        exp: "Professional Experience",
        edu: "Education",
        comp: "Skills",
        limbi: "Languages",
        cert: "Certifications",
      },
      photoPlaceholder: "Photo",
      photoAlt: "photo",
      profilePlaceholder: "Professional profile...",
      achievementsPlaceholder: "Separate achievements with •",
      delete: "Delete",
      deleteExperience: "Delete experience",
      addExperience: "+ Add experience",
      degreePlaceholder: "Degree / Course",
      institutionPlaceholder: "Institution",
      periodPlaceholder: "Period",
      addEducation: "+ Add education",
      addSkill: "+ Add skill",
      addLanguage: "+ Add language",
      addCertification: "+ Add certification",
    },
    roleCard: {
      useRole: "Use role",
      chooseRole: "Choose role →",
    },
    customRoleCard: {
      badge: "Custom role",
      createFor: "Create a CV for",
      subtitle: "You keep the same 18 designs and start with a clean CV that is ready to edit for your role.",
      continue: "Continue to designs",
    },
    designCard: {
      optionsCount: "18 options",
      previewName: "First Last Name",
      previewProfile: ["Profile", "Skills"],
      previewSections: ["Exp", "Education"],
      previewFallback: "Preview",
      choose: "Choose design",
      preview: "Preview design →",
    },
  },
};

function getDefaultSummary(job, lang) {
  if (lang === "en") {
    return `Starter resume sample for ${job.toLowerCase()} roles. Open it, edit the content, and export a polished PDF fast.`;
  }

  return "";
}

function getEnglishChips(title) {
  const chips = title
    .replaceAll("/", " ")
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3);

  return chips.length ? chips : ["Starter", "ATS", "CV"];
}

export function getCopy(lang) {
  return UI_COPY[normalizeUiLang(lang)];
}

export function getLocalizedVariantLabel(variant, lang) {
  const labels = VARIANT_LABELS[normalizeUiLang(lang)];
  return labels[variant] || labels.fallback;
}

export function getLocalizedDesignTagline(design, lang) {
  if (normalizeUiLang(lang) !== "en") {
    return design.tagline;
  }

  return DESIGN_TAGLINES_EN[design.key] || design.tagline;
}

export function getStarterRoleName(starterId, fallbackName, lang) {
  if (normalizeUiLang(lang) !== "en") {
    return fallbackName;
  }

  return STARTER_ROLE_EN[starterId]?.job || fallbackName;
}

export function getStarterRoleTitle(starterId, fallbackTitle, lang) {
  if (normalizeUiLang(lang) !== "en") {
    return fallbackTitle;
  }

  return STARTER_ROLE_SEED_EN[starterId]?.titlu || STARTER_ROLE_EN[starterId]?.title || fallbackTitle;
}

export function getStarterRoleData(starterId, fallbackData, lang) {
  if (normalizeUiLang(lang) !== "en") {
    return fallbackData;
  }

  return STARTER_ROLE_SEED_EN[starterId] || fallbackData;
}

export function getStarterRoleCopy(profile, lang) {
  const normalizedLang = normalizeUiLang(lang);
  const starterData = getStarterRoleData(profile.id, profile.data, normalizedLang);

  if (normalizedLang !== "en") {
    return {
      job: profile.job,
      title: starterData.titlu,
      summary: starterData.despre,
      chips: starterData.competente.slice(0, 3).map((entry) => entry.split(" ")[0]),
    };
  }

  const job = getStarterRoleName(profile.id, profile.job, normalizedLang);
  const title = getStarterRoleTitle(profile.id, starterData.titlu, normalizedLang);

  return {
    job,
    title,
    summary: starterData.despre || getDefaultSummary(job, normalizedLang),
    chips: starterData.competente?.length
      ? starterData.competente.slice(0, 3).map((entry) => entry.split(" ")[0])
      : getEnglishChips(title),
  };
}
