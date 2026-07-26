"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("app/index.html", "utf8");
const source = fs.readFileSync("app/modern-dashboard-ui.js", "utf8");
const iconSource = fs.readFileSync("app/work4it-icons.js", "utf8");
const css = fs.readFileSync("app/modern-dashboard-ui.css", "utf8");
const profile = fs.readFileSync("app/profile-account.js", "utf8");
const helpContent = fs.readFileSync("app/help-content-config.js", "utf8");
const screenshotImport = fs.readFileSync("app/screenshot-import.js", "utf8");
const menuManager = fs.readFileSync("app/workit-menu-manager.js", "utf8");
const authGate = fs.readFileSync("app/auth-gate.js", "utf8");
const serviceWorker = fs.readFileSync("app/service-worker.js", "utf8");

new Function(source);
new Function(iconSource);

for (const id of [
  "modernDashboardUI", "modernDashboardTitle", "modernIconRail", "modernFeaturePanel",
  "modernCardGrid", "modernToolPanel", "modernBottomNav", "programGeneratorAccess",
  "savedDropdown", "savedSelect", "trashDropdown", "trashItems", "membershipNavStatus",
  "savedProgramsView", "savedProgramsViewTitle", "savedProgramsViewSelect",
  "savedProgramsViewList", "savedProgramsViewEmpty", "savedProgramsViewCount",
  "programCreationView", "programCreationViewTitle", "programType", "automaticExerciseCount",
  "countPicker", "cardioGoalPicker", "calisthenicsTemplatePicker"
]) {
  assert.equal((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1, `${id} must be unique`);
}

assert.doesNotMatch(html, /id="sidebar"|class="sidebar"|home-dashboard|id="homeDashboard"|work4it_ui_layout|data-ui-layout|changeAppLayout|Classic UI/);
assert.doesNotMatch(source, /work4it_ui_layout|DEFAULT_LAYOUT|setLayout|getLayout|MutationObserver|homeDashboard|toggleSidebar/);
assert.doesNotMatch(profile, /work4it-layout|changeAppLayout|layoutSettingFeedback|work4it:layout-changed/);
assert.doesNotMatch(menuManager, /sidebar|toggleSidebar|WorkitMenuView/);
assert.doesNotMatch(css, /data-ui-layout|home-dashboard|\.sidebar/);

for (const category of ["user", "training", "more"]) {
  assert.match(html, new RegExp(`data-modern-category="${category}"`));
  assert.match(source, new RegExp(`${category}: \\{`));
}
assert.equal((html.match(/data-modern-category=/g) || []).length, 3, "Modern UI has exactly three primary categories");

for (const handler of [
  "openProfileSetup", "openProfileWizardFromMenu", "openMembershipView", "openBlankWorkoutDialog",
  "openModernProgramGenerator", "openModernSavedPrograms", "continueDashboardWorkout", "startDashboardWorkout",
  "openDashboard", "openProgressView", "openCalorieView", "openAiCoach", "openScreenshotImportInfo",
  "exportDataFromMenu", "openHelpAboutDialog", "logoutProfileAccount", "openModernTrash"
]) assert.match(source, new RegExp(handler), `Modern UI reuses ${handler}`);

assert.match(source, /Work4itDashboardRuntime\?\.getSnapshot/);
assert.doesNotMatch(source, /FirestoreDataService|FirebaseAuthService|\bfetch\(|XMLHttpRequest/, "Modern UI does not introduce a competing data flow");
assert.match(source, /Forbereder dit dashboard/);
assert.match(source, /state\.view\.featuredWorkout/);
assert.match(source, /data\.view\?\.activeWorkout/);
assert.match(source, /function visibleActions\(\)/);
assert.match(source, /actions\.filter\(action => !action\.activeOnly \|\| hasActiveWorkout\)/);
assert.match(source, /return active \? \[active, \.\.\.visible\.filter\(action => action\.id !== "active"\)\] : visible/);
assert.match(source, /rail\.hidden = activeCategory === "training"/);
assert.match(source, /panel\.hidden = activeCategory === "training"/);
assert.doesNotMatch(html, /Hurtig adgang|modernShortcutsTitle|modern-shortcuts/);
assert.match(source, /\{ id: "today"[\s\S]*?\{ id: "saved"[\s\S]*?\{ id: "generator"/);
assert.match(source, /function openModernSavedPrograms\(/);
assert.match(source, /openSurface\?\.\("saved-programs-view"/);
assert.match(source, /trainingDashboardScrollPosition = window\.scrollY/);
assert.match(source, /window\.scrollTo\(\{ top: trainingDashboardScrollPosition, behavior: "auto" \}\)/);
assert.match(source, /function renderSavedProgramsView\(/);
assert.match(source, /data-saved-program-id=/);
assert.match(source, /window\.loadSavedProgram\?\.\(id\)/);
const savedProgramsHandler = source.match(/function openModernSavedPrograms\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
assert.doesNotMatch(savedProgramsHandler, /scrollIntoView/, "Mine programmer opens as a view instead of scrolling the dashboard");
assert.match(html, /class="saved-programs-view"/);
assert.match(html, /aria-label="Tilbage til Træning"/);
assert.match(html, />Vælg et gemt træningspas</);
assert.match(html, />Gemte programmer</);
assert.match(source, />Åbn og redigér</);
assert.match(html, /savedProgramsView[\s\S]*?tabindex="-1"/);
assert.match(html, /\["profile", "membership", "progress", "calorie", "dashboard", "today", "program", "session", "saved-programs", "create-program"\]/);
assert.match(html, /view === "saved-programs"[\s\S]*?openModernSavedPrograms/);
assert.match(authGate, /"saved-programs"/);
assert.match(menuManager, /\.saved-programs-view\.open/);
assert.match(source, /function openModernProgramGenerator\(/);
assert.match(source, /openSurface\?\.\("program-creation-view"/);
assert.match(source, /function closeProgramCreationView\(/);
const programCreationHandler = source.match(/function openModernProgramGenerator\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
assert.doesNotMatch(programCreationHandler, /openToolPanel|scrollIntoView/, "Program creation opens as a full view instead of scrolling the dashboard");
assert.match(html, /class="program-creation-view"/);
assert.match(html, /id="programCreationViewTitle" tabindex="-1">Opret nyt træningspas</);
assert.match(html, /programCreationView[\s\S]*?id="programGeneratorAccess"/);
assert.match(html, /view === "create-program"[\s\S]*?openModernProgramGenerator/);
assert.match(html, /closeProgramCreationView\?\.\(\{ restoreScroll: false, persist: false \}\)/);
assert.match(authGate, /"create-program"/);
assert.match(menuManager, /\.program-creation-view\.open/);
assert.match(source, /function openModernTrash\(/);
assert.match(source, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/, "Horizontal tabs support keyboard navigation");
assert.match(source, /class="modern-mini-card/);
assert.match(source, /data-modern-open=/);
assert.match(source, /class="modern-mini-card-label"/);
assert.doesNotMatch(source, /<small>\$\{escapeHtml\(state\.meta \|\| action\.description\)\}<\/small>/, "Quick access cards show names only");
assert.match(source, /Work4itIcons\?\.markup/);
assert.match(source, /scrollIntoView\?\.\(\{ behavior: "smooth", block: "nearest", inline: "center" \}\)/);

for (const iconName of [
  "profile", "target", "membership", "coach", "settings", "play", "aiPlan", "blank",
  "programs", "active", "import", "history", "progress", "calories", "trash", "export",
  "help", "privacy", "feedback", "logout", "user", "training", "more", "save",
  "finish", "pause", "back", "close", "share", "add", "cloud", "reset", "calisthenics"
]) assert.match(iconSource, new RegExp(`${iconName}:`), `Shared icon system includes ${iconName}`);
assert.doesNotMatch(source, /👤|🏋️|◆|✦|▣|◷|▧|⌫/, "Modern navigation no longer uses generic emoji or text glyphs");
assert.match(html, /data-work4it-icon="user"/);
assert.match(html, /data-work4it-icon="training"/);
assert.match(html, /data-work4it-icon="more"/);
for (const iconName of ["save", "finish", "pause", "play", "close", "progress", "share", "trash", "add"])
  assert.match(html, new RegExp(`data-work4it-leading-icon="${iconName}"`), `Core app action uses ${iconName} SVG icon`);
assert.match(helpContent, /icon: "coach"/);
assert.match(helpContent, /icon: "cloud"/);
assert.doesNotMatch(helpContent, /🤖|🎯|📊|☁️|📸|⭐|📝/);
assert.match(screenshotImport, /Work4itIcons\?\.markup\?\.\("import"\)/);
assert.doesNotMatch(html, />▶<\/button>|>↺<\/button>|>📷|>🗑|>💾|>➕/);

assert.match(css, /position: fixed/);
assert.match(css, /overflow-x: auto/);
assert.match(css, /\.modern-icon-label/);
assert.match(css, /\.modern-icon-label[\s\S]*?white-space: nowrap/);
assert.match(css, /\.modern-mini-card strong[\s\S]*?white-space: nowrap/);
assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.modern-card-grid \{ grid-template-columns: 1fr; \}/);
assert.match(css, /\.modern-mini-card\.is-active-workout \{[\s\S]*?grid-column: 1 \/ -1/);
assert.match(css, /\.saved-programs-view \{[\s\S]*?position: fixed[\s\S]*?overflow-y: auto/);
assert.match(css, /\.program-creation-view \{[\s\S]*?position: fixed[\s\S]*?overflow-y: auto/);
assert.match(css, /\.program-creation-view\.open \{ display: block; \}/);
assert.match(css, /\.program-creation-view-shell \{[\s\S]*?width: min\(760px, 100%\)/);
assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.program-creation-view \{ padding: 12px/);
assert.match(css, /\.saved-programs-view\.open \{ display: block; \}/);
assert.match(css, /\.saved-program-card \{[\s\S]*?grid-template-columns: auto minmax\(0, 1fr\) auto/);
assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.saved-program-card \{ grid-template-columns: auto minmax\(0, 1fr\)/);
assert.match(css, /@media \(min-width: 760px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /\.work4it-icon-svg/);
assert.match(css, /--modern-icon-color/);
assert.match(css, /--modern-touch: 48px/);
assert.match(css, /min-height: var\(--modern-touch\)/);
assert.match(css, /body\[data-workout-view="session"\] \.modern-bottom-nav/);
assert.match(css, /@media \(max-width: 560px\)/);
assert.match(css, /@media \(min-width: 760px\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

for (const asset of ["modern-dashboard-ui.css", "modern-dashboard-ui.js"])
  assert.match(html, new RegExp(`${asset.replace(".", "\\.")}\\?v=20260726-create-program-view1`));
assert.match(html, /work4it-icons\.js\?v=20260722-icon-system1/);
for (const asset of ["profile-account.js", "membership.js"])
  assert.match(html, new RegExp(`${asset.replace(".", "\\.")}\\?v=20260721-modern-permanent1`));
assert.match(html, /workit-menu-manager\.js\?v=20260726-create-program-view1/);
assert.match(html, /auth-gate\.js\?v=20260726-create-program-view1/);
assert.match(html, /service-worker\.js\?v=20260726-create-program-view1/);
assert.match(serviceWorker, /work4it-shell-v134-create-program-view1/);
for (const asset of ["modern-dashboard-ui.css", "modern-dashboard-ui.js"])
  assert.match(serviceWorker, new RegExp(`${asset.replace(".", "\\.")}\\?v=20260726-create-program-view1`));
assert.match(serviceWorker, /work4it-icons\.js\?v=20260722-icon-system1/);
for (const asset of ["profile-account.js", "membership.js"])
  assert.match(serviceWorker, new RegExp(`${asset.replace(".", "\\.")}\\?v=20260721-modern-permanent1`));
assert.match(serviceWorker, /workit-menu-manager\.js\?v=20260726-create-program-view1/);
assert.match(serviceWorker, /auth-gate\.js\?v=20260726-create-program-view1/);

const listeners = new Map();
const window = {
  addEventListener(type, handler) { listeners.set(type, handler); },
  dispatchEvent() {},
  setTimeout() {},
  Work4itDashboardRuntime: { getSnapshot: () => ({ loading: true, view: {} }) }
};
const document = {
  readyState: "loading",
  getElementById: () => null,
  addEventListener(type, handler) { listeners.set(type, handler); }
};
vm.runInNewContext(source, { window, document, console, CustomEvent: class CustomEvent {} });
assert.equal(typeof window.Work4itModernDashboard.render, "function");
assert.equal(typeof window.Work4itModernDashboard.setCategory, "function");
assert.equal(typeof window.openModernProgramGenerator, "function");
assert.equal(typeof window.closeProgramCreationView, "function");
assert.equal(typeof window.openModernSavedPrograms, "function");
assert.equal(typeof window.closeSavedProgramsView, "function");
assert.deepEqual(
  [...window.Work4itModernDashboard.getVisibleActionIds().slice(0, 3)],
  ["today", "saved", "generator"],
  "Training prioritizes today, saved programs and AI plan"
);
assert.equal(window.Work4itModernDashboard.getVisibleActionIds().includes("active"), false,
  "Active workout is omitted when no session exists");
window.Work4itDashboardRuntime.getSnapshot = () => ({
  loading: false,
  view: { activeWorkout: { id: "session-1", title: "Aktiv træning" } },
  programs: []
});
assert.equal(window.Work4itModernDashboard.getVisibleActionIds()[0], "active",
  "A real active workout is promoted to the first position");
assert.equal(typeof window.openModernTrash, "function");
assert.equal("setLayout" in window.Work4itModernDashboard, false, "Classic/Modern switching is permanently removed");

function fakeElement(id) {
  const classes = new Set();
  return {
    id,
    hidden: false,
    disabled: false,
    innerHTML: "",
    scrollTop: 0,
    attributes: {},
    style: { removeProperty() {} },
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name)
    },
    addEventListener() {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    focus() {}
  };
}

const savedViewElements = Object.fromEntries([
  "savedProgramsView", "savedProgramsViewTitle", "savedProgramsViewSelect",
  "savedProgramsViewList", "savedProgramsViewEmpty", "savedProgramsViewCount",
  "programCreationView", "programCreationViewTitle", "programGeneratorAccess", "countPicker"
].map(id => [id, fakeElement(id)]));
savedViewElements.programGeneratorAccess.hidden = true;
const savedViewEvents = new Map();
const savedViewCalls = { restoredScroll: null, savedView: "", loadedProgram: "", editorOpened: 0, surface: "" };
const savedViewWindow = {
  scrollY: 427,
  addEventListener(type, handler) { savedViewEvents.set(type, handler); },
  requestAnimationFrame(callback) { callback(); },
  scrollTo(options) { savedViewCalls.restoredScroll = options.top; },
  saveLastActiveView(view) { savedViewCalls.savedView = view; },
  loadSavedProgram(id) { savedViewCalls.loadedProgram = id; },
  openWorkoutEditor() { savedViewCalls.editorOpened += 1; },
  Work4itDashboardRuntime: {
    getSnapshot: () => ({
      loading: false,
      view: {},
      programs: [{ id: "program-1", title: "Push", savedAt: "2026-07-25T10:00:00Z", days: [{ exercises: [{ name: "Push-Up" }] }] }]
    })
  },
  WorkitMenuManager: {
    openSurface(id) { savedViewCalls.surface = id; },
    closePanel() {},
    notifySurfaceClosed() {}
  },
  Work4itIcons: { markup: name => `<svg data-icon="${name}"></svg>`, hydrate() {} }
};
const savedViewDocument = {
  readyState: "loading",
  getElementById: id => savedViewElements[id] || null,
  addEventListener(type, handler) { savedViewEvents.set(type, handler); },
  querySelectorAll: () => []
};
vm.runInNewContext(source, {
  window: savedViewWindow,
  document: savedViewDocument,
  console,
  CustomEvent: class CustomEvent {}
});
assert.equal(savedViewWindow.openModernProgramGenerator(), true);
assert.equal(savedViewElements.programCreationView.classList.contains("open"), true);
assert.equal(savedViewElements.programCreationView.getAttribute("aria-hidden"), "false");
assert.equal(savedViewElements.programGeneratorAccess.hidden, false);
assert.equal(savedViewElements.countPicker.style.display, "none");
assert.equal(savedViewCalls.surface, "program-creation-view");
assert.equal(savedViewCalls.savedView, "create-program");
assert.equal(savedViewWindow.closeProgramCreationView(), true);
assert.equal(savedViewElements.programCreationView.classList.contains("open"), false);
assert.equal(savedViewCalls.restoredScroll, 427);
assert.equal(savedViewCalls.savedView, "program");
assert.equal(savedViewWindow.openModernSavedPrograms(), true);
assert.equal(savedViewElements.savedProgramsView.classList.contains("open"), true);
assert.equal(savedViewElements.savedProgramsView.getAttribute("aria-hidden"), "false");
assert.equal(savedViewCalls.surface, "saved-programs-view");
assert.equal(savedViewCalls.savedView, "saved-programs");
assert.match(savedViewElements.savedProgramsViewList.innerHTML, /Push/);
assert.match(savedViewElements.savedProgramsViewList.innerHTML, /Åbn og redigér/);
assert.equal(savedViewWindow.closeSavedProgramsView(), true);
assert.equal(savedViewCalls.restoredScroll, 427);
assert.equal(savedViewCalls.savedView, "program");
savedViewWindow.openModernSavedPrograms();
assert.equal(savedViewWindow.openModernSavedProgram("program-1"), true);
assert.equal(savedViewCalls.loadedProgram, "program-1");
assert.equal(savedViewCalls.editorOpened, 1);
assert.equal(savedViewElements.savedProgramsView.classList.contains("open"), false);

console.log("Permanent Modern Dashboard UI migration, navigation and runtime contracts OK");
