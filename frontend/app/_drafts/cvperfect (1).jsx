import { useState, useRef } from "react";

const cvTemplates = [
  {
    id: 1,
    job: "Casier",
    color: "#1a56db",
    accent: "#e8f0fe",
    icon: "🛒",
    data: {
      nume: "Ionescu Maria",
      titlu: "Casier / Operator Vânzări",
      email: "maria.ionescu@email.ro",
      telefon: "0721 234 567",
      oras: "București",
      linkedin: "linkedin.com/in/maria-ionescu",
      despre: "Casier cu experiență de 4 ani în retail, orientat spre client și rezultate. Abilități dovedite în gestionarea numerarului, procesarea plăților și asigurarea satisfacției clienților. Recunoscută pentru acuratețe, rapiditate și atitudine pozitivă în relația cu clienții.",
      experienta: [
        { firma: "Mega Image SRL", perioada: "2021 – Prezent", rol: "Casier Senior", desc: "Procesarea a 200+ tranzacții zilnice cu acuratețe 99.8% • Gestionarea casieriei cu zero discrepanțe timp de 2 ani • Formarea a 5 angajați noi în proceduri POS și servicii clienți • Implementarea programului de fidelitate – creștere 15% clienți recurenți" },
        { firma: "Kaufland România", perioada: "2019 – 2021", rol: "Casier", desc: "Operarea sistemului POS și procesarea plăților cash/card • Soluționarea reclamațiilor clienților cu rată de satisfacție 95% • Menținerea curățeniei și ordinii la zona de casă • Colaborare eficientă în echipă de 20 persoane" }
      ],
      educatie: [{ institutie: "Liceul Economic Virgil Madgearu", perioada: "2015 – 2019", diploma: "Bacalaureat – Profil Economic" }],
      competente: ["Operare POS & sisteme de plată", "Gestionare numerar", "Servicii clienți excelente", "Lucru sub presiune", "MS Office (Word, Excel)", "Comunicare interpersonală", "Atenție la detalii", "Lucru în echipă"],
      limbi: ["Română (nativă)", "Engleză (intermediar – B1)"],
      certificari: ["Certificat Casier – COR 523003", "Curs Servicii Clienți – 2022"]
    }
  },
  {
    id: 2,
    job: "Secretară",
    color: "#7c3aed",
    accent: "#f3e8ff",
    icon: "📋",
    data: {
      nume: "Popescu Elena",
      titlu: "Secretară / Asistent Administrativ",
      email: "elena.popescu@email.ro",
      telefon: "0733 456 789",
      oras: "Cluj-Napoca",
      linkedin: "linkedin.com/in/elena-popescu",
      despre: "Secretară profesionistă cu 6 ani experiență în mediu corporativ dinamic. Expert în coordonarea agendelor executive, organizarea evenimentelor și gestionarea documentelor confidențiale. Reputată pentru discreție, proactivitate și capacitate excepțională de organizare multi-task.",
      experienta: [
        { firma: "Banca Transilvania", perioada: "2020 – Prezent", rol: "Secretară Executivă", desc: "Gestionarea agendei directorului general și coordonarea a 50+ întâlniri lunare • Redactarea corespondenței oficiale în română și engleză • Organizarea conferințelor interne și externe (15+ evenimente/an) • Administrarea bazei de date confidențiale și arhivare electronică" },
        { firma: "Cabinet Avocatură Ionescu & Asociații", perioada: "2017 – 2020", rol: "Secretară Juridică", desc: "Pregătirea dosarelor juridice și documentelor legale • Gestionarea programărilor și relației cu clienții • Redactarea contractelor și corespondenței juridice • Suport administrativ pentru 8 avocați" }
      ],
      educatie: [{ institutie: "Universitatea Babeș-Bolyai Cluj", perioada: "2013 – 2017", diploma: "Licență – Administrație Publică" }],
      competente: ["MS Office Suite (avansat)", "Managementul agendei executive", "Redactare documente oficiale", "Organizare evenimente", "Comunicare profesională", "Arhivare & gestiune documente", "Discreție și confidențialitate", "Planificare și prioritizare"],
      limbi: ["Română (nativă)", "Engleză (avansat – C1)", "Franceză (mediu – B2)"],
      certificari: ["Certificat Secretary Professional – 2021", "Curs Management Birou – 2020"]
    }
  },
  {
    id: 3,
    job: "Lucrător Comercial",
    color: "#059669",
    accent: "#ecfdf5",
    icon: "🏪",
    data: {
      nume: "Dumitrescu Andrei",
      titlu: "Lucrător Comercial / Agent Vânzări",
      email: "andrei.dumitrescu@email.ro",
      telefon: "0745 678 901",
      oras: "Iași",
      linkedin: "linkedin.com/in/andrei-dumitrescu",
      despre: "Lucrător comercial dinamic cu 5 ani experiență în retail și vânzări directe. Abilități solide în merchandising, gestionarea stocurilor și depășirea targeturilor de vânzări. Orientat spre performanță cu o rată de conversie peste media echipei cu 23%.",
      experienta: [
        { firma: "Carrefour România", perioada: "2021 – Prezent", rol: "Lucrător Comercial Senior", desc: "Gestionarea raioanelor cu produse în valoare de 500.000 RON lunar • Depășirea targetului de vânzări cu 23% în medie • Implementarea planogramelor și strategiilor de merchandising • Formarea și mentorarea a 8 angajați noi" },
        { firma: "Profi Rom Food", perioada: "2018 – 2021", rol: "Lucrător Comercial", desc: "Aprovizionarea și gestionarea stocurilor pentru 3 raioane • Procesarea comenzilor și relația cu furnizorii • Inventariere lunară cu acuratețe 99.5% • Promovarea produselor și suport activ în vânzări" }
      ],
      educatie: [{ institutie: "Colegiul Economic Dimitrie Cantemir", perioada: "2014 – 2018", diploma: "Bacalaureat – Comerț" }],
      competente: ["Merchandising & planograme", "Gestionare stocuri & inventar", "Tehnici de vânzare", "Operare sisteme ERP", "Relații cu clienții", "Managementul timpului", "Lucru în echipă", "Analiză vânzări"],
      limbi: ["Română (nativă)", "Engleză (conversațional – B2)"],
      certificari: ["Certificat Lucrător Comercial – COR 522303", "Curs Tehnici Vânzare – 2022"]
    }
  },
  {
    id: 4,
    job: "HR Specialist",
    color: "#dc2626",
    accent: "#fef2f2",
    icon: "👥",
    data: {
      nume: "Constantin Raluca",
      titlu: "HR Specialist / Recruiter",
      email: "raluca.constantin@email.ro",
      telefon: "0756 789 012",
      oras: "București",
      linkedin: "linkedin.com/in/raluca-constantin-hr",
      despre: "Specialist HR cu 7 ani experiență în recrutare, employee engagement și HR operations. Expert în recrutarea profilelor tehnice și non-tehnice, cu track record de reducere a timpului de angajare cu 35%. Pasionată de construirea unor culturi organizaționale sănătoase și programe de dezvoltare a angajaților.",
      experienta: [
        { firma: "Accenture România", perioada: "2020 – Prezent", rol: "Senior HR Business Partner", desc: "Gestionarea ciclului complet de recrutare pentru 200+ poziții anual • Reducerea timpului mediu de angajare de la 45 la 29 de zile • Implementarea programului de onboarding care a crescut retenția cu 28% • Coordonarea evaluărilor de performanță pentru 500 angajați" },
        { firma: "Vodafone România", perioada: "2016 – 2020", rol: "HR Recruiter", desc: "Recrutarea profilelor tehnice și comerciale pentru toate departamentele • Managementul platformelor ATS (Workday, SAP SuccessFactors) • Organizarea job fair-urilor cu 1000+ candidați participanți • Dezvoltarea programului Graduate pentru 30 de tineri anual" }
      ],
      educatie: [{ institutie: "Academia de Studii Economice București", perioada: "2012 – 2016", diploma: "Licență – Managementul Resurselor Umane" }],
      competente: ["Full-cycle recruitment", "LinkedIn Recruiter (Expert)", "Workday & SAP SuccessFactors", "Employee Relations", "Performance Management", "HR Analytics & Reporting", "Employer Branding", "Labor Law România"],
      limbi: ["Română (nativă)", "Engleză (fluent – C2)", "Germană (mediu – B1)"],
      certificari: ["SHRM-CP Certification", "LinkedIn Recruiter Certified", "Curs Inspector Resurse Umane – 2019"]
    }
  },
  {
    id: 5,
    job: "Operator Calculator",
    color: "#0891b2",
    accent: "#ecfeff",
    icon: "💻",
    data: {
      nume: "Gheorghe Mihai",
      titlu: "Operator Calculator / Data Entry Specialist",
      email: "mihai.gheorghe@email.ro",
      telefon: "0722 345 678",
      oras: "Timișoara",
      linkedin: "linkedin.com/in/mihai-gheorghe",
      despre: "Operator calculator cu 5 ani experiență în introducerea și procesarea datelor, cu o rată de acuratețe de 99.7%. Expert în MS Office, baze de date și sisteme ERP. Capabil să proceseze volume mari de date în termene stricte, menținând standarde înalte de calitate.",
      experienta: [
        { firma: "Ernst & Young România", perioada: "2021 – Prezent", rol: "Senior Data Entry Operator", desc: "Procesarea a 5000+ înregistrări zilnice cu acuratețe 99.7% • Administrarea bazelor de date SQL și Access • Generarea rapoartelor lunare în Excel cu tabele pivot și macro-uri • Formarea a 10 angajați noi în proceduri de lucru" },
        { firma: "Telekom România", perioada: "2018 – 2021", rol: "Operator Date", desc: "Introducerea și validarea datelor în sistemele CRM și ERP • Reconcilierea discrepanțelor în baze de date • Gestionarea arhivei electronice și fizice • Suport tehnic pentru utilizatorii interni" }
      ],
      educatie: [{ institutie: "Universitatea Politehnica Timișoara", perioada: "2014 – 2018", diploma: "Licență – Informatică Aplicată" }],
      competente: ["MS Excel (avansat – VBA, Pivot)", "MS Access & SQL", "SAP ERP", "Google Workspace", "Data Entry 95 WPM", "Procesare imagini & documente", "Atenție la detalii", "Gestionare baze de date"],
      limbi: ["Română (nativă)", "Engleză (avansat – C1)"],
      certificari: ["Microsoft Office Specialist (MOS) Excel Expert", "SAP Certified User", "Certificat Operator Introducere Date – COR 411301"]
    }
  },
  {
    id: 6,
    job: "Asistent Manager",
    color: "#9333ea",
    accent: "#faf5ff",
    icon: "📊",
    data: {
      nume: "Vasile Andreea",
      titlu: "Asistent Manager / Office Manager",
      email: "andreea.vasile@email.ro",
      telefon: "0734 567 890",
      oras: "Brașov",
      linkedin: "linkedin.com/in/andreea-vasile",
      despre: "Asistent manager proactiv cu 6 ani experiență în suport executiv și coordonare operațională. Expert în optimizarea proceselor administrative, managementul proiectelor și coordonarea echipelor cross-funcționale. Recunoscut pentru abilitatea de a anticipa nevoile managerilor și de a livra rezultate fără supervizare.",
      experienta: [
        { firma: "Dedeman SRL", perioada: "2020 – Prezent", rol: "Asistent Director General", desc: "Coordonarea operațiunilor zilnice pentru echipă de 150 angajați • Managementul bugetului departamental de 2M RON anual • Organizarea strategică a agendei executive – 100+ întâlniri/lună • Implementarea sistemului de management documente – reducere 40% timp birocratic" },
        { firma: "Holcim România", perioada: "2017 – 2020", rol: "Asistent Manager Operațional", desc: "Coordonarea proiectelor interdepartamentale cu 20+ stakeholderi • Pregătirea rapoartelor de management și prezentărilor Board • Gestionarea contractelor cu furnizorii și negocierea prețurilor • Implementarea procedurilor ISO 9001" }
      ],
      educatie: [{ institutie: "Universitatea Transilvania Brașov", perioada: "2013 – 2017", diploma: "Licență – Management" }],
      competente: ["Project Management (PMI)", "MS Office Suite (expert)", "Coordonare executivă", "Managementul bugetului", "Negociere & contracte", "Analiză & raportare business", "Leadership de echipă", "Optimizare procese"],
      limbi: ["Română (nativă)", "Engleză (C2 – fluent)", "Italiană (B1)"],
      certificari: ["PMP Certification – Project Management Institute", "ISO 9001 Lead Auditor", "Curs Management Organizațional – 2021"]
    }
  },
  {
    id: 7,
    job: "Asistent Medical",
    color: "#0d9488",
    accent: "#f0fdf4",
    icon: "🏥",
    data: {
      nume: "Munteanu Cristina",
      titlu: "Asistent Medical Generalist",
      email: "cristina.munteanu@email.ro",
      telefon: "0742 678 901",
      oras: "Cluj-Napoca",
      linkedin: "linkedin.com/in/cristina-munteanu-amg",
      despre: "Asistent medical generalist cu 8 ani experiență în îngrijirea pacienților în secții de medicină internă și urgențe. Dedicat excelenței în îngrijirea pacienților, cu abilități dovedite în gestionarea situațiilor de urgență și comunicarea empatică cu pacienții și familiile acestora.",
      experienta: [
        { firma: "Spitalul Clinic Județean Cluj", perioada: "2019 – Prezent", rol: "Asistent Medical Principal", desc: "Îngrijirea și monitorizarea a 15-20 pacienți pe tură • Administrarea tratamentelor și monitorizarea parametrilor vitali • Coordonarea echipei de 8 asistenți medicali pe tură de noapte • Implementarea protocoalelor de prevenire a infecțiilor nosocomiale – reducere 30%" },
        { firma: "Spitalul Municipal Cluj", perioada: "2015 – 2019", rol: "Asistent Medical", desc: "Pregătirea și asistarea medicilor în proceduri clinice • Recoltarea probelor biologice și interpretarea rezultatelor de bază • Educarea pacienților privind administrarea medicamentelor • Documentarea precisă în fișele medicale" }
      ],
      educatie: [
        { institutie: "UMF Iuliu Hațieganu Cluj-Napoca", perioada: "2019 – 2021", diploma: "Master – Managementul Serviciilor de Sănătate" },
        { institutie: "Colegiul Sanitar Cluj", perioada: "2012 – 2015", diploma: "Asistent Medical Generalist" }
      ],
      competente: ["Îngrijire pacienți critici", "Administrare tratamente IV/IM", "EKG & monitorizare", "Prim ajutor & BLS/ALS", "Gestionare urgențe medicale", "Documentație medicală EMR", "Comunicare empatică", "Prevenire infecții nosocomiale"],
      limbi: ["Română (nativă)", "Engleză medicală (B2)"],
      certificari: ["Certificat BLS & ALS – 2023", "Atestat Asistent Medical Principal – OAMGMAMR", "Curs Gestionare Urgențe – 2022"]
    }
  },
  {
    id: 8,
    job: "Doctor",
    color: "#1d4ed8",
    accent: "#eff6ff",
    icon: "⚕️",
    data: {
      nume: "Dr. Ionescu Alexandru",
      titlu: "Medic Specialist Medicină Internă",
      email: "dr.alexandru.ionescu@email.ro",
      telefon: "0751 789 012",
      oras: "București",
      linkedin: "linkedin.com/in/dr-alexandru-ionescu",
      despre: "Medic specialist în Medicină Internă cu 12 ani experiență clinică, cu subspecializare în boli cardiovasculare și diabet. Experiență în cercetare medicală cu 15 articole publicate în reviste indexate ISI. Dedicat îngrijirii centrate pe pacient și medicinei bazate pe dovezi.",
      experienta: [
        { firma: "Spitalul Universitar de Urgență București", perioada: "2018 – Prezent", rol: "Medic Specialist Medicină Internă", desc: "Gestionarea a 2500+ cazuri clinice anual cu rata de succes 97% • Coordonarea echipei medicale de 12 persoane în secție • Implementarea protocoalelor AHA/ESC pentru bolile cardiovasculare • 8 articole publicate în reviste medicale indexate ISI (2018-2024)" },
        { firma: "Clinica Medicover București", perioada: "2014 – 2018", rol: "Medic Specialist Ambulatoriu", desc: "Consultații și diagnosticarea afecțiunilor interne complexe • Interpretarea investigațiilor paraclinice – ecografie, EKG, CT • Colaborarea interdisciplinară cu cardiologi, endocrinologi • Programe de prevenție și educație medicală pentru pacienți" }
      ],
      educatie: [
        { institutie: "UMF Carol Davila București", perioada: "2008 – 2014", diploma: "Medic – Facultatea de Medicină Generală" },
        { institutie: "Rezidențiat Medicină Internă", perioada: "2014 – 2019", diploma: "Medic Specialist – Medicină Internă" }
      ],
      competente: ["Diagnostic clinic avansat", "Ecografie internistică", "Interpretare EKG & imagistică", "Boli cardiovasculare & diabet", "Cercetare medicală & publicații", "Protocoale AHA/ESC", "EMR/HIS Hospital Systems", "Leadership echipă medicală"],
      limbi: ["Română (nativă)", "Engleză medicală (C2)", "Franceză (B2)"],
      certificari: ["Atestat Specialist Medicină Internă – CMDR", "Certificat Ecografie Internistică – 2020", "Curs ALS Avansat – 2023", "Fellow ESC – European Society of Cardiology"]
    }
  },
  {
    id: 9,
    job: "Profesor",
    color: "#b45309",
    accent: "#fffbeb",
    icon: "📚",
    data: {
      nume: "Popa Mihaela",
      titlu: "Profesor Matematică & Informatică",
      email: "mihaela.popa@email.ro",
      telefon: "0724 890 123",
      oras: "Iași",
      linkedin: "linkedin.com/in/mihaela-popa-prof",
      despre: "Profesor cu 10 ani experiență în predarea matematicii și informaticii la nivel liceal. Pasionată de pedagogia inovatoare și tehnologiile educaționale. 95% rată de promovare a elevilor la BAC și olimpiade naționale. Expert în diferențierea instruirii și pregătirea elevilor de performanță.",
      experienta: [
        { firma: "Colegiul Național Costache Negruzzi Iași", perioada: "2018 – Prezent", rol: "Profesor Titular Matematică", desc: "Predarea matematicii claselor IX-XII – 30 ore/săptămână • 95% rată de promovare BAC Matematică (media județeană: 78%) • 12 elevi pregătiți pentru olimpiade naționale – 3 premii I • Coordonator cerc pedagogic și activități extracurriculare STEM" },
        { firma: "Liceul Teoretic Dimitrie Cantemir Iași", perioada: "2013 – 2018", rol: "Profesor Informatică", desc: "Predarea informaticii claselor X-XII (Pascal, C++, Java) • Pregătirea echipelor pentru concursurile naționale de informatică • Implementarea platformei educaționale Google Classroom • Mentorarea a 25 de elevi în proiecte de software" }
      ],
      educatie: [
        { institutie: "Universitatea Alexandru Ioan Cuza Iași", perioada: "2009 – 2013", diploma: "Licență – Matematică-Informatică" },
        { institutie: "DPPD – Iași", perioada: "2012 – 2013", diploma: "Modul Psihopedagogic Nivel II" }
      ],
      competente: ["Pedagogie inovatoare & diferențiată", "Pregătire olimpiade matematică", "Programare C++, Java, Python", "Platforme eLearning (Moodle, GClassroom)", "Evaluare formativă & sumativă", "Microsoft Teams & Office 365 Education", "Comunicare cu părinții & consiliere", "Cercetare educațională"],
      limbi: ["Română (nativă)", "Engleză (C1)", "Franceză (B1)"],
      certificari: ["Grad Didactic I – 2021", "Certificat Intel Teach to the Future", "Curs eTwinning & Proiecte Europene – 2020"]
    }
  },
  {
    id: 10,
    job: "Operator Call Center",
    color: "#0369a1",
    accent: "#f0f9ff",
    icon: "📞",
    data: {
      nume: "Radu Florentina",
      titlu: "Operator Call Center / Customer Support",
      email: "florentina.radu@email.ro",
      telefon: "0763 901 234",
      oras: "București",
      linkedin: "linkedin.com/in/florentina-radu",
      despre: "Operator call center cu 5 ani experiență în suport clienți inbound și outbound. Recunoscută pentru capacitatea de rezolvare a situațiilor dificile, menținând satisfacția clienților la 94%. Abilități excelente de comunicare verbală și gestionare a conflictelor, cu experiență în CRM și sisteme de ticketing.",
      experienta: [
        { firma: "Orange România", perioada: "2021 – Prezent", rol: "Senior Customer Care Specialist", desc: "Gestionarea a 80-100 apeluri zilnice cu timp mediu de rezolvare de 4 min • CSAT (Customer Satisfaction Score) constant peste 94% • Mentorat 12 angajați noi în proceduri de call center • Nominalizat 'Best Agent Q3 2023' din echipă de 150 agenți" },
        { firma: "Telekom România", perioada: "2019 – 2021", rol: "Operator Call Center", desc: "Suport tehnic și comercial pentru clienți rezidențiali și business • Procesarea comenzilor și reclamațiilor în Salesforce CRM • Upselling și cross-selling – depășit target cu 18% • AHT (Average Handling Time) redus cu 25% față de media echipei" }
      ],
      educatie: [{ institutie: "Universitatea din București", perioada: "2015 – 2019", diploma: "Licență – Comunicare și Relații Publice" }],
      competente: ["Comunicare verbală excelentă", "Salesforce & Zendesk CRM", "Gestionare conflicte", "Tehnici de vânzare telefonica", "Multitasking & prioritizare", "Rezolvare rapidă probleme", "Empatie & inteligență emoțională", "Raportare & analiză KPI"],
      limbi: ["Română (nativă)", "Engleză (B2)", "Franceză (A2)"],
      certificari: ["Certificat Customer Care Professional – 2022", "Curs NLP pentru Call Center – 2021", "Salesforce Certified User"]
    }
  },
  {
    id: 11,
    job: "Customer Support",
    color: "#0f766e",
    accent: "#f0fdfa",
    icon: "🎧",
    data: {
      nume: "Stoica Bianca",
      titlu: "Customer Support Specialist / Help Desk",
      email: "bianca.stoica@email.ro",
      telefon: "0774 012 345",
      oras: "Timișoara",
      linkedin: "linkedin.com/in/bianca-stoica-cs",
      despre: "Customer Support Specialist cu 4 ani experiență în suport tehnic și non-tehnic prin chat, email și telefon. Expert în platformele Zendesk și Freshdesk, cu focus pe experiența utilizatorului și rezolvarea eficientă a problemelor. CSAT mediu de 4.8/5 menținut constant.",
      experienta: [
        { firma: "UiPath România", perioada: "2022 – Prezent", rol: "Customer Support Specialist L2", desc: "Suport tehnic avansat pentru produse SaaS – 60+ tichete/zi • CSAT mediu 4.8/5 din peste 2000 evaluări • Crearea și actualizarea a 150+ articole Knowledge Base • Colaborare cu echipa de Product pentru bug reporting și feedback" },
        { firma: "eMAG România", perioada: "2019 – 2022", rol: "Customer Support Agent", desc: "Gestionarea solicitărilor clienților prin email, chat și telefon • Procesarea retururilor și reclamațiilor conform politicii companiei • Timp mediu de răspuns menținut sub 2 ore • Training în customer experience pentru 5 agenți noi" }
      ],
      educatie: [{ institutie: "Universitatea de Vest Timișoara", perioada: "2015 – 2019", diploma: "Licență – Psihologie" }],
      competente: ["Zendesk & Freshdesk (expert)", "Chat & Email Support", "Suport tehnic L1/L2", "Knowledge Base Management", "CSAT & NPS Optimization", "Empatie & comunicare clară", "Gestionare multiple canale", "Jira & ticketing systems"],
      limbi: ["Română (nativă)", "Engleză (C1 – fluent)", "Germană (A2)"],
      certificari: ["Zendesk Support Administrator", "Certificat Customer Experience – 2022", "Google Analytics Individual Qualification"]
    }
  },
  {
    id: 12,
    job: "Manager",
    color: "#1e3a5f",
    accent: "#f8fafc",
    icon: "📈",
    data: {
      nume: "Dragomir Cristian",
      titlu: "Manager Operațional / General Manager",
      email: "cristian.dragomir@email.ro",
      telefon: "0785 123 456",
      oras: "București",
      linkedin: "linkedin.com/in/cristian-dragomir-gm",
      despre: "Manager operațional cu 12 ani experiență în conducerea echipelor și optimizarea performanței business. Track record dovedit de creștere a veniturilor cu 40% și reducere a costurilor operaționale cu 25% în 3 ani. Expert în transformare organizațională, strategii de scalare și leadership de înaltă performanță.",
      experienta: [
        { firma: "Farmec SA", perioada: "2018 – Prezent", rol: "Director Operațional", desc: "Conducerea operațiunilor pentru 5 fabrici cu 1200 angajați • Creșterea cifrei de afaceri de la 120M la 168M RON (+40%) în 3 ani • Implementarea Lean Management – reducere costuri cu 25% • Transformarea digitală – implementare ERP SAP S/4HANA pentru 800 utilizatori" },
        { firma: "Ursus Breweries Romania", perioada: "2012 – 2018", rol: "Manager Producție Regional", desc: "Coordonarea producției pentru 3 fabrici din regiune • Implementarea standardelor AB InBev – reducere pierderi cu 35% • Management echipă de 300 angajați și 15 manageri de linie • Buget de investiții administrat: 15M EUR anual" }
      ],
      educatie: [
        { institutie: "INSEAD France", perioada: "2016", diploma: "Executive MBA – General Management" },
        { institutie: "Universitatea Politehnica București", perioada: "2000 – 2005", diploma: "Inginer – Inginerie Industrială" }
      ],
      competente: ["Strategic Planning & Execution", "P&L Management", "Lean & Six Sigma (Black Belt)", "Change Management", "SAP S/4HANA", "Business Development", "M&A Due Diligence", "Leadership echipe mari (500+)"],
      limbi: ["Română (nativă)", "Engleză (C2 – fluent)", "Franceză (B2)", "Germană (B1)"],
      certificari: ["Six Sigma Black Belt – ASQ", "PMP – Project Management Institute", "Lean Management Certificate – TÜV"]
    }
  },
  {
    id: 13,
    job: "Designer",
    color: "#be185d",
    accent: "#fdf2f8",
    icon: "🎨",
    data: {
      nume: "Nicolescu Diana",
      titlu: "Graphic Designer / Brand Identity Designer",
      email: "diana.nicolescu@email.ro",
      telefon: "0796 234 567",
      oras: "Cluj-Napoca",
      linkedin: "linkedin.com/in/diana-nicolescu-design",
      despre: "Designer grafic cu 6 ani experiență în brand identity, print și digital design. Portfolio de 200+ proiecte pentru clienți din retail, FMCG și tech. Recunoscută pentru creativitate distinctivă, atenție obsesivă la detalii și capacitatea de a traduce viziunea de brand în identitate vizuală memorabilă.",
      experienta: [
        { firma: "Publicis Groupe Romania", perioada: "2021 – Prezent", rol: "Senior Graphic Designer", desc: "Crearea identităților vizuale pentru 30+ branduri naționale și internaționale • Coordonarea campaniilor integrate – print, digital, outdoor, packaging • Colaborarea cu copywriteri și account managers în echipă de 25 persoane • Prezentarea conceptelor creatice direct clienților (C-level)" },
        { firma: "Freelance & Agenție Studio Creativă", perioada: "2017 – 2021", rol: "Graphic Designer", desc: "200+ proiecte livrate – logo, branding, materiale print, packaging • Clienți: Farmec, Napolact, Dacia, startup-uri tech • Crearea ghidurilor de brand și brandbook-uri complete • Motion design și animații 2D pentru social media" }
      ],
      educatie: [{ institutie: "Universitatea de Artă și Design Cluj-Napoca", perioada: "2013 – 2017", diploma: "Licență – Design Grafic" }],
      competente: ["Adobe Creative Suite (Ps, Ai, Id, Ae)", "Figma & Sketch", "Brand Identity Design", "Typography & Color Theory", "Packaging Design", "Motion Graphics (After Effects)", "Print Production", "Social Media Design"],
      limbi: ["Română (nativă)", "Engleză (C1)", "Italiană (B1)"],
      certificari: ["Adobe Certified Expert (ACE) – Photoshop", "Figma Professional – 2022", "Coursera: Branding & Identity – 2021"]
    }
  },
  {
    id: 14,
    job: "Web Developer",
    color: "#1d4ed8",
    accent: "#eff6ff",
    icon: "🌐",
    data: {
      nume: "Alexe Bogdan",
      titlu: "Full-Stack Web Developer",
      email: "bogdan.alexe@email.ro",
      telefon: "0707 345 678",
      oras: "București",
      linkedin: "linkedin.com/in/bogdan-alexe-dev",
      despre: "Full-Stack Web Developer cu 7 ani experiență în dezvoltarea aplicațiilor web scalabile. Expert în React, Node.js și cloud computing (AWS). Contribuitor activ open-source cu 2000+ stele pe GitHub. Pasionat de performanță, accesibilitate și best practices în ingineria software.",
      experienta: [
        { firma: "Bitdefender România", perioada: "2020 – Prezent", rol: "Senior Full-Stack Developer", desc: "Dezvoltarea platformei Central cu 5M+ utilizatori activi • Migrarea monolitului legacy la microservicii – reducere timp răspuns cu 60% • Implementarea CI/CD cu GitHub Actions & AWS CodePipeline • Code review și mentoring pentru 6 developeri juniori și mid-level" },
        { firma: "Roweb Development", perioada: "2016 – 2020", rol: "Full-Stack Developer", desc: "Livrarea a 40+ proiecte web pentru clienți din EU și US • Stack: React, Vue.js, Node.js, Laravel, PostgreSQL, MySQL • Implementarea arhitecturii REST API și GraphQL • Optimizare SEO și performanță (PageSpeed 90+ scor)" }
      ],
      educatie: [{ institutie: "Universitatea Politehnica București", perioada: "2012 – 2016", diploma: "Inginer – Calculatoare și Tehnologia Informației" }],
      competente: ["React & Next.js (expert)", "Node.js & Express", "TypeScript", "AWS (EC2, S3, Lambda, RDS)", "PostgreSQL & MongoDB", "Docker & Kubernetes", "GraphQL & REST API", "Git & CI/CD"],
      limbi: ["Română (nativă)", "Engleză (C2 – fluent)"],
      certificari: ["AWS Certified Developer Associate", "MongoDB Certified Developer", "Google Cloud Professional"]
    }
  },
  {
    id: 15,
    job: "Laravel Developer",
    color: "#e11d48",
    accent: "#fff1f2",
    icon: "⚡",
    data: {
      nume: "Manolescu Victor",
      titlu: "Laravel / PHP Senior Developer",
      email: "victor.manolescu@email.ro",
      telefon: "0718 456 789",
      oras: "Iași",
      linkedin: "linkedin.com/in/victor-manolescu-laravel",
      despre: "Laravel Senior Developer cu 8 ani experiență exclusivă în ecosistemul PHP/Laravel. Expert în arhitecturi REST API scalabile, pachete custom Composer și optimizarea performanței bazelor de date. Contribuitor la Laravel Ecosystem cu pachete descărcate de 50.000+ ori pe Packagist.",
      experienta: [
        { firma: "Evolvice GmbH (Remote – Germania)", perioada: "2021 – Prezent", rol: "Senior Laravel Developer", desc: "Arhitectura și dezvoltarea platformei SaaS pentru 200K utilizatori • Implementarea microserviciilor Laravel cu Queues, Events și WebSockets • Optimizarea query-urilor SQL – reducere timp execuție cu 70% • Publicarea a 3 pachete Composer cu 50K+ instalări totale" },
        { firma: "Arnia Software Iași", perioada: "2015 – 2021", rol: "PHP/Laravel Developer", desc: "Livrarea a 60+ proiecte Laravel pentru clienți din UK, US, Canada • Implementarea arhitecturii DDD și CQRS în aplicații enterprise • Integrări cu Stripe, PayPal, Twilio, Pusher, AWS S3 • TDD cu PHPUnit și Pest – coverage 85%+" }
      ],
      educatie: [{ institutie: "Universitatea Alexandru Ioan Cuza Iași", perioada: "2011 – 2015", diploma: "Licență – Informatică" }],
      competente: ["Laravel 10/11 (expert)", "PHP 8.x & Composer", "REST API & GraphQL", "MySQL & Redis optimization", "Vue.js & Alpine.js", "AWS & Laravel Forge", "PHPUnit & Pest TDD", "Docker & CI/CD"],
      limbi: ["Română (nativă)", "Engleză (C2 – technical fluent)"],
      certificari: ["Zend PHP Certified Engineer", "AWS Certified Developer", "Laracasts Pro – 500+ lecții"]
    }
  },
  {
    id: 16,
    job: "PHP Developer",
    color: "#7c3aed",
    accent: "#faf5ff",
    icon: "🐘",
    data: {
      nume: "Diaconu Radu",
      titlu: "PHP Backend Developer",
      email: "radu.diaconu@email.ro",
      telefon: "0729 567 890",
      oras: "Cluj-Napoca",
      linkedin: "linkedin.com/in/radu-diaconu-php",
      despre: "PHP Backend Developer cu 6 ani experiență în dezvoltarea sistemelor backend complexe și API-uri RESTful. Expert în arhitecturi OOP, design patterns și optimizarea performanței. Experiență solidă cu Symfony, Yii2 și integrări cu servicii terțe. Orientat spre cod curat, testabil și mentenabil.",
      experienta: [
        { firma: "NTT Data Romania", perioada: "2020 – Prezent", rol: "Senior PHP Developer", desc: "Dezvoltarea și mentenanța sistemelor backend pentru client bancar (top 5 EU) • Arhitectura API-urilor RESTful consumate de 500K+ utilizatori • Implementarea OAuth 2.0, JWT și securizarea endpoints-urilor • Code quality: SonarQube Grade A, code coverage 80%+" },
        { firma: "Tremend Software Consulting", perioada: "2017 – 2020", rol: "PHP Developer", desc: "Backend development Symfony 4/5 pentru platforme e-commerce • Integrare payment gateways: Stripe, PayU, Netopia • Optimizare Doctrine ORM – reducere queries cu 45% • Implementarea Elasticsearch pentru căutare full-text" }
      ],
      educatie: [{ institutie: "Universitatea Tehnică Cluj-Napoca", perioada: "2013 – 2017", diploma: "Licență – Calculatoare și Sisteme Informatice" }],
      competente: ["PHP 8.x OOP (expert)", "Symfony 5/6 & Doctrine", "MySQL & PostgreSQL", "Elasticsearch & Redis", "REST API & OpenAPI", "PHPUnit & Behat", "Docker & Kubernetes", "Git & GitLab CI/CD"],
      limbi: ["Română (nativă)", "Engleză (C1 – technical)"],
      certificari: ["Symfony Certification", "Zend PHP Engineer Certification", "AWS Solutions Architect Associate"]
    }
  },
  {
    id: 18,
    job: "Social Media Manager",
    color: "#e11d74",
    accent: "#fdf2f8",
    icon: "📱",
    data: {
      nume: "Florescu Ioana",
      titlu: "Social Media Manager / Digital Content Creator",
      email: "ioana.florescu@email.ro",
      telefon: "0731 112 233",
      oras: "București",
      linkedin: "linkedin.com/in/ioana-florescu-smm",
      despre: "Social Media Manager cu 5 ani experiență în crearea și gestionarea brandurilor digitale pe Instagram, TikTok, Facebook și LinkedIn. Expert în content strategy, paid social și influencer marketing. Am crescut comunități de la 0 la 150K followeri organici și am generat campanii cu ROAS de 4.8x pentru clienți din e-commerce, beauty și lifestyle.",
      experienta: [
        { firma: "Notino România", perioada: "2022 – Prezent", rol: "Senior Social Media Manager", desc: "Gestionarea canalelor Instagram (280K), TikTok (190K), Facebook (420K) • Creștere organică +85% followeri în 18 luni prin strategie de conținut video-first • Campanii paid social cu buget lunar 60.000 RON – ROAS mediu 4.8x • Coordonarea a 15+ colaborări cu influenceri (nano, micro, macro)" },
        { firma: "Agenție iCreativ Digital", perioada: "2019 – 2022", rol: "Social Media Specialist", desc: "Managementul conturilor social media pentru 12 branduri simultan • Crearea calendarelor editoriale și producerea conținutului (foto, video, Reels, TikTok) • Raportare lunară KPI: reach, engagement rate, CTR, conversii • Implementare strategii de creștere organică – medie +3.200 followeri/lună per cont" }
      ],
      educatie: [
        { institutie: "Universitatea din București", perioada: "2015 – 2019", diploma: "Licență – Marketing & Comunicare" }
      ],
      competente: ["Instagram & TikTok Strategy", "Meta Ads Manager (avansat)", "Content Creation & Reels", "Canva & Adobe Express", "Influencer Marketing", "Google Analytics 4", "Copywriting & Storytelling", "Community Management"],
      limbi: ["Română (nativă)", "Engleză (C1 – fluent)", "Italiană (A2)"],
      certificari: ["Meta Certified Digital Marketing Associate", "Google Analytics Individual Qualification", "HubSpot Social Media Certification – 2023", "Curs TikTok Ads for Business – 2023"]
    }
  },
  {
    id: 17,
    job: "Programator",
    color: "#065f46",
    accent: "#ecfdf5",
    icon: "👨‍💻",
    data: {
      nume: "Ene Sebastian",
      titlu: "Software Engineer / Programator",
      email: "sebastian.ene@email.ro",
      telefon: "0740 678 901",
      oras: "București",
      linkedin: "linkedin.com/in/sebastian-ene-dev",
      despre: "Software Engineer cu 5 ani experiență în dezvoltarea aplicațiilor enterprise. Polivalent în Python, Java și Go, cu experiență în sisteme distribuite și machine learning. Absolvent cu mențiune al Politehnicii București, contribuitor open-source activ și speaker la conferințe tech locale.",
      experienta: [
        { firma: "ING Tech Romania", perioada: "2021 – Prezent", rol: "Software Engineer", desc: "Dezvoltarea sistemelor backend pentru aplicații banking cu 2M+ utilizatori • Implementarea microserviciilor în Java Spring Boot & Go • Machine learning pipeline pentru detecția fraudelor – reducere cu 40% • Tech lead pentru echipă de 5 ingineri în proiecte agile" },
        { firma: "Adobe Romania", perioada: "2018 – 2021", rol: "Junior/Mid Software Engineer", desc: "Contribuții la platforma Adobe Experience Manager • Optimizarea algoritmilor de procesare imagini – speedup 3x • Implementarea unit și integration tests – coverage 85% • Participarea la hackathoane interne – 2 premii câștigate" }
      ],
      educatie: [
        { institutie: "Universitatea Politehnica București", perioada: "2014 – 2018", diploma: "Inginer – Calculatoare (Medie 9.75 – Cu Mențiune)" }
      ],
      competente: ["Python (Django, FastAPI)", "Java Spring Boot", "Go (Golang)", "Kubernetes & Docker", "Apache Kafka", "PostgreSQL & Redis", "Machine Learning (TensorFlow)", "Algoritmi & Structuri de Date"],
      limbi: ["Română (nativă)", "Engleză (C2 – fluent)", "Germană (A2)"],
      certificari: ["Google Professional Cloud Developer", "Oracle Java Certified Professional", "Coursera: Deep Learning Specialization – Andrew Ng"]
    }
  }
];

function CVPreview({ template, photoUrl }) {
  const { data, color } = template;
  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", maxWidth: 794, margin: "0 auto", background: "#fff", color: "#222" }}>
      {/* Header */}
      <div style={{ background: color, color: "#fff", padding: "36px 48px 28px", display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ flexShrink: 0 }}>
          {photoUrl ? (
            <img src={photoUrl} alt="Foto profil" style={{ width: 110, height: 110, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255,255,255,0.4)" }} />
          ) : (
            <div style={{ width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "4px dashed rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", cursor: "pointer" }}>
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontSize: 10, opacity: 0.8, textAlign: "center", marginTop: 4 }}>Adaugă foto</span>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>{data.nume}</h1>
          <p style={{ margin: "6px 0 14px", fontSize: 15, opacity: 0.9, fontWeight: 500 }}>{data.titlu}</p>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, opacity: 0.9 }}>
            <span>📧 {data.email}</span>
            <span>📞 {data.telefon}</span>
            <span>📍 {data.oras}</span>
            <span>🔗 {data.linkedin}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 0 }}>
        {/* Main Content */}
        <div style={{ padding: "28px 32px 28px 48px" }}>
          <Section title="Profil Profesional" color={color}>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "#444" }}>{data.despre}</p>
          </Section>

          <Section title="Experiență Profesională" color={color}>
            {data.experienta.map((exp, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#222" }}>{exp.rol}</div>
                    <div style={{ color: color, fontWeight: 600, fontSize: 13 }}>{exp.firma}</div>
                  </div>
                  <div style={{ background: color, color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12, marginTop: 2 }}>{exp.perioada}</div>
                </div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                  {exp.desc.split(" • ").map((item, j) => (
                    <li key={j} style={{ fontSize: 13, lineHeight: 1.6, color: "#555", marginBottom: 3 }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          <Section title="Educație" color={color}>
            {data.educatie.map((edu, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{edu.diploma}</div>
                    <div style={{ color: color, fontSize: 13 }}>{edu.institutie}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap", marginLeft: 12 }}>{edu.perioada}</div>
                </div>
              </div>
            ))}
          </Section>
        </div>

        {/* Sidebar */}
        <div style={{ background: "#f8f9fa", padding: "28px 24px", borderLeft: "1px solid #eee" }}>
          <SideSection title="Competențe" color={color}>
            {data.competente.map((c, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "#444", fontWeight: 500 }}>{c}</span>
                </div>
                <div style={{ height: 4, background: "#e0e0e0", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${75 + Math.random() * 25}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </SideSection>

          <SideSection title="Limbi Străine" color={color}>
            {data.limbi.map((l, i) => (
              <div key={i} style={{ fontSize: 13, color: "#555", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                {l}
              </div>
            ))}
          </SideSection>

          <SideSection title="Certificări" color={color}>
            {data.certificari.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: "#555", marginBottom: 8, padding: "6px 10px", background: "#fff", borderRadius: 6, borderLeft: `3px solid ${color}` }}>
                {c}
              </div>
            ))}
          </SideSection>
        </div>
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1, borderBottom: `2px solid ${color}`, paddingBottom: 6 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SideSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `2px solid ${color}`, paddingBottom: 5 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function CVPerfectApp() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // grid | preview
  const fileRef = useRef();

  const filtered = cvTemplates.filter(t =>
    t.job.toLowerCase().includes(search.toLowerCase()) ||
    t.data.titlu.toLowerCase().includes(search.toLowerCase())
  );

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  const handleSelect = (t) => {
    setSelectedTemplate(t);
    setView("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Top Nav */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e8ecf4", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #1a56db, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 18 }}>✦</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a", letterSpacing: "-0.5px" }}>CVPerfect</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: -2 }}>cvperfect.online</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {view === "preview" && (
              <button onClick={() => setView("grid")} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                ← Înapoi la template-uri
              </button>
            )}
            {view === "preview" && selectedTemplate && (
              <>
                <button onClick={() => fileRef.current.click()} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #1a56db", background: "#eff6ff", color: "#1a56db", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  📷 Adaugă Foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
                <button style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #1a56db, #7c3aed)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 12px rgba(26,86,219,0.3)" }}>
                  ⬇️ Descarcă PDF
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {view === "grid" ? (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-block", background: "linear-gradient(135deg, #eff6ff, #faf5ff)", border: "1px solid #c7d2fe", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "#4338ca", fontWeight: 600, marginBottom: 16 }}>
              ✦ 17 Template-uri Profesionale
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-1px", lineHeight: 1.2 }}>
              Crează CV-ul Perfect<br />
              <span style={{ background: "linear-gradient(135deg, #1a56db, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                în 5 Minute
              </span>
            </h1>
            <p style={{ fontSize: 17, color: "#64748b", margin: "0 auto 32px", maxWidth: 520, lineHeight: 1.6 }}>
              Template-uri standard european, completate cu date fictive românești și cuvinte cheie ATS optimizate pentru angajatori.
            </p>

            {/* Stats */}
            <div style={{ display: "flex", justifyContent: "center", gap: 48, marginBottom: 40 }}>
              {[["17", "Template-uri"], ["ATS", "Optimizat"], ["EU", "Standard"], ["100%", "Gratuit"]].map(([val, label]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1a56db" }}>{val}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ maxWidth: 420, margin: "0 auto", position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 16 }}>🔍</span>
              <input
                type="text"
                placeholder="Caută meserie: casier, doctor, developer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              />
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {filtered.map(template => (
              <TemplateCard key={template.id} template={template} onSelect={handleSelect} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <p>Nu am găsit template-uri pentru "{search}"</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          {/* CV Preview */}
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #e8ecf4" }}>
            {selectedTemplate && <CVPreview template={selectedTemplate} photoUrl={photoUrl} />}
          </div>

          {/* Sidebar Editor */}
          <div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", border: "1px solid #e8ecf4", marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                {selectedTemplate?.icon} Template: {selectedTemplate?.job}
              </h3>

              {/* Photo Upload */}
              <div
                onClick={() => fileRef.current.click()}
                style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: "pointer", marginBottom: 16, transition: "all 0.2s", background: photoUrl ? "#f0fdf4" : "#f8fafc" }}
              >
                {photoUrl ? (
                  <div>
                    <img src={photoUrl} alt="preview" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>✓ Fotografie adăugată</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>Adaugă fotografia ta</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>JPG, PNG – max 5MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />

              {/* Action Buttons */}
              <button style={{ width: "100%", padding: "12px", borderRadius: 10, background: `linear-gradient(135deg, ${selectedTemplate?.color}, #7c3aed)`, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, marginBottom: 10, boxShadow: `0 4px 12px ${selectedTemplate?.color}40` }}>
                ⬇️ Descarcă CV (PDF)
              </button>
              <button style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#f8fafc", color: "#374151", border: "1.5px solid #e2e8f0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                ✏️ Personalizează datele
              </button>
            </div>

            {/* Other templates */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", border: "1px solid #e8ecf4" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Alte Template-uri
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cvTemplates.filter(t => t.id !== selectedTemplate?.id).slice(0, 6).map(t => (
                  <button key={t.id} onClick={() => handleSelect(t)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #f1f5f9", background: "#fafbfc", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{t.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.job}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.data.titlu}</div>
                    </div>
                  </button>
                ))}
                <button onClick={() => setView("grid")} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: 13 }}>
                  + Toate template-urile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e8ecf4", background: "#fff", padding: "24px", textAlign: "center", marginTop: 48 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
          © 2025 CVPerfect.online — Template-uri CV Standard European | ATS Optimizat
        </p>
      </footer>
    </div>
  );
}

function TemplateCard({ template, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const { data, color, icon, job } = template;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: `1.5px solid ${hovered ? color : "#e8ecf4"}`, boxShadow: hovered ? `0 12px 32px ${color}25` : "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.25s", cursor: "pointer" }}
    >
      {/* Card Header Preview */}
      <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, padding: "20px 20px 16px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {icon}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{data.nume}</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{job}</div>
          </div>
        </div>
        {/* Mini CV lines */}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
          {["80%", "60%", "90%", "70%"].map((w, i) => (
            <div key={i} style={{ height: 4, width: w, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />
          ))}
        </div>
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#fff", fontWeight: 600 }}>
          ATS ✓
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: "16px 20px 20px" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{data.titlu}</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          {data.despre.slice(0, 90)}...
        </p>

        {/* Skills Preview */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
          {data.competente.slice(0, 3).map((c, i) => (
            <span key={i} style={{ padding: "3px 8px", background: `${color}12`, color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {c.split(" ")[0]}
            </span>
          ))}
          <span style={{ padding: "3px 8px", background: "#f1f5f9", color: "#64748b", borderRadius: 20, fontSize: 11 }}>
            +{data.competente.length - 3} mai multe
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => onSelect(template)}
          style={{ width: "100%", padding: "10px", borderRadius: 10, background: hovered ? color : "#f8fafc", color: hovered ? "#fff" : "#374151", border: `1.5px solid ${hovered ? color : "#e2e8f0"}`, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}
        >
          {hovered ? "✦ Utilizează acest template" : "Previzualizează →"}
        </button>
      </div>
    </div>
  );
}
