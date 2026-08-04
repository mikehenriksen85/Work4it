# Firebase-opsætning

## Projekt og targets

Firebase CLI bruger automatisk projektet `workout-b55ed` via `.firebaserc`.

```bash
firebase use
firebase target
```

Forventet output er projektet `workout-b55ed` samt hosting-targets:

- `app` → `work4it-app`
- `website` → `workout-b55ed`

## Klienttjenester

`app/firebase-config.js` initialiserer én Firebase App og eksporterer:

- Authentication
- Firestore
- Functions i `europe-west1`
- Cloud Storage

Email/password- og Google-login håndteres i `app/auth-service.js`. Aktiverede
providers og autoriserede domæner kontrolleres i Firebase Console; de kan ikke
udledes fuldstændigt af repositoryet alene.

## Firestore

- Regler: `firestore.rules`
- Indekser: `firestore.indexes.json`
- Primært repository: `app/firestore-cloud-service.js`

Brugerdata ligger under `users/{uid}`. Fælles prisdata ligger i
`appConfig/pricing`, og animationsmetadata ligger i `exerciseAnimations`.

Regler og indekser må kun deployes efter lokal test og eksplicit godkendelse:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project workout-b55ed
```

## Storage

`storage.rules` tillader autentificeret læsning af godkendte øvelsesanimationer.
Kun den permanente administrator kan skrive de validerede animation- og thumbnailtyper.

## Functions og secrets

Functions bruger Node.js 22 og regionen `europe-west1`. Følgende secrets findes:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

De sættes med Firebase CLI og må aldrig skrives i Git:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project workout-b55ed
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project workout-b55ed
```

## App Check

Klienten initialiserer aktuelt ikke App Check, og callable Functions håndhæver ikke
`enforceAppCheck`. Før offentlig skalering bør App Check konfigureres i Firebase
Console, indføres i klienten og aktiveres gradvist på callable endpoints efter test.

## Lokal verifikation

```bash
npm install
npm start
npm run test:cloud-storage
npm run test:subscriptions
```

Deploy udføres aldrig automatisk som del af almindelig udvikling.
