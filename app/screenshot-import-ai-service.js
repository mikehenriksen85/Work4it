import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-functions.js";
import { functions } from "./firebase-config.js";

const interpretCallable = httpsCallable(functions, "interpretWorkoutScreenshotOcr", { timeout: 90_000 });

async function interpret(payload) {
  const user = window.FirebaseAuthService?.getCurrentUser?.() || null;
  if (!user?.uid) {
    const error = new Error("Log ind for at bruge AI-fortolkning. Den lokale semantiske parser fortsætter automatisk.");
    error.code = "unauthenticated";
    throw error;
  }
  const response = await interpretCallable(payload);
  const data = response?.data || {};
  if (!data?.result || data.modelUsed !== true) throw new Error("AI-funktionen returnerede ikke et validerbart resultat.");
  return data;
}

window.Work4itScreenshotAI = Object.freeze({ interpret });
