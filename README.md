# cvperfect

## Project structure

/frontend
- app/ -> paginile site-ului (App Router)
- app/components/ -> componente reutilizabile (Navbar, Footer, Buttons, Cards)
- app/lib/ -> functii utile (Stripe client, fetch helpers)
- app/styles/ -> CSS / Tailwind config
- app/api/ -> doar daca vrei sa folosesti API Routes in loc de backend separat
- public/ -> imagini, favicon
- package.json
- next.config.js
- tsconfig.json

## Notes
- This repo currently contains a minimal scaffold to match the structure above.

## Backend (Node + Express)

/backend
- src/ -> codul backend-ului
- src/routes/ -> rutele API (plati, webhook, generare PDF)
- src/controllers/ -> logica fiecarei rute
- src/utils/ -> functii pentru Stripe, PDF, email
- src/server.ts -> serverul Express
- package.json
- tsconfig.json

## ENV (chei si configurari)

/.env

Frontend (`frontend/.env`)
- NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
- API_URL=https://backend-ul-tau.onrender.com

Backend (`backend/.env`)
- STRIPE_SECRET_KEY=
- STRIPE_WEBHOOK_SECRET=
- FRONTEND_URL=https://cvperfect.online

## Deploy pe Render

Vei avea doua servicii:
- Frontend -> Static Site sau Web Service (Next.js)
- Backend -> Web Service (Node)

Domeniul il conectam la frontend.
Backend-ul il legam prin `API_URL` in frontend.
