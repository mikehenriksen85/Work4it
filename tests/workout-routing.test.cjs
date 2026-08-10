"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const modernDashboard = fs.readFileSync("app/modern-dashboard-ui.js", "utf8");
const css = fs.readFileSync("app/modern-dashboard-ui.css", "utf8");
const authGate = fs.readFileSync("app/auth-gate.js", "utf8");

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .filter(Boolean);
inlineScripts.forEach(source => new Function(source));

const dashboardStart = html.indexOf('id="programCanvas"');
const dashboardEnd = html.indexOf("</main>", dashboardStart);
const workoutStart = html.indexOf('id="workoutView"');
const workoutEditor = html.indexOf('id="workoutEditorDetails"');
const bottomNavigation = html.indexOf('id="modernBottomNav"');

assert.ok(dashboardStart >= 0 && dashboardEnd > dashboardStart, "Dashboard root exists");
assert.ok(workoutStart > dashboardEnd, "WorkoutView is a sibling after the closed dashboard main element");
assert.ok(workoutEditor > workoutStart && workoutEditor < bottomNavigation, "Workout editor belongs to WorkoutView, not the dashboard");
assert.equal((html.match(/id="workoutView"/g) || []).length, 1, "There is exactly one WorkoutView");
assert.doesNotMatch(`${html}\n${modernDashboard}\n${css}`, /calisthenics-workout-view|cardio-workout-view|moveWorkoutEditor|restoreWorkoutEditorHome/,
  "No competing workout screens or editor-reparenting routes remain");

assert.match(html, /function openWorkout\(workoutId = "", options = \{\}\)/);
assert.match(html, /function leaveWorkoutView\(options = \{\}\)/);
assert.match(html, /function setWorkoutScreenActive\(active, options = \{\}\)/);
assert.equal((html.match(/\bloadSavedProgram\(/g) || []).length, 2,
  "loadSavedProgram is only defined and called internally by openWorkout");
assert.equal((html.match(/\bopenWorkoutEditor\(/g) || []).length, 1,
  "The legacy editor opener remains only as a compatibility delegate");
assert.match(html, /dashboard\.hidden = true[\s\S]*?dashboard\.inert = true/);
assert.match(html, /bottomNavigation\.hidden = true[\s\S]*?bottomNavigation\.inert = true/);
assert.match(html, /workoutView\.hidden = false[\s\S]*?document\.body\.dataset\.appScreen = "workout"/);
assert.match(html, /workoutView\.hidden = true[\s\S]*?dashboard\.hidden = false/);
assert.match(css, /body\[data-app-screen="workout"\] #programCanvas/);
assert.match(css, /body\[data-app-screen="workout"\] \.modern-bottom-nav/);

function functionBody(source, name) {
  const closingIndent = source === modernDashboard ? "  " : "    ";
  return source.match(new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n${closingIndent}\\}`))?.[1] || "";
}

const screenBody = functionBody(html, "setWorkoutScreenActive");
assert.ok(screenBody, "Workout screen controller body can be tested");
const classes = () => {
  const values = new Set();
  return { add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value) };
};
const elements = {
  workoutView: { hidden: true, inert: true, classList: classes(), attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } },
  programCanvas: { hidden: false, inert: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } },
  modernBottomNav: { hidden: false, inert: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }
};
const fakeDocument = { body: { dataset: {} } };
let rememberedScroll = 0;
const runScreen = new Function("active", "options", "$", "document", "rememberWorkoutReturnScrollPosition", screenBody);
assert.equal(runScreen(true, {}, id => elements[id], fakeDocument, () => { rememberedScroll += 1; }), true);
assert.equal(rememberedScroll, 1);
assert.equal(elements.programCanvas.hidden, true);
assert.equal(elements.programCanvas.inert, true);
assert.equal(elements.modernBottomNav.hidden, true);
assert.equal(elements.workoutView.hidden, false);
assert.equal(elements.workoutView.classList.contains("open"), true);
assert.equal(fakeDocument.body.dataset.appScreen, "workout");
assert.equal(runScreen(false, {}, id => elements[id], fakeDocument, () => {}), true);
assert.equal(elements.programCanvas.hidden, false);
assert.equal(elements.modernBottomNav.hidden, false);
assert.equal(elements.workoutView.hidden, true);
assert.equal("appScreen" in fakeDocument.body.dataset, false);

const openWorkoutBody = functionBody(html, "openWorkout");
assert.match(openWorkoutBody, /loadSavedProgram\(requestedId, \{ persist: false, renderDashboard: false \}\)/,
  "Workout data loading is internal to the common navigation function");
assert.match(openWorkoutBody, /setWorkoutScreenActive\(true, options\)/);
assert.match(openWorkoutBody, /saveLastActiveView\(mode === "session" \? "session" : "workout"\)/);
assert.match(functionBody(html, "openWorkoutEditor"), /return openWorkout\(/, "Legacy editor entry delegates to openWorkout");
assert.doesNotMatch(functionBody(html, "openWorkoutEditor"), /scrollIntoView|details\.open/);

const requiredFlows = [
  ["1. Dagens træning", functionBody(html, "openDashboardTodayWorkout"), /openWorkout\(programId\)/],
  ["2. Mine programmer", functionBody(modernDashboard, "openModernSavedProgram"), /openWorkout\?\.\(id\)/],
  ["3. Tomt træningspas", functionBody(html, "newWorkout"), /openWorkout\(\)/],
  ["4. AI-træningsplan", functionBody(html, "presentGeneratedWorkout"), /openWorkout\(\)/],
  ["5. Nyt oprettet/importeret træningspas", functionBody(html, "createProgramFromScreenshot"), /openWorkout\(id\)/],
  ["6. Rediger eksisterende træningspas", functionBody(html, "openDashboardSavedProgram"), /openWorkout\(id\)/],
  ["7. Genoptag aktiv træning", functionBody(html, "showTrainingSession"), /openWorkout\("", \{ mode: "session"/]
];
for (const [label, body, routePattern] of requiredFlows) {
  assert.ok(body, `${label}: handler exists`);
  assert.match(body, routePattern, `${label}: uses the common WorkoutView route`);
}

assert.match(html, /const view = \["profile", "membership", "progress", "calorie", "dashboard", "today", "program", "workout", "session"/);
assert.match(html, /view === "workout" && restoredAutosave[\s\S]*?showProgramView/);
assert.match(authGate, /"workout"/);
assert.match(authGate, /document\.body\.dataset\.appScreen === "workout"[\s\S]*?\["programCanvas", "modernBottomNav"\]/,
  "Auth unlock preserves the dedicated screen boundary");
assert.match(functionBody(html, "restoreAfterResume"), /showTrainingSession\(\)/);
assert.match(functionBody(html, "finishWorkout"), /leaveWorkoutView\(\{ allowActive: true \}\)/);

console.log("Dedicated WorkoutView routing scenarios passed: 7/7");
