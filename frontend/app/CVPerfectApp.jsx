"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  getCopy,
  getLocalizedDesignTagline,
  getLocalizedVariantLabel,
  getStarterRoleCopy,
  getStarterRoleData,
  getStarterRoleName,
  normalizeUiLang,
  UI_LANGUAGE_STORAGE_KEY,
} from "./i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cvperfect-backend.onrender.com";
const PENDING_PURCHASE_STORAGE_KEY = "cvperfect.pendingPurchase";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

function syncLanguageInUrl(lang, options = {}) {
  const { removePaymentParams = false } = options;

  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (removePaymentParams) {
    url.searchParams.delete("payment");
    url.searchParams.delete("session_id");
  }

  if (normalizeUiLang(lang) === "ro") {
    url.searchParams.set("lang", "ro");
  } else {
    url.searchParams.delete("lang");
  }

  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextPath !== currentPath) {
    window.history.replaceState({}, "", nextPath);
  }
}

function normalizeString(value, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeColor(value) {
  const candidate = normalizeString(value, 16).toLowerCase();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(candidate) ? candidate : "#1a56db";
}

function normalizeLang(value) {
  return normalizeString(value, 8).toLowerCase() === "en" ? "en" : "ro";
}

function normalizeStringList(value, maxItems = 32, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(entry => normalizeString(entry, maxLength)).filter(Boolean);
}

function normalizeObjectList(value, keys, maxItems = 24, maxLength = 2400) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(entry => {
    const source = entry && typeof entry === "object" ? entry : {};
    const normalized = {};
    keys.forEach(key => {
      normalized[key] = normalizeString(source[key], maxLength);
    });
    return normalized;
  });
}

function normalizePhotoDataUrl(value) {
  const dataUrl = normalizeString(value, 5_000_000);
  if (!dataUrl) return "";
  return /^data:image\/(png|jpeg|jpg);base64,[a-z0-9+/=]+$/i.test(dataUrl) ? dataUrl : "";
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(entry => stableSerialize(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value ?? null);
}

function normalizePdfPayload(payload) {
  return {
    templateName: normalizeString(payload?.templateName, 160),
    color: normalizeColor(payload?.color),
    lang: normalizeLang(payload?.lang),
    photoDataUrl: normalizePhotoDataUrl(payload?.photoDataUrl),
    cvData: {
      nume: normalizeString(payload?.cvData?.nume, 160),
      titlu: normalizeString(payload?.cvData?.titlu, 160),
      email: normalizeString(payload?.cvData?.email, 160),
      telefon: normalizeString(payload?.cvData?.telefon, 80),
      oras: normalizeString(payload?.cvData?.oras, 120),
      linkedin: normalizeString(payload?.cvData?.linkedin, 200),
      despre: normalizeString(payload?.cvData?.despre, 8000),
      experienta: normalizeObjectList(payload?.cvData?.experienta, ["firma", "perioada", "rol", "desc"], 24, 3000),
      educatie: normalizeObjectList(payload?.cvData?.educatie, ["institutie", "perioada", "diploma"], 16, 1200),
      competente: normalizeStringList(payload?.cvData?.competente, 32, 240),
      limbi: normalizeStringList(payload?.cvData?.limbi, 16, 160),
      certificari: normalizeStringList(payload?.cvData?.certificari, 24, 240),
    },
  };
}

async function sha256Hex(input) {
  const encoded = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function createDocumentHash(payload) {
  return sha256Hex(stableSerialize(normalizePdfPayload(payload)));
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function getSkillWidth(skill) {
  const total = Array.from(skill || "").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return 72 + (total % 26);
}

function savePendingPurchase(purchase) {
  try {
    localStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
  } catch (error) {
    console.error("Could not persist pending purchase", error);
  }
}

function loadPendingPurchase() {
  try {
    const raw = localStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Could not read pending purchase", error);
    return null;
  }
}

function clearPendingPurchase() {
  try {
    localStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
  } catch (error) {
    console.error("Could not clear pending purchase", error);
  }
}

function parseFilenameFromDisposition(header) {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const basicMatch = header.match(/filename="([^"]+)"/i);
  return basicMatch?.[1] || null;
}

function useStripePayment(lang) {
  const copy = getCopy(lang);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [preparingCheckout, setPreparingCheckout] = useState(false);
  const [preparedCheckoutHash, setPreparedCheckoutHash] = useState(null);
  const warmupPromiseRef = useRef(null);
  const lastWarmupAtRef = useRef(0);
  const preparedCheckoutRef = useRef(null);
  const preparePromiseRef = useRef(null);
  const verifyPaymentRef = useRef(null);

  const fetchCheckoutUrl = async ({ templateName, lang, documentHash, color, cvData, photoDataUrl, authToken, resumeId }) => {
    const res = await fetch(`${API_URL}/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ templateName, lang, documentHash, color, cvData, photoDataUrl, resumeId })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || copy.errors.paymentInit);
    }

    if (!data.url) {
      throw new Error(copy.errors.paymentRetry);
    }

    return data.url;
  };

  const warmCheckout = async () => {
    const now = Date.now();

    if (warmupPromiseRef.current) {
      return warmupPromiseRef.current;
    }

    if (lastWarmupAtRef.current && now - lastWarmupAtRef.current < 4 * 60 * 1000) {
      return null;
    }

    warmupPromiseRef.current = fetch(`${API_URL}/health`, {
      cache: "no-store",
    })
      .catch(error => {
        console.warn("Checkout warm-up failed", error);
        return null;
      })
      .finally(() => {
        lastWarmupAtRef.current = Date.now();
        warmupPromiseRef.current = null;
      });

    return warmupPromiseRef.current;
  };

  const prepareCheckout = async ({ templateName, lang, documentHash, color, cvData, photoDataUrl, authToken, accountUserId, resumeId }) => {
    const preparedCheckout = preparedCheckoutRef.current;
    const accountKey = `${accountUserId || "anonymous"}:${resumeId || "unsaved"}`;

    if (preparedCheckout?.documentHash === documentHash && preparedCheckout.accountKey === accountKey && preparedCheckout.url) {
      return preparedCheckout.url;
    }

    const inFlightPreparation = preparePromiseRef.current;

    if (inFlightPreparation?.documentHash === documentHash && inFlightPreparation.accountKey === accountKey) {
      return inFlightPreparation.promise;
    }

    const promise = (async () => {
        setPreparingCheckout(true);
        setPreparedCheckoutHash(null);

      try {
        await warmCheckout();
        const url = await fetchCheckoutUrl({ templateName, lang, documentHash, color, cvData, photoDataUrl, authToken, resumeId });
        preparedCheckoutRef.current = { documentHash, accountKey, url };
        setPreparedCheckoutHash(documentHash);
        return url;
      } finally {
        setPreparingCheckout(false);
      }
    })();

    preparePromiseRef.current = { documentHash, accountKey, promise };

    return promise.finally(() => {
      if (preparePromiseRef.current?.promise === promise) {
        preparePromiseRef.current = null;
      }
    });
  };

  const verifyPayment = async (sessionId) => {
    const response = await fetch(`${API_URL}/verify-payment?session_id=${sessionId}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || copy.errors.paymentVerify);
    }

    if (data.paid && data.downloadToken) {
      const nextPayment = {
        sessionId: data.sessionId || sessionId,
        documentHash: data.documentHash,
        downloadToken: data.downloadToken,
        expiresAt: data.expiresAt || null,
      };
      setPaymentInfo(nextPayment);
      return nextPayment;
    }

    if (data.requiresNewCheckout) {
      setPaymentInfo(null);
      throw new Error(copy.errors.legacyCheckout);
    }

    setPaymentInfo(null);
    return null;
  };

  verifyPaymentRef.current = verifyPayment;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");

    if (payment === "success" && sessionId) {
      setChecking(true);
      verifyPaymentRef.current(sessionId)
        .then(() => {
          syncLanguageInUrl(lang, { removePaymentParams: true });
        })
        .catch(error => {
          console.error(error);
          alert(error.message || copy.errors.paymentVerify);
        })
        .finally(() => setChecking(false));
    }
  }, [copy.errors.paymentVerify, lang]);

  useEffect(() => {
    const scheduleWarmup = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => {
          void warmCheckout();
        }, { timeout: 2500 });
        return;
      }

      window.setTimeout(() => {
        void warmCheckout();
      }, 1200);
    };

    scheduleWarmup();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void warmCheckout();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const startPayment = async ({ templateName, lang, documentHash, color, cvData, photoDataUrl, authToken, accountUserId, resumeId }) => {
    setStartingCheckout(true);

    try {
      const preparedCheckout = preparedCheckoutRef.current;
      const accountKey = `${accountUserId || "anonymous"}:${resumeId || "unsaved"}`;
      const checkoutUrl =
        preparedCheckout?.documentHash === documentHash && preparedCheckout.accountKey === accountKey
          ? preparedCheckout.url
          : await prepareCheckout({ templateName, lang, documentHash, color, cvData, photoDataUrl, authToken, accountUserId, resumeId });

      window.location.href = checkoutUrl;
    } catch (e) {
      console.error(e);
      alert(e.message || copy.errors.serverConnection);
    } finally {
      setStartingCheckout(false);
    }
  };

  return {
    paymentInfo,
    checking,
    prepareCheckout,
    preparedCheckoutHash,
    preparingCheckout,
    startPayment,
    verifyPayment,
    startingCheckout,
    warmCheckout,
  };
}

// ─── PAYWALL MODAL ────────────────────────────────────────────────────────────
function PaywallModal({ onClose, onPay, templateName, lang, color, isPaying, isPreparingCheckout, checkoutReady }) {
  const copy = getCopy(lang);
  const langLabel = lang === "en" ? copy.common.englishLabel : copy.common.romanianLabel;
  const paymentButtonLabel = isPaying
    ? copy.paywall.openingStripe
    : isPreparingCheckout && !checkoutReady
      ? copy.paywall.preparingPayment
      : copy.paywall.payNow;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", position: "relative" }}>
        {/* Close */}
        <button onClick={onClose} disabled={isPaying} style={{ position: "absolute", top: 16, right: 16, background: "#f1f5f9", border: "none", width: 32, height: 32, borderRadius: "50%", cursor: isPaying ? "not-allowed" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", opacity: isPaying ? 0.55 : 1 }}>✕</button>

        {/* Icon */}
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${color}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 30 }}>📄</div>

        {/* Title */}
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#0f172a", textAlign: "center" }}>{copy.paywall.title}</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 1.6 }}>
          <strong>{templateName}</strong> ({langLabel}) {copy.paywall.readySuffix}
        </p>

        {/* Price box */}
        <div style={{ background: "linear-gradient(135deg, #f0f9ff, #eff6ff)", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{copy.paywall.priceLabel}</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: "#0f172a", letterSpacing: "-1px" }}>19 <span style={{ fontSize: 22 }}>RON</span></div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{copy.paywall.oneTime}</div>
        </div>

        {/* Benefits */}
        <div style={{ marginBottom: 24 }}>
          {copy.paywall.benefits.map((b, i) => (
            <div key={i} style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>{b}</div>
          ))}
        </div>

        {/* Pay button */}
        <button onClick={onPay} disabled={isPaying}
          style={{ width: "100%", padding: "14px", borderRadius: 12, background: isPaying ? "#94a3b8" : `linear-gradient(135deg, ${color}, #7c3aed)`, color: "#fff", border: "none", cursor: isPaying ? "wait" : "pointer", fontWeight: 800, fontSize: 16, boxShadow: isPaying ? "none" : `0 6px 20px ${color}50`, marginBottom: 12 }}>
          {paymentButtonLabel}
        </button>

        {(isPaying || isPreparingCheckout) && (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>
            {checkoutReady && !isPaying
              ? copy.paywall.checkoutReady
              : copy.paywall.wakeUp}
          </p>
        )}

        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          {copy.paywall.secureFooter}
        </p>
      </div>
    </div>
  );
}

// ─── 18 CV TEMPLATES ─────────────────────────────────────────────────────────
const cvTemplates = [
  { id: 1, job: "Casier", color: "#1a56db", icon: "🛒", data: { nume: "Ionescu Maria", titlu: "Casier / Operator Vânzări", email: "maria.ionescu@email.ro", telefon: "0721 234 567", oras: "București", linkedin: "linkedin.com/in/maria-ionescu", despre: "Casier cu experiență de 4 ani în retail, orientat spre client și rezultate. Abilități dovedite în gestionarea numerarului, procesarea plăților și asigurarea satisfacției clienților. Recunoscută pentru acuratețe, rapiditate și atitudine pozitivă în relația cu clienții.", experienta: [{ firma: "Mega Image SRL", perioada: "2021 – Prezent", rol: "Casier Senior", desc: "Procesarea a 200+ tranzacții zilnice cu acuratețe 99.8% • Gestionarea casieriei cu zero discrepanțe timp de 2 ani • Formarea a 5 angajați noi în proceduri POS și servicii clienți • Implementarea programului de fidelitate – creștere 15% clienți recurenți" }, { firma: "Kaufland România", perioada: "2019 – 2021", rol: "Casier", desc: "Operarea sistemului POS și procesarea plăților cash/card • Soluționarea reclamațiilor clienților cu rată de satisfacție 95% • Menținerea curățeniei și ordinii la zona de casă • Colaborare eficientă în echipă de 20 persoane" }], educatie: [{ institutie: "Liceul Economic Virgil Madgearu", perioada: "2015 – 2019", diploma: "Bacalaureat – Profil Economic" }], competente: ["Operare POS & sisteme de plată", "Gestionare numerar", "Servicii clienți excelente", "Lucru sub presiune", "MS Office (Word, Excel)", "Comunicare interpersonală", "Atenție la detalii", "Lucru în echipă"], limbi: ["Română (nativă)", "Engleză (intermediar – B1)"], certificari: ["Certificat Casier – COR 523003", "Curs Servicii Clienți – 2022"] } },
  { id: 2, job: "Secretară", color: "#7c3aed", icon: "📋", data: { nume: "Popescu Elena", titlu: "Secretară / Asistent Administrativ", email: "elena.popescu@email.ro", telefon: "0733 456 789", oras: "Cluj-Napoca", linkedin: "linkedin.com/in/elena-popescu", despre: "Secretară profesionistă cu 6 ani experiență în mediu corporativ dinamic. Expert în coordonarea agendelor executive, organizarea evenimentelor și gestionarea documentelor confidențiale. Reputată pentru discreție, proactivitate și capacitate excepțională de organizare multi-task.", experienta: [{ firma: "Banca Transilvania", perioada: "2020 – Prezent", rol: "Secretară Executivă", desc: "Gestionarea agendei directorului general și coordonarea a 50+ întâlniri lunare • Redactarea corespondenței oficiale în română și engleză • Organizarea conferințelor interne și externe (15+ evenimente/an) • Administrarea bazei de date confidențiale și arhivare electronică" }, { firma: "Cabinet Avocatură Ionescu & Asociații", perioada: "2017 – 2020", rol: "Secretară Juridică", desc: "Pregătirea dosarelor juridice și documentelor legale • Gestionarea programărilor și relației cu clienții • Redactarea contractelor și corespondenței juridice • Suport administrativ pentru 8 avocați" }], educatie: [{ institutie: "Universitatea Babeș-Bolyai Cluj", perioada: "2013 – 2017", diploma: "Licență – Administrație Publică" }], competente: ["MS Office Suite (avansat)", "Managementul agendei executive", "Redactare documente oficiale", "Organizare evenimente", "Comunicare profesională", "Arhivare & gestiune documente", "Discreție și confidențialitate", "Planificare și prioritizare"], limbi: ["Română (nativă)", "Engleză (avansat – C1)", "Franceză (mediu – B2)"], certificari: ["Certificat Secretary Professional – 2021", "Curs Management Birou – 2020"] } },
  { id: 3, job: "Lucrător Comercial", color: "#059669", icon: "🏪", data: { nume: "Dumitrescu Andrei", titlu: "Lucrător Comercial / Agent Vânzări", email: "andrei.dumitrescu@email.ro", telefon: "0745 678 901", oras: "Iași", linkedin: "linkedin.com/in/andrei-dumitrescu", despre: "Lucrător comercial dinamic cu 5 ani experiență în retail și vânzări directe. Abilități solide în merchandising, gestionarea stocurilor și depășirea targeturilor de vânzări. Orientat spre performanță cu o rată de conversie peste media echipei cu 23%.", experienta: [{ firma: "Carrefour România", perioada: "2021 – Prezent", rol: "Lucrător Comercial Senior", desc: "Gestionarea raioanelor cu produse în valoare de 500.000 RON lunar • Depășirea targetului de vânzări cu 23% în medie • Implementarea planogramelor și strategiilor de merchandising • Formarea și mentorarea a 8 angajați noi" }, { firma: "Profi Rom Food", perioada: "2018 – 2021", rol: "Lucrător Comercial", desc: "Aprovizionarea și gestionarea stocurilor pentru 3 raioane • Procesarea comenzilor și relația cu furnizorii • Inventariere lunară cu acuratețe 99.5% • Promovarea produselor și suport activ în vânzări" }], educatie: [{ institutie: "Colegiul Economic Dimitrie Cantemir", perioada: "2014 – 2018", diploma: "Bacalaureat – Comerț" }], competente: ["Merchandising & planograme", "Gestionare stocuri & inventar", "Tehnici de vânzare", "Operare sisteme ERP", "Relații cu clienții", "Managementul timpului", "Lucru în echipă", "Analiză vânzări"], limbi: ["Română (nativă)", "Engleză (conversațional – B2)"], certificari: ["Certificat Lucrător Comercial – COR 522303", "Curs Tehnici Vânzare – 2022"] } },
  { id: 4, job: "HR Specialist", color: "#dc2626", icon: "👥", data: { nume: "Constantin Raluca", titlu: "HR Specialist / Recruiter", email: "raluca.constantin@email.ro", telefon: "0756 789 012", oras: "București", linkedin: "linkedin.com/in/raluca-constantin-hr", despre: "Specialist HR cu 7 ani experiență în recrutare, employee engagement și HR operations. Expert în recrutarea profilelor tehnice și non-tehnice, cu track record de reducere a timpului de angajare cu 35%. Pasionată de construirea unor culturi organizaționale sănătoase și programe de dezvoltare a angajaților.", experienta: [{ firma: "Accenture România", perioada: "2020 – Prezent", rol: "Senior HR Business Partner", desc: "Gestionarea ciclului complet de recrutare pentru 200+ poziții anual • Reducerea timpului mediu de angajare de la 45 la 29 de zile • Implementarea programului de onboarding care a crescut retenția cu 28% • Coordonarea evaluărilor de performanță pentru 500 angajați" }, { firma: "Vodafone România", perioada: "2016 – 2020", rol: "HR Recruiter", desc: "Recrutarea profilelor tehnice și comerciale pentru toate departamentele • Managementul platformelor ATS (Workday, SAP SuccessFactors) • Organizarea job fair-urilor cu 1000+ candidați • Dezvoltarea programului Graduate pentru 30 de tineri anual" }], educatie: [{ institutie: "Academia de Studii Economice București", perioada: "2012 – 2016", diploma: "Licență – Managementul Resurselor Umane" }], competente: ["Full-cycle recruitment", "LinkedIn Recruiter (Expert)", "Workday & SAP SuccessFactors", "Employee Relations", "Performance Management", "HR Analytics & Reporting", "Employer Branding", "Labor Law România"], limbi: ["Română (nativă)", "Engleză (fluent – C2)", "Germană (mediu – B1)"], certificari: ["SHRM-CP Certification", "LinkedIn Recruiter Certified", "Curs Inspector Resurse Umane – 2019"] } },
  { id: 5, job: "Operator Calculator", color: "#0891b2", icon: "💻", data: { nume: "Gheorghe Mihai", titlu: "Operator Calculator / Data Entry Specialist", email: "mihai.gheorghe@email.ro", telefon: "0722 345 678", oras: "Timișoara", linkedin: "linkedin.com/in/mihai-gheorghe", despre: "Operator calculator cu 5 ani experiență în introducerea și procesarea datelor, cu o rată de acuratețe de 99.7%. Expert în MS Office, baze de date și sisteme ERP. Capabil să proceseze volume mari de date în termene stricte, menținând standarde înalte de calitate.", experienta: [{ firma: "Ernst & Young România", perioada: "2021 – Prezent", rol: "Senior Data Entry Operator", desc: "Procesarea a 5000+ înregistrări zilnice cu acuratețe 99.7% • Administrarea bazelor de date SQL și Access • Generarea rapoartelor lunare în Excel cu tabele pivot și macro-uri • Formarea a 10 angajați noi în proceduri de lucru" }, { firma: "Telekom România", perioada: "2018 – 2021", rol: "Operator Date", desc: "Introducerea și validarea datelor în sistemele CRM și ERP • Reconcilierea discrepanțelor în baze de date • Gestionarea arhivei electronice și fizice • Suport tehnic pentru utilizatorii interni" }], educatie: [{ institutie: "Universitatea Politehnica Timișoara", perioada: "2014 – 2018", diploma: "Licență – Informatică Aplicată" }], competente: ["MS Excel (avansat – VBA, Pivot)", "MS Access & SQL", "SAP ERP", "Google Workspace", "Data Entry 95 WPM", "Procesare imagini & documente", "Atenție la detalii", "Gestionare baze de date"], limbi: ["Română (nativă)", "Engleză (avansat – C1)"], certificari: ["Microsoft Office Specialist (MOS) Excel Expert", "SAP Certified User", "Certificat Operator Introducere Date – COR 411301"] } },
  { id: 6, job: "Asistent Manager", color: "#9333ea", icon: "📊", data: { nume: "Vasile Andreea", titlu: "Asistent Manager / Office Manager", email: "andreea.vasile@email.ro", telefon: "0734 567 890", oras: "Brașov", linkedin: "linkedin.com/in/andreea-vasile", despre: "Asistent manager proactiv cu 6 ani experiență în suport executiv și coordonare operațională. Expert în optimizarea proceselor administrative, managementul proiectelor și coordonarea echipelor cross-funcționale. Recunoscut pentru abilitatea de a anticipa nevoile managerilor și de a livra rezultate fără supervizare.", experienta: [{ firma: "Dedeman SRL", perioada: "2020 – Prezent", rol: "Asistent Director General", desc: "Coordonarea operațiunilor zilnice pentru echipă de 150 angajați • Managementul bugetului departamental de 2M RON anual • Organizarea strategică a agendei executive – 100+ întâlniri/lună • Implementarea sistemului de management documente – reducere 40% timp birocratic" }, { firma: "Holcim România", perioada: "2017 – 2020", rol: "Asistent Manager Operațional", desc: "Coordonarea proiectelor interdepartamentale cu 20+ stakeholderi • Pregătirea rapoartelor de management și prezentărilor Board • Gestionarea contractelor cu furnizorii și negocierea prețurilor • Implementarea procedurilor ISO 9001" }], educatie: [{ institutie: "Universitatea Transilvania Brașov", perioada: "2013 – 2017", diploma: "Licență – Management" }], competente: ["Project Management (PMI)", "MS Office Suite (expert)", "Coordonare executivă", "Managementul bugetului", "Negociere & contracte", "Analiză & raportare business", "Leadership de echipă", "Optimizare procese"], limbi: ["Română (nativă)", "Engleză (C2 – fluent)", "Italiană (B1)"], certificari: ["PMP Certification – Project Management Institute", "ISO 9001 Lead Auditor", "Curs Management Organizațional – 2021"] } },
  { id: 7, job: "Asistent Medical", color: "#0d9488", icon: "🏥", data: { nume: "Munteanu Cristina", titlu: "Asistent Medical Generalist", email: "cristina.munteanu@email.ro", telefon: "0742 678 901", oras: "Cluj-Napoca", linkedin: "linkedin.com/in/cristina-munteanu-amg", despre: "Asistent medical generalist cu 8 ani experiență în îngrijirea pacienților în secții de medicină internă și urgențe. Dedicat excelenței în îngrijirea pacienților, cu abilități dovedite în gestionarea situațiilor de urgență și comunicarea empatică cu pacienții și familiile acestora.", experienta: [{ firma: "Spitalul Clinic Județean Cluj", perioada: "2019 – Prezent", rol: "Asistent Medical Principal", desc: "Îngrijirea și monitorizarea a 15-20 pacienți pe tură • Administrarea tratamentelor și monitorizarea parametrilor vitali • Coordonarea echipei de 8 asistenți medicali pe tură de noapte • Implementarea protocoalelor de prevenire a infecțiilor nosocomiale – reducere 30%" }, { firma: "Spitalul Municipal Cluj", perioada: "2015 – 2019", rol: "Asistent Medical", desc: "Pregătirea și asistarea medicilor în proceduri clinice • Recoltarea probelor biologice și interpretarea rezultatelor de bază • Educarea pacienților privind administrarea medicamentelor • Documentarea precisă în fișele medicale" }], educatie: [{ institutie: "UMF Iuliu Hațieganu Cluj-Napoca", perioada: "2019 – 2021", diploma: "Master – Managementul Serviciilor de Sănătate" }, { institutie: "Colegiul Sanitar Cluj", perioada: "2012 – 2015", diploma: "Asistent Medical Generalist" }], competente: ["Îngrijire pacienți critici", "Administrare tratamente IV/IM", "EKG & monitorizare", "Prim ajutor & BLS/ALS", "Gestionare urgențe medicale", "Documentație medicală EMR", "Comunicare empatică", "Prevenire infecții nosocomiale"], limbi: ["Română (nativă)", "Engleză medicală (B2)"], certificari: ["Certificat BLS & ALS – 2023", "Atestat Asistent Medical Principal – OAMGMAMR", "Curs Gestionare Urgențe – 2022"] } },
  { id: 8, job: "Doctor", color: "#1d4ed8", icon: "⚕️", data: { nume: "Dr. Ionescu Alexandru", titlu: "Medic Specialist Medicină Internă", email: "dr.alexandru.ionescu@email.ro", telefon: "0751 789 012", oras: "București", linkedin: "linkedin.com/in/dr-alexandru-ionescu", despre: "Medic specialist în Medicină Internă cu 12 ani experiență clinică, cu subspecializare în boli cardiovasculare și diabet. Experiență în cercetare medicală cu 15 articole publicate în reviste indexate ISI. Dedicat îngrijirii centrate pe pacient și medicinei bazate pe dovezi.", experienta: [{ firma: "Spitalul Universitar de Urgență București", perioada: "2018 – Prezent", rol: "Medic Specialist Medicină Internă", desc: "Gestionarea a 2500+ cazuri clinice anual cu rata de succes 97% • Coordonarea echipei medicale de 12 persoane în secție • Implementarea protocoalelor AHA/ESC pentru bolile cardiovasculare • 8 articole publicate în reviste medicale indexate ISI (2018-2024)" }, { firma: "Clinica Medicover București", perioada: "2014 – 2018", rol: "Medic Specialist Ambulatoriu", desc: "Consultații și diagnosticarea afecțiunilor interne complexe • Interpretarea investigațiilor paraclinice – ecografie, EKG, CT • Colaborarea interdisciplinară cu cardiologi, endocrinologi • Programe de prevenție și educație medicală pentru pacienți" }], educatie: [{ institutie: "UMF Carol Davila București", perioada: "2008 – 2014", diploma: "Medic – Facultatea de Medicină Generală" }, { institutie: "Rezidențiat Medicină Internă", perioada: "2014 – 2019", diploma: "Medic Specialist – Medicină Internă" }], competente: ["Diagnostic clinic avansat", "Ecografie internistică", "Interpretare EKG & imagistică", "Boli cardiovasculare & diabet", "Cercetare medicală & publicații", "Protocoale AHA/ESC", "EMR/HIS Hospital Systems", "Leadership echipă medicală"], limbi: ["Română (nativă)", "Engleză medicală (C2)", "Franceză (B2)"], certificari: ["Atestat Specialist Medicină Internă – CMDR", "Certificat Ecografie Internistică – 2020", "Curs ALS Avansat – 2023", "Fellow ESC – European Society of Cardiology"] } },
  { id: 9, job: "Profesor", color: "#b45309", icon: "📚", data: { nume: "Popa Mihaela", titlu: "Profesor Matematică & Informatică", email: "mihaela.popa@email.ro", telefon: "0724 890 123", oras: "Iași", linkedin: "linkedin.com/in/mihaela-popa-prof", despre: "Profesor cu 10 ani experiență în predarea matematicii și informaticii la nivel liceal. Pasionată de pedagogia inovatoare și tehnologiile educaționale. 95% rată de promovare a elevilor la BAC și olimpiade naționale. Expert în diferențierea instruirii și pregătirea elevilor de performanță.", experienta: [{ firma: "Colegiul Național Costache Negruzzi Iași", perioada: "2018 – Prezent", rol: "Profesor Titular Matematică", desc: "Predarea matematicii claselor IX-XII – 30 ore/săptămână • 95% rată de promovare BAC Matematică (media județeană: 78%) • 12 elevi pregătiți pentru olimpiade naționale – 3 premii I • Coordonator cerc pedagogic și activități extracurriculare STEM" }, { firma: "Liceul Teoretic Dimitrie Cantemir Iași", perioada: "2013 – 2018", rol: "Profesor Informatică", desc: "Predarea informaticii claselor X-XII (Pascal, C++, Java) • Pregătirea echipelor pentru concursurile naționale de informatică • Implementarea platformei educaționale Google Classroom • Mentorarea a 25 de elevi în proiecte de software" }], educatie: [{ institutie: "Universitatea Alexandru Ioan Cuza Iași", perioada: "2009 – 2013", diploma: "Licență – Matematică-Informatică" }, { institutie: "DPPD – Iași", perioada: "2012 – 2013", diploma: "Modul Psihopedagogic Nivel II" }], competente: ["Pedagogie inovatoare & diferențiată", "Pregătire olimpiade matematică", "Programare C++, Java, Python", "Platforme eLearning (Moodle, GClassroom)", "Evaluare formativă & sumativă", "Microsoft Teams & Office 365 Education", "Comunicare cu părinții & consiliere", "Cercetare educațională"], limbi: ["Română (nativă)", "Engleză (C1)", "Franceză (B1)"], certificari: ["Grad Didactic I – 2021", "Certificat Intel Teach to the Future", "Curs eTwinning & Proiecte Europene – 2020"] } },
  { id: 10, job: "Operator Call Center", color: "#0369a1", icon: "📞", data: { nume: "Radu Florentina", titlu: "Operator Call Center / Customer Support", email: "florentina.radu@email.ro", telefon: "0763 901 234", oras: "București", linkedin: "linkedin.com/in/florentina-radu", despre: "Operator call center cu 5 ani experiență în suport clienți inbound și outbound. Recunoscută pentru capacitatea de rezolvare a situațiilor dificile, menținând satisfacția clienților la 94%. Abilități excelente de comunicare verbală și gestionare a conflictelor, cu experiență în CRM și sisteme de ticketing.", experienta: [{ firma: "Orange România", perioada: "2021 – Prezent", rol: "Senior Customer Care Specialist", desc: "Gestionarea a 80-100 apeluri zilnice cu timp mediu de rezolvare de 4 min • CSAT (Customer Satisfaction Score) constant peste 94% • Mentorat 12 angajați noi în proceduri de call center • Nominalizat Best Agent Q3 2023 din echipă de 150 agenți" }, { firma: "Telekom România", perioada: "2019 – 2021", rol: "Operator Call Center", desc: "Suport tehnic și comercial pentru clienți rezidențiali și business • Procesarea comenzilor și reclamațiilor în Salesforce CRM • Upselling și cross-selling – depășit target cu 18% • AHT redus cu 25% față de media echipei" }], educatie: [{ institutie: "Universitatea din București", perioada: "2015 – 2019", diploma: "Licență – Comunicare și Relații Publice" }], competente: ["Comunicare verbală excelentă", "Salesforce & Zendesk CRM", "Gestionare conflicte", "Tehnici de vânzare telefonică", "Multitasking & prioritizare", "Rezolvare rapidă probleme", "Empatie & inteligență emoțională", "Raportare & analiză KPI"], limbi: ["Română (nativă)", "Engleză (B2)", "Franceză (A2)"], certificari: ["Certificat Customer Care Professional – 2022", "Curs NLP pentru Call Center – 2021", "Salesforce Certified User"] } },
  { id: 11, job: "Customer Support", color: "#0f766e", icon: "🎧", data: { nume: "Stoica Bianca", titlu: "Customer Support Specialist / Help Desk", email: "bianca.stoica@email.ro", telefon: "0774 012 345", oras: "Timișoara", linkedin: "linkedin.com/in/bianca-stoica-cs", despre: "Customer Support Specialist cu 4 ani experiență în suport tehnic și non-tehnic prin chat, email și telefon. Expert în platformele Zendesk și Freshdesk, cu focus pe experiența utilizatorului și rezolvarea eficientă a problemelor. CSAT mediu de 4.8/5 menținut constant.", experienta: [{ firma: "UiPath România", perioada: "2022 – Prezent", rol: "Customer Support Specialist L2", desc: "Suport tehnic avansat pentru produse SaaS – 60+ tichete/zi • CSAT mediu 4.8/5 din peste 2000 evaluări • Crearea și actualizarea a 150+ articole Knowledge Base • Colaborare cu echipa de Product pentru bug reporting și feedback" }, { firma: "eMAG România", perioada: "2019 – 2022", rol: "Customer Support Agent", desc: "Gestionarea solicitărilor clienților prin email, chat și telefon • Procesarea retururilor și reclamațiilor conform politicii companiei • Timp mediu de răspuns menținut sub 2 ore • Training în customer experience pentru 5 agenți noi" }], educatie: [{ institutie: "Universitatea de Vest Timișoara", perioada: "2015 – 2019", diploma: "Licență – Psihologie" }], competente: ["Zendesk & Freshdesk (expert)", "Chat & Email Support", "Suport tehnic L1/L2", "Knowledge Base Management", "CSAT & NPS Optimization", "Empatie & comunicare clară", "Gestionare multiple canale", "Jira & ticketing systems"], limbi: ["Română (nativă)", "Engleză (C1 – fluent)", "Germană (A2)"], certificari: ["Zendesk Support Administrator", "Certificat Customer Experience – 2022", "Google Analytics Individual Qualification"] } },
  { id: 12, job: "Manager", color: "#1e3a5f", icon: "📈", data: { nume: "Dragomir Cristian", titlu: "Manager Operațional / General Manager", email: "cristian.dragomir@email.ro", telefon: "0785 123 456", oras: "București", linkedin: "linkedin.com/in/cristian-dragomir-gm", despre: "Manager operațional cu 12 ani experiență în conducerea echipelor și optimizarea performanței business. Track record dovedit de creștere a veniturilor cu 40% și reducere a costurilor operaționale cu 25% în 3 ani. Expert în transformare organizațională, strategii de scalare și leadership de înaltă performanță.", experienta: [{ firma: "Farmec SA", perioada: "2018 – Prezent", rol: "Director Operațional", desc: "Conducerea operațiunilor pentru 5 fabrici cu 1200 angajați • Creșterea cifrei de afaceri de la 120M la 168M RON (+40%) în 3 ani • Implementarea Lean Management – reducere costuri cu 25% • Transformarea digitală – implementare ERP SAP S/4HANA pentru 800 utilizatori" }, { firma: "Ursus Breweries Romania", perioada: "2012 – 2018", rol: "Manager Producție Regional", desc: "Coordonarea producției pentru 3 fabrici din regiune • Implementarea standardelor AB InBev – reducere pierderi cu 35% • Management echipă de 300 angajați și 15 manageri de linie • Buget de investiții administrat: 15M EUR anual" }], educatie: [{ institutie: "INSEAD France", perioada: "2016", diploma: "Executive MBA – General Management" }, { institutie: "Universitatea Politehnica București", perioada: "2000 – 2005", diploma: "Inginer – Inginerie Industrială" }], competente: ["Strategic Planning & Execution", "P&L Management", "Lean & Six Sigma (Black Belt)", "Change Management", "SAP S/4HANA", "Business Development", "M&A Due Diligence", "Leadership echipe mari (500+)"], limbi: ["Română (nativă)", "Engleză (C2 – fluent)", "Franceză (B2)", "Germană (B1)"], certificari: ["Six Sigma Black Belt – ASQ", "PMP – Project Management Institute", "Lean Management Certificate – TÜV"] } },
  { id: 13, job: "Designer", color: "#be185d", icon: "🎨", data: { nume: "Nicolescu Diana", titlu: "Graphic Designer / Brand Identity Designer", email: "diana.nicolescu@email.ro", telefon: "0796 234 567", oras: "Cluj-Napoca", linkedin: "linkedin.com/in/diana-nicolescu-design", despre: "Designer grafic cu 6 ani experiență în brand identity, print și digital design. Portfolio de 200+ proiecte pentru clienți din retail, FMCG și tech. Recunoscută pentru creativitate distinctivă, atenție obsesivă la detalii și capacitatea de a traduce viziunea de brand în identitate vizuală memorabilă.", experienta: [{ firma: "Publicis Groupe Romania", perioada: "2021 – Prezent", rol: "Senior Graphic Designer", desc: "Crearea identităților vizuale pentru 30+ branduri naționale și internaționale • Coordonarea campaniilor integrate – print, digital, outdoor, packaging • Colaborarea cu copywriteri și account managers în echipă de 25 persoane • Prezentarea conceptelor creative direct clienților (C-level)" }, { firma: "Freelance & Agenție Studio Creativă", perioada: "2017 – 2021", rol: "Graphic Designer", desc: "200+ proiecte livrate – logo, branding, materiale print, packaging • Clienți: Farmec, Napolact, Dacia, startup-uri tech • Crearea ghidurilor de brand și brandbook-uri complete • Motion design și animații 2D pentru social media" }], educatie: [{ institutie: "Universitatea de Artă și Design Cluj-Napoca", perioada: "2013 – 2017", diploma: "Licență – Design Grafic" }], competente: ["Adobe Creative Suite (Ps, Ai, Id, Ae)", "Figma & Sketch", "Brand Identity Design", "Typography & Color Theory", "Packaging Design", "Motion Graphics (After Effects)", "Print Production", "Social Media Design"], limbi: ["Română (nativă)", "Engleză (C1)", "Italiană (B1)"], certificari: ["Adobe Certified Expert (ACE) – Photoshop", "Figma Professional – 2022", "Coursera: Branding & Identity – 2021"] } },
  { id: 14, job: "Web Developer", color: "#1d4ed8", icon: "🌐", data: { nume: "Alexe Bogdan", titlu: "Full-Stack Web Developer", email: "bogdan.alexe@email.ro", telefon: "0707 345 678", oras: "București", linkedin: "linkedin.com/in/bogdan-alexe-dev", despre: "Full-Stack Web Developer cu 7 ani experiență în dezvoltarea aplicațiilor web scalabile. Expert în React, Node.js și cloud computing (AWS). Contribuitor activ open-source cu 2000+ stele pe GitHub. Pasionat de performanță, accesibilitate și best practices în ingineria software.", experienta: [{ firma: "Bitdefender România", perioada: "2020 – Prezent", rol: "Senior Full-Stack Developer", desc: "Dezvoltarea platformei Central cu 5M+ utilizatori activi • Migrarea monolitului legacy la microservicii – reducere timp răspuns cu 60% • Implementarea CI/CD cu GitHub Actions & AWS CodePipeline • Code review și mentoring pentru 6 developeri juniori și mid-level" }, { firma: "Roweb Development", perioada: "2016 – 2020", rol: "Full-Stack Developer", desc: "Livrarea a 40+ proiecte web pentru clienți din EU și US • Stack: React, Vue.js, Node.js, Laravel, PostgreSQL, MySQL • Implementarea arhitecturii REST API și GraphQL • Optimizare SEO și performanță (PageSpeed 90+ scor)" }], educatie: [{ institutie: "Universitatea Politehnica București", perioada: "2012 – 2016", diploma: "Inginer – Calculatoare și Tehnologia Informației" }], competente: ["React & Next.js (expert)", "Node.js & Express", "TypeScript", "AWS (EC2, S3, Lambda, RDS)", "PostgreSQL & MongoDB", "Docker & Kubernetes", "GraphQL & REST API", "Git & CI/CD"], limbi: ["Română (nativă)", "Engleză (C2 – fluent)"], certificari: ["AWS Certified Developer Associate", "MongoDB Certified Developer", "Google Cloud Professional"] } },
  { id: 15, job: "Laravel Developer", color: "#e11d48", icon: "⚡", data: { nume: "Manolescu Victor", titlu: "Laravel / PHP Senior Developer", email: "victor.manolescu@email.ro", telefon: "0718 456 789", oras: "Iași", linkedin: "linkedin.com/in/victor-manolescu-laravel", despre: "Laravel Senior Developer cu 8 ani experiență exclusivă în ecosistemul PHP/Laravel. Expert în arhitecturi REST API scalabile, pachete custom Composer și optimizarea performanței bazelor de date. Contribuitor la Laravel Ecosystem cu pachete descărcate de 50.000+ ori pe Packagist.", experienta: [{ firma: "Evolvice GmbH (Remote – Germania)", perioada: "2021 – Prezent", rol: "Senior Laravel Developer", desc: "Arhitectura și dezvoltarea platformei SaaS pentru 200K utilizatori • Implementarea microserviciilor Laravel cu Queues, Events și WebSockets • Optimizarea query-urilor SQL – reducere timp execuție cu 70% • Publicarea a 3 pachete Composer cu 50K+ instalări totale" }, { firma: "Arnia Software Iași", perioada: "2015 – 2021", rol: "PHP/Laravel Developer", desc: "Livrarea a 60+ proiecte Laravel pentru clienți din UK, US, Canada • Implementarea arhitecturii DDD și CQRS în aplicații enterprise • Integrări cu Stripe, PayPal, Twilio, Pusher, AWS S3 • TDD cu PHPUnit și Pest – coverage 85%+" }], educatie: [{ institutie: "Universitatea Alexandru Ioan Cuza Iași", perioada: "2011 – 2015", diploma: "Licență – Informatică" }], competente: ["Laravel 10/11 (expert)", "PHP 8.x & Composer", "REST API & GraphQL", "MySQL & Redis optimization", "Vue.js & Alpine.js", "AWS & Laravel Forge", "PHPUnit & Pest TDD", "Docker & CI/CD"], limbi: ["Română (nativă)", "Engleză (C2 – technical fluent)"], certificari: ["Zend PHP Certified Engineer", "AWS Certified Developer", "Laracasts Pro – 500+ lecții"] } },
  { id: 16, job: "PHP Developer", color: "#7c3aed", icon: "🐘", data: { nume: "Diaconu Radu", titlu: "PHP Backend Developer", email: "radu.diaconu@email.ro", telefon: "0729 567 890", oras: "Cluj-Napoca", linkedin: "linkedin.com/in/radu-diaconu-php", despre: "PHP Backend Developer cu 6 ani experiență în dezvoltarea sistemelor backend complexe și API-uri RESTful. Expert în arhitecturi OOP, design patterns și optimizarea performanței. Experiență solidă cu Symfony, Yii2 și integrări cu servicii terțe. Orientat spre cod curat, testabil și mentenabil.", experienta: [{ firma: "NTT Data Romania", perioada: "2020 – Prezent", rol: "Senior PHP Developer", desc: "Dezvoltarea și mentenanța sistemelor backend pentru client bancar (top 5 EU) • Arhitectura API-urilor RESTful consumate de 500K+ utilizatori • Implementarea OAuth 2.0, JWT și securizarea endpoints-urilor • Code quality: SonarQube Grade A, code coverage 80%+" }, { firma: "Tremend Software Consulting", perioada: "2017 – 2020", rol: "PHP Developer", desc: "Backend development Symfony 4/5 pentru platforme e-commerce • Integrare payment gateways: Stripe, PayU, Netopia • Optimizare Doctrine ORM – reducere queries cu 45% • Implementarea Elasticsearch pentru căutare full-text" }], educatie: [{ institutie: "Universitatea Tehnică Cluj-Napoca", perioada: "2013 – 2017", diploma: "Licență – Calculatoare și Sisteme Informatice" }], competente: ["PHP 8.x OOP (expert)", "Symfony 5/6 & Doctrine", "MySQL & PostgreSQL", "Elasticsearch & Redis", "REST API & OpenAPI", "PHPUnit & Behat", "Docker & Kubernetes", "Git & GitLab CI/CD"], limbi: ["Română (nativă)", "Engleză (C1 – technical)"], certificari: ["Symfony Certification", "Zend PHP Engineer Certification", "AWS Solutions Architect Associate"] } },
  { id: 17, job: "Programator", color: "#065f46", icon: "👨‍💻", data: { nume: "Ene Sebastian", titlu: "Software Engineer / Programator", email: "sebastian.ene@email.ro", telefon: "0740 678 901", oras: "București", linkedin: "linkedin.com/in/sebastian-ene-dev", despre: "Software Engineer cu 5 ani experiență în dezvoltarea aplicațiilor enterprise. Polivalent în Python, Java și Go, cu experiență în sisteme distribuite și machine learning. Absolvent cu mențiune al Politehnicii București, contribuitor open-source activ și speaker la conferințe tech locale.", experienta: [{ firma: "ING Tech Romania", perioada: "2021 – Prezent", rol: "Software Engineer", desc: "Dezvoltarea sistemelor backend pentru aplicații banking cu 2M+ utilizatori • Implementarea microserviciilor în Java Spring Boot & Go • Machine learning pipeline pentru detecția fraudelor – reducere cu 40% • Tech lead pentru echipă de 5 ingineri în proiecte agile" }, { firma: "Adobe Romania", perioada: "2018 – 2021", rol: "Junior/Mid Software Engineer", desc: "Contribuții la platforma Adobe Experience Manager • Optimizarea algoritmilor de procesare imagini – speedup 3x • Implementarea unit și integration tests – coverage 85% • Participarea la hackathoane interne – 2 premii câștigate" }], educatie: [{ institutie: "Universitatea Politehnica București", perioada: "2014 – 2018", diploma: "Inginer – Calculatoare (Medie 9.75 – Cu Mențiune)" }], competente: ["Python (Django, FastAPI)", "Java Spring Boot", "Go (Golang)", "Kubernetes & Docker", "Apache Kafka", "PostgreSQL & Redis", "Machine Learning (TensorFlow)", "Algoritmi & Structuri de Date"], limbi: ["Română (nativă)", "Engleză (C2 – fluent)", "Germană (A2)"], certificari: ["Google Professional Cloud Developer", "Oracle Java Certified Professional", "Coursera: Deep Learning Specialization – Andrew Ng"] } },
  { id: 18, job: "Social Media Manager", color: "#e11d74", icon: "📱", data: { nume: "Florescu Ioana", titlu: "Social Media Manager / Digital Content Creator", email: "ioana.florescu@email.ro", telefon: "0731 112 233", oras: "București", linkedin: "linkedin.com/in/ioana-florescu-smm", despre: "Social Media Manager cu 5 ani experiență în crearea și gestionarea brandurilor digitale pe Instagram, TikTok, Facebook și LinkedIn. Expert în content strategy, paid social și influencer marketing. Am crescut comunități de la 0 la 150K followeri organici și am generat campanii cu ROAS de 4.8x pentru clienți din e-commerce, beauty și lifestyle.", experienta: [{ firma: "Notino România", perioada: "2022 – Prezent", rol: "Senior Social Media Manager", desc: "Gestionarea canalelor Instagram (280K), TikTok (190K), Facebook (420K) • Creștere organică +85% followeri în 18 luni prin strategie de conținut video-first • Campanii paid social cu buget lunar 60.000 RON – ROAS mediu 4.8x • Coordonarea a 15+ colaborări cu influenceri (nano, micro, macro)" }, { firma: "Agenție iCreativ Digital", perioada: "2019 – 2022", rol: "Social Media Specialist", desc: "Managementul conturilor social media pentru 12 branduri simultan • Crearea calendarelor editoriale și producerea conținutului (foto, video, Reels, TikTok) • Raportare lunară KPI: reach, engagement rate, CTR, conversii • Implementare strategii de creștere organică – medie +3.200 followeri/lună per cont" }], educatie: [{ institutie: "Universitatea din București", perioada: "2015 – 2019", diploma: "Licență – Marketing & Comunicare" }], competente: ["Instagram & TikTok Strategy", "Meta Ads Manager (avansat)", "Content Creation & Reels", "Canva & Adobe Express", "Influencer Marketing", "Google Analytics 4", "Copywriting & Storytelling", "Community Management"], limbi: ["Română (nativă)", "Engleză (C1 – fluent)", "Italiană (A2)"], certificari: ["Meta Certified Digital Marketing Associate", "Google Analytics Individual Qualification", "HubSpot Social Media Certification – 2023", "Curs TikTok Ads for Business – 2023"] } },
];

const DESIGN_PRESETS = [
  { id: 1, key: "nordic-slate", name: "Nordic Slate", variant: "classic", color: "#1f4fd6", icon: "🧭", tagline: "Clean, clar, foarte ATS-friendly", previewStarterId: 1 },
  { id: 2, key: "executive-pulse", name: "Executive Pulse", variant: "executive", color: "#0f766e", icon: "🏛️", tagline: "Serios, premium, pentru roluri corporate", previewStarterId: 2 },
  { id: 3, key: "soft-column", name: "Soft Column", variant: "soft", color: "#0ea5e9", icon: "🌿", tagline: "Luminos si echilibrat, usor de parcurs", previewStarterId: 3 },
  { id: 4, key: "atlas-sidebar", name: "Atlas Sidebar", variant: "sidebar", color: "#dc2626", icon: "🗂️", tagline: "Sidebar puternic, personalitate vizuala", previewStarterId: 4 },
  { id: 5, key: "ivory-serif", name: "Ivory Serif", variant: "serif", color: "#b45309", icon: "🖋️", tagline: "Editorial, elegant, aerisit", previewStarterId: 5 },
  { id: 6, key: "mono-grid", name: "Mono Grid", variant: "minimal", color: "#7c3aed", icon: "📐", tagline: "Minimal modern, focus pe informatie", previewStarterId: 6 },
  { id: 7, key: "cobalt-line", name: "Cobalt Line", variant: "classic", color: "#2563eb", icon: "📎", tagline: "Accent clar si ritm bun pe sectiuni", previewStarterId: 7 },
  { id: 8, key: "amber-board", name: "Amber Board", variant: "executive", color: "#d97706", icon: "📊", tagline: "Boardroom look pentru senioritate", previewStarterId: 8 },
  { id: 9, key: "mint-balance", name: "Mint Balance", variant: "soft", color: "#059669", icon: "🍃", tagline: "Prietenos, modern, foarte lizibil", previewStarterId: 9 },
  { id: 10, key: "ruby-rail", name: "Ruby Rail", variant: "sidebar", color: "#be123c", icon: "🚇", tagline: "Structura ferma si contrast puternic", previewStarterId: 10 },
  { id: 11, key: "linen-story", name: "Linen Story", variant: "serif", color: "#92400e", icon: "📚", tagline: "Clasic, cald, inspirat editorial", previewStarterId: 11 },
  { id: 12, key: "graph-paper", name: "Graph Paper", variant: "minimal", color: "#0891b2", icon: "🧩", tagline: "Curat, tehnic, fara zgomot vizual", previewStarterId: 12 },
  { id: 13, key: "ocean-brief", name: "Ocean Brief", variant: "classic", color: "#0f766e", icon: "🌊", tagline: "Business modern cu accent calm", previewStarterId: 13 },
  { id: 14, key: "charcoal-deck", name: "Charcoal Deck", variant: "executive", color: "#334155", icon: "🗃️", tagline: "Elegant si sobru pentru decizie rapida", previewStarterId: 14 },
  { id: 15, key: "sage-panel", name: "Sage Panel", variant: "soft", color: "#65a30d", icon: "🌱", tagline: "Aerisit, calm, modern si proaspat", previewStarterId: 15 },
  { id: 16, key: "violet-edge", name: "Violet Edge", variant: "sidebar", color: "#7c3aed", icon: "🪄", tagline: "Mai indraznet, cu margine vizuala clara", previewStarterId: 16 },
  { id: 17, key: "sandstone-classic", name: "Sandstone Classic", variant: "serif", color: "#a16207", icon: "🏺", tagline: "Clasic premium, potrivit pentru consultanti", previewStarterId: 17 },
  { id: 18, key: "neon-brief", name: "Neon Brief", variant: "minimal", color: "#06b6d4", icon: "⚡", tagline: "Sharp, tech-first, foarte direct", previewStarterId: 18 },
];

const designCatalog = DESIGN_PRESETS.map((preset) => {
  const previewStarter =
    cvTemplates.find((template) => template.id === preset.previewStarterId) ||
    cvTemplates[0];

  return {
    ...preset,
    previewData: previewStarter?.data || null,
    previewRole: previewStarter?.job || "Rol",
  };
});

function createEmptyCvData(roleName) {
  const normalizedRole = normalizeString(roleName, 160);

  return {
    nume: "",
    titlu: normalizedRole,
    email: "",
    telefon: "",
    oras: "",
    linkedin: "",
    despre: "",
    experienta: [],
    educatie: [],
    competente: [],
    limbi: [],
    certificari: [],
  };
}

function getDesignVariantLabel(variant, lang = "ro") {
  return getLocalizedVariantLabel(variant, lang);
}

const DESIGN_THEME_OVERRIDES = {
  "nordic-slate": {
    headerBackground: "linear-gradient(135deg, #183a8a 0%, #1f4fd6 56%, #60a5fa 100%)",
    shellShadow: "0 24px 60px rgba(31,79,214,0.14)",
    photoShape: "circle",
    contactChipMode: "glass",
  },
  "executive-pulse": {
    headerBackground: "linear-gradient(135deg, #0b1220 0%, #0f172a 42%, #0f766e 100%)",
    shellRadius: 14,
    shellShadow: "0 24px 58px rgba(15,118,110,0.16)",
    photoShape: "square",
    contactChipMode: "outline",
  },
  "soft-column": {
    headerBackground: "radial-gradient(circle at top left, #ffffff 0%, #d9fbff 28%, #ffffff 76%)",
    shellRadius: 26,
    shellShadow: "0 20px 52px rgba(14,165,233,0.10)",
    photoShape: "rounded",
    contactChipMode: "soft",
  },
  "atlas-sidebar": {
    headerBackground: "linear-gradient(135deg, #0f172a 0%, #1f2937 70%, #dc2626 160%)",
    sidebarBackground: "repeating-linear-gradient(180deg, rgba(220,38,38,0.12) 0px, rgba(220,38,38,0.12) 28px, rgba(255,255,255,0.0) 28px, rgba(255,255,255,0.0) 56px), linear-gradient(180deg, rgba(220,38,38,0.16), rgba(220,38,38,0.04))",
    shellRadius: 18,
    shellShadow: "0 22px 54px rgba(220,38,38,0.12)",
    photoShape: "square",
    contactChipMode: "glass",
  },
  "ivory-serif": {
    documentBackground: "#fffaf2",
    headerBackground: "linear-gradient(180deg, #f9f1e2 0%, #fffaf2 100%)",
    shellRadius: 10,
    shellShadow: "0 20px 46px rgba(180,83,9,0.10)",
    photoShape: "rounded",
    contactChipMode: "outline",
  },
  "mono-grid": {
    documentBackground: "#ffffff",
    headerBackground: "linear-gradient(180deg, #ffffff 0%, #ffffff 72%, rgba(124,58,237,0.08) 100%)",
    shellRadius: 8,
    shellShadow: "0 18px 44px rgba(124,58,237,0.10)",
    photoShape: "square",
    contactChipMode: "outline",
  },
  "cobalt-line": {
    headerBackground: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 65%, #60a5fa 100%)",
    shellShadow: "0 22px 52px rgba(37,99,235,0.14)",
    photoShape: "circle",
    contactChipMode: "glass",
  },
  "amber-board": {
    headerBackground: "linear-gradient(135deg, #1c1917 0%, #292524 48%, #d97706 130%)",
    shellRadius: 12,
    shellShadow: "0 24px 56px rgba(217,119,6,0.16)",
    photoShape: "soft-square",
    contactChipMode: "outline",
  },
  "mint-balance": {
    headerBackground: "radial-gradient(circle at top left, #ffffff 0%, #dcfce7 24%, #ffffff 74%)",
    sidebarBackground: "linear-gradient(180deg, rgba(5,150,105,0.14), rgba(255,255,255,0.0) 68%)",
    shellRadius: 28,
    shellShadow: "0 20px 50px rgba(5,150,105,0.10)",
    photoShape: "circle",
    contactChipMode: "soft",
  },
  "ruby-rail": {
    headerBackground: "linear-gradient(135deg, #111827 0%, #4c0519 42%, #be123c 100%)",
    sidebarBackground: "linear-gradient(180deg, rgba(190,18,60,0.18), rgba(190,18,60,0.04))",
    shellRadius: 20,
    shellShadow: "0 22px 54px rgba(190,18,60,0.14)",
    photoShape: "square",
    contactChipMode: "glass",
  },
  "linen-story": {
    documentBackground: "#fffdf8",
    headerBackground: "linear-gradient(180deg, #fbf2e7 0%, #fffdf8 100%)",
    shellRadius: 6,
    shellShadow: "0 18px 42px rgba(146,64,14,0.10)",
    photoShape: "rounded",
    contactChipMode: "soft",
  },
  "graph-paper": {
    documentBackground: "#fcfeff",
    headerBackground: "linear-gradient(180deg, #ffffff 0%, #ffffff 72%, rgba(8,145,178,0.08) 100%)",
    shellRadius: 6,
    shellShadow: "0 18px 42px rgba(8,145,178,0.10)",
    photoShape: "square",
    contactChipMode: "outline",
  },
  "ocean-brief": {
    headerBackground: "linear-gradient(135deg, #115e59 0%, #0f766e 54%, #5eead4 140%)",
    shellShadow: "0 22px 52px rgba(15,118,110,0.14)",
    photoShape: "circle",
    contactChipMode: "glass",
  },
  "charcoal-deck": {
    headerBackground: "linear-gradient(135deg, #0f172a 0%, #1f2937 56%, #334155 100%)",
    shellRadius: 12,
    shellShadow: "0 22px 52px rgba(51,65,85,0.16)",
    photoShape: "soft-square",
    contactChipMode: "outline",
  },
  "sage-panel": {
    headerBackground: "radial-gradient(circle at top left, #ffffff 0%, #ecfccb 26%, #ffffff 74%)",
    sidebarBackground: "linear-gradient(180deg, rgba(101,163,13,0.14), rgba(255,255,255,0.0) 70%)",
    shellRadius: 30,
    shellShadow: "0 20px 50px rgba(101,163,13,0.10)",
    photoShape: "rounded",
    contactChipMode: "soft",
  },
  "violet-edge": {
    headerBackground: "linear-gradient(135deg, #2e1065 0%, #7c3aed 55%, #c4b5fd 100%)",
    sidebarBackground: "linear-gradient(180deg, rgba(124,58,237,0.18), rgba(124,58,237,0.04))",
    shellRadius: 22,
    shellShadow: "0 22px 54px rgba(124,58,237,0.16)",
    photoShape: "square",
    contactChipMode: "glass",
  },
  "sandstone-classic": {
    documentBackground: "#fffaf5",
    headerBackground: "linear-gradient(180deg, #f6ead8 0%, #fffaf5 100%)",
    shellRadius: 8,
    shellShadow: "0 18px 42px rgba(161,98,7,0.10)",
    photoShape: "rounded",
    contactChipMode: "outline",
  },
  "neon-brief": {
    documentBackground: "#fbfeff",
    headerBackground: "linear-gradient(180deg, #ffffff 0%, #ffffff 68%, rgba(6,182,212,0.08) 100%)",
    shellRadius: 10,
    shellShadow: "0 18px 42px rgba(6,182,212,0.10)",
    photoShape: "soft-square",
    contactChipMode: "outline",
  },
};

function getDesignTheme(design) {
  const color = design?.color || "#1a56db";
  let baseTheme;

  switch (design?.variant) {
    case "executive":
      baseTheme = {
        fontFamily: "'Segoe UI', Arial, sans-serif",
        documentBackground: "#ffffff",
        shellBorder: `1px solid ${color}18`,
        shellShadow: "0 20px 48px rgba(15,23,42,0.08)",
        shellRadius: 18,
        headerBackground: "linear-gradient(135deg, #0f172a, #1e293b)",
        headerTextColor: "#ffffff",
        headerSecondaryColor: "rgba(255,255,255,0.82)",
        headerAlign: "left",
        singleColumn: false,
        gridTemplateColumns: "1fr 250px",
        sidebarFirst: false,
        sidebarBackground: "#f8fafc",
        sidebarBorder: `1px solid ${color}1f`,
        sectionMode: "boxed",
        cardSections: true,
        skillMode: "chips",
        bodyPaddingMain: "22px 24px 22px 32px",
        bodyPaddingSide: "22px 18px",
        photoBorder: "3px solid rgba(255,255,255,0.25)",
        photoShape: "soft-square",
        contactChipMode: "glass",
      };
      break;
    case "soft":
      baseTheme = {
        fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
        documentBackground: "#ffffff",
        shellBorder: `1px solid ${color}20`,
        shellShadow: "0 18px 44px rgba(15,23,42,0.06)",
        shellRadius: 24,
        headerBackground: `linear-gradient(135deg, ${color}22, #ffffff 72%)`,
        headerTextColor: "#0f172a",
        headerSecondaryColor: "#475569",
        headerAlign: "left",
        singleColumn: false,
        gridTemplateColumns: "1fr 250px",
        sidebarFirst: false,
        sidebarBackground: `${color}10`,
        sidebarBorder: `1px solid ${color}22`,
        sectionMode: "pill",
        cardSections: true,
        skillMode: "chips",
        bodyPaddingMain: "22px 24px 22px 32px",
        bodyPaddingSide: "22px 18px",
        photoBorder: `3px solid ${color}33`,
        photoShape: "rounded",
        contactChipMode: "soft",
      };
      break;
    case "sidebar":
      baseTheme = {
        fontFamily: "'Segoe UI', Arial, sans-serif",
        documentBackground: "#ffffff",
        shellBorder: `1px solid ${color}1a`,
        shellShadow: "0 18px 44px rgba(15,23,42,0.08)",
        shellRadius: 18,
        headerBackground: "linear-gradient(135deg, #0f172a, #1f2937)",
        headerTextColor: "#ffffff",
        headerSecondaryColor: "rgba(255,255,255,0.82)",
        headerAlign: "left",
        singleColumn: false,
        gridTemplateColumns: "250px 1fr",
        sidebarFirst: true,
        sidebarBackground: `linear-gradient(180deg, ${color}18, ${color}08)`,
        sidebarBorder: `1px solid ${color}22`,
        sectionMode: "line",
        cardSections: false,
        skillMode: "bars",
        bodyPaddingMain: "22px 28px",
        bodyPaddingSide: "22px 18px",
        photoBorder: "3px solid rgba(255,255,255,0.3)",
        photoShape: "square",
        contactChipMode: "glass",
      };
      break;
    case "serif":
      baseTheme = {
        fontFamily: "Georgia, 'Times New Roman', serif",
        documentBackground: "#fffdf7",
        shellBorder: `1px solid ${color}1f`,
        shellShadow: "0 18px 42px rgba(15,23,42,0.06)",
        shellRadius: 8,
        headerBackground: "#f6efe4",
        headerTextColor: "#111827",
        headerSecondaryColor: "#6b7280",
        headerAlign: "center",
        singleColumn: true,
        gridTemplateColumns: "1fr",
        sidebarFirst: false,
        sidebarBackground: "#ffffff",
        sidebarBorder: `1px solid ${color}22`,
        sectionMode: "boxed",
        cardSections: true,
        skillMode: "chips",
        bodyPaddingMain: "24px 34px 28px",
        bodyPaddingSide: "0",
        photoBorder: `3px solid ${color}2d`,
        photoShape: "rounded",
        contactChipMode: "outline",
      };
      break;
    case "minimal":
      baseTheme = {
        fontFamily: "'Arial', sans-serif",
        documentBackground: "#ffffff",
        shellBorder: `1px solid ${color}16`,
        shellShadow: "0 16px 38px rgba(15,23,42,0.06)",
        shellRadius: 10,
        headerBackground: `linear-gradient(180deg, #ffffff 0%, #ffffff 72%, ${color}12 100%)`,
        headerTextColor: "#0f172a",
        headerSecondaryColor: "#475569",
        headerAlign: "center",
        singleColumn: true,
        gridTemplateColumns: "1fr",
        sidebarFirst: false,
        sidebarBackground: "#ffffff",
        sidebarBorder: `1px solid ${color}18`,
        sectionMode: "pill",
        cardSections: false,
        skillMode: "chips",
        bodyPaddingMain: "24px 34px 28px",
        bodyPaddingSide: "0",
        photoBorder: `3px solid ${color}22`,
        photoShape: "soft-square",
        contactChipMode: "outline",
      };
      break;
    case "classic":
    default:
      baseTheme = {
        fontFamily: "'Segoe UI', Arial, sans-serif",
        documentBackground: "#ffffff",
        shellBorder: `1px solid ${color}16`,
        shellShadow: "0 18px 44px rgba(15,23,42,0.07)",
        shellRadius: 18,
        headerBackground: `linear-gradient(135deg, ${color}, ${color}cc)`,
        headerTextColor: "#ffffff",
        headerSecondaryColor: "rgba(255,255,255,0.86)",
        headerAlign: "left",
        singleColumn: false,
        gridTemplateColumns: "1fr 250px",
        sidebarFirst: false,
        sidebarBackground: "#f7f8fa",
        sidebarBorder: `1px solid ${color}14`,
        sectionMode: "line",
        cardSections: false,
        skillMode: "bars",
        bodyPaddingMain: "22px 24px 22px 32px",
        bodyPaddingSide: "22px 18px",
        photoBorder: "3px solid rgba(255,255,255,0.34)",
        photoShape: "circle",
        contactChipMode: "glass",
      };
      break;
  }

  return {
    ...baseTheme,
    ...(DESIGN_THEME_OVERRIDES[design?.key] || {}),
  };
}

function getPhotoRadius(shape) {
  switch (shape) {
    case "square":
      return 18;
    case "soft-square":
      return 24;
    case "rounded":
      return 28;
    case "circle":
    default:
      return "50%";
  }
}

// ─── EDITABLE FIELD ───────────────────────────────────────────────────────────
function EF({ value, onChange, multiline, style, placeholder }) {
  const [active, setActive] = useState(false);
  const ref = useRef();
  useEffect(() => { if (active && ref.current) ref.current.focus(); }, [active]);
  const safeValue = value ?? "";
  const base = { ...style, outline: "none", background: active ? "rgba(253,224,71,0.28)" : "transparent", border: active ? "1.5px dashed #f59e0b" : "1.5px dashed transparent", borderRadius: 3, padding: "1px 4px", transition: "all 0.15s", cursor: "text", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", color: "inherit", letterSpacing: "inherit", lineHeight: "inherit" };
  if (multiline) return <textarea ref={ref} value={safeValue} placeholder={placeholder} onChange={e => onChange(e.target.value)} onFocus={() => setActive(true)} onBlur={() => setActive(false)} rows={4} style={{ ...base, width: "100%", resize: "vertical", display: "block", boxSizing: "border-box" }} />;
  return <input ref={ref} type="text" value={safeValue} placeholder={placeholder} onChange={e => onChange(e.target.value)} onFocus={() => setActive(true)} onBlur={() => setActive(false)} style={{ ...base, width: "100%", display: "inline-block", boxSizing: "border-box" }} />;
}

function EditableText({ value, onChange, style, placeholder, editMode }) {
  return editMode
    ? <EF value={value} onChange={onChange} style={style} placeholder={placeholder} />
    : <span style={style}>{value}</span>;
}

function EditableTextMulti({ value, onChange, style, placeholder, editMode }) {
  return editMode
    ? <EF value={value} onChange={onChange} multiline style={style} placeholder={placeholder} />
    : <span style={style}>{value}</span>;
}

function SectionTitle({ title, color, mode, compact }) {
  if (mode === "pill") {
    return (
      <div style={{ marginBottom: compact ? 10 : 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", background: `${color}14`, color, borderRadius: 999, padding: compact ? "4px 10px" : "5px 12px", fontSize: compact ? 10.5 : 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {title}
        </span>
      </div>
    );
  }

  if (mode === "boxed") {
    return (
      <div style={{ marginBottom: compact ? 10 : 12 }}>
        <span style={{ display: "inline-block", border: `1.5px solid ${color}`, color, padding: compact ? "4px 8px" : "5px 10px", borderRadius: 6, fontSize: compact ? 10.5 : 11.5, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase", background: "#fff" }}>
          {title}
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: compact ? 10 : 12 }}>
      <h3 style={{ margin: 0, fontSize: compact ? 10.8 : 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: compact ? 1 : 1.2, borderBottom: `2px solid ${color}`, paddingBottom: 5 }}>
        {title}
      </h3>
    </div>
  );
}

function DocumentSection({ title, color, theme, compact, children }) {
  const content = theme.cardSections
    ? (
      <div style={{ background: "#fff", border: `1px solid ${color}18`, borderRadius: 14, padding: compact ? "12px" : "14px 15px", boxShadow: "0 6px 16px rgba(15,23,42,0.04)" }}>
        {children}
      </div>
    )
    : children;

  return (
    <div style={{ marginBottom: compact ? 16 : 20 }}>
      <SectionTitle title={title} color={color} mode={theme.sectionMode} compact={compact} />
      {content}
    </div>
  );
}

// ─── CV DOCUMENT ──────────────────────────────────────────────────────────────
function CVDocument({ cvData, setCvData, design, photoUrl, onPhotoClick, editMode, lang }) {
  const copy = getCopy(lang);
  const color = design?.color || "#1a56db";
  const theme = getDesignTheme(design);
  const darkHeader = theme.headerTextColor === "#ffffff";
  const photoRadius = getPhotoRadius(theme.photoShape);
  const set = (k, v) => setCvData(p => ({ ...p, [k]: v }));
  const setN = (arr, i, f, v) => setCvData(p => { const a = JSON.parse(JSON.stringify(p[arr])); a[i][f] = v; return { ...p, [arr]: a }; });
  const setL = (arr, i, v) => setCvData(p => { const a = [...p[arr]]; a[i] = v; return { ...p, [arr]: a }; });
  const labels = copy.document.sections;

  const contactEntries = [
    { key: "email", icon: "📧", value: cvData.email },
    { key: "telefon", icon: "📞", value: cvData.telefon },
    { key: "oras", icon: "📍", value: cvData.oras },
    { key: "linkedin", icon: "🔗", value: cvData.linkedin },
  ];

  const contactChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    border: theme.contactChipMode === "outline" ? `1px solid ${darkHeader ? "rgba(255,255,255,0.22)" : `${color}35`}` : "1px solid transparent",
    background:
      theme.contactChipMode === "outline"
        ? darkHeader ? "transparent" : "#ffffff"
        : darkHeader
          ? "rgba(255,255,255,0.14)"
          : theme.contactChipMode === "soft"
            ? `${color}10`
            : `${color}14`,
    color: darkHeader ? theme.headerSecondaryColor : "#334155",
    fontSize: 11.5,
    boxShadow: theme.contactChipMode === "soft" ? `0 6px 14px ${color}12` : "none",
  };

  const itemSurfaceStyle = theme.cardSections
    ? { background: "#fff", border: `1px solid ${color}14`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)" }
    : null;

  const renderSkills = (compact = false) => (
    <DocumentSection title={labels.comp} color={color} theme={theme} compact={compact}>
      {cvData.competente.map((skill, index) => {
        const skillWidth = getSkillWidth(skill);

        if (theme.skillMode === "chips") {
          return (
            <div key={index} style={{ display: "inline-flex", flexDirection: "column", marginRight: 8, marginBottom: 8, verticalAlign: "top" }}>
              <span style={{ display: "inline-flex", alignItems: "center", background: `${color}12`, color, borderRadius: 999, padding: "5px 10px", fontSize: 11.5, fontWeight: 600 }}>
                {editMode ? <EF value={skill} onChange={value => setL("competente", index, value)} style={{ fontSize: 11.5, color }} /> : skill}
              </span>
              {editMode && (
                <button
                  onClick={() => setCvData(p => ({ ...p, competente: p.competente.filter((_, skillIndex) => skillIndex !== index) }))}
                  style={{ marginTop: 4, border: "none", background: "#fee2e2", color: "#b91c1c", fontSize: 10.5, padding: "1px 5px", borderRadius: 6, cursor: "pointer", alignSelf: "flex-start" }}
                >
                  {copy.document.delete}
                </button>
              )}
            </div>
          );
        }

        return (
          <div key={index} style={{ marginBottom: 9 }}>
            {editMode ? <EF value={skill} onChange={value => setL("competente", index, value)} style={{ fontSize: 12, fontWeight: 500, color: "#334155" }} /> : <span style={{ fontSize: 12, fontWeight: 500, color: "#334155" }}>{skill}</span>}
            {editMode && (
              <button
                onClick={() => setCvData(p => ({ ...p, competente: p.competente.filter((_, skillIndex) => skillIndex !== index) }))}
                style={{ marginTop: 4, border: "none", background: "#fee2e2", color: "#b91c1c", fontSize: 10.5, padding: "1px 5px", borderRadius: 6, cursor: "pointer" }}
              >
                {copy.document.delete}
              </button>
            )}
            <div style={{ height: 3.5, background: "#e2e8f0", borderRadius: 999, marginTop: 3 }}>
              <div style={{ height: "100%", width: `${skillWidth}%`, background: color, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}
      {editMode && (
        <button
          onClick={() => setCvData(p => ({ ...p, competente: [...p.competente, ""] }))}
          style={{ marginTop: 4, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#475569", fontSize: 11, padding: "5px 7px", borderRadius: 7, cursor: "pointer" }}
        >
          {copy.document.addSkill}
        </button>
      )}
    </DocumentSection>
  );

  const renderLanguages = (compact = false) => (
    <DocumentSection title={labels.limbi} color={color} theme={theme} compact={compact}>
      {cvData.limbi.map((language, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
          {editMode ? <EF value={language} onChange={value => setL("limbi", index, value)} style={{ fontSize: 12.5, color: "#555" }} /> : <span style={{ fontSize: 12.5, color: "#555" }}>{language}</span>}
          {editMode && (
            <button
              onClick={() => setCvData(p => ({ ...p, limbi: p.limbi.filter((_, languageIndex) => languageIndex !== index) }))}
              style={{ border: "none", background: "#fee2e2", color: "#b91c1c", fontSize: 10.5, padding: "1px 5px", borderRadius: 6, cursor: "pointer" }}
            >
              {copy.document.delete}
            </button>
          )}
        </div>
      ))}
      {editMode && (
        <button
          onClick={() => setCvData(p => ({ ...p, limbi: [...p.limbi, ""] }))}
          style={{ marginTop: 4, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#475569", fontSize: 11, padding: "5px 7px", borderRadius: 7, cursor: "pointer" }}
        >
          {copy.document.addLanguage}
        </button>
      )}
    </DocumentSection>
  );

  const renderCertifications = (compact = false) => (
    <DocumentSection title={labels.cert} color={color} theme={theme} compact={compact}>
      {cvData.certificari.map((certificate, index) => (
        <div key={index} style={{ marginBottom: 7, padding: "6px 9px", background: theme.cardSections ? `${color}08` : "#fff", borderRadius: 7, borderLeft: `3px solid ${color}` }}>
          {editMode ? <EF value={certificate} onChange={value => setL("certificari", index, value)} style={{ fontSize: 11.5, color: "#555" }} /> : <span style={{ fontSize: 11.5, color: "#555" }}>{certificate}</span>}
          {editMode && (
            <button
              onClick={() => setCvData(p => ({ ...p, certificari: p.certificari.filter((_, certificateIndex) => certificateIndex !== index) }))}
              style={{ marginTop: 4, border: "none", background: "#fee2e2", color: "#b91c1c", fontSize: 10.5, padding: "1px 5px", borderRadius: 6, cursor: "pointer" }}
            >
              {copy.document.delete}
            </button>
          )}
        </div>
      ))}
      {editMode && (
        <button
          onClick={() => setCvData(p => ({ ...p, certificari: [...p.certificari, ""] }))}
          style={{ marginTop: 4, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#475569", fontSize: 11, padding: "5px 7px", borderRadius: 7, cursor: "pointer" }}
        >
          {copy.document.addCertification}
        </button>
      )}
    </DocumentSection>
  );

  const sideContent = (
    <>
      {renderSkills(!theme.singleColumn)}
      {renderLanguages(!theme.singleColumn)}
      {renderCertifications(!theme.singleColumn)}
    </>
  );

  const mainContent = (
    <>
      <DocumentSection title={labels.profil} color={color} theme={theme}>
        <EditableTextMulti value={cvData.despre} onChange={value => set("despre", value)} editMode={editMode} style={{ fontSize: 13, lineHeight: 1.7, color: "#444", display: "block", width: "100%" }} placeholder={copy.document.profilePlaceholder} />
      </DocumentSection>

      <DocumentSection title={labels.exp} color={color} theme={theme}>
        {cvData.experienta.map((exp, index) => (
          <div key={index} style={{ marginBottom: 16, ...(itemSurfaceStyle || {}) }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <EditableText value={exp.rol} onChange={value => setN("experienta", index, "rol", value)} editMode={editMode} style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: "#111" }} />
                <EditableText value={exp.firma} onChange={value => setN("experienta", index, "firma", value)} editMode={editMode} style={{ display: "block", color, fontWeight: 600, fontSize: 12.5 }} />
              </div>
              <div style={{ background: color, color: "#fff", padding: "2px 9px", borderRadius: 20, fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
                <EditableText value={exp.perioada} onChange={value => setN("experienta", index, "perioada", value)} editMode={editMode} style={{ color: "#fff" }} />
              </div>
            </div>
            {editMode
              ? <EF value={exp.desc} onChange={value => setN("experienta", index, "desc", value)} multiline style={{ fontSize: 12.5, color: "#555", marginTop: 6 }} placeholder={copy.document.achievementsPlaceholder} />
              : <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{exp.desc.split(" • ").filter(Boolean).map((item, bulletIndex) => <li key={bulletIndex} style={{ fontSize: 12.5, lineHeight: 1.6, color: "#555", marginBottom: 2 }}>{item}</li>)}</ul>}
            {editMode && (
              <button
                onClick={() => setCvData(p => ({ ...p, experienta: p.experienta.filter((_, experienceIndex) => experienceIndex !== index) }))}
                style={{ marginTop: 6, border: "none", background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 6px", borderRadius: 6, cursor: "pointer" }}
              >
                {copy.document.deleteExperience}
              </button>
            )}
          </div>
        ))}
        {editMode && (
        <button
          onClick={() => setCvData(p => ({ ...p, experienta: [...p.experienta, { firma: "", perioada: "", rol: "", desc: "" }] }))}
          style={{ marginTop: 6, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#475569", fontSize: 11.5, padding: "6px 8px", borderRadius: 7, cursor: "pointer" }}
        >
          {copy.document.addExperience}
        </button>
      )}
      </DocumentSection>

      <DocumentSection title={labels.edu} color={color} theme={theme}>
        {cvData.educatie.map((edu, index) => (
          <div key={index} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", ...(itemSurfaceStyle || {}) }}>
            <div style={{ flex: 1 }}>
              <EditableText value={edu.diploma} onChange={value => setN("educatie", index, "diploma", value)} editMode={editMode} style={{ display: "block", fontWeight: 700, fontSize: 13 }} placeholder={copy.document.degreePlaceholder} />
              <EditableText value={edu.institutie} onChange={value => setN("educatie", index, "institutie", value)} editMode={editMode} style={{ display: "block", color, fontSize: 12.5 }} placeholder={copy.document.institutionPlaceholder} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <EditableText value={edu.perioada} onChange={value => setN("educatie", index, "perioada", value)} editMode={editMode} style={{ fontSize: 11.5, color: "#888", whiteSpace: "nowrap" }} placeholder={copy.document.periodPlaceholder} />
              {editMode && (
                <button
                  onClick={() => setCvData(p => ({ ...p, educatie: p.educatie.filter((_, educationIndex) => educationIndex !== index) }))}
                  style={{ border: "none", background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 6px", borderRadius: 6, cursor: "pointer" }}
                >
                  {copy.document.delete}
                </button>
              )}
            </div>
          </div>
        ))}
        {editMode && (
        <button
          onClick={() => setCvData(p => ({ ...p, educatie: [...p.educatie, { institutie: "", perioada: "", diploma: "" }] }))}
          style={{ marginTop: 6, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#475569", fontSize: 11.5, padding: "6px 8px", borderRadius: 7, cursor: "pointer" }}
        >
          {copy.document.addEducation}
        </button>
      )}
      </DocumentSection>

      {theme.singleColumn && sideContent}
    </>
  );

  return (
    <div id="cv-document" className="cv-document" style={{ fontFamily: theme.fontFamily, width: "100%", maxWidth: 794, background: theme.documentBackground, color: "#1a1a1a", border: theme.shellBorder, borderRadius: theme.shellRadius, overflow: "hidden", boxShadow: theme.shellShadow }}>
      <div style={{ background: theme.headerBackground, padding: theme.headerAlign === "center" ? "32px 42px 24px" : "30px 42px 24px", display: "flex", flexDirection: theme.headerAlign === "center" ? "column" : "row", alignItems: "center", justifyContent: theme.headerAlign === "center" ? "center" : "flex-start", gap: 20, textAlign: theme.headerAlign === "center" ? "center" : "left", borderTop: !darkHeader ? `6px solid ${color}` : "none", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: darkHeader ? 0.16 : 0.45, background: design?.variant === "minimal" || design?.variant === "serif" ? "repeating-linear-gradient(90deg, transparent 0px, transparent 34px, rgba(255,255,255,0.5) 34px, rgba(255,255,255,0.5) 35px)" : "radial-gradient(circle at top right, rgba(255,255,255,0.7) 0%, transparent 42%), linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.14) 48%, transparent 85%)", pointerEvents: "none" }} />
        <div onClick={onPhotoClick} style={{ flexShrink: 0, cursor: "pointer" }}>
          {photoUrl
            ? <Image src={photoUrl} alt={copy.document.photoAlt} width={96} height={96} unoptimized style={{ width: 96, height: 96, borderRadius: photoRadius, objectFit: "cover", border: theme.photoBorder, boxShadow: "0 8px 18px rgba(15,23,42,0.08)", position: "relative", zIndex: 1 }} />
            : <div style={{ width: 96, height: 96, borderRadius: photoRadius, background: darkHeader ? "rgba(255,255,255,0.14)" : `${color}12`, border: darkHeader ? "3px dashed rgba(255,255,255,0.4)" : `3px dashed ${color}35`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
                <span style={{ fontSize: 24 }}>📷</span>
                <span style={{ fontSize: 9, color: darkHeader ? "rgba(255,255,255,0.8)" : "#64748b", marginTop: 3 }}>{copy.document.photoPlaceholder}</span>
              </div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
          <EditableText value={cvData.nume} onChange={value => set("nume", value)} editMode={editMode} style={{ display: "block", color: theme.headerTextColor, fontSize: 25, fontWeight: 700, letterSpacing: "-0.3px" }} />
          <EditableText value={cvData.titlu} onChange={value => set("titlu", value)} editMode={editMode} style={{ display: "block", color: theme.headerSecondaryColor, fontSize: 13.5, fontWeight: 500, marginTop: 4 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: theme.headerAlign === "center" ? "center" : "flex-start", marginTop: 12 }}>
            {contactEntries.map((entry) => (
              (editMode || entry.value) ? (
                <span key={entry.key} style={contactChipStyle}>
                  <span>{entry.icon}</span>
                  <EditableText value={entry.value} onChange={value => set(entry.key, value)} editMode={editMode} style={{ color: "inherit" }} />
                </span>
              ) : null
            ))}
          </div>
        </div>
      </div>

      {theme.singleColumn ? (
        <div style={{ padding: theme.bodyPaddingMain }}>
          {mainContent}
        </div>
      ) : (
        <div className="cv-document-grid" style={{ display: "grid", gridTemplateColumns: theme.gridTemplateColumns }}>
          {theme.sidebarFirst && (
            <div style={{ background: theme.sidebarBackground, padding: theme.bodyPaddingSide, borderRight: theme.sidebarBorder }}>
              {sideContent}
            </div>
          )}
          <div style={{ padding: theme.bodyPaddingMain }}>
            {mainContent}
          </div>
          {!theme.sidebarFirst && (
            <div style={{ background: theme.sidebarBackground, padding: theme.bodyPaddingSide, borderLeft: theme.sidebarBorder }}>
              {sideContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoleCard({ profile, onSelect, lang }) {
  const copy = getCopy(lang);
  const [hov, setHov] = useState(false);
  const { data, color, icon } = profile;
  const roleCopy = getStarterRoleCopy(profile, lang);
  const starterData = getStarterRoleData(profile.id, data, lang);

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "#fff", borderRadius: 15, overflow: "hidden", border: `1.5px solid ${hov ? color : "#e8ecf4"}`, boxShadow: hov ? `0 10px 28px ${color}22` : "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.22s", cursor: "pointer" }}>
      <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, padding: "18px 18px 14px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{icon}</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13.5 }}>{starterData.nume}</div>
            <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 11 }}>{roleCopy.job}</div>
          </div>
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 7px", fontSize: 10, color: "#fff", fontWeight: 700 }}>{copy.common.starter}</div>
      </div>
      <div style={{ padding: "13px 17px 17px" }}>
        <h3 style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{roleCopy.title}</h3>
        <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>{roleCopy.summary.slice(0, 96)}...</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 12 }}>
          {roleCopy.chips.map((competence, index) => <span key={index} style={{ padding: "2px 7px", background: `${color}14`, color, borderRadius: 20, fontSize: 10.5, fontWeight: 600 }}>{competence}</span>)}
        </div>
        <button onClick={() => onSelect(profile)} style={{ width: "100%", padding: "9px", borderRadius: 9, background: hov ? color : "#f8fafc", color: hov ? "#fff" : "#374151", border: `1.5px solid ${hov ? color : "#e2e8f0"}`, cursor: "pointer", fontWeight: 700, fontSize: 12.5, transition: "all 0.18s" }}>
          {hov ? copy.roleCard.useRole : copy.roleCard.chooseRole}
        </button>
      </div>
    </div>
  );
}

function CustomRoleCard({ roleName, onSelect, lang }) {
  const copy = getCopy(lang);

  return (
    <button onClick={() => onSelect(roleName)} style={{ width: "100%", textAlign: "left", background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: 16, border: "1.5px solid #0f172a", padding: 20, cursor: "pointer", color: "#fff", boxShadow: "0 18px 40px rgba(15,23,42,0.18)" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, marginBottom: 14 }}>
        <span>{copy.customRoleCard.badge}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 8 }}>
        {copy.customRoleCard.createFor} &quot;{roleName}&quot;
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
        {copy.customRoleCard.subtitle}
      </p>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700 }}>
        <span>{copy.customRoleCard.continue}</span>
        <span>→</span>
      </div>
    </button>
  );
}

function DesignCard({ design, onSelect, lang }) {
  const copy = getCopy(lang);
  const [hov, setHov] = useState(false);
  const preview = getStarterRoleData(design.previewStarterId, design.previewData, lang) || {};
  const theme = getDesignTheme(design);
  const photoRadius = getPhotoRadius(theme.photoShape);
  const isSingleColumn = theme.singleColumn;
  const previewColumns = isSingleColumn ? "1fr" : theme.sidebarFirst ? "72px 1fr" : "1fr 72px";
  const previewSidebarFirst = theme.sidebarFirst && !isSingleColumn;
  const previewRole = getStarterRoleName(design.previewStarterId, design.previewRole, lang);
  const previewLabels = theme.skillMode === "chips" ? copy.designCard.previewProfile : copy.designCard.previewSections;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "#fff", borderRadius: theme.shellRadius, overflow: "hidden", border: `1.5px solid ${hov ? design.color : "#e8ecf4"}`, boxShadow: hov ? `0 12px 32px ${design.color}26` : "0 4px 12px rgba(15,23,42,0.06)", transition: "all 0.22s", cursor: "pointer" }}>
      <div style={{ background: theme.headerBackground, padding: "16px 18px 14px", color: theme.headerTextColor, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: theme.headerTextColor === "#ffffff" ? 0.16 : 0.5, background: isSingleColumn ? "repeating-linear-gradient(90deg, transparent 0px, transparent 30px, rgba(255,255,255,0.46) 30px, rgba(255,255,255,0.46) 31px)" : "radial-gradient(circle at top right, rgba(255,255,255,0.7) 0%, transparent 42%), linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 48%, transparent 85%)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
            <div style={{ width: 42, height: 42, borderRadius: photoRadius, background: theme.headerTextColor === "#ffffff" ? "rgba(255,255,255,0.16)" : `${design.color}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{design.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{design.name}</div>
              <div style={{ fontSize: 11, color: theme.headerSecondaryColor }}>{getDesignVariantLabel(design.variant, lang)}</div>
            </div>
          </div>
          <span style={{ borderRadius: 999, background: theme.headerTextColor === "#ffffff" ? "rgba(255,255,255,0.16)" : `${design.color}14`, padding: "3px 8px", fontSize: 10.5, fontWeight: 700, position: "relative", zIndex: 1 }}>{copy.designCard.optionsCount}</span>
        </div>
        <div style={{ marginTop: 14, background: theme.documentBackground, borderRadius: 14, padding: "10px 12px", position: "relative", zIndex: 1, border: `1px solid ${design.color}18`, color: "#0f172a" }}>
          <div style={{ display: "grid", gridTemplateColumns: previewColumns, minHeight: 86, overflow: "hidden", borderRadius: 10 }}>
            {previewSidebarFirst && <div style={{ background: theme.sidebarBackground, borderRight: theme.sidebarBorder, padding: "8px 7px" }}>
              <div style={{ width: 28, height: 28, borderRadius: photoRadius, background: `${design.color}16`, marginBottom: 8 }} />
              {["100%", "78%", "66%"].map((width, index) => <div key={index} style={{ height: 4, width, background: `${design.color}${index === 0 ? "55" : "22"}`, borderRadius: 999, marginBottom: 6 }} />)}
            </div>}
            <div style={{ padding: "8px 10px", background: theme.documentBackground }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a" }}>{preview.nume || copy.designCard.previewName}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{previewRole}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
                {previewLabels.map((label) => (
                  <span key={label} style={{ padding: "2px 6px", background: theme.skillMode === "chips" ? `${design.color}14` : "#f1f5f9", color: theme.skillMode === "chips" ? design.color : "#64748b", borderRadius: theme.sectionMode === "boxed" ? 6 : 999, fontSize: 9.5, fontWeight: 700 }}>
                    {label}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                {["72%", "48%", "86%", "60%"].map((width, index) => <div key={index} style={{ height: 3, width, background: index === 0 ? `${design.color}` : `${design.color}33`, borderRadius: 999, marginBottom: 4 }} />)}
              </div>
            </div>
            {!previewSidebarFirst && !isSingleColumn && <div style={{ background: theme.sidebarBackground, borderLeft: theme.sidebarBorder, padding: "8px 7px" }}>
              <div style={{ width: "100%", height: 7, borderRadius: 999, background: `${design.color}24`, marginBottom: 8 }} />
              {["88%", "64%", "76%"].map((width, index) => <div key={index} style={{ height: 4, width, background: `${design.color}${index === 0 ? "55" : "22"}`, borderRadius: 999, marginBottom: 6 }} />)}
            </div>}
          </div>
        </div>
      </div>
      <div style={{ padding: "14px 17px 17px" }}>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#475569", lineHeight: 1.6 }}>{getLocalizedDesignTagline(design, lang)}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <span style={{ padding: "3px 8px", background: `${design.color}12`, color: design.color, borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>{getDesignVariantLabel(design.variant, lang)}</span>
          <span style={{ padding: "3px 8px", background: "#f8fafc", color: "#64748b", borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>{previewRole || copy.designCard.previewFallback}</span>
        </div>
        <button onClick={() => onSelect(design)} style={{ width: "100%", padding: "10px", borderRadius: 10, background: hov ? design.color : "#f8fafc", color: hov ? "#fff" : "#374151", border: `1.5px solid ${hov ? design.color : "#e2e8f0"}`, cursor: "pointer", fontWeight: 700, fontSize: 12.5, transition: "all 0.18s" }}>
          {hov ? copy.designCard.choose : copy.designCard.preview}
        </button>
      </div>
    </div>
  );
}

function LanguageSwitch({ lang, onChange }) {
  const copy = getCopy(lang);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 4, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 999 }}>
      {["en", "ro"].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-label={`${copy.common.languageToggle} ${option.toUpperCase()}`}
          style={{ padding: "6px 10px", borderRadius: 999, border: "none", background: lang === option ? "#1a56db" : "transparent", color: lang === option ? "#fff" : "#475569", cursor: lang === option ? "default" : "pointer", fontWeight: 800, fontSize: 11.5, minWidth: 38 }}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function AccountModal({
  lang,
  user,
  authEmail,
  setAuthEmail,
  onClose,
  onLogin,
  onLogout,
  onSaveResume,
  onOpenResume,
  onDownloadPurchase,
  resumes,
  purchases,
  loading,
  saving,
  message,
  configured,
}) {
  const copy = getCopy(lang);
  const accountCopy = copy.account;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.58)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 620, maxHeight: "88vh", overflow: "auto", borderRadius: 18, boxShadow: "0 28px 70px rgba(15,23,42,0.25)", border: "1px solid #e2e8f0" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 850, color: "#0f172a" }}>{accountCopy.title}</div>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>{user?.email || accountCopy.subtitle}</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 800 }}>×</button>
        </div>

        {!configured && (
          <div style={{ margin: 18, padding: 14, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13, lineHeight: 1.5 }}>
            {accountCopy.notConfigured}
          </div>
        )}

        {message && (
          <div style={{ margin: "18px 18px 0", padding: 12, borderRadius: 12, background: "#ecfeff", border: "1px solid #a5f3fc", color: "#155e75", fontSize: 13, fontWeight: 650 }}>
            {message}
          </div>
        )}

        {!user ? (
          <div style={{ padding: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
              {accountCopy.emailLabel}
            </label>
            <input
              type="email"
              value={authEmail}
              onChange={event => setAuthEmail(event.target.value)}
              placeholder={accountCopy.emailPlaceholder}
              disabled={!configured || loading}
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", marginBottom: 10 }}
            />
            <button onClick={onLogin} disabled={!configured || loading || !authEmail.trim()} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: loading || !authEmail.trim() ? "#94a3b8" : "linear-gradient(135deg,#1a56db,#7c3aed)", color: "#fff", cursor: loading ? "wait" : "pointer", fontWeight: 850 }}>
              {loading ? accountCopy.sendingLink : accountCopy.sendLink}
            </button>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{accountCopy.loginHint}</p>
          </div>
        ) : (
          <div style={{ padding: 18, display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={onSaveResume} disabled={saving} style={nb("#bbf7d0", saving ? "#dcfce7" : "#f0fdf4", "#047857", 800)}>
                {saving ? accountCopy.saving : accountCopy.saveCurrent}
              </button>
              <button onClick={onLogout} style={nb("#fecaca", "#fff1f2", "#be123c", 750)}>
                {accountCopy.logout}
              </button>
            </div>

            <section>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.4 }}>{accountCopy.savedResumes}</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {resumes.length ? resumes.map(resume => (
                  <button key={resume.id} onClick={() => onOpenResume(resume)} style={{ textAlign: "left", padding: 12, borderRadius: 11, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13.5 }}>{resume.title || accountCopy.untitledResume}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{resume.design_name || resume.design_key} · {resume.lang?.toUpperCase?.() || "RO"}</div>
                  </button>
                )) : (
                  <div style={{ padding: 12, borderRadius: 11, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: 13 }}>{accountCopy.noResumes}</div>
                )}
              </div>
            </section>

            <section>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.4 }}>{accountCopy.purchaseHistory}</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {purchases.length ? purchases.map(purchase => (
                  <div key={purchase.id} style={{ padding: 12, borderRadius: 11, border: "1px solid #e2e8f0", background: "#fff", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13.5 }}>{purchase.title || accountCopy.untitledResume}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                        {(purchase.amount_total ? `${(purchase.amount_total / 100).toFixed(0)} ${String(purchase.currency || "ron").toUpperCase()}` : "19 RON")} · {purchase.paid_at ? new Date(purchase.paid_at).toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US") : accountCopy.paid}
                      </div>
                    </div>
                    <button onClick={() => onDownloadPurchase(purchase)} style={nb("#bfdbfe", "#eff6ff", "#1d4ed8", 800)}>
                      {accountCopy.downloadAgain}
                    </button>
                  </div>
                )) : (
                  <div style={{ padding: 12, borderRadius: 11, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: 13 }}>{accountCopy.noPurchases}</div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const fBtn = { width: "100%", padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 12.5, textAlign: "center", boxSizing: "border-box" };

export default function App() {
  const [lang, setLang] = useState("en");
  const copy = getCopy(lang);
  const {
    paymentInfo,
    checking,
    prepareCheckout,
    preparedCheckoutHash,
    preparingCheckout,
    startPayment,
    verifyPayment,
    startingCheckout,
    warmCheckout,
  } = useStripePayment(lang);
  const [tmpl, setTmpl] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleSeedData, setRoleSeedData] = useState(null);
  const [cvRO, setCvRO] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [currentDocumentHash, setCurrentDocumentHash] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState("role");
  const [editMode, setEditMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [mobileView, setMobileView] = useState("cv");
  const [accountOpen, setAccountOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [savedResumes, setSavedResumes] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [activeResumeId, setActiveResumeId] = useState(null);
  const fileRef = useRef();
  const prepareCheckoutRef = useRef(prepareCheckout);
  const downloadPaidPdfRef = useRef(null);
  const downloadStoredPaidPdfRef = useRef(null);
  const autoDownloadAttemptRef = useRef(null);
  const authToken = authSession?.access_token || null;

  useEffect(() => {
    prepareCheckoutRef.current = prepareCheckout;
  }, [prepareCheckout]);

  const cvData = cvRO;
  const setCvData = setCvRO;
  const selectedStarterProfile = selectedRole?.starterId
    ? cvTemplates.find((template) => template.id === selectedRole.starterId)
    : null;
  const paidForCurrentDocument = Boolean(
    paymentInfo && currentDocumentHash && paymentInfo.documentHash === currentDocumentHash
  );
  const checkoutReady = Boolean(
    showPaywall &&
    currentDocumentHash &&
    preparedCheckoutHash &&
    preparedCheckoutHash === currentDocumentHash
  );
  const selectedRoleName = selectedStarterProfile
    ? getStarterRoleName(selectedRole.starterId, selectedStarterProfile.job, lang)
    : selectedRole?.name || cvData?.titlu || copy.common.yourRole;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRoles = cvTemplates.filter(template => {
    const roleCopy = getStarterRoleCopy(template, lang);
    return [
      template.job,
      template.data.titlu,
      roleCopy.job,
      roleCopy.title,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
  });
  const hasExactStarter = cvTemplates.some(template => {
    const roleCopy = getStarterRoleCopy(template, lang);
    return [
      template.job,
      template.data.titlu,
      roleCopy.job,
      roleCopy.title,
    ].some((value) => value?.toLowerCase() === normalizedSearch);
  });
  const showCustomRoleCard = normalizedSearch.length > 1 && !hasExactStarter;

  const showAccountMessage = (message) => {
    setAccountMessage(message);
    window.setTimeout(() => setAccountMessage(""), 5000);
  };

  const getAuthAccessToken = async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const loadSavedResumes = async () => {
    if (!supabase || !authUser) {
      setSavedResumes([]);
      return [];
    }

    const { data, error } = await supabase
      .from("cv_resumes")
      .select("*")
      .eq("user_id", authUser.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      showAccountMessage(copy.account.loadError);
      return [];
    }

    setSavedResumes(data || []);
    return data || [];
  };

  const loadPurchaseHistory = async () => {
    const token = await getAuthAccessToken();

    if (!token) {
      setPurchaseHistory([]);
      return [];
    }

    const response = await fetch(`${API_URL}/account/purchases`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(payload);
      showAccountMessage(payload.error || copy.account.loadError);
      return [];
    }

    setPurchaseHistory(payload.purchases || []);
    return payload.purchases || [];
  };

  const refreshAccountData = async () => {
    await Promise.all([loadSavedResumes(), loadPurchaseHistory()]);
  };

  const handleLogin = async () => {
    if (!supabase) {
      showAccountMessage(copy.account.notConfigured);
      return;
    }

    const email = authEmail.trim();
    if (!email) return;

    setAccountLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
        },
      });

      if (error) throw error;
      showAccountMessage(copy.account.linkSent);
    } catch (error) {
      console.error(error);
      showAccountMessage(error.message || copy.account.loginError);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthUser(null);
    setAuthSession(null);
    setSavedResumes([]);
    setPurchaseHistory([]);
    setActiveResumeId(null);
    showAccountMessage(copy.account.loggedOut);
  };

  const saveCurrentResume = async ({ silent = false } = {}) => {
    if (!supabase) {
      setAccountOpen(true);
      showAccountMessage(copy.account.notConfigured);
      return null;
    }

    if (!authUser) {
      setAccountOpen(true);
      showAccountMessage(copy.account.loginRequired);
      return null;
    }

    if (!tmpl || !cvData) {
      if (!silent) showAccountMessage(copy.account.nothingToSave);
      return null;
    }

    setAccountSaving(true);

    try {
      const documentHash =
        currentDocumentHash ||
        await createDocumentHash({
          templateName: tmpl.key,
          color: tmpl.color,
          lang,
          cvData,
          photoDataUrl: photo,
        });
      const title = normalizeString(cvData.nume || cvData.titlu || selectedRoleName || "CV", 160) || "CV";
      const row = {
        user_id: authUser.id,
        title,
        role_name: selectedRoleName,
        role_source: selectedRole?.source || "custom",
        role_starter_id: selectedRole?.starterId || null,
        design_id: tmpl.id || null,
        design_key: tmpl.key,
        design_name: tmpl.name,
        color: tmpl.color,
        lang,
        cv_data: cvData,
        photo_data_url: photo || null,
        document_hash: documentHash,
        updated_at: new Date().toISOString(),
      };

      const query = activeResumeId
        ? supabase
            .from("cv_resumes")
            .update(row)
            .eq("id", activeResumeId)
            .eq("user_id", authUser.id)
            .select()
            .single()
        : supabase
            .from("cv_resumes")
            .insert(row)
            .select()
            .single();

      const { data, error } = await query;

      if (error) throw error;

      setActiveResumeId(data.id);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      await loadSavedResumes();
      if (!silent) showAccountMessage(copy.account.saved);
      return data;
    } catch (error) {
      console.error(error);
      showAccountMessage(error.message || copy.account.saveError);
      return null;
    } finally {
      setAccountSaving(false);
    }
  };

  const openSavedResume = (resume) => {
    const restoredLang = normalizeUiLang(resume.lang || lang);
    const restoredDesign =
      designCatalog.find(design => design.id === resume.design_id || design.key === resume.design_key) ||
      {
        id: resume.design_id || 0,
        key: resume.design_key || "saved-design",
        name: resume.design_name || (restoredLang === "en" ? "Saved design" : "Design salvat"),
        variant: "classic",
        color: resume.color || "#1a56db",
        icon: "📄",
        tagline: restoredLang === "en" ? "Saved in your account" : "Salvat în contul tău",
        previewData: resume.cv_data,
        previewRole: resume.role_name || resume.cv_data?.titlu || "CV",
      };

    setLang(restoredLang);
    setTmpl(restoredDesign);
    setSelectedRole({
      name: resume.role_name || resume.cv_data?.titlu || copy.common.yourRole,
      source: resume.role_source || "saved",
      starterId: resume.role_starter_id || null,
    });
    setRoleSeedData(cloneData(resume.cv_data));
    setCvRO(cloneData(resume.cv_data));
    setPhoto(resume.photo_data_url || null);
    setActiveResumeId(resume.id);
    setEditMode(false);
    setPage("editor");
    setMobileView("cv");
    setAccountOpen(false);
    window.scrollTo({ top: 0 });
  };

  const downloadPurchasePdf = async (purchase) => {
    const token = await getAuthAccessToken();
    if (!token) {
      showAccountMessage(copy.account.loginRequired);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/account/download-purchase-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId: purchase.id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || copy.errors.pdfGeneration);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filename = parseFilenameFromDisposition(disposition) || `CV_${String(purchase.lang || lang).toUpperCase()}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      showAccountMessage(error.message || copy.errors.pdfGeneration);
    }
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthSession(data.session || null);
      setAuthUser(data.session?.user || null);
      setAuthEmail(data.session?.user?.email || "");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session || null);
      setAuthUser(session?.user || null);
      setAuthEmail(session?.user?.email || "");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      setSavedResumes([]);
      setPurchaseHistory([]);
      return;
    }

    void refreshAccountData();
    // Account data is refreshed when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  useEffect(() => {
    if (selectedRole?.source !== "starter" || !selectedStarterProfile || !roleSeedData) {
      return;
    }

    const roSeed = selectedStarterProfile.data;
    const enSeed = getStarterRoleData(selectedStarterProfile.id, selectedStarterProfile.data, "en");
    const currentSeedSerialized = stableSerialize(roleSeedData);
    const roSeedSerialized = stableSerialize(roSeed);
    const enSeedSerialized = stableSerialize(enSeed);

    if (currentSeedSerialized !== roSeedSerialized && currentSeedSerialized !== enSeedSerialized) {
      return;
    }

    const nextSeed = getStarterRoleData(selectedStarterProfile.id, selectedStarterProfile.data, lang);
    const nextSeedSerialized = stableSerialize(nextSeed);

    if (currentSeedSerialized === nextSeedSerialized) {
      return;
    }

    setRoleSeedData(cloneData(nextSeed));

    if (cvRO && stableSerialize(cvRO) === currentSeedSerialized) {
      setCvRO(cloneData(nextSeed));
    }
  }, [lang, roleSeedData, cvRO, selectedRole?.source, selectedStarterProfile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang");
    const savedLang = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    const nextLang = normalizeUiLang(urlLang || savedLang || "en");
    setLang(nextLang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;

    try {
      localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error("Could not persist UI language", error);
    }

    syncLanguageInUrl(lang);
  }, [lang]);

  const handleRoleSelection = ({ name, source, seedData, starterId = null }) => {
    const normalizedRole = normalizeString(name, 160);

    if (!normalizedRole) {
      return;
    }

    setSelectedRole({ name: normalizedRole, source, starterId });
    setRoleSeedData(cloneData(seedData));
    setTmpl(null);
    setCvRO(null);
    setPhoto(null);
    setCurrentDocumentHash(null);
    setActiveResumeId(null);
    setEditMode(source === "custom");
    setPage("designs");
    setMobileView("cv");
    window.scrollTo({ top: 0 });
  };

  const selectStarterRole = (profile) => {
    const roleCopy = getStarterRoleCopy(profile, lang);
    const starterSeedData = getStarterRoleData(profile.id, profile.data, lang);

    handleRoleSelection({
      name: roleCopy.job,
      source: "starter",
      starterId: profile.id,
      seedData: starterSeedData,
    });
  };

  const selectCustomRole = (roleName) => {
    const normalizedRole = normalizeString(roleName, 160);

    if (!normalizedRole) {
      return;
    }

    handleRoleSelection({
      name: normalizedRole,
      source: "custom",
      seedData: createEmptyCvData(normalizedRole),
    });
  };

  const selectDesign = (design, options = {}) => {
    const preserveCurrent = options.preserveCurrent ?? Boolean(cvRO);

    setTmpl(design);

    if (!preserveCurrent) {
      const nextSeed =
        roleSeedData ||
        createEmptyCvData(selectedRole?.name || design.previewRole || copy.common.yourRole);
      setCvRO(cloneData(nextSeed));
      setPhoto(null);
      setEditMode(selectedRole?.source === "custom");
    }

    setPage("editor");
    setMobileView("cv");
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    let cancelled = false;

    if (!tmpl || !cvData) {
      setCurrentDocumentHash(null);
      return;
    }

    createDocumentHash({
      templateName: tmpl.key,
      color: tmpl.color,
      lang,
      cvData,
      photoDataUrl: photo,
    })
      .then(hash => {
        if (!cancelled) {
          setCurrentDocumentHash(hash);
        }
      })
      .catch(error => {
        console.error(error);
        if (!cancelled) {
          setCurrentDocumentHash(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tmpl, cvData, photo, lang]);

  useEffect(() => {
    if (!paymentInfo?.downloadToken) return;

    const pendingPurchase = loadPendingPurchase();
    if (!pendingPurchase || pendingPurchase.documentHash !== paymentInfo.documentHash) {
      return;
    }

    const restoredLang = normalizeUiLang(pendingPurchase.lang || "en");

    const restoredTemplate =
      designCatalog.find(template => template.id === pendingPurchase.designId || template.key === pendingPurchase.designKey) ||
      {
        id: pendingPurchase.designId || 0,
        key: pendingPurchase.designKey || "restored-design",
        name: pendingPurchase.designName || (restoredLang === "en" ? "Restored design" : "Design restaurat"),
        variant: "classic",
        color: pendingPurchase.color || "#1a56db",
        icon: "📄",
        tagline: restoredLang === "en" ? "Restored from the payment session" : "Design restaurat din sesiunea de plată",
        previewData: pendingPurchase.cvData,
        previewRole: pendingPurchase.roleName || pendingPurchase.cvData?.titlu || (restoredLang === "en" ? "Role" : "Rol"),
      };

    if (pendingPurchase.lang) {
      setLang(restoredLang);
    }

    setTmpl(restoredTemplate);
    setSelectedRole({
      name: pendingPurchase.roleName || pendingPurchase.cvData?.titlu || (restoredLang === "en" ? "Your role" : "Rolul tău"),
      source: pendingPurchase.roleSource || "restored",
      starterId: pendingPurchase.roleStarterId || null,
    });
    setRoleSeedData(cloneData(pendingPurchase.cvData));
    setCvRO(cloneData(pendingPurchase.cvData));
    setPhoto(pendingPurchase.photoDataUrl || null);
    setEditMode(false);
    setPage("editor");
    setMobileView("cv");
    window.scrollTo({ top: 0 });
  }, [paymentInfo]);

  useEffect(() => {
    if (!showPaywall || !tmpl || !cvData || !currentDocumentHash) {
      return;
    }

    prepareCheckoutRef.current({
      templateName: tmpl.key,
      lang,
      documentHash: currentDocumentHash,
      color: tmpl.color,
      cvData,
      photoDataUrl: photo,
      authToken,
      accountUserId: authUser?.id || null,
      resumeId: activeResumeId,
    }).catch(error => {
      console.error("Checkout preparation failed", error);
    });
  }, [showPaywall, tmpl, cvData, currentDocumentHash, lang, photo, authToken, authUser?.id, activeResumeId]);

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      alert(copy.errors.invalidPhotoType);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto(reader.result);
      }
    };
    reader.onerror = () => {
      alert(copy.errors.photoRead);
    };
    reader.readAsDataURL(file);
  };

  const downloadStoredPaidPdf = async (activePayment = paymentInfo) => {
    if (!activePayment?.downloadToken) {
      return false;
    }

    try {
      setExporting(true);

      const response = await fetch(`${API_URL}/download-session-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          downloadToken: activePayment.downloadToken,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || copy.errors.pdfGeneration);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fallbackFilename = `CV_${lang.toUpperCase()}.pdf`;
      const filename = parseFilenameFromDisposition(disposition) || fallbackFilename;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      clearPendingPurchase();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setExporting(false);
    }
  };

  downloadStoredPaidPdfRef.current = downloadStoredPaidPdf;

  const downloadPaidPdf = async (activePayment = paymentInfo, allowRefresh = true) => {
    if (!activePayment || !tmpl || !cvData) {
      const downloaded = await downloadStoredPaidPdf(activePayment);
      if (!downloaded) {
        setShowPaywall(true);
      }
      return;
    }

    try {
      const documentHash = await createDocumentHash({
        templateName: tmpl.key,
        color: tmpl.color,
        lang,
        cvData,
        photoDataUrl: photo,
      });

      if (documentHash !== activePayment.documentHash) {
        setShowPaywall(true);
        return;
      }

      setExporting(true);
      setEditMode(false);

      const response = await fetch(`${API_URL}/download-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          downloadToken: activePayment.downloadToken,
          templateName: tmpl.key,
          color: tmpl.color,
          lang,
          cvData,
          photoDataUrl: photo,
        }),
      });

      if (response.status === 403 && allowRefresh && activePayment.sessionId) {
        const refreshedPayment = await verifyPayment(activePayment.sessionId).catch(() => null);
        if (refreshedPayment?.documentHash === documentHash) {
          setExporting(false);
          return downloadPaidPdf(refreshedPayment, false);
        }
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || copy.errors.pdfGeneration);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fallbackFilename = `CV_${(cvData?.nume || "CV").replace(/ /g, "_")}_${lang.toUpperCase()}.pdf`;
      const filename = parseFilenameFromDisposition(disposition) || fallbackFilename;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      clearPendingPurchase();
    } catch (error) {
      console.error(error);
      alert(error.message || copy.errors.pdfGeneration);
    } finally {
      setExporting(false);
    }
  };

  downloadPaidPdfRef.current = downloadPaidPdf;

  useEffect(() => {
    if (!paymentInfo?.downloadToken) {
      return;
    }

    const pendingPurchase = loadPendingPurchase();
    if (!pendingPurchase || pendingPurchase.documentHash !== paymentInfo.documentHash) {
      const attemptKey = `${paymentInfo.sessionId || "session"}:${paymentInfo.documentHash}:stored`;
      if (autoDownloadAttemptRef.current === attemptKey) {
        return;
      }

      autoDownloadAttemptRef.current = attemptKey;
      void downloadStoredPaidPdfRef.current?.(paymentInfo);
      return;
    }

    if (!tmpl || !cvData || !currentDocumentHash) {
      return;
    }

    if (currentDocumentHash !== paymentInfo.documentHash) {
      return;
    }

    const attemptKey = `${paymentInfo.sessionId || "session"}:${paymentInfo.documentHash}`;
    if (autoDownloadAttemptRef.current === attemptKey) {
      return;
    }

    autoDownloadAttemptRef.current = attemptKey;
    void downloadPaidPdfRef.current?.(paymentInfo);
  }, [paymentInfo, tmpl, cvData, currentDocumentHash]);

  const handleDownloadClick = async () => {
    if (paymentInfo) {
      await downloadPaidPdf();
      return;
    }

    void warmCheckout();
    setShowPaywall(true);
  };

  const handlePayNow = async () => {
    if (!tmpl || !cvData) return;

    try {
      let resumeIdForCheckout = activeResumeId;

      if (authUser && supabase) {
        const savedResume = await saveCurrentResume({ silent: true });
        resumeIdForCheckout = savedResume?.id || resumeIdForCheckout;
      }

      const documentHash =
        currentDocumentHash ||
        await createDocumentHash({
          templateName: tmpl.key,
          color: tmpl.color,
          lang,
          cvData,
          photoDataUrl: photo,
        });

      savePendingPurchase({
        designId: tmpl.id,
        designKey: tmpl.key,
        designName: tmpl.name,
        roleName: selectedRoleName,
        roleSource: selectedRole?.source || "custom",
        roleStarterId: selectedRole?.starterId || null,
        color: tmpl.color,
        lang,
        cvData,
        photoDataUrl: photo,
        documentHash,
        resumeId: resumeIdForCheckout || null,
        savedAt: Date.now(),
      });

      await startPayment({
        templateName: tmpl.key,
        lang,
        documentHash,
        color: tmpl.color,
        cvData,
        photoDataUrl: photo,
        authToken,
        accountUserId: authUser?.id || null,
        resumeId: resumeIdForCheckout,
      });
    } catch (error) {
      console.error(error);
      alert(error.message || copy.errors.paymentPrepare);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #faf8ff 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── PAYWALL MODAL ── */}
      {showPaywall && tmpl && (
        <PaywallModal
          onClose={() => {
            if (!startingCheckout) {
              setShowPaywall(false);
            }
          }}
          onPay={handlePayNow}
          templateName={selectedRoleName}
          lang={lang}
          color={tmpl.color}
          isPaying={startingCheckout}
          isPreparingCheckout={preparingCheckout}
          checkoutReady={checkoutReady}
        />
      )}

      {accountOpen && supabase && (
        <AccountModal
          lang={lang}
          user={authUser}
          authEmail={authEmail}
          setAuthEmail={setAuthEmail}
          onClose={() => setAccountOpen(false)}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSaveResume={() => saveCurrentResume()}
          onOpenResume={openSavedResume}
          onDownloadPurchase={downloadPurchasePdf}
          resumes={savedResumes}
          purchases={purchaseHistory}
          loading={accountLoading}
          saving={accountSaving}
          message={accountMessage}
          configured={Boolean(supabase)}
        />
      )}

      {/* ── SUCCESS BANNER (după plată) ── */}
      {paymentInfo && (
        <div style={{ background: "linear-gradient(90deg, #059669, #0d9488)", padding: "10px 20px", textAlign: "center" }}>
          <span style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>
            {paidForCurrentDocument
              ? copy.banners.paymentConfirmed
              : copy.banners.paymentLocked}
          </span>
        </div>
      )}

      {/* ── CHECKING PAYMENT ── */}
      {checking && (
        <div style={{ background: "#fef9c3", padding: "10px 20px", textAlign: "center" }}>
          <span style={{ fontSize: 13, color: "#854d0e", fontWeight: 600 }}>{copy.banners.checkingPayment}</span>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e8ecf4", position: "sticky", top: 0, zIndex: 999, boxShadow: "0 2px 14px rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 20px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#1a56db,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 15 }}>✦</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", letterSpacing: "-0.4px" }}>CVPerfect</div>
              <div style={{ fontSize: 9, color: "#94a3b8", marginTop: -2 }}>cvperfect.online</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {supabase && (
              <button onClick={() => setAccountOpen(true)} style={nb(authUser ? "#bbf7d0" : "#bfdbfe", authUser ? "#f0fdf4" : "#eff6ff", authUser ? "#047857" : "#1d4ed8", 800)}>
                {authUser ? copy.account.accountButtonSignedIn : copy.account.accountButton}
              </button>
            )}
            <LanguageSwitch lang={lang} onChange={setLang} />

            {page === "editor" && tmpl && cvData && (
              <>
              <button onClick={() => setPage("designs")} style={nb("#e2e8f0","#fff","#374151")}>{copy.header.backDesigns}</button>
              <button onClick={() => setPage("role")} style={nb("#fde68a","#fffbeb","#92400e")}>{copy.header.backJob}</button>
              <button onClick={() => fileRef.current.click()} style={nb("#bae6fd","#f0f9ff","#0369a1")}>{photo ? copy.header.changePhotoShort : copy.header.addPhotoShort}</button>

              {/* Mobile switch in header */}
              <div className="mobile-only" style={{ display: "none" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setMobileView("cv")}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: mobileView === "cv" ? "#1a56db" : "#fff", color: mobileView === "cv" ? "#fff" : "#374151", fontWeight: 700, fontSize: 11 }}
                  >
                    {copy.common.viewCv}
                  </button>
                  <button
                    onClick={() => setMobileView("panel")}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: mobileView === "panel" ? "#1a56db" : "#fff", color: mobileView === "panel" ? "#fff" : "#374151", fontWeight: 700, fontSize: 11 }}
                  >
                    {copy.common.editPanel}
                  </button>
                </div>
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#334155", borderRadius: 999, padding: "6px 10px", fontSize: 11.5, fontWeight: 700 }}>
                <span>{selectedRoleName}</span>
                <span style={{ color: "#94a3b8" }}>·</span>
                <span style={{ color: tmpl.color }}>{tmpl.name}</span>
              </div>

              <button onClick={() => setEditMode(e => !e)} style={nb(editMode ? "#fcd34d" : "#e2e8f0", editMode ? "#fffbeb" : "#fff", editMode ? "#92400e" : "#374151", 700)}>
                {editMode ? copy.header.preview : copy.header.edit}
              </button>
              {editMode && <button onClick={() => saveCurrentResume()} disabled={accountSaving} style={nb(saved ? "#059669" : "#bbf7d0", saved ? "#059669" : "#f0fdf4", saved ? "#fff" : "#059669", 700)}>{saved ? copy.header.saved : accountSaving ? copy.account.saving : copy.header.save}</button>}
              <button onClick={handleDownloadClick} disabled={exporting || startingCheckout}
                style={{ padding: "7px 16px", borderRadius: 8, background: paidForCurrentDocument ? "linear-gradient(135deg,#059669,#0d9488)" : exporting || startingCheckout ? "#94a3b8" : `linear-gradient(135deg,${tmpl.color},#7c3aed)`, color: "#fff", border: "none", cursor: exporting || startingCheckout ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12.5, boxShadow: exporting || startingCheckout ? "none" : `0 3px 10px ${tmpl.color}44` }}>
                {exporting ? copy.header.pdfLoading : startingCheckout ? copy.header.stripeLoading : paidForCurrentDocument ? copy.header.pdfPaid : copy.header.pdfLocked}
              </button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={onPhoto} />
        </div>
      </header>

      {/* Edit banner */}
      {page === "editor" && editMode && (
        <div style={{ background: "#fef9c3", borderBottom: "1.5px solid #fde047", padding: "7px 20px", textAlign: "center" }}>
          <span style={{ fontSize: 13, color: "#854d0e", fontWeight: 600 }}>
            {copy.banners.editMode}
          </span>
        </div>
      )}

      {/* ── GRID ── */}
      {page === "role" && (
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "34px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-block", background: "linear-gradient(135deg,#eff6ff,#faf5ff)", border: "1px solid #c7d2fe", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: "#4338ca", fontWeight: 600, marginBottom: 12 }}>{copy.rolePage.pill}</div>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-1px", lineHeight: 1.2 }}>
              {copy.rolePage.titleLead}<br />
              <span style={{ background: "linear-gradient(135deg,#1a56db,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{copy.rolePage.titleAccent}</span>
            </h1>
            <p style={{ fontSize: 15.5, color: "#64748b", margin: "0 auto 24px", maxWidth: 500, lineHeight: 1.65 }}>
              {copy.rolePage.subtitle}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 36, marginBottom: 32 }}>
              {copy.rolePage.stats.map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 21, fontWeight: 800, color: "#1a56db" }}>{stat.value}</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div style={{ maxWidth: 390, margin: "0 auto", position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 15 }}>🔍</span>
              <input type="text" placeholder={copy.rolePage.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 11, border: "1.5px solid #e2e8f0", fontSize: 13.5, outline: "none", boxSizing: "border-box", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))", gap: 16 }}>
            {showCustomRoleCard && <CustomRoleCard roleName={search.trim()} onSelect={selectCustomRole} lang={lang} />}
            {filteredRoles.map(role => <RoleCard key={role.id} profile={role} onSelect={selectStarterRole} lang={lang} />)}
          </div>
          {!filteredRoles.length && !showCustomRoleCard && <div style={{ textAlign: "center", padding: "52px 0", color: "#94a3b8" }}><div style={{ fontSize: 40 }}>🔍</div><p>{copy.rolePage.noResults} &quot;{search}&quot;</p></div>}
        </div>
      )}

      {page === "designs" && selectedRole && (
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "34px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#ecfeff,#eef2ff)", border: "1px solid #bfdbfe", borderRadius: 999, padding: "5px 14px", fontSize: 12, color: "#1d4ed8", fontWeight: 700, marginBottom: 14 }}>
              <span>{copy.designsPage.selectedRole}</span>
              <span>{selectedRoleName}</span>
            </div>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.8px" }}>
              {copy.designsPage.title}
            </h2>
            <p style={{ margin: "0 auto 20px", maxWidth: 640, fontSize: 15.5, color: "#64748b", lineHeight: 1.65 }}>
              {copy.designsPage.subtitle}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setPage("role")} style={nb("#e2e8f0", "#fff", "#374151", 700)}>{copy.designsPage.changeJob}</button>
              {selectedRole?.source === "custom" && <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", fontSize: 11.5, fontWeight: 700 }}>{copy.designsPage.customRoleBadge}</span>}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))", gap: 16 }}>
            {designCatalog.map(design => <DesignCard key={design.id} design={design} onSelect={selectDesign} lang={lang} />)}
          </div>
        </div>
      )}

      {/* ── EDITOR ── */}
      {page === "editor" && tmpl && cvData && (
        <div className="editor-layout" style={{ maxWidth: 1260, margin: "0 auto", padding: "22px 20px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
          {/* Mobile switch */}
          <div className="mobile-only mobile-switch" style={{ display: "none" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMobileView("cv")}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: mobileView === "cv" ? "#1a56db" : "#fff", color: mobileView === "cv" ? "#fff" : "#374151", fontWeight: 700, fontSize: 12 }}
              >
                {copy.common.viewCv}
              </button>
              <button
                onClick={() => setMobileView("panel")}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: mobileView === "panel" ? "#1a56db" : "#fff", color: mobileView === "panel" ? "#fff" : "#374151", fontWeight: 700, fontSize: 12 }}
              >
                {copy.common.editPanel}
              </button>
            </div>
          </div>
          {/* CV Document */}
          <div className={`editor-doc ${mobileView !== "cv" ? "mobile-hidden" : ""}`} style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 6px 28px rgba(0,0,0,0.09)", border: `2px solid ${editMode ? "#fcd34d" : "#e8ecf4"}`, transition: "border 0.2s" }}>
            <CVDocument cvData={cvData} setCvData={setCvData} design={tmpl} photoUrl={photo} onPhotoClick={() => fileRef.current.click()} editMode={editMode} lang={lang} />
          </div>

          {/* Right Panel */}
          <div className={`editor-sidebar ${mobileView !== "panel" ? "mobile-hidden" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Actions */}
            <div style={{ background: "#fff", border: `1.5px solid ${editMode ? "#fcd34d" : "#e8ecf4"}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{tmpl.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{tmpl.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{selectedRoleName} · {getDesignVariantLabel(tmpl.variant, lang)} · {copy.common.langBadge}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => fileRef.current.click()} style={{ ...fBtn, background: photo ? "#f0fdf4" : "#f0f9ff", color: photo ? "#059669" : "#0369a1", border: `1.5px solid ${photo ? "#bbf7d0" : "#bae6fd"}` }}>
                  {photo ? copy.editor.photoAdded : copy.editor.addPhoto}
                </button>
                {photo && <div style={{ textAlign: "center" }}><Image src={photo} alt={copy.editor.photoPreviewAlt} width={52} height={52} unoptimized style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: `3px solid ${tmpl.color}` }} /></div>}

                <button onClick={() => setEditMode(e => !e)} style={{ ...fBtn, background: editMode ? "#fffbeb" : "#f8fafc", color: editMode ? "#b45309" : "#374151", border: `1.5px solid ${editMode ? "#fcd34d" : "#e2e8f0"}`, fontWeight: 700 }}>
                  {editMode ? copy.editor.exitEdit : copy.editor.editCv}
                </button>

                <button onClick={handleDownloadClick} disabled={exporting || startingCheckout}
                  style={{ ...fBtn, padding: "12px", background: paidForCurrentDocument ? "linear-gradient(135deg,#059669,#0d9488)" : exporting || startingCheckout ? "#94a3b8" : `linear-gradient(135deg,${tmpl.color},#7c3aed)`, color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: exporting || startingCheckout ? "not-allowed" : "pointer", boxShadow: exporting || startingCheckout ? "none" : `0 4px 14px ${tmpl.color}44` }}>
                  {exporting ? copy.editor.generatingPdf : startingCheckout ? copy.editor.connectingStripe : paidForCurrentDocument ? copy.editor.downloadPaid : copy.editor.downloadLocked}
                </button>
              </div>
            </div>

            {/* Contact quick edit */}
            {editMode && (
              <div style={{ background: "#fff", border: "1.5px solid #e8ecf4", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
                  {copy.editor.contactDetails} {copy.common.langBadge}
                </div>
                {Object.entries(copy.editor.contactFields).map(([key, label]) => (
                  <div key={key} style={{ marginBottom: 9 }}>
                    <label style={{ display: "block", fontSize: 10.5, color: "#94a3b8", fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>{label}</label>
                    <input type="text" value={cvData[key] || ""} onChange={e => setCvData(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Other templates */}
            <div style={{ background: "#fff", border: "1.5px solid #e8ecf4", borderRadius: 14, padding: 15 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 11 }}>{copy.editor.otherDesigns}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {designCatalog.filter(t => t.id !== tmpl.id).slice(0, 4).map(t => (
                  <button key={t.id} onClick={() => selectDesign(t, { preserveCurrent: true })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #f1f5f9", background: "#fafbfc", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${t.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{t.icon}</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{t.name}</div>
                      <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{getDesignVariantLabel(t.variant, lang)}</div>
                    </div>
                  </button>
                ))}
                <button onClick={() => setPage("designs")} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: 12 }}>{copy.editor.allDesigns}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: "1px solid #e8ecf4", background: "#fff", padding: "20px", textAlign: "center", marginTop: 36 }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <Link href="/gdpr" style={{ fontSize: 12.5, color: "#475569", fontWeight: 600, textDecoration: "none" }}>
            GDPR
          </Link>
          <span style={{ color: "#cbd5e1" }}>•</span>
          <Link href="/privacy-policy" style={{ fontSize: 12.5, color: "#475569", fontWeight: 600, textDecoration: "none" }}>
            {copy.footer.privacy}
          </Link>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>© {new Date().getFullYear()} CVPerfect.online · {copy.footer.tagline}</p>
      </footer>
    </div>
  );
}

const nb = (border, bg, color, fw = 600) => ({ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, cursor: "pointer", fontWeight: fw, fontSize: 12 });
