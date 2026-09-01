"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const storage = new Map();
const context = {
  console,
  Date,
  Math,
  window: {
    Work4itAISystem: {
      guardInput: () => ({ allowed: true }),
      HEALTH_SAFETY_NOTICE: "Sikkerhedsbesked"
    }
  },
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value))
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("app/ai-copilot-actions.js", "utf8"), context);
vm.runInContext(fs.readFileSync("app/ai-coach-program-engine.js", "utf8"), context);

const actions = context.window.AICopilotActions;
const engine = context.window.Work4itAICoachProgramEngine;
const indexSource = fs.readFileSync("app/index.html", "utf8");
const libraryMatch = indexSource.match(/const exerciseLibrary = (\{[\s\S]*?\n    \});\n\n    function hasTrainingEquipment/);
assert.ok(libraryMatch, "Work4its produktionskatalog kunne ikke læses");
const exerciseLibrary = vm.runInNewContext(`(${libraryMatch[1]})`);
const catalog = Object.entries(exerciseLibrary).flatMap(([muscle, names]) => names.map(name => ({ name, muscle })));

const baseContext = {
  profile: {
    goal: "muscle_gain",
    experience: "intermediate",
    preferredTrainingStyle: "hybrid",
    preferredExerciseCount: 5,
    availableEquipment: []
  },
  activeProgram: {
    title: "Mit eksisterende program",
    exercises: [
      { name: "Barbell Bench Press", muscle: "Bryst", sets: [{ weightKg: 60, reps: 10, pause: "01:30" }] },
      { name: "Barbell Row", muscle: "Øvre ryg", sets: [{ weightKg: 55, reps: 10, pause: "01:30" }] },
      { name: "Back Squat", muscle: "Forside lår", sets: [{ weightKg: 80, reps: 8, pause: "02:00" }] }
    ]
  }
};

function concreteProgramFor(input, inputContext = baseContext) {
  const action = actions.parse(input, { activeProgram: inputContext.activeProgram });
  assert.ok(action, `Forventede struktureret AI-action for: ${input}`);
  const result = engine.generate(action, inputContext, catalog);
  assert.equal(result.validation.valid, true, `${input}: ${result.validation.errors?.join(" ")}`);
  const program = result.program;
  assert.ok(program.name && program.title, `${input}: navn mangler`);
  assert.ok(program.category && program.programType, `${input}: kategori/type mangler`);
  assert.ok(program.days[0].exercises.length > 0, `${input}: øvelser mangler`);
  program.days[0].exercises.forEach((exercise, index) => {
    assert.equal(exercise.order, index + 1, `${input}: rækkefølge`);
    assert.ok(exercise.sets.length > 0, `${input}: sæt mangler`);
    assert.ok(exercise.sets[0].targetReps, `${input}: reps mangler`);
    assert.ok(exercise.sets[0].pause, `${input}: pause mangler`);
  });
  return { action, program };
}

const muscleGain = concreteProgramFor("Lav et program til muskelopbygning");
assert.equal(muscleGain.program.goal, "muscle_gain");

const shortProgram = concreteProgramFor("Jeg har kun 20 minutter");
assert.equal(shortProgram.program.durationMinutes, 20);
assert.ok(shortProgram.program.days[0].exercises.every(exercise => exercise.sets.length <= 2));

const fullBody = concreteProgramFor("Lav et FullBody-program");
assert.equal(fullBody.program.programType, "fullbody");

const dumbbells = concreteProgramFor("Jeg har kun håndvægte");
assert.ok(dumbbells.program.days[0].exercises.every(exercise => exercise.equipment === "Håndvægte"));

const optimized = concreteProgramFor("Optimer mit nuværende program efter min profil");
assert.equal(optimized.program.title, "Mit eksisterende program");
assert.equal(optimized.program.goal, baseContext.profile.goal);

const alternatives = engine.alternatives(muscleGain.action, baseContext, catalog);
assert.equal(alternatives.length, 3);
assert.ok(alternatives.every(item => item.action.programValidation.valid && item.action.program.days[0].exercises.length));

const genericResponse = {
  title: "Opret det foreslåede program",
  name: "Opret det foreslåede program",
  goal: "muscle_gain",
  category: "FullBody",
  type: "fullbody",
  programType: "fullbody",
  durationMinutes: 45,
  days: []
};
assert.equal(engine.validate(genericResponse, catalog).valid, false, "Generisk svar uden konkrete øvelser skal afvises");

const cancelBlock = indexSource.match(/function cancelCopilotProposal\(\)[\s\S]*?\n    }/);
assert.ok(cancelBlock, "Annullér-handler mangler");
assert.doesNotMatch(cancelBlock[0], /executeCopilotAction|persistCopilotChanges|setPrograms\(/, "Annullér må ikke mutere eller gemme");
assert.match(indexSource, /renderCopilotProgramPreview\(action\)/, "Konkret preview skal rendres");
assert.match(indexSource, /saveProgramToCloud\(program\)/, "Godkendt AI-program skal bruge målrettet cloud-save");

const cloudSource = fs.readFileSync("app/firestore-cloud-service.js", "utf8");
assert.match(cloudSource, /\["users", uid, COLLECTIONS\.workouts, normalized\.id\]/, "AI-programmets UID-path mangler");
assert.match(cloudSource, /currentUserUid: authUid\(\)/, "Firestore-fejllog skal indeholde currentUser UID");
assert.match(cloudSource, /firebaseSdkUid: firebaseSdkUid\(\)/, "Firestore-fejllog skal indeholde Firebase SDK UID");
assert.match(cloudSource, /firebaseSdkUid\(\) !== uid/, "Cloud-save skal afvise UID-mismatch før write");

const rules = fs.readFileSync("firestore.rules", "utf8");
assert.match(rules, /match \/workouts\/\{workoutId\}[\s\S]*?allow read, create, update, delete: if isOwner\(userId\)/, "Firestore rules tillader ikke ejerens workout-path");

console.log("AI Coach konkret programflow OK: 5 brugerprompts, preview, alternativer, annullering og UID-cloud-path");
