const assert = require("node:assert/strict");
const fs = require("node:fs");
const semantic = require("../app/screenshot-import-semantic.js");

const catalog = [
  { name: "Barbell Bench Press", muscle: "Bryst" },
  { name: "Dumbbell Bench Press", muscle: "Bryst" },
  { name: "Incline Barbell Bench Press", muscle: "Bryst" },
  { name: "Push-Up", muscle: "Bryst" },
  { name: "Dumbbell Curl", muscle: "Biceps" },
  { name: "Barbell Curl", muscle: "Biceps" },
  { name: "Hammer Curl", muscle: "Biceps" },
  { name: "Romanian Deadlift", muscle: "Bagside lår & baller" },
  { name: "Back Squat", muscle: "Forside lår" },
  { name: "Lat Pulldown", muscle: "Øvre ryg" },
  { name: "Seated Cable Row", muscle: "Øvre ryg" },
  { name: "Rear Delt Fly", muscle: "Skuldre" },
  { name: "Løbebånd", muscle: "Cardio" }
];

function parse(text, confidence = 86, imports = []) {
  return semantic.parseOcrText(text, confidence, { catalog, imports });
}

{
  const result = parse("Program: Push A\nDumbbell Bench Press 3x10 47,5 kg Rest 90 sec");
  const exercise = result.days[0].exercises[0];
  assert.equal(result.programName, "Push A");
  assert.equal(exercise.matchedName, "Dumbbell Bench Press");
  assert.equal(exercise.sets.length, 3);
  assert.deepEqual(exercise.sets[0], {
    reps: "10",
    weight: "47.5",
    pause: "01:30",
    sourceText: "Dumbbell Bench Press 3x10 47,5 kg Rest 90 sec"
  });
}

{
  const result = parse("Sommerprogram\nDag 1: Push\nPush-Up\n4 × 8-12\nDag 2: Pull\nLat Pull Down 3 sets 10 reps\nSeated Row 3x12");
  assert.equal(result.programName, "Sommerprogram");
  assert.equal(result.days.length, 2);
  assert.equal(result.days[0].exercises[0].sets.length, 4);
  assert.equal(result.days[0].exercises[0].sets[0].reps, "8-12");
  assert.equal(result.days[1].exercises[0].matchedName, "Lat Pulldown");
  assert.equal(result.days[1].exercises[1].matchedName, "Seated Cable Row");
}

{
  const result = parse("Dumbbell Curl\n3x12");
  assert.equal(result.programName, "Importeret træningspas", "Første øvelse må ikke fejlagtigt blive programnavn");
  assert.equal(result.days[0].exercises.length, 1);
  assert.equal(result.days[0].exercises[0].sets.length, 3);
}

{
  const result = parse("Push-Up");
  const exercise = result.days[0].exercises[0];
  assert.equal(exercise.sets.length, 1, "Manglende sæt skal give præcis 1 fallback-sæt");
  assert.equal(exercise.setCountInferred, true);
  assert.equal(exercise.sets[0].reps, "");
  assert.equal(exercise.sets[0].weight, "");
  assert.match(exercise.warnings.join(" "), /1 sæt/);
}

{
  const result = parse("Back Squat\n1 10 60 kg\n2 8 70 kg\n3 8 70 kg");
  const exercise = result.days[0].exercises[0];
  assert.equal(exercise.sets.length, 3);
  assert.deepEqual(exercise.sets.map(set => [set.reps, set.weight]), [["10", "60"], ["8", "70"], ["8", "70"]]);
}

{
  const result = parse("Program: Ben\nBack Squat 4 8-10 100 kg 120 sec\nRomanian Deadlift 3 10 75,5 kg 2 min");
  const [squat, deadlift] = result.days[0].exercises;
  assert.equal(squat.matchedName, "Back Squat");
  assert.equal(squat.sets.length, 4);
  assert.equal(squat.sets[0].reps, "8-10");
  assert.equal(squat.sets[0].weight, "100");
  assert.equal(squat.sets[0].pause, "02:00");
  assert.equal(deadlift.sets[0].weight, "75.5");
}

{
  const result = parse("Dumbbell Curl\n12,5 kg", 49);
  const exercise = result.days[0].exercises[0];
  assert.equal(exercise.sets.length, 1, "Et beskåret billede bevarer fallback på ét sæt");
  assert.equal(exercise.sets[0].weight, "12.5");
  assert.equal(exercise.sets[0].reps, "");
}

{
  const result = parse("RDL 4x8 80 kg\nDumbbell Curl 3x10");
  assert.equal(result.days[0].exercises[0].matchedName, "Romanian Deadlift");
  assert.equal(result.days[0].exercises[1].sets[0].weight, "", "Kg må ikke opfindes, når enheden ikke findes ved øvelsen");
}

{
  const imports = [{
    approvedAt: "2026-08-11T10:00:00.000Z",
    approvedMappings: [{ ocrName: "Rear Flyy", catalogName: "Rear Delt Fly" }]
  }];
  const match = semantic.matchExerciseName("Rear Flyy", catalog, semantic.extractLearnedMappings(imports));
  assert.equal(match.matchedName, "Rear Delt Fly");
  assert.equal(match.source, "learned");
}

{
  const match = semantic.matchExerciseName("Bench Press", catalog, new Map());
  assert.equal(match.matchedName, "", "Et tvetydigt navn må ikke auto-matches");
  assert.ok(match.suggestions.length >= 2);
  assert.ok(match.suggestions.length <= 3, "Der må højst vises tre forslag");
}

{
  const match = semantic.matchExerciseName("DumbbeII CurI", catalog, new Map());
  assert.equal(match.matchedName, "Dumbbell Curl", "Almindelig I/l OCR-fejl skal kunne matches sikkert");
}

{
  const local = parse("Bench Press 3x10");
  const ai = semantic.validateAiResult({
    programName: "Bryst",
    confidence: { programName: 0.9, overall: 0.91 },
    days: [{
      title: "Dag 1",
      exercises: [{
        ocrName: "Bench Press",
        catalogName: "Barbell Bench Press",
        evidenceLine: "Bench Press 3x10",
        setCount: 3,
        sets: Array.from({ length: 3 }, () => ({ reps: "10", weightKg: 100, pauseSeconds: 90 })),
        confidence: { name: 0.94, sets: 0.98, reps: 0.98, weight: 0.7, pause: 0.7 }
      }]
    }]
  }, "Bench Press 3x10", { catalog });
  assert.ok(ai);
  assert.equal(ai.days[0].exercises[0].sets[0].reps, "10");
  assert.equal(ai.days[0].exercises[0].sets[0].weight, "", "AI-opfundet kg skal fjernes af evidensvalideringen");
  assert.equal(ai.days[0].exercises[0].sets[0].pause, "", "AI-opfundet pause skal fjernes af evidensvalideringen");
  assert.equal(semantic.mergeInterpretations(local, ai).days.length, 1);
}

{
  const cases = [
    "PULL\nLat Pulldown 4x8-12\nBarbell Curl 3 sets 10 reps",
    "Workout: Full body\nBack Squat\nSets: 3 Reps: 8 Weight: 75,5 kg Rest: 2 min",
    "Dag 1\nPush-Up\nSæt 3 reps 12\nDag 2\nLøbebånd"
  ];
  cases.forEach((text, index) => {
    const result = parse(text, index === 2 ? 54 : 90);
    assert.ok(result.days.flatMap(day => day.exercises).length >= 1, `Layoutvariant ${index + 1} skal give øvelser`);
  });
}

{
  const importer = fs.readFileSync("app/screenshot-import.js", "utf8");
  const html = fs.readFileSync("app/index.html", "utf8");
  const serviceWorker = fs.readFileSync("app/service-worker.js", "utf8");
  const functionsIndex = fs.readFileSync("functions/index.js", "utf8");
  const cloudService = fs.readFileSync("app/firestore-cloud-service.js", "utf8");
  assert.ok(html.indexOf("screenshot-import-semantic.js") < html.indexOf("screenshot-import.js"), "Den semantiske kerne skal indlæses før UI-modulet");
  assert.match(html, /screenshot-import-ai-service\.js/);
  assert.match(importer, /buildOcrCanvas/);
  assert.match(importer, /approvedMappings/);
  assert.doesNotMatch(importer, /Brug OCR-navn:/, "Ikke-matchede OCR-navne må ikke omgå Work4it-kataloget");
  assert.match(serviceWorker, /screenshot-import-semantic\.js/);
  assert.match(serviceWorker, /screenshot-import-ai-service\.js/);
  assert.match(functionsIndex, /exports\.interpretWorkoutScreenshotOcr/);
  assert.match(functionsIndex, /reserveAiRequest/);
  assert.match(cloudService, /saveImportDataToCloud/);
  assert.match(html, /await saveImportToCloud\(importRecord\)/);
}

console.log("Screenshot-import semantic parser tests passed");
