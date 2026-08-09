"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const profileWizard = fs.readFileSync("app/profile-wizard.js", "utf8");
const trainingGoalEngine = fs.readFileSync("app/training-goal-engine.js", "utf8");
const modernDashboard = fs.readFileSync("app/modern-dashboard-ui.js", "utf8");
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .filter(Boolean);
inlineScripts.forEach(source => new Function(source));

for (const id of [
  "modernDashboardUI",
  "modernDashboardTitle",
  "modernIconRail",
  "modernFeaturePanel",
  "modernCardGrid",
  "modernToolPanel",
  "programGeneratorAccess",
  "savedDropdown",
  "savedSelect",
  "trashDropdown",
  "trashItems",
  "modernBottomNav",
  "membershipNavStatus",
  "elapsedTimeMetric",
  "programSecondaryActions",
  "workoutEditorDetails",
  "workoutEditorHome",
  "calisthenicsWorkoutView",
  "calisthenicsWorkoutViewTitle",
  "calisthenicsWorkoutEditorHost",
  "cardioWorkoutView",
  "cardioWorkoutViewTitle",
  "cardioWorkoutEditorHost",
  "aiCoachPanel"
]) {
  assert.equal((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1, `${id} must be unique`);
}

for (const handler of [
  "openProfileSetup", "openMembershipView", "openProfileWizardFromMenu",
  "openBlankWorkoutDialog", "openScreenshotImportInfo", "openDashboard", "openCalorieView",
  "openProgressView", "openAiCoach", "exportDataFromMenu", "openHelpAboutDialog",
  "logoutProfileAccount", "openDashboardTodayWorkout", "startDashboardWorkout", "continueDashboardWorkout",
  "openModernCalisthenicsWorkout", "closeCalisthenicsWorkoutView",
  "openModernCardioWorkout", "closeCardioWorkoutView"
]) {
  assert.match(`${html}\n${modernDashboard}`, new RegExp(handler), `${handler} must remain wired`);
}

assert.match(html, /function modernDashboardSnapshot\(/);
assert.match(html, /window\.Work4itDashboardRuntime = Object\.freeze/);
assert.match(html, /function renderDashboard\(/);
assert.match(html, /work4it:dashboard-updated/);
assert.match(html, /function openDashboardTodayWorkout\([\s\S]*?modernDashboardSnapshot\(\)\.view\?\.featuredWorkout/);
const openTodayBody = html.match(/function openDashboardTodayWorkout\(\) \{([\s\S]*?)\n    \}/)?.[1] || "";
assert.match(openTodayBody, /hasActiveWorkoutSession\(\)[\s\S]*?showTrainingSession\(\)/);
assert.match(openTodayBody, /loadSavedProgram\(programId\)/);
assert.match(openTodayBody, /openWorkoutEditor\(\)/);
assert.match(openTodayBody, /saveLastActiveView\("today"\)/);
assert.doesNotMatch(openTodayBody, /toggleWorkoutTimer|beginWorkoutSession|startWorkoutTimerInterval|clearPauseTimers/);
const runOpenTodayScenario = active => {
  const calls = { show: 0, load: 0, open: 0, save: 0 };
  const run = new Function(
    "hasActiveWorkoutSession", "showTrainingSession", "modernDashboardSnapshot", "window",
    "currentSavedProgramId", "slotIds", "loadSavedProgram", "validCanvasExerciseCount",
    "updateStartTrainingAvailability", "openWorkoutEditor", "saveLastActiveView",
    openTodayBody
  );
  const result = run(
    () => active,
    () => { calls.show += 1; return true; },
    () => ({ view: { featuredWorkout: { id: "program-1" } } }),
    { Work4itDashboardRuntime: { canStartProgram: () => true } },
    "", () => [], () => { calls.load += 1; }, () => 2, () => false,
    () => { calls.open += 1; }, () => { calls.save += 1; }
  );
  return { calls, result };
};
const unopenedToday = runOpenTodayScenario(false);
assert.deepEqual(unopenedToday.calls, { show: 0, load: 1, open: 1, save: 1 }, "opening a program must not create or resume a session");
assert.equal(unopenedToday.result, true);
const activeToday = runOpenTodayScenario(true);
assert.deepEqual(activeToday.calls, { show: 1, load: 0, open: 0, save: 0 }, "an existing active session must be resumed unchanged");
assert.match(html, /function startDashboardWorkout\(\) \{\s+return openDashboardTodayWorkout\(\);/);
const continueTodayBody = html.match(/function continueDailyWorkout\(\) \{([\s\S]*?)\n    \}/)?.[1] || "";
assert.match(continueTodayBody, /hasActiveWorkoutSession\(\)[\s\S]*?showTrainingSession\(\)/);
assert.match(continueTodayBody, /openWorkoutEditor\(\)/);
assert.match(continueTodayBody, /saveLastActiveView\("today"\)/);
assert.doesNotMatch(continueTodayBody, /toggleWorkoutTimer|beginWorkoutSession|startWorkoutTimerInterval|clearPauseTimers/);
assert.match(html, /function continueDashboardWorkout\([\s\S]*?showTrainingSession\(\)/);
assert.match(html, /function presentGeneratedWorkout\(\) \{[\s\S]*?closeToolPanel[\s\S]*?renderDashboard\(\)[\s\S]*?openWorkoutEditor\(\)/);
assert.equal((html.match(/presentGeneratedWorkout\(\);/g) || []).length, 3);
assert.match(html, /function updateStartTrainingAvailability\([\s\S]*?validProgramExerciseCount/);
assert.match(html, /function updateLiveTrainingVisibility\(/);
assert.match(html, /const isActive = hasActiveWorkoutSession\(\)/);
assert.match(html, /document\.body\.dataset\.liveTraining = String\(isActive\)/);
assert.match(html, /function hasActiveWorkoutSession\(\) \{\s+return isActiveWorkoutSession\(activeWorkoutSession\)/);
assert.match(html, /service-worker\.js\?v=20260809-direct-navigation1/);
assert.doesNotMatch(html, /Hurtig adgang|modernShortcutsTitle|modern-shortcuts/);
assert.match(html, /id="modernCardGrid" aria-label="Træning: funktioner"/);
assert.match(html, /dashboard-view-model\.js\?v=20260718-dashboard-buttons1/);
assert.match(html, /workout-heatmap\.js\?v=20260718-heatmap1/);
assert.match(html, /function renderWorkoutHeatmapSection\(/);
assert.match(html, /function initializeWorkoutHeatmap\(/);
assert.match(html, /workout-history:changed/);
assert.match(html, /class="progression-suggestion/);
assert.match(html, /function applyProgressionSuggestion\(/);

assert.match(html, /function latestCardioDurationMinutes\(exerciseName\)/);
assert.match(html, /durationMinutes: requestedMinutes \|\| previousMinutes \|\| ""/);
assert.doesNotMatch(html, /Number\(action\.durationMinutes\) \|\| 30/);
assert.doesNotMatch(profileWizard, /durationMinutes: prescription\.durationMinutes \|\| 30/);
assert.match(profileWizard, /durationMinutes: prescription\.durationMinutes \|\| ""/);
assert.match(trainingGoalEngine, /exerciseType: "cardio", durationMinutes: ""/);

assert.match(html, /class="sticky-metric live-training-only" id="elapsedTimeMetric" hidden/);
assert.match(html, /class="calorie-panel live-training-only" id="caloriePanel" aria-live="polite" hidden/);
assert.match(html, /class="dashboard-btn live-training-only[^"]*"[^>]*data-work4it-leading-icon="progress"[^>]*onclick="openDashboard\(\)"[^>]*hidden/);
assert.match(html, /function isValidWorkoutExerciseName\(/);
assert.match(html, /function updateWorkoutProgress\(\) \{\s+updateStartTrainingAvailability\(\);\s+updateWorkoutEditorActionState\(\)/);
assert.match(html, /id="workoutEditorEmptyActions"/);
assert.match(html, /id="workoutPrimaryActions" hidden/);
assert.match(html, /onclick="openFirstExercisePicker\(event\)"/);
assert.match(html, /id="saveWorkoutButton"[^>]*onclick="saveCanvasState\(\)"/);
assert.match(html, /function saveCanvasState\(\) \{\s+if \(!updateWorkoutEditorActionState\(\)\) return false;/);
assert.match(html, /function openCreateOrImportWorkout\(/);
assert.match(html, /class="blank-workout-options"/);
assert.equal((html.match(/class="small-btn blank-workout-option/g) || []).length, 7);
assert.match(html, /data-work4it-leading-icon="training" onclick="openStrengthWorkoutCategoryDialog\(\)"/);
assert.match(html, /function openStrengthWorkoutCategoryDialog\(preserveWorkout = false\)/);
for (const category of ["Alle", "Push", "Pull", "Stabilitet"]) {
  assert.match(html, new RegExp(`onclick="selectBlankStrengthCategory\\('${category}'\\)"`));
}
assert.match(html, /function selectBlankStrengthCategory\(category\)[\s\S]*?newWorkout\("strength", category\)/);
assert.match(html, /blankStrengthCategoryMode === "existing"/);
assert.match(html, /setStrengthExercisePickerContext\(category\)/);
assert.match(html, /onclick="openStrengthWorkoutCategoryDialog\(true\)">Skift kategori<\/button>/);
assert.match(html, /function newWorkout\(type = "strength", strengthCategory = "", options = \{\}\)/);
assert.match(html, /blankStrengthCategoryFlowActive\) setStrengthExercisePickerContext\(strengthCategory\)/);
assert.match(html, /function strengthCategoryMuscles\(category\)/);
assert.match(html, /category === "Alle" \? \["Push", "Pull"\] : \[category\]/);
assert.match(html, /function uniqueExercisesForMuscles\(exercises, muscles\)/);
assert.match(html, /blankStrengthCategoryFlowActive && activeMovementFilter === "Alle"[\s\S]*?uniqueExercisesForMuscles/);
assert.match(html, /\.blank-workout-options\.strength-category-options \{[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(html, /@media \(max-width: 560px\)[\s\S]*?\.blank-workout-options\.strength-category-options \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);

const strengthCategoryBody = html.match(/function strengthCategoryMuscles\(category\) \{([\s\S]*?)\n    \}/)?.[1];
assert.ok(strengthCategoryBody, "strength category scope must exist");
const strengthGroups = [
  { key: "Bryst", category: "Push" }, { key: "Ryg", category: "Pull" },
  { key: "Mave", category: "Stabilitet" }, { key: "Cardio", category: "Cardio" }
];
const strengthCategoryMuscles = new Function("category", "muscleGroups", strengthCategoryBody);
assert.deepEqual(strengthCategoryMuscles("Alle", strengthGroups), ["Bryst", "Ryg"], "Alle contains only Push and Pull");
assert.deepEqual(strengthCategoryMuscles("Push", strengthGroups), ["Bryst"]);
assert.deepEqual(strengthCategoryMuscles("Pull", strengthGroups), ["Ryg"]);
assert.deepEqual(strengthCategoryMuscles("Stabilitet", strengthGroups), ["Mave"]);

const uniqueExercisesBody = html.match(/function uniqueExercisesForMuscles\(exercises, muscles\) \{([\s\S]*?)\n    \}/)?.[1];
assert.ok(uniqueExercisesBody, "strength exercise deduplication must exist");
const uniqueExercisesForMuscles = new Function("exercises", "muscles", "normalizeExerciseCatalogKey", uniqueExercisesBody);
const normalizeKey = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const mergedExercises = uniqueExercisesForMuscles([
  { name: "Face Pull", muscle: "Bryst" }, { name: "Face Pull", muscle: "Ryg" },
  { name: "Row", muscle: "Ryg" }, { name: "Plank", muscle: "Mave" }
], ["Bryst", "Ryg"], normalizeKey);
assert.deepEqual(mergedExercises.map(exercise => exercise.name), ["Face Pull", "Row"], "Alle removes duplicates and excludes Stabilitet");
assert.match(html, /data-work4it-leading-icon="calisthenics" onclick="openModernCalisthenicsWorkout\(\)"/);
assert.match(html, /class="calisthenics-workout-view"/);
assert.match(html, /id="calisthenicsWorkoutEditorHost"/);
assert.match(html, /view === "calisthenics-workout"[\s\S]*?openModernCalisthenicsWorkout\(\{ restoreScrollState: true, initialize: false \}\)/);
assert.match(modernDashboard, /function moveWorkoutEditor\(host\)/);
assert.match(modernDashboard, /host\.appendChild\(editor\)/);
assert.match(modernDashboard, /function restoreWorkoutEditorHome\(\)/);
assert.match(modernDashboard, /home\.parentNode\.insertBefore\(editor, home\.nextSibling\)/);
assert.match(modernDashboard, /window\.newWorkout\?\.\("calisthenics", "", \{ view: "calisthenics-workout" \}\)/);
assert.match(html, /data-work4it-leading-icon="calories" onclick="openModernCardioWorkout\(\)"/);
assert.match(html, /class="cardio-workout-view"/);
assert.match(html, /id="cardioWorkoutEditorHost"/);
assert.match(html, /view === "cardio-workout"[\s\S]*?openModernCardioWorkout\(\{ restoreScrollState: true, initialize: false \}\)/);
assert.match(modernDashboard, /function openModernCardioWorkout\(options = \{\}\)/);
assert.match(modernDashboard, /function closeCardioWorkoutView\(options = \{\}\)/);
assert.match(modernDashboard, /window\.newWorkout\?\.\("cardio", "", \{ view: "cardio-workout" \}\)/);
assert.match(html, /\.blank-workout-option \{[\s\S]*?white-space: nowrap;[\s\S]*?overflow-wrap: normal;[\s\S]*?word-break: keep-all;[\s\S]*?hyphens: none;/);
assert.match(html, /@media \(max-width: 560px\)[\s\S]*?\.blank-workout-options \{ grid-template-columns: 1fr; \}/);
assert.match(html, /firestore:fallback-active[\s\S]*?dashboardCloudPending = false;[\s\S]*?renderSaved\(\)/);
assert.match(html, /Offline – ændringer synkroniseres automatisk senere/);
assert.match(html, /id="homeSyncRetryButton" onclick="retryDashboardSync\(\)"/);
assert.match(html, /const background = event\.detail\?\.background === true/);
assert.match(html, /if \(background\) setDashboardSyncNotice\(\)/);
assert.match(html, /const synced = await \(service\.retryCloudConnection\?\.\(\) \|\| service\.syncAllLocalData\(\)\)/);
assert.match(html, /if \(synced === true\)/);
assert.doesNotMatch(html, /setDashboardSyncNotice\([^\n]*"Kunne ikke synkronisere"/);

assert.doesNotMatch(html, /id="sidebar"|class="sidebar"|sidebar-accordion|sidebar-item|home-dashboard|id="homeDashboard"|id="timerBtn"/);
assert.doesNotMatch(html, /work4it_ui_layout|data-ui-layout|changeAppLayout|Classic UI/);
assert.equal((html.match(/data-modern-category=/g) || []).length, 3);
for (const category of ["user", "training", "more"]) assert.match(html, new RegExp(`data-modern-category="${category}"`));
assert.match(html, /id="programGeneratorAccess"/);
assert.match(html, /id="savedDropdown"/);
assert.match(html, /id="trashDropdown"/);

assert.equal((html.match(/id=["']exerciseActionMenu["']/g) || []).length, 1);
assert.match(html, /class="exercise-more-button"/);
assert.match(html, /aria-haspopup="menu" aria-expanded="false" aria-controls="exerciseActionMenu"/);
assert.match(html, /role="menu" aria-label="Øvelseshandlinger"/);
for (const [action, label] of [
  ["demo", "Se demo"],
  ["replace", "Erstat øvelse"],
  ["simulate", "Simuler"],
  ["delete", "Slet øvelse"]
]) {
  assert.match(html, new RegExp(`data-exercise-action="${action}"[^>]*>${label}<`));
}
assert.match(html, /exercise-action-menu-item danger/);
assert.match(html, /function toggleExerciseActionMenu\(/);
assert.match(html, /function closeExerciseActionMenu\(/);
assert.match(html, /function handleExerciseActionMenuKey\(/);
assert.match(html, /WorkitMenuManager\?\.openPanel/);
assert.match(html, /onpointerdown="event\.stopPropagation\(\)" ondragstart="event\.preventDefault\(\)"/);
assert.match(html, /if \(action === "demo"\) openExerciseDemo\(slot\)/);
assert.match(html, /else if \(action === "replace"\) openReplacementDialog\(slot\)/);
assert.match(html, /else if \(action === "simulate"\) openDashboard\(slot\)/);
assert.match(html, /else if \(action === "delete"\) removeExercise\(slot\)/);

const exerciseTemplate = html.match(/block\.innerHTML = `[\s\S]*?`;/)?.[0] || "";
assert.doesNotMatch(exerciseTemplate, />Demo<|>Simuler<|danger-slot/);
assert.doesNotMatch(exerciseTemplate, /<div>\$\{t\("ok"\)\}<\/div>/);
assert.match(html, /data-set-number="\$\{i\}"/);
assert.match(html, /cb\.setAttribute\("aria-label", actionLabel\)/);
assert.match(html, /\.set-complete-control \{ position: relative; display: grid; place-items: center; width: 52px; height: 52px;/);
assert.match(html, /class="weight set-value-input" type="text" inputmode="decimal"/);
assert.match(html, /class="reps set-value-input" type="text" inputmode="numeric"/);
assert.match(html, /aria-label="Sæt \$\{i\}: vægt i kg"/);
assert.match(html, /aria-label="Sæt \$\{i\}: gentagelser"/);
assert.match(html, /font-size: 20px !important/);
assert.match(html, /min-height: 56px/);
assert.match(html, /grid-template-areas:\s+"previous previous previous pause"\s+"set weight reps complete"/);
assert.match(html, /\.set-number \{ display: grid; grid-template-rows: auto 52px;/);
assert.match(html, /\.set-number \{ grid-template-rows: auto 56px; \}/);
assert.match(html, /function maybeStartAutoPause\([\s\S]*?setActivePauseComponent\(slot, set\)/);
assert.match(html, /\.pause-control input \{[\s\S]*?background: var\(--input\);[\s\S]*?color: var\(--text-primary\);/);
assert.match(html, /function formatPreviousSetDisplay\(/);
assert.match(html, /Sidst: \$\{weight\} kg × \$\{reps\}/);
assert.match(html, /function updatePauseInlineDisplay\(/);
assert.doesNotMatch(html, /if \(inline\) inline\.textContent/);
assert.match(html, /class="program-secondary-actions" id="programSecondaryActions"/);
assert.match(html, /<summary>Flere programhandlinger<\/summary>/);
assert.equal((html.match(/onclick="shareCurrentProgram\(\)"/g) || []).length, 1);
assert.equal((html.match(/onclick="deleteCurrentProgram\(\)"/g) || []).length, 1);
assert.match(html, /class="exercise-details-toggle" type="button" aria-expanded="false"/);
assert.match(html, /function toggleExerciseDetails\(/);
assert.match(html, /function closeExerciseDetails\(/);
assert.match(html, /\.exercise:not\(\.show-advanced\) \.set-analytics \{ display: none; \}/);
assert.match(html, /closeExerciseDetails\(\);\s+closeExerciseActionMenu\(false\)/);
assert.match(html, /function updateAutosaveStatusTone\(/);
assert.match(html, /new MutationObserver\(updateAutosaveStatusTone\)/);

const activeSessionPredicateBody = html.match(/function isActiveWorkoutSession\(session\) \{([\s\S]*?)\n    \}/)?.[1];
assert.ok(activeSessionPredicateBody, "active session predicate must exist");
const isActiveWorkoutSession = new Function("session", activeSessionPredicateBody);
assert.equal(isActiveWorkoutSession(null), false, "a new workout is not active");
assert.equal(isActiveWorkoutSession({ sessionStatus: "not_started" }), false, "not_started is not active");
assert.equal(isActiveWorkoutSession({ sessionStatus: "in_progress", exercises: [{ name: "Push-Up" }] }), true, "a valid in_progress workout is active");
assert.equal(isActiveWorkoutSession({ sessionStatus: "paused", exercises: [{ name: "Back Squat" }] }), true, "a valid paused workout remains active");
assert.equal(isActiveWorkoutSession({ sessionStatus: "in_progress", exercises: [] }), false, "an empty stale session is not active");
assert.equal(isActiveWorkoutSession({ sessionStatus: "paused", exercises: [{ name: "Vælg øvelse" }] }), false, "a placeholder-only session is not active");
assert.equal(isActiveWorkoutSession({ sessionStatus: "completed" }), false, "completed is not active");

const editorActionStateBody = html.match(/function updateWorkoutEditorActionState\(\) \{([\s\S]*?)\n    \}/)?.[1];
assert.ok(editorActionStateBody, "empty workout action-state function must exist");
const editorElements = Object.fromEntries(["workoutEditorEmptyActions", "workoutPrimaryActions", "workoutStatusSummary", "saveWorkoutButton"]
  .map(id => [id, { hidden: false, disabled: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } }]));
const runEditorActionState = validCount => new Function("$", "validCanvasExerciseCount", editorActionStateBody)(
  id => editorElements[id],
  () => validCount
);
assert.equal(runEditorActionState(0), false);
assert.equal(editorElements.workoutEditorEmptyActions.hidden, false, "empty state is shown without exercises");
assert.equal(editorElements.workoutPrimaryActions.hidden, true, "save action area is hidden without exercises");
assert.equal(editorElements.workoutStatusSummary.hidden, true, "meaningless zero metrics are hidden without exercises");
assert.equal(editorElements.saveWorkoutButton.disabled, true, "save cannot be activated without exercises");
assert.equal(runEditorActionState(1), true);
assert.equal(editorElements.workoutEditorEmptyActions.hidden, true, "empty state disappears when an exercise exists");
assert.equal(editorElements.workoutPrimaryActions.hidden, false, "save action returns when content exists");
assert.equal(editorElements.workoutStatusSummary.hidden, false, "workout metrics return when content exists");
assert.equal(editorElements.saveWorkoutButton.disabled, false, "save is enabled for a valid workout");

const previousSetFormatterBody = html.match(/function formatPreviousSetDisplay\(value\) \{([\s\S]*?)\n    \}/)?.[1];
assert.ok(previousSetFormatterBody, "previous set formatter must exist");
const formatPreviousSetDisplay = new Function("value", previousSetFormatterBody);
assert.equal(formatPreviousSetDisplay("45kg · 10r · 01:30"), "Sidst: 45 kg × 10");
assert.equal(formatPreviousSetDisplay("Sidst: 47,5 kg × 8"), "Sidst: 47,5 kg × 8");
assert.equal(formatPreviousSetDisplay("-"), "Sidst: –");

console.log("Simplified dashboard hierarchy and preserved-handler contracts OK");
