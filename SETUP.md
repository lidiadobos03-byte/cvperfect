# 🚀 CVPerfect — Ghid Setup Stripe + Render
## De la zero la prima vânzare în ~30 minute

---

## PASUL 1 — Configurează Stripe (5 minute)

### 1a. Obține cheile API
1. Mergi la **stripe.com/dashboard**
2. Click pe **Developers → API Keys**
3. Copiază:
   - `Publishable key` → pk_live_... (nu o folosim în backend)
   - **`Secret key`** → `sk_live_...` ← asta o pui în Render

> ⚠️ Pentru teste folosește `sk_test_...` și `pk_test_...`

### 1b. Creează Webhook
1. **Developers → Webhooks → Add endpoint**
2. URL: `https://NUMELE-TÅU.onrender.com/webhook`
3. Events: bifează **`checkout.session.completed`**
4. Click **Add endpoint**
5. Copiază **Signing secret** → `whsec_...` ← asta e `STRIPE_WEBHOOK_SECRET`

### 1c. Activează RON ca valută
1. **Settings → Business settings → Bank accounts and currencies**
2. Adaugă **RON**

---

## PASUL 2 — Deploy Backend pe Render (10 minute)

### 2a. Creează serviciul
1. Mergi la **render.com → New → Web Service**
2. Conectează repo-ul tău GitHub cu folderul `cvperfect-backend`
3. Setări:
   - **Name**: `cvperfect-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (suficient la început)

### 2b. Adaugă Environment Variables în Render
Click pe **Environment → Add Environment Variable**:

```
STRIPE_SECRET_KEY      = sk_live_CHEIA_TA
STRIPE_WEBHOOK_SECRET  = whsec_SECRETUL_TAU
FRONTEND_URL           = https://cvperfect.online
PORT                   = 4000
```

### 2c. Notează URL-ul backend-ului
După deploy, Render îți dă un URL de forma:
`https://cvperfect-backend.onrender.com`

---

## PASUL 3 — Actualizează Frontend (2 minute)

În fișierul `cvperfect.jsx`, linia ~35, schimbă:
```javascript
const API_URL = "https://cvperfect-backend.onrender.com";
// ^^^^^ pune URL-ul exact din Render
```

---

## PASUL 4 — Testează plata (5 minute)

### Folosește carduri de test Stripe:
| Card | Rezultat |
|------|----------|
| `4242 4242 4242 4242` | ✅ Plată reușită |
| `4000 0000 0000 9995` | ❌ Fonduri insuficiente |
| `4000 0025 0000 3155` | 🔐 Necesită 3D Secure |

- **Data expirare**: orice dată viitoare (ex: 12/28)
- **CVC**: orice 3 cifre (ex: 123)

### Flow de test:
1. Deschide cvperfect.online
2. Alege un template → click **Descarcă PDF — 19 RON**
3. Completează cu cardul de test
4. Ar trebui să revii pe site cu banner verde ✅
5. Verifică în **Stripe Dashboard → Payments** că a apărut plata

---

## PASUL 5 — Activează plăți reale

1. În Stripe Dashboard → **Activate your account**
2. Completează datele firmei/PFA
3. Înlocuiește `sk_test_...` cu `sk_live_...` în Render
4. Gata — primești bani reali! 💰

---

## Structura finală

```
cvperfect.online (Render - React)
    ↓ POST /create-checkout
cvperfect-backend.onrender.com (Render - Node.js)
    ↓ Stripe Checkout (stripe.com)
    ↓ redirect success
cvperfect.online?payment=success&session_id=xxx
    ↓ GET /verify-payment
    ↓ PDF deblocat ✅
```

---

## FAQ

**Q: Ce se întâmplă dacă userul închide browserul după plată?**
A: Nu-i problemă — session_id rămâne în URL history. Dacă revine cu același link, verificarea merge.

**Q: Pot oferi și PDF-ul EN în același preț?**
A: Da! Odată marcat `paid = true` în sesiune, butonul RO și EN sunt ambele deblocate.

**Q: Render Free adoarme după 15 min inactivitate.**
A: Adevărat. Upgradeaza la Render Starter ($7/lună) când ai primele vânzări, sau folosește un cron job gratuit (cron-job.org) să pingeze `/health` la fiecare 10 min.

**Q: Cum văd vânzările?**
A: `https://cvperfect-backend.onrender.com/stats` — sau direct în Stripe Dashboard.

---

## Support
Dacă ceva nu merge → check logs în Render Dashboard → **Logs**
