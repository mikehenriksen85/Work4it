# Work4it-arkitektur

Dette dokument beskriver den nuværende produktionsarkitektur. Det er en
strukturreference og ændrer ikke appens dataflow.

## Overblik

Work4it består af tre selvstændige dele:

1. `app/` er den kanoniske PWA og Firebase Hosting-kilde for target `app`.
2. `functions/` indeholder Cloud Functions til Stripe, administratorværktøjer og øvelsesanimationer.
3. `website/` indeholder det separate offentlige website og juridiske dokumenter.

`public/` er den officielle kilde til billeder og lyde. Scriptet
`scripts/sync-official-assets.cjs` kopierer de nødvendige assets til deploy-mapperne før hosting.

## Klient

Klienten er en browserbaseret JavaScript-app uden buildtrin. `app/index.html`
indlæser funktionsmodulerne direkte, og `app/service-worker.js` leverer offline app-shell.

Vigtige lag:

- UI og navigation: `app/index.html`, `app/modern-dashboard-ui.js`, `app/modern-dashboard-ui.css`
- Authentication: `app/firebase-config.js`, `app/auth-service.js`, `app/auth-gate.js`
- Cloud-data: `app/firestore-cloud-service.js`
- Lokal fallback og brugerafgrænsning: `app/storage-scope.js`
- Programmer: `app/workout-program-store.js`, `app/training-goal-engine.js`
- Medlemskab og Stripe-klient: `app/membership.js`, `app/stripe-checkout.js`

## Dataflow

Når en Firebase-bruger er autentificeret, er Firestore den primære lagring.
Lokale browserdata fungerer som cache og offline-fallback. Brugerdata ligger under
`users/{uid}` og underliggende samlinger. Security Rules kontrollerer ejerskab med
Firebase Authentication UID.

Stripe Checkout oprettes gennem callable Functions. Webhooken opdaterer medlemskab
server-side. Stripe-hemmeligheder leveres som Firebase Functions secrets og må ikke
ligge i klientkode eller miljøfiler i Git.

## Firebase

- Projekt: `workout-b55ed`
- Functions-region: `europe-west1`
- Hosting-target `app`: `work4it-app`
- Hosting-target `website`: `workout-b55ed`
- Firestore-regler: `firestore.rules`
- Firestore-indekser: `firestore.indexes.json`
- Storage-regler: `storage.rules`

Se [Firebase-opsætning](docs/FIREBASE_SETUP.md).

## Mapper

```text
app/          Kanonisk PWA og hosting-kilde
functions/    Firebase Cloud Functions
public/       Officielle grafiske assets og lyde
scripts/      Kontrollerede projekt- og synkroniseringsscripts
tests/        Node-baserede kontrakt- og regressionstests
docs/         Aktiv teknisk dokumentation
website/      Separat offentligt website og juridiske dokumenter
```

## Kendt teknisk gæld

Projektroden indeholder ældre kopier af flere filer, som også findes i `app/`.
Firebase deployer kun `app/`, og root-kopierne må derfor ikke ændres eller slettes,
før en særskilt reference- og regressionskontrol har bekræftet, at ingen eksterne flows
bruger dem. Nye ændringer skal foretages i `app/`.
