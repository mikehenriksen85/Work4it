"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const wizardSource = fs.readFileSync("app/wizard-store.js", "utf8");
const profileSource = fs.readFileSync("app/profile-account.js", "utf8");
const cloudSource = fs.readFileSync("app/firestore-cloud-service.js", "utf8");
const html = fs.readFileSync("app/index.html", "utf8");
const serviceWorker = fs.readFileSync("app/service-worker.js", "utf8");

function createStore({ user = { uid: "uid-1" }, cloudSave = async () => true } = {}) {
  const values = new Map();
  const events = [];
  const localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const window = {
    dispatchEvent: event => events.push(event),
    FirebaseAuthService: { getCurrentUser: () => user },
    FirestoreDataService: { saveProfileToCloud: cloudSave }
  };
  const sandbox = { window, localStorage, CustomEvent, Date, console };
  vm.createContext(sandbox);
  vm.runInContext(wizardSource, sandbox);
  return { store: window.TrainingWizardStore, values, events };
}

(async () => {
  let cloudProfile = null;
  const success = createStore({ cloudSave: async profile => { cloudProfile = profile; return true; } });
  const saved = await success.store.saveProfileAndSync({ name: "Mike", goal: "strength", trainingGoals: { primary: "strength" } });
  const localProfile = JSON.parse(success.values.get("training_profile_v1"));
  assert.equal(localProfile.name, "Mike", "profile is saved locally first");
  assert.equal(cloudProfile.name, "Mike", "the same normalized profile is sent directly to Cloud");
  assert.equal(saved.updatedAt, cloudProfile.updatedAt);

  const failed = createStore({ cloudSave: async () => { const error = new Error("offline"); error.code = "firestore/unavailable"; throw error; } });
  await assert.rejects(() => failed.store.saveProfileAndSync({ name: "Offline", goal: "strength", trainingGoals: { primary: "strength" } }), /offline/);
  assert.equal(JSON.parse(failed.values.get("training_profile_v1")).name, "Offline", "local profile survives a real network failure");

  const signedOut = createStore({ user: null });
  await assert.rejects(() => signedOut.store.saveProfileAndSync({ name: "Local", goal: "strength", trainingGoals: { primary: "strength" } }), /gyldigt login/);
  assert.equal(JSON.parse(signedOut.values.get("training_profile_v1")).name, "Local");

  assert.match(cloudSource, /const pendingInitialization = initializationByUid\.get\(uid\);[\s\S]*?if \(!isPermissionDenied\(error\)\) throw error;[\s\S]*?await refreshFirestoreAuth\(operation, uid\)/);
  assert.match(cloudSource, /async function saveProfileToCloud\(profile\) \{\s+const uid = await requireCloudUser\("Profilgemning"\)/);
  assert.match(cloudSource, /PATHS\.profile\(uid\)/);
  assert.match(cloudSource, /reportFirestoreError\("saveProfileToCloud", path, error, uid\)/);
  assert.match(cloudSource, /if \(\["offline", "error"\]\.includes\(cloudState\)\)[\s\S]*?await saveProfileToCloud\(pendingProfile\)/);
  assert.match(cloudSource, /localFingerprint = currentLocalFingerprint\(\);\s+window\.dispatchEvent\(new CustomEvent\("firestore:sync-completed"/);
  const fingerprintWatcher = cloudSource.match(/window\.setInterval\(\(\) => \{[\s\S]*?\}, 2000\);/)?.[0] || "";
  assert.doesNotMatch(fingerprintWatcher, /localFingerprint = next/, "failed syncs remain pending for retry");

  assert.match(profileSource, /Gemmer profil lokalt og i Cloud/);
  assert.match(profileSource, /✔ Profil gemt lokalt og i Cloud/);
  assert.match(profileSource, /\[Work4it profil\] Cloud-gemning mislykkedes/);
  assert.match(profileSource, /users\/\$\{window\.FirebaseAuthService/);
  assert.match(html, /wizard-store\.js\?v=20260718-profile-cloud1/);
  assert.match(html, /profile-account\.js\?v=20260810-user-menu1/);
  assert.match(html, /firestore-cloud-service\.js\?v=20260823-ai-program-save1/);
  assert.match(html, /service-worker\.js\?v=20260823-ai-coach-program1/);
  assert.match(serviceWorker, /work4it-shell-v151-ai-coach-program1/);

  const profileSections = ["personal", "account", "security", "training", "privacy", "settings"];
  const panels = profileSections.map(section => ({
    dataset: { profileAccountSection: section }, hidden: false, attributes: {},
    classList: { toggle() {} }, setAttribute(name, value) { this.attributes[name] = String(value); }
  }));
  const tabs = profileSections.map(section => ({
    dataset: { profileAccountTab: section }, tabIndex: -1, attributes: {}, focused: false,
    setAttribute(name, value) { this.attributes[name] = String(value); },
    focus() { this.focused = true; }, closest() { return this; }
  }));
  const sectionStorage = new Map();
  const sectionStorageApi = {
    getItem: key => sectionStorage.get(key) ?? null,
    setItem: (key, value) => sectionStorage.set(key, String(value))
  };
  const profileUiWindow = {
    addEventListener() {}, clearTimeout() {}, setTimeout() {}, requestAnimationFrame(callback) { callback(); },
    Work4itIcons: { hydrate() {} }
  };
  const profileUiDocument = {
    getElementById: () => null,
    querySelectorAll(selector) {
      if (selector === "[data-profile-account-section]") return panels;
      if (selector === "[data-profile-account-tab]") return tabs;
      return [];
    }
  };
  const profileUiSandbox = {
    window: profileUiWindow, document: profileUiDocument,
    localStorage: sectionStorageApi, sessionStorage: sectionStorageApi,
    console, URL, Blob, Date
  };
  vm.createContext(profileUiSandbox);
  vm.runInContext(profileSource, profileUiSandbox);
  assert.equal(profileUiWindow.selectProfileAccountSection("security"), "security");
  assert.equal(panels.find(panel => panel.dataset.profileAccountSection === "security").hidden, false);
  assert.equal(panels.filter(panel => !panel.hidden).length, 1, "only the selected profile section is visible");
  assert.equal(tabs.find(tab => tab.dataset.profileAccountTab === "security").attributes["aria-selected"], "true");
  assert.equal(sectionStorage.get("work4it:profileAccountSection"), "security", "selected profile section persists for resume");
  profileUiWindow.handleProfileAccountTabKey({ key: "ArrowRight", target: tabs[2], preventDefault() {} });
  assert.equal(panels.find(panel => panel.dataset.profileAccountSection === "training").hidden, false, "keyboard navigation selects the next section");
  assert.equal(tabs[3].focused, true);

  console.log("Profile local-first and confirmed Cloud-save scenarios passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
