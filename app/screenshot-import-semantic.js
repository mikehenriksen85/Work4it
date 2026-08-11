(function screenshotImportSemanticModule(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Work4itScreenshotSemantic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createScreenshotImportSemantic() {
  "use strict";

  const VERSION = "2.0.0";
  const AUTO_MATCH_MIN = 92;
  const SUGGESTION_MIN = 42;
  const MAX_SUGGESTIONS = 3;

  const ALIASES = Object.freeze({
    "bb bench": "Barbell Bench Press",
    "bb bench press": "Barbell Bench Press",
    "barbell bench": "Barbell Bench Press",
    "baenkpres": "Barbell Bench Press",
    "baenkpres med stang": "Barbell Bench Press",
    "db bench": "Dumbbell Bench Press",
    "db bench press": "Dumbbell Bench Press",
    "haandvaegt baenkpres": "Dumbbell Bench Press",
    "incline bench": "Incline Barbell Bench Press",
    "incline bb press": "Incline Barbell Bench Press",
    "incline db press": "Incline Dumbbell Press",
    "skraa haandvaegtspres": "Incline Dumbbell Press",
    "ohp": "Overhead Press",
    "military press": "Military Press",
    "skulderpres": "Overhead Press",
    "db shoulder press": "Dumbbell Shoulder Press",
    "lateral raises": "Lateral Raise",
    "side laterals": "Lateral Raise",
    "pushups": "Push-Up",
    "push ups": "Push-Up",
    "armboejninger": "Push-Up",
    "pullups": "Pull-Up",
    "pull ups": "Pull-Up",
    "kropshaevninger": "Pull-Up",
    "chinups": "Chin-Up",
    "chin ups": "Chin-Up",
    "lat pull down": "Lat Pulldown",
    "nedtraek": "Lat Pulldown",
    "seated row": "Seated Cable Row",
    "siddende kabel row": "Seated Cable Row",
    "bent over row": "Barbell Row",
    "bb row": "Barbell Row",
    "db row": "Dumbbell Row",
    "one arm row": "One-Arm Dumbbell Row",
    "en arms haandvaegt row": "One-Arm Dumbbell Row",
    "rdl": "Romanian Deadlift",
    "romanian dl": "Romanian Deadlift",
    "rumaensk doedloeft": "Romanian Deadlift",
    "doedloeft": "Deadlift",
    "konventionel doedloeft": "Deadlift",
    "backsquat": "Back Squat",
    "back squat": "Back Squat",
    "squat": "Back Squat",
    "knæbojning": "Back Squat",
    "knaeboejning": "Back Squat",
    "frontsquat": "Front Squat",
    "front squat": "Front Squat",
    "bulgarian split squats": "Bulgarian Split Squat",
    "bulgarian squat": "Bulgarian Split Squat",
    "benpres": "Leg Press",
    "leg extensions": "Leg Extension",
    "laar extension": "Leg Extension",
    "hamstring curl": "Lying Leg Curl",
    "leg curls": "Lying Leg Curl",
    "hipthrust": "Hip Thrust",
    "hip thrusts": "Hip Thrust",
    "db curl": "Dumbbell Curl",
    "dumbbell curls": "Dumbbell Curl",
    "haandvaegt curl": "Dumbbell Curl",
    "bb curl": "Barbell Curl",
    "barbell curls": "Barbell Curl",
    "biceps curls": "Barbell Curl",
    "hammer curls": "Hammer Curl",
    "tricep pushdown": "Cable Triceps Pushdown",
    "triceps push down": "Cable Triceps Pushdown",
    "rope push down": "Rope Pushdown",
    "face pulls": "Face Pull",
    "rear delt flies": "Rear Delt Fly",
    "calf raises": "Standing Calf Raise",
    "standing calf raises": "Standing Calf Raise",
    "situps": "Sit-Up",
    "sit ups": "Sit-Up",
    "crunches": "Crunch",
    "running": "Udendørs løb",
    "outdoor run": "Udendørs løb",
    "loeb": "Udendørs løb",
    "treadmill": "Løbebånd",
    "loebebaand": "Løbebånd",
    "rowing machine": "Romaskine",
    "row erg": "Romaskine",
    "bike": "Motionscykel",
    "stationary bike": "Motionscykel",
    "cross trainer": "Crosstrainer",
    "elliptical": "Crosstrainer",
    "stair climber": "Stairmaster / Stair Climber"
  });

  function normalizeLine(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[|¦]/g, " ")
      .replace(/[–—−]/g, "-")
      .replace(/[×✕✖]/g, "x")
      .replace(/[•●▪◦]/g, " • ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeOcrLetters(value) {
    const chars = String(value || "").split("");
    return chars.map((char, index) => {
      const previousIsLetter = index > 0 && /[A-Za-zÆØÅæøå]/.test(chars[index - 1]);
      const nextIsLetterOrEnd = index === chars.length - 1 || !/[0-9]/.test(chars[index + 1]);
      if (char === "I" && previousIsLetter && nextIsLetterOrEnd) return "l";
      if (char === "1" && previousIsLetter && nextIsLetterOrEnd) return "l";
      if (char === "0" && previousIsLetter && nextIsLetterOrEnd) return "o";
      return char;
    }).join("");
  }

  function canonical(value) {
    return normalizeOcrLetters(normalizeLine(value))
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/æ/g, "ae")
      .replace(/ø/g, "oe")
      .replace(/å/g, "aa")
      .replace(/&/g, " and ")
      .replace(/\b(push|pull|chin)[ -]?ups\b/g, "$1 up")
      .replace(/\b([0-9])\s*[oO]\s*([0-9])\b/g, "$10$2")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function numericText(value) {
    return normalizeLine(value)
      .replace(/(\d)[oO](?=\d|\s|$)/g, (_, digit) => `${digit}0`)
      .replace(/(^|\s)[oO](?=\d)/g, (_, prefix) => `${prefix}0`)
      .replace(/(\d)[lI](?=\d|\s|$)/g, (_, digit) => `${digit}1`);
  }

  function uniqueCatalog(catalog) {
    const seen = new Set();
    return (Array.isArray(catalog) ? catalog : []).filter(item => {
      const key = canonical(item?.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function extractLearnedMappings(imports) {
    const mappings = new Map();
    (Array.isArray(imports) ? imports : []).forEach(entry => {
      const approved = Array.isArray(entry?.approvedMappings) ? entry.approvedMappings : [];
      approved.forEach(mapping => {
        const input = canonical(mapping?.ocrName);
        const target = String(mapping?.catalogName || "").trim();
        if (!input || !target) return;
        const current = mappings.get(input);
        const approvals = Math.max(1, Number(mapping.approvals) || 1) + (current?.approvals || 0);
        mappings.set(input, { catalogName: target, approvals, updatedAt: mapping.updatedAt || entry.approvedAt || entry.createdAt || "" });
      });
    });
    return mappings;
  }

  function damerauLevenshtein(leftValue, rightValue) {
    const left = canonical(leftValue);
    const right = canonical(rightValue);
    if (!left || !right) return Math.max(left.length, right.length);
    const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
    for (let i = 0; i <= left.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= right.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= left.length; i++) {
      for (let j = 1; j <= right.length; j++) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
        if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
          matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
        }
      }
    }
    return matrix[left.length][right.length];
  }

  function tokenSimilarity(leftValue, rightValue) {
    const left = [...new Set(canonical(leftValue).split(" ").filter(Boolean))];
    const right = [...new Set(canonical(rightValue).split(" ").filter(Boolean))];
    if (!left.length || !right.length) return 0;
    const tokenScore = (token, values) => Math.max(...values.map(value => {
      const longest = Math.max(token.length, value.length, 1);
      return Math.max(0, 1 - damerauLevenshtein(token, value) / longest);
    }));
    const leftScore = left.reduce((sum, token) => sum + tokenScore(token, right), 0) / left.length;
    const rightScore = right.reduce((sum, token) => sum + tokenScore(token, left), 0) / right.length;
    return (leftScore + rightScore) / 2;
  }

  function acronym(value) {
    return canonical(value).split(" ").filter(Boolean).map(token => token[0]).join("");
  }

  function equipmentTerms(value) {
    const terms = new Set();
    const normalized = canonical(value);
    const groups = {
      dumbbell: /\b(dumbbell|db|haandvaegt)\b/,
      barbell: /\b(barbell|bb|vaegtstang|stang)\b/,
      cable: /\b(cable|kabel|rope)\b/,
      machine: /\b(machine|maskine|smith)\b/,
      kettlebell: /\b(kettlebell|kb)\b/,
      bodyweight: /\b(bodyweight|kropsvaegt)\b/
    };
    Object.entries(groups).forEach(([term, pattern]) => { if (pattern.test(normalized)) terms.add(term); });
    return terms;
  }

  function scoreCandidate(input, candidate) {
    const left = canonical(input);
    const right = canonical(candidate);
    if (!left || !right) return 0;
    if (left === right) return 100;
    const longest = Math.max(left.length, right.length, 1);
    const edit = Math.max(0, 1 - damerauLevenshtein(left, right) / longest);
    const tokens = tokenSimilarity(left, right);
    const contains = left.includes(right) || right.includes(left) ? 1 : 0;
    const acronymMatch = left.length >= 2 && left.length <= 5 && left === acronym(right) ? 1 : 0;
    let score = (edit * 50) + (tokens * 32) + (contains * 10) + (acronymMatch * 18);
    const inputEquipment = equipmentTerms(left);
    const candidateEquipment = equipmentTerms(right);
    if (inputEquipment.size && candidateEquipment.size && ![...inputEquipment].some(term => candidateEquipment.has(term))) score -= 24;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function matchExerciseName(rawName, catalog, learnedMappings) {
    const inputName = cleanExerciseName(rawName);
    const inputKey = canonical(inputName);
    const values = uniqueCatalog(catalog);
    if (!inputKey || !values.length) {
      return { inputName, matchedName: "", muscle: "", confidence: 0, status: "missing", source: "none", suggestions: [] };
    }

    const learned = learnedMappings instanceof Map ? learnedMappings.get(inputKey) : null;
    const learnedExercise = learned && values.find(item => canonical(item.name) === canonical(learned.catalogName));
    if (learnedExercise) {
      return {
        inputName,
        matchedName: learnedExercise.name,
        muscle: learnedExercise.muscle || "",
        confidence: 100,
        status: "matched",
        source: "learned",
        suggestions: [{ name: learnedExercise.name, muscle: learnedExercise.muscle || "", confidence: 100 }]
      };
    }

    const aliasTarget = ALIASES[inputKey];
    const aliasExercise = aliasTarget && values.find(item => canonical(item.name) === canonical(aliasTarget));
    if (aliasExercise) {
      return {
        inputName,
        matchedName: aliasExercise.name,
        muscle: aliasExercise.muscle || "",
        confidence: 98,
        status: "matched",
        source: "synonym",
        suggestions: [{ name: aliasExercise.name, muscle: aliasExercise.muscle || "", confidence: 98 }]
      };
    }

    const scored = values.map(exercise => ({ exercise, score: scoreCandidate(inputName, exercise.name) }))
      .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
    const best = scored[0];
    const second = scored[1];
    const margin = (best?.score || 0) - (second?.score || 0);
    const exact = canonical(best?.exercise?.name) === inputKey;
    const autoMatch = Boolean(best && (exact || (best.score >= AUTO_MATCH_MIN && margin >= 6)));
    const suggestions = scored.slice(0, MAX_SUGGESTIONS)
      .filter(item => item.score >= SUGGESTION_MIN)
      .map(item => ({ name: item.exercise.name, muscle: item.exercise.muscle || "", confidence: item.score }));
    return {
      inputName,
      matchedName: autoMatch ? best.exercise.name : "",
      muscle: autoMatch ? best.exercise.muscle || "" : "",
      confidence: best?.score || 0,
      status: autoMatch ? "matched" : suggestions.length ? "needs_review" : "missing",
      source: exact ? "exact" : autoMatch ? "fuzzy_high" : "suggestion",
      suggestions
    };
  }

  function secondsToPause(seconds) {
    const value = Math.max(0, Math.min(60 * 60, Number(seconds) || 0));
    return value ? `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}` : "";
  }

  function parsePause(line) {
    const value = numericText(line);
    const clock = value.match(/\b(?:pause|rest)\s*[:=]?\s*(\d{1,2}):(\d{2})\b/i);
    if (clock) return { value: secondsToPause(Number(clock[1]) * 60 + Number(clock[2])), confidence: 99, evidence: clock[0] };
    const explicit = value.match(/\b(?:pause|rest)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(min(?:utter?)?|m|sek(?:under?)?|sec(?:onds?)?|s)\b/i);
    if (!explicit) return { value: "", confidence: 0, evidence: "" };
    const amount = Number(explicit[1].replace(",", "."));
    const seconds = /^(min|m)/i.test(explicit[2]) ? Math.round(amount * 60) : Math.round(amount);
    return { value: secondsToPause(seconds), confidence: 98, evidence: explicit[0] };
  }

  function parseSetRow(line) {
    const value = numericText(line);
    let match = value.match(/^\s*(\d{1,2})[.)]?\s+(\d{1,3}(?:\s*-\s*\d{1,3})?)\s+(\d+(?:[.,]\d+)?)\s*kg\b/i);
    if (match) return { index: Number(match[1]), reps: match[2].replace(/\s/g, ""), weight: match[3].replace(",", "."), sourceText: line };
    match = value.match(/^\s*(\d{1,2})[.)]?\s+(\d+(?:[.,]\d+)?)\s*kg\s*(?:x\s*)?(\d{1,3}(?:\s*-\s*\d{1,3})?)\b/i);
    if (match) return { index: Number(match[1]), reps: match[3].replace(/\s/g, ""), weight: match[2].replace(",", "."), sourceText: line };
    match = value.match(/^\s*(?:set|saet|sæt)\s*(\d{1,2})\s*[:.-]?\s*(\d{1,3}(?:\s*-\s*\d{1,3})?)\s*(?:reps?)?\s*(?:@|x)?\s*(\d+(?:[.,]\d+)?)?\s*(kg)?\b/i);
    if (match && match[2]) return { index: Number(match[1]), reps: match[2].replace(/\s/g, ""), weight: match[4] ? String(match[3] || "").replace(",", ".") : "", sourceText: line };
    return null;
  }

  function parsePrescription(line) {
    const value = numericText(line);
    const pause = parsePause(value);
    const setRow = parseSetRow(value);
    const table = value.match(/^(.+?[a-zæøå)])\s+(\d{1,2})\s+(\d{1,3}(?:\s*-\s*\d{1,3})?)\s+(\d+(?:[.,]\d+)?)\s*kg(?:\s+(\d+(?:[.,]\d+)?)\s*(min(?:utter?)?|m|sek(?:under?)?|sec(?:onds?)?|s))?$/i);
    const compact = value.match(/\b(\d{1,2})\s*x\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\b/i);
    const words = value.match(/\b(\d{1,2})\s*(?:sæt|saet|sets?)\s*(?:x|of|med)?\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*(?:reps?|gentagelser?)?\b/i);
    const labeledSets = value.match(/\b(?:sæt|saet|sets?)\s*[:=]?\s*(\d{1,2})\b/i);
    const labeledReps = value.match(/\b(?:reps?|gentagelser?)\s*[:=]?\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\b/i);
    const weight = value.match(/\b(?:kg|vægt|vaegt|weight)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i)
      || value.match(/\b(\d+(?:[.,]\d+)?)\s*kg\b/i);
    const weightValue = table ? table[4].replace(",", ".") : weight ? (weight[1] || "").replace(",", ".") : "";
    const match = compact || words;
    const setCount = table ? Number(table[2]) : match ? Number(match[1]) : labeledSets ? Number(labeledSets[1]) : null;
    const reps = table ? table[3].replace(/\s/g, "") : match ? `${match[2]}${match[3] ? `-${match[3]}` : ""}` : labeledReps ? `${labeledReps[1]}${labeledReps[2] ? `-${labeledReps[2]}` : ""}` : "";
    const tablePause = table?.[5]
      ? secondsToPause(/^(min|m)/i.test(table[6] || "") ? Math.round(Number(table[5].replace(",", ".")) * 60) : Math.round(Number(table[5].replace(",", "."))))
      : "";
    return {
      name: table?.[1]?.trim() || "",
      setCount: Number.isInteger(setCount) && setCount >= 1 && setCount <= 20 ? setCount : null,
      reps,
      weight: weightValue,
      pause: pause.value || tablePause,
      setRow,
      confidence: {
        sets: setCount ? 98 : 0,
        reps: reps ? 98 : 0,
        weight: weightValue ? 98 : 0,
        pause: pause.confidence || (tablePause ? 94 : 0)
      },
      hasValues: Boolean(setCount || reps || weightValue || pause.value || tablePause || setRow)
    };
  }

  function cleanExerciseName(line) {
    return normalizeLine(line)
      .replace(/^\s*(?:[-•✓]|\d+[.)])\s*/, "")
      .replace(/^\s*(?:exercise|øvelse)\s*[:=-]\s*/i, "")
      .replace(/\s+\d{1,2}\s*x\s*\d{1,3}(?:\s*-\s*\d{1,3})?.*$/i, "")
      .replace(/\s+\d{1,2}\s*(?:sæt|saet|sets?)\b.*$/i, "")
      .replace(/\s+(?:sæt|saet|sets?|reps?|gentagelser?|kg|vægt|vaegt|weight|pause|rest)\s*[:=].*$/i, "")
      .replace(/\s+\d+(?:[.,]\d+)?\s*kg\b.*$/i, "")
      .replace(/[:;,.-]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function dayHeading(line) {
    const value = normalizeLine(line);
    const explicit = value.match(/^(?:(dag|day)\s*(\d{0,2})|mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:.\-–]?\s*(.*)$/i);
    if (explicit) return value.replace(/[:.\-–]+$/, "").trim();
    if (/^(push|pull|upper|lower|full\s*body|helkrop|bryst(?:\s*(?:og|&)\s*triceps)?|ryg(?:\s*(?:og|&)\s*biceps)?|ben|legs?)(?:\s+(?:day|dag|a|b|1|2))?$/i.test(value)) return value;
    return "";
  }

  function looksLikeNoise(line) {
    const value = normalizeLine(line);
    return !value || value.length < 2
      || /^(workout|træning|program|exercise|øvelse|sets?|sæt|saet|reps?|kg|weight|vægt|vaegt|rest|pause|notes?|noter?|done|færdig)$/i.test(value)
      || /^(hevy|strong|fitbod)$/i.test(value)
      || /^(exercise|øvelse)\b.*\b(sets?|sæt|saet|reps?|gentagelser)\b/i.test(value)
      || /\b(?:days?|dage|weeks?|uger|months?|måneder)\s+ago\b/i.test(value)
      || /^(wifi|bluetooth|battery|batteri|notification|notifikation|menu|navigation|nav|back|tilbage)$/i.test(value)
      || /^\d{1,3}%$/.test(value)
      || /^\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?$/.test(value);
  }

  function explicitProgramTitle(line) {
    const match = normalizeLine(line).match(/^(?:program|workout|træningspas|traeningspas|plan)\s*[:=-]\s*(.{2,70})$/i);
    return match ? match[1].trim() : "";
  }

  function fieldWarnings(exercise) {
    const warnings = [];
    if (exercise.setCountInferred) warnings.push("Sæt mangler – 1 sæt er indsat som fallback.");
    if (!exercise.sets.some(set => set.reps)) warnings.push("Reps kunne ikke aflæses sikkert.");
    if (exercise.matchStatus !== "matched") warnings.push("Vælg et af de foreslåede Work4it-matches.");
    return warnings;
  }

  function reviewFieldNames(fieldConfidence) {
    return Object.entries(fieldConfidence || {}).filter(([field, score]) => {
      if (["weight", "pause"].includes(field) && Number(score) === 0) return false;
      return Number(score) < 85;
    }).map(([field]) => field);
  }

  function buildExercise(rawName, prescription, catalog, learnedMappings, sourceText) {
    const match = matchExerciseName(rawName, catalog, learnedMappings);
    const rows = prescription.setRow ? [prescription.setRow] : [];
    const setCount = prescription.setCount || rows.length || 1;
    const sets = rows.length
      ? rows.map(row => ({ reps: row.reps || "", weight: row.weight || "", pause: prescription.pause || "", sourceText: row.sourceText || sourceText }))
      : Array.from({ length: setCount }, () => ({ reps: prescription.reps || "", weight: prescription.weight || "", pause: prescription.pause || "", sourceText }));
    const exercise = {
      originalName: match.inputName || rawName,
      name: match.matchedName || match.inputName || rawName,
      matchedName: match.matchedName,
      muscle: match.muscle,
      matchConfidence: match.confidence,
      matchStatus: match.status,
      matchSource: match.source,
      matchSuggestions: match.suggestions,
      setCount,
      setCountInferred: !prescription.setCount && !rows.length,
      reps: sets[0]?.reps || "",
      weight: sets[0]?.weight || "",
      pause: sets[0]?.pause || "",
      sets,
      notes: "",
      fieldConfidence: {
        name: match.confidence,
        sets: prescription.setCount || rows.length ? 98 : 30,
        reps: sets.some(set => set.reps) ? 98 : 0,
        weight: sets.some(set => set.weight) ? 98 : 0,
        pause: sets.some(set => set.pause) ? 98 : 0
      },
      sourceText: sourceText || rawName
    };
    exercise.reviewFields = reviewFieldNames(exercise.fieldConfidence);
    exercise.warnings = fieldWarnings(exercise);
    exercise.uncertain = exercise.reviewFields.length > 0 || exercise.matchStatus !== "matched";
    return exercise;
  }

  function mergePrescription(exercise, prescription, sourceText) {
    if (!exercise || !prescription?.hasValues) return exercise;
    if (prescription.setRow) {
      const row = prescription.setRow;
      const index = Math.max(0, Math.min(19, Number(row.index || exercise.sets.length + 1) - 1));
      while (exercise.sets.length <= index) exercise.sets.push({ reps: "", weight: "", pause: "", sourceText: "" });
      exercise.sets[index] = { reps: row.reps || "", weight: row.weight || "", pause: prescription.pause || "", sourceText: row.sourceText || sourceText };
      exercise.setCount = exercise.sets.length;
      exercise.setCountInferred = false;
      exercise.fieldConfidence.sets = 98;
    } else {
      const count = prescription.setCount || exercise.setCount || 1;
      exercise.setCount = count;
      exercise.setCountInferred = !prescription.setCount && exercise.setCountInferred;
      const current = exercise.sets.length ? exercise.sets : [{}];
      exercise.sets = Array.from({ length: count }, (_, index) => ({
        reps: prescription.reps || current[index]?.reps || current[0]?.reps || "",
        weight: prescription.weight || current[index]?.weight || current[0]?.weight || "",
        pause: prescription.pause || current[index]?.pause || current[0]?.pause || "",
        sourceText: sourceText || current[index]?.sourceText || ""
      }));
      if (prescription.setCount) exercise.fieldConfidence.sets = 98;
    }
    if (prescription.reps || prescription.setRow?.reps) exercise.fieldConfidence.reps = 98;
    if (prescription.weight || prescription.setRow?.weight) exercise.fieldConfidence.weight = 98;
    if (prescription.pause) exercise.fieldConfidence.pause = 98;
    exercise.reps = exercise.sets[0]?.reps || "";
    exercise.weight = exercise.sets[0]?.weight || "";
    exercise.pause = exercise.sets[0]?.pause || "";
    exercise.reviewFields = reviewFieldNames(exercise.fieldConfidence);
    exercise.warnings = fieldWarnings(exercise);
    exercise.uncertain = exercise.reviewFields.length > 0 || exercise.matchStatus !== "matched";
    return exercise;
  }

  function detectProgramName(lines, catalog, learnedMappings) {
    for (const line of lines) {
      const explicit = explicitProgramTitle(line);
      if (explicit) return { title: explicit, source: "explicit", confidence: 99 };
    }
    const first = lines.find(line => !looksLikeNoise(line) && !dayHeading(line));
    if (!first) return { title: "Importeret træningspas", source: "fallback", confidence: 30 };
    const prescription = parsePrescription(first);
    const match = matchExerciseName(cleanExerciseName(first), catalog, learnedMappings);
    if (!prescription.hasValues && match.confidence < SUGGESTION_MIN && first.length <= 70) {
      return { title: cleanExerciseName(first), source: "heading", confidence: 72 };
    }
    return { title: "Importeret træningspas", source: "fallback", confidence: 30 };
  }

  function parseOcrText(text, confidence, options) {
    const catalog = uniqueCatalog(options?.catalog || []);
    const learnedMappings = options?.learnedMappings instanceof Map ? options.learnedMappings : extractLearnedMappings(options?.imports || []);
    const lines = String(text || "").split(/\r?\n/).map(normalizeLine).filter(Boolean);
    const titleInfo = detectProgramName(lines, catalog, learnedMappings);
    const result = {
      parserVersion: VERSION,
      interpretationSource: "local_semantic",
      programName: titleInfo.title,
      title: titleInfo.title,
      titleConfidence: titleInfo.confidence,
      confidence: Math.max(0, Math.min(100, Math.round(Number(confidence) || 0))),
      days: [{ id: "day_1", title: "Dag 1", exercises: [] }],
      warnings: [],
      diagnostics: { lineCount: lines.length, ignoredLines: [], autoMatches: 0, reviewMatches: 0 }
    };
    let day = result.days[0];
    let pendingExercise = null;

    lines.forEach(line => {
      const title = explicitProgramTitle(line);
      if (title) return;
      const heading = dayHeading(line);
      if (heading) {
        if (!day.exercises.length && result.days.length === 1) day.title = heading;
        else {
          day = { id: `day_${result.days.length + 1}`, title: heading, exercises: [] };
          result.days.push(day);
        }
        pendingExercise = null;
        return;
      }
      if (looksLikeNoise(line)) {
        result.diagnostics.ignoredLines.push(line);
        return;
      }
      if (titleInfo.source === "heading" && canonical(line) === canonical(titleInfo.title)) return;

      const prescription = parsePrescription(line);
      const prescriptionLineMatch = prescription.hasValues
        ? matchExerciseName(cleanExerciseName(line), catalog, learnedMappings)
        : null;
      if (pendingExercise && prescription.hasValues && (prescription.setRow || (prescriptionLineMatch?.confidence || 0) < SUGGESTION_MIN)) {
        mergePrescription(pendingExercise, prescription, line);
        return;
      }

      const rawName = prescription.name || cleanExerciseName(line);
      const match = matchExerciseName(rawName, catalog, learnedMappings);
      const plausibleName = Boolean(rawName && /[a-zæøå]/i.test(rawName) && rawName.length <= 90 && (prescription.hasValues || match.confidence >= SUGGESTION_MIN));
      if (plausibleName) {
        const exercise = buildExercise(rawName, prescription, catalog, learnedMappings, line);
        day.exercises.push(exercise);
        pendingExercise = exercise;
        if (exercise.matchStatus === "matched") result.diagnostics.autoMatches += 1;
        else result.diagnostics.reviewMatches += 1;
        return;
      }

      if (pendingExercise && /^(?:note|notes|noter?|bemærkning)\s*:/i.test(line)) {
        pendingExercise.notes = line.replace(/^[^:]+:\s*/, "");
        return;
      }
      result.diagnostics.ignoredLines.push(line);
    });

    result.days = result.days.filter(item => item.exercises.length);
    if (!result.days.length) result.days = [{ id: "day_1", title: "Dag 1", exercises: [] }];
    const exercises = result.days.flatMap(item => item.exercises);
    if (!exercises.length) result.warnings.push("Ingen sikre øvelser blev fundet. Kontrollér billedet eller redigér OCR-teksten.");
    const fallbackSets = exercises.filter(exercise => exercise.setCountInferred).length;
    const unresolved = exercises.filter(exercise => exercise.matchStatus !== "matched").length;
    const missingValues = exercises.filter(exercise => exercise.reviewFields.includes("reps")).length;
    if (fallbackSets) result.warnings.push(`${fallbackSets} ${fallbackSets === 1 ? "øvelse bruger" : "øvelser bruger"} fallback på 1 sæt.`);
    if (unresolved) result.warnings.push(`${unresolved} ${unresolved === 1 ? "øvelse kræver" : "øvelser kræver"} valg mellem de mest sandsynlige Work4it-matches.`);
    if (missingValues) result.warnings.push("Kun felter med sikker aflæsning er udfyldt; øvrige felter er markeret til kontrol.");
    if (result.confidence < 60) result.warnings.push("Billedets samlede OCR-sikkerhed er lav, men sikkert aflæste enkeltfelter er bevaret.");
    return result;
  }

  function numberTokens(value) {
    return String(value || "").replace(/,/g, ".").match(/\d+(?:\.\d+)?/g) || [];
  }

  function evidenceSupports(value, evidenceLine, rawText) {
    if (value == null || value === "") return false;
    const evidence = normalizeLine(evidenceLine);
    if (!evidence || !canonical(rawText).includes(canonical(evidence))) return false;
    const evidenceNumbers = new Set(numberTokens(evidence));
    return numberTokens(value).every(token => evidenceNumbers.has(token));
  }

  function validateAiResult(aiResult, rawText, options) {
    if (!aiResult || typeof aiResult !== "object" || !Array.isArray(aiResult.days)) return null;
    const catalog = uniqueCatalog(options?.catalog || []);
    const learnedMappings = options?.learnedMappings instanceof Map ? options.learnedMappings : extractLearnedMappings(options?.imports || []);
    const days = aiResult.days.slice(0, 14).map((aiDay, dayIndex) => {
      const exercises = (Array.isArray(aiDay?.exercises) ? aiDay.exercises : []).slice(0, 40).map(aiExercise => {
        const evidence = normalizeLine(aiExercise?.evidenceLine || aiExercise?.sourceText || "");
        const ocrName = cleanExerciseName(aiExercise?.ocrName || aiExercise?.name || "");
        const requestedCatalogName = String(aiExercise?.catalogName || "").trim();
        const catalogExercise = catalog.find(item => canonical(item.name) === canonical(requestedCatalogName));
        const localMatch = matchExerciseName(ocrName, catalog, learnedMappings);
        const suggestionNames = new Set(localMatch.suggestions.map(item => canonical(item.name)));
        const modelNameConfidence = Math.round(100 * Math.max(0, Math.min(1, Number(aiExercise?.confidence?.name) || 0)));
        const modelCatalogAllowed = Boolean(catalogExercise && (suggestionNames.has(canonical(catalogExercise.name)) || scoreCandidate(ocrName, catalogExercise.name) >= 70));
        const match = modelCatalogAllowed && modelNameConfidence >= AUTO_MATCH_MIN
          ? { ...localMatch, matchedName: catalogExercise.name, muscle: catalogExercise.muscle || "", confidence: Math.min(99, Math.max(localMatch.confidence, modelNameConfidence)), status: "matched", source: "ai_validated" }
          : localMatch;
        const setCountValue = Math.max(1, Math.min(20, Number(aiExercise?.setCount) || 1));
        const setCountSupported = evidenceSupports(aiExercise?.setCount, evidence, rawText);
        const aiSets = Array.isArray(aiExercise?.sets) ? aiExercise.sets.slice(0, 20) : [];
        const sets = (aiSets.length ? aiSets : Array.from({ length: setCountSupported ? setCountValue : 1 }, () => ({
          reps: aiExercise?.reps,
          weightKg: aiExercise?.weightKg,
          pauseSeconds: aiExercise?.pauseSeconds
        }))).map(set => {
          const reps = evidenceSupports(set?.reps, evidence, rawText) ? String(set.reps).replace(/\s/g, "") : "";
          const weight = evidenceSupports(set?.weightKg, evidence, rawText) ? String(set.weightKg).replace(",", ".") : "";
          const pause = evidenceSupports(set?.pauseSeconds, evidence, rawText) ? secondsToPause(set.pauseSeconds) : "";
          return { reps, weight, pause, sourceText: evidence };
        });
        const exercise = {
          originalName: ocrName,
          name: match.matchedName || ocrName,
          matchedName: match.matchedName,
          muscle: match.muscle,
          matchConfidence: match.confidence,
          matchStatus: match.status,
          matchSource: match.source,
          matchSuggestions: match.suggestions,
          setCount: sets.length,
          setCountInferred: !setCountSupported && !aiSets.length,
          reps: sets[0]?.reps || "",
          weight: sets[0]?.weight || "",
          pause: sets[0]?.pause || "",
          sets,
          notes: String(aiExercise?.notes || "").slice(0, 200),
          fieldConfidence: {
            name: match.confidence,
            sets: setCountSupported || aiSets.length ? 90 : 30,
            reps: sets.some(set => set.reps) ? 90 : 0,
            weight: sets.some(set => set.weight) ? 90 : 0,
            pause: sets.some(set => set.pause) ? 90 : 0
          },
          sourceText: evidence
        };
        exercise.reviewFields = reviewFieldNames(exercise.fieldConfidence);
        exercise.warnings = fieldWarnings(exercise);
        exercise.uncertain = exercise.reviewFields.length > 0 || exercise.matchStatus !== "matched";
        return exercise;
      }).filter(exercise => exercise.originalName);
      return { id: `day_${dayIndex + 1}`, title: String(aiDay?.title || `Dag ${dayIndex + 1}`).slice(0, 70), exercises };
    }).filter(day => day.exercises.length);
    if (!days.length) return null;
    const aiProgramName = String(aiResult.programName || "").slice(0, 70).trim();
    const programNameSupported = Boolean(aiProgramName && canonical(rawText).includes(canonical(aiProgramName)));
    return {
      parserVersion: VERSION,
      interpretationSource: "vertex_ai_validated",
      programName: programNameSupported ? aiProgramName : "Importeret træningspas",
      title: programNameSupported ? aiProgramName : "Importeret træningspas",
      titleConfidence: programNameSupported ? Math.round(100 * Math.max(0, Math.min(1, Number(aiResult?.confidence?.programName) || 0))) : 30,
      confidence: Math.round(100 * Math.max(0, Math.min(1, Number(aiResult?.confidence?.overall) || 0))),
      days,
      warnings: [],
      diagnostics: { model: aiResult.model || "gemini", validated: true }
    };
  }

  function mergeInterpretations(localResult, aiResult) {
    if (!aiResult?.days?.length) return localResult;
    const localExerciseCount = localResult?.days?.reduce((sum, day) => sum + (day.exercises?.length || 0), 0) || 0;
    const aiExerciseCount = aiResult.days.reduce((sum, day) => sum + (day.exercises?.length || 0), 0);
    if (aiExerciseCount < Math.max(1, Math.ceil(localExerciseCount * 0.6))) return localResult;
    const merged = { ...aiResult };
    if ((!merged.programName || merged.titleConfidence < 70) && localResult?.programName) {
      merged.programName = localResult.programName;
      merged.title = localResult.title;
      merged.titleConfidence = localResult.titleConfidence;
    }
    merged.warnings = [...new Set([
      ...(aiResult.warnings || []),
      ...aiResult.days.flatMap(day => day.exercises).flatMap(fieldWarnings)
    ])];
    return merged;
  }

  function approvedMappings(program) {
    const grouped = new Map();
    (program?.days || []).flatMap(day => day.exercises || []).forEach(exercise => {
      const ocrName = String(exercise.originalName || "").trim();
      const catalogName = String(exercise.matchedName || "").trim();
      if (!ocrName || !catalogName || canonical(ocrName) === canonical(catalogName)) return;
      const key = `${canonical(ocrName)}::${canonical(catalogName)}`;
      if (!grouped.has(key)) grouped.set(key, { ocrName, catalogName, approvals: 1, updatedAt: new Date().toISOString() });
      else grouped.get(key).approvals += 1;
    });
    return [...grouped.values()];
  }

  function qualityScore(result) {
    const exercises = result?.days?.flatMap(day => day.exercises || []) || [];
    if (!exercises.length) return 0;
    const matched = exercises.filter(exercise => exercise.matchStatus === "matched").length;
    const populated = exercises.reduce((sum, exercise) => sum + [exercise.sets?.length, exercise.reps, exercise.weight, exercise.pause].filter(Boolean).length, 0);
    return (exercises.length * 20) + (matched * 12) + (populated * 3) + (Number(result.confidence) || 0) / 10;
  }

  return {
    VERSION,
    AUTO_MATCH_MIN,
    MAX_SUGGESTIONS,
    ALIASES,
    normalizeLine,
    canonical,
    extractLearnedMappings,
    matchExerciseName,
    parsePrescription,
    parseOcrText,
    validateAiResult,
    mergeInterpretations,
    approvedMappings,
    qualityScore,
    secondsToPause
  };
});
