const assert = require("node:assert/strict");
const ai = require("../functions/screenshot-ocr-ai.js");

const input = ai.validateRequest({
  rawText: "Push-Up 3x10",
  ocrConfidence: 82,
  catalog: [{ name: "Push-Up", muscle: "Bryst" }, { name: "Push-Up", muscle: "Bryst" }],
  learnedMappings: [{ ocrName: "Push Ups", catalogName: "Push-Up" }]
});
assert.equal(input.catalog.length, 1);
assert.match(ai.buildPrompt(input), /Never invent sets, reps, kg, pause/);
assert.match(ai.buildPrompt(input), /OCR_TEXT_BEGIN/);
assert.deepEqual(ai.extractJson('```json\n{"programName":"Test","days":[]}\n```'), { programName: "Test", days: [] });
assert.throws(() => ai.validateRequest({ rawText: "", catalog: [] }), /tom/);

console.log("Screenshot OCR AI function tests passed");
