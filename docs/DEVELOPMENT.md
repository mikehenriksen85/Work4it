# Udviklingsvejledning

## Branch-model

- `main` er stabil produktionsgren.
- `develop` er aktiv integrations- og udviklingsgren.
- Funktioner og rettelser udvikles på korte branches fra `develop`.
- En release går fra `develop` til `main` efter tests og manuel godkendelse.

Forslag til branch-navne:

- `feature/kort-beskrivelse`
- `fix/kort-beskrivelse`
- `docs/kort-beskrivelse`

Direkte commits til `main` bør blokeres med branch protection på GitHub.

## Lokal opstart

Krav: Node.js 22 og npm.

```bash
npm install
npm start
```

Appen åbnes på `http://127.0.0.1:8767/app/index.html`.

## Tests

Projektet har separate testpakker:

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

Der findes endnu ikke TypeScript-, ESLint-, Prettier- eller samlet buildkontrol.
De bør indføres trinvist uden at omskrive forretningslogikken.

## Arbejdsregler

1. Nye klientændringer foretages i `app/`, ikke i de ældre root-kopier.
2. Firestore-paths ændres sammen med Security Rules og relevante tests.
3. Hemmeligheder gemmes som Firebase secrets, aldrig i `.env` eller kildekode.
4. `public/` er den officielle asset-kilde; kør `npm run sync:assets` ved assetændringer.
5. Deploy, commit og push udføres kun efter eksplicit bestilling.

## Firebase

Se [FIREBASE_SETUP.md](FIREBASE_SETUP.md). `.firebaserc` binder CLI til det korrekte
projekt, men kontrollér altid `firebase use` før manuelle produktionskommandoer.

## Release-kontrol

Før merge til `main`:

- arbejdstræet indeholder kun tilsigtede filer;
- alle relevante tests består;
- PWA-manifest og service worker er konsistente;
- Firestore-/Storage-regler er gennemgået ved dataændringer;
- ingen `.env`, cachefiler, backupkoder eller genererede filer er staged;
- deployment sker separat efter merge og manuel godkendelse.
