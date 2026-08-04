# Work4it

Work4it er en dansk, mobile-first PWA til planlægning, registrering og analyse
af styrke-, cardio- og calisthenicstræning.

## Centrale funktioner

- Oprettelse, import og AI-generering af træningsprogrammer
- Aktiv træning med sæt, kg, reps, tid, pause og autosave
- Firestore som primær cloudlagring med lokal offline-fallback
- Firebase Authentication med email/password og Google-login
- Historik, statistik, kropsmål, progression, volumen og estimeret 1RM
- AI Coach og målbaseret programtilpasning
- Stripe Checkout, webhookbaseret medlemskab og administrator-testflow
- Interne øvelsesanimationer og PWA-cache
- Responsivt Modern Dashboard UI til mobil, tablet og desktop

## Kom hurtigt i gang

Krav: Node.js 22 og npm.

```bash
npm install
npm start
```

Åbn derefter:

```text
http://127.0.0.1:8767/app/index.html
```

## Projektstruktur

```text
app/          Kanonisk PWA og Firebase Hosting-kilde
functions/    Firebase Cloud Functions
public/       Officielle billeder og lyde
scripts/      Asset- og projektværktøjer
tests/        Kontrakt- og regressionstests
docs/         Teknisk dokumentation
website/      Separat offentligt website og juridiske dokumenter
```

Firebase Hosting deployer `app/`. Flere ældre filer findes stadig i projektroden;
de er dokumenteret som teknisk gæld og må ikke bruges til nye ændringer.

Se [ARCHITECTURE.md](ARCHITECTURE.md) for dataflow og komponentansvar.

## Branch-model

- `main`: stabil produktionsgren
- `develop`: aktiv udviklings- og integrationsgren
- korte `feature/*`, `fix/*` og `docs/*` branches oprettes fra `develop`

Se [udviklingsvejledningen](docs/DEVELOPMENT.md).

## Tests

Kør de relevante pakker før merge:

```bash
npm run test:ai-coach
npm run test:subscriptions
npm run test:cloud-storage
npm run test:dashboard
npm run test:animations
npm run test:completion-analysis
npm run test:progression
npm run test:assets
```

## Firebase

Firebase CLI er bundet til projektet `workout-b55ed` gennem `.firebaserc`.
Applikationen bruger Authentication, Firestore, Functions, Storage og to Hosting-targets.

```bash
firebase use
firebase target
```

Se [Firebase-opsætningen](docs/FIREBASE_SETUP.md) før ændringer af regler,
Functions, secrets eller hosting.

## Miljø og secrets

Repositoryet kræver ikke lokale klienthemmeligheder. Stripe-nøgler administreres som
Firebase Functions secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

`.env`, `.env.local` og produktionsvarianter ignoreres af Git. `.env.example`
indeholder kun variabelnavne og må aldrig indeholde værdier.

## Sikkerhed

- Firestore-regler: `firestore.rules`
- Storage-regler: `storage.rules`
- Firestore-indekser: `firestore.indexes.json`
- Licens: [MIT](LICENSE)

App Check er endnu ikke integreret og er dokumenteret som en prioriteret
sikkerhedsforbedring i Firebase-vejledningen.

## Deployment

Deployment udføres manuelt og separat fra almindelig udvikling. Kontrollér altid
aktivt projekt og target før en deployment. Der deployes aldrig automatisk fra denne
dokumentation.
