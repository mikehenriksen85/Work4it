# Screenshot-import

Work4its screenshot-import er en valideret hybridpipeline:

1. Billedet forbehandles lokalt (opskalering, gråtoner, kontrast og automatisk inversion af mørke screenshots).
2. Tesseract OCR kører lokalt i browseren. Ved lav kvalitet køres både den forbehandlede og originale variant, og det bedste semantiske resultat vælges.
3. OCR-teksten fortolkes af `interpretWorkoutScreenshotOcr` i Cloud Functions med Vertex AI Gemini.
4. Modeloutput valideres igen i browseren. Øvelser skal findes i Work4its katalog, og sæt/reps/kg/pause accepteres kun, når modellens evidenslinje indeholder værdierne.
5. Hvis AI-funktionen ikke er tilgængelig, fortsætter flowet med den lokale semantiske parser.
6. Brugeren godkender previewet. Først derefter oprettes programmet og gemmes lokalt samt i Firestore.

## Model og aktivering

Cloud Function bruger Googles officielle `@google/genai` SDK, Application Default Credentials og modellen `gemini-2.5-flash`. Der gemmes ingen API-nøgle i klienten eller Git.

Før funktionen deployes første gang:

- Aktivér Vertex AI API i Firebase-/Google Cloud-projektet `workout-b55ed`.
- Giv Cloud Functions' runtime-servicekonto rollen `Vertex AI User`.
- Deploy Cloud Functions med `firebase deploy --only functions`.

Kun OCR-teksten sendes til funktionen; billedfilen forlader ikke browseren. Rå OCR-tekst skrives ikke til Functions-loggen. Loggen indeholder kun hash, confidence og antal fundne dage/øvelser.

## Matching og læring

- Eksakte navne, kontrollerede synonymer, forkortelser og høj-sikker fuzzy matching kan auto-matches.
- Tvetydige navne viser højst tre primære forslag og auto-matches ikke.
- Ved godkendelse gemmes brugerens OCR-navn → katalog-navn mapping i importposten under `users/{uid}/imports/{importId}`.
- De godkendte mappings genbruges ved senere imports. Grundmodellen ændres eller trænes ikke.

## Fallbacks

- Manglende antal sæt giver præcis 1 tydeligt markeret fallback-sæt.
- Manglende reps, kg eller pause forbliver tomme.
- Et modelresultat kan aldrig omgå Work4its katalog- eller evidensvalidering.
