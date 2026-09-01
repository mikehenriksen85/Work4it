(function aiCoachProgramEngineModule() {
  "use strict";

  const PROGRAM_TYPES = new Set(["push", "pull", "fullbody", "stability", "cardio", "calisthenics"]);
  const GOALS = new Set(["muscle_gain", "weight_loss", "strength", "general_health", "cardio"]);
  const LEVELS = new Set(["beginner", "light_intermediate", "intermediate", "experienced"]);
  const TYPE_LABELS = {
    push: "Push",
    pull: "Pull",
    fullbody: "FullBody",
    stability: "Stabilitet",
    cardio: "Cardio",
    calisthenics: "Calisthenics"
  };
  const GOAL_LABELS = {
    muscle_gain: "Muskelopbygning",
    weight_loss: "Vægttab",
    strength: "Styrke",
    general_health: "Generel sundhed",
    cardio: "Kondition"
  };
  const TYPE_MUSCLES = {
    push: ["Bryst", "Skuldre", "Triceps", "Forside lår"],
    pull: ["Øvre ryg", "Biceps", "Bagside lår & baller"],
    fullbody: ["Forside lår", "Bryst", "Øvre ryg", "Bagside lår & baller", "Skuldre", "Mave"],
    stability: ["Mave", "Nedre ryg / lænd"],
    calisthenics: ["Bryst", "Øvre ryg", "Forside lår", "Skuldre", "Triceps", "Mave", "FullBody"],
    cardio: ["Cardio"]
  };

  function text(value) {
    return String(value || "").trim();
  }

  function normalize(value) {
    return text(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Number(value) || minimum));
  }

  function categoryFor(exercise) {
    if (text(exercise?.category)) return text(exercise.category);
    if (["Bryst", "Skuldre", "Triceps", "Forside lår"].includes(exercise?.muscle)) return "Push";
    if (["Øvre ryg", "Biceps", "Bagside lår & baller"].includes(exercise?.muscle)) return "Pull";
    if (["Mave", "Nedre ryg / lænd"].includes(exercise?.muscle)) return "Stabilitet";
    if (exercise?.muscle === "Cardio") return "Cardio";
    if (exercise?.muscle === "FullBody") return "FullBody";
    return "Andet";
  }

  function equipmentFor(exercise) {
    if (text(exercise?.equipment)) {
      const explicit = normalize(exercise.equipment);
      if (/dumbbell|handvaegt/.test(explicit)) return "Håndvægte";
      if (/bodyweight|kropsvaegt/.test(explicit)) return "Kropsvægt";
      if (/barbell|vaegtstang|^stang$/.test(explicit)) return "Vægtstang";
      if (/machine|maskine/.test(explicit)) return "Maskiner";
      if (/cable|kabel/.test(explicit)) return "Kabel";
      if (/kettlebell/.test(explicit)) return "Kettlebell";
      if (/band|elastik/.test(explicit)) return "Elastik";
      if (/cardio/.test(explicit)) return "Cardio";
      return text(exercise.equipment);
    }
    const name = normalize(exercise?.name);
    if (exercise?.muscle === "Cardio") return "Cardio";
    if (/dumbbell|handvaegt/.test(name)) return "Håndvægte";
    if (/barbell|ez bar|vaegtstang/.test(name)) return "Vægtstang";
    if (/kettlebell/.test(name)) return "Kettlebell";
    if (/cable|kabel|pulldown|pushdown|face pull/.test(name)) return "Kabel";
    if (/machine|maskine|pec deck|leg press|hack squat/.test(name)) return "Maskiner";
    if (/resistance band|elastik/.test(name)) return "Elastik";
    if (exercise?.type === "Hjemme" || exercise?.trainingStyle === "calisthenics") return "Kropsvægt";
    return "Andet";
  }

  function normalizeEquipment(values) {
    return (Array.isArray(values) ? values : [])
      .map(value => {
        const item = normalize(value);
        if (/dumbbell|handvaegt/.test(item)) return "Håndvægte";
        if (/bodyweight|kropsvaegt|uden udstyr/.test(item)) return "Kropsvægt";
        if (/barbell|vaegtstang|stang/.test(item)) return "Vægtstang";
        if (/machine|maskine/.test(item)) return "Maskiner";
        if (/cable|kabel/.test(item)) return "Kabel";
        if (/kettlebell/.test(item)) return "Kettlebell";
        if (/band|elastik/.test(item)) return "Elastik";
        return text(value);
      })
      .filter(Boolean);
  }

  function requestedEquipment(action, profile) {
    if (action?.constraint === "dumbbells_only") return ["Håndvægte"];
    if (action?.constraint === "no_equipment") return ["Kropsvægt"];
    return normalizeEquipment(action?.availableEquipment || profile?.availableEquipment);
  }

  function resolveType(action, profile) {
    if (PROGRAM_TYPES.has(action?.programType)) return action.programType;
    if (action?.goal === "cardio" || profile?.goal === "cardio") return "cardio";
    if (action?.style === "calisthenics" || profile?.preferredTrainingStyle === "calisthenics") return "calisthenics";
    return "fullbody";
  }

  function prescription(goal, level, durationMinutes) {
    const shortWorkout = durationMinutes > 0 && durationMinutes <= 20;
    if (goal === "strength") {
      return { setCount: shortWorkout ? 2 : level === "experienced" ? 4 : 3, targetReps: level === "beginner" ? "6-8" : "4-6", pauseSeconds: shortWorkout ? 90 : 150 };
    }
    if (goal === "muscle_gain") {
      return { setCount: shortWorkout ? 2 : level === "experienced" ? 4 : 3, targetReps: "8-12", pauseSeconds: shortWorkout ? 60 : 90 };
    }
    if (goal === "weight_loss") return { setCount: shortWorkout ? 2 : 3, targetReps: "10-15", pauseSeconds: 60 };
    return { setCount: shortWorkout ? 2 : 3, targetReps: "8-12", pauseSeconds: shortWorkout ? 45 : 75 };
  }

  function formatPause(seconds) {
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function setTemplate(plan, sourceSet = {}) {
    return {
      prev: text(sourceSet.prev),
      completed: false,
      weight: sourceSet.weight ?? sourceSet.weightKg ?? "",
      reps: sourceSet.reps ?? "",
      targetReps: text(sourceSet.targetReps) || plan.targetReps,
      pause: formatPause(plan.pauseSeconds),
      pauseSeconds: plan.pauseSeconds,
      pauseManual: false
    };
  }

  function uniqueCatalog(catalog) {
    const seen = new Set();
    return (Array.isArray(catalog) ? catalog : []).filter(exercise => {
      const key = `${normalize(exercise?.name)}|${normalize(exercise?.muscle)}`;
      if (!exercise?.name || !exercise?.muscle || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function findCatalogExercise(catalog, name, muscle = "") {
    const normalizedName = normalize(name);
    const exact = catalog.find(exercise => normalize(exercise.name) === normalizedName && (!muscle || exercise.muscle === muscle));
    return exact || catalog.find(exercise => normalize(exercise.name) === normalizedName) || null;
  }

  function eligibleCatalog(catalog, programType, style, equipment) {
    const muscles = TYPE_MUSCLES[programType] || TYPE_MUSCLES.fullbody;
    let pool = uniqueCatalog(catalog).filter(exercise => muscles.includes(exercise.muscle));
    if (programType === "calisthenics" || style === "calisthenics") {
      pool = pool.filter(exercise => exercise.trainingStyle === "calisthenics" || equipmentFor(exercise) === "Kropsvægt");
    } else if (style === "home") {
      pool = pool.filter(exercise => exercise.type === "Hjemme" || equipmentFor(exercise) === "Kropsvægt");
    } else if (style === "gym") {
      pool = pool.filter(exercise => exercise.type !== "Hjemme" || equipmentFor(exercise) !== "Kropsvægt");
    }
    if (equipment.length) {
      const filtered = pool.filter(exercise => equipment.includes(equipmentFor(exercise)));
      if (filtered.length) pool = filtered;
    }
    return pool;
  }

  function selectExercises(catalog, programType, style, equipment, count, variant = 0) {
    const pool = eligibleCatalog(catalog, programType, style, equipment);
    const muscles = TYPE_MUSCLES[programType] || TYPE_MUSCLES.fullbody;
    const selected = [];
    const used = new Set();
    const offset = Math.max(0, Number(variant) || 0);

    for (let index = 0; index < count; index += 1) {
      const muscle = muscles[index % muscles.length];
      const candidates = pool.filter(exercise => exercise.muscle === muscle && !used.has(normalize(exercise.name)));
      const fallback = pool.filter(exercise => !used.has(normalize(exercise.name)));
      const source = candidates.length ? candidates : fallback;
      if (!source.length) break;
      const exercise = source[(offset + Math.floor(index / muscles.length)) % source.length];
      used.add(normalize(exercise.name));
      selected.push(exercise);
    }
    return selected;
  }

  function adaptActiveExercises(action, context, catalog, count, variant) {
    const active = Array.isArray(context?.activeProgram?.exercises) ? context.activeProgram.exercises : [];
    if (!active.length) return [];
    const equipment = requestedEquipment(action, context.profile);
    const planType = resolveType(action, context.profile);
    const pool = eligibleCatalog(catalog, planType, action.style || context.profile?.preferredTrainingStyle, equipment);
    const used = new Set();
    const result = [];
    for (const current of active) {
      if (result.length >= count) break;
      const definition = findCatalogExercise(catalog, current.name, current.muscle);
      let chosen = definition;
      if (action.constraint === "dumbbells_only" || action.constraint === "no_equipment") {
        const required = action.constraint === "dumbbells_only" ? "Håndvægte" : "Kropsvægt";
        if (!chosen || equipmentFor(chosen) !== required) {
          const alternatives = pool.filter(exercise => exercise.muscle === (current.muscle || definition?.muscle) && !used.has(normalize(exercise.name)));
          chosen = alternatives[variant % Math.max(1, alternatives.length)] || null;
        }
      }
      if (chosen && !used.has(normalize(chosen.name))) {
        used.add(normalize(chosen.name));
        result.push({ definition: chosen, source: current });
      }
    }
    return result;
  }

  function programExercise(exercise, source, order, plan, programType) {
    const sourceSets = Array.isArray(source?.sets) ? source.sets : [];
    return {
      order,
      name: exercise.name,
      muscle: exercise.muscle,
      category: categoryFor(exercise),
      type: programType,
      equipment: equipmentFor(exercise),
      exerciseType: exercise.muscle === "Cardio" ? "cardio" : "strength",
      trainingStyle: exercise.trainingStyle || (exercise.type === "Hjemme" ? "calisthenics" : "gym"),
      sets: Array.from({ length: plan.setCount }, (_, index) => setTemplate(plan, sourceSets[index]))
    };
  }

  function generate(action = {}, context = {}, catalog = [], options = {}) {
    const profile = context.profile || {};
    const variant = Math.max(0, Number(options.variant) || 0);
    const goal = GOALS.has(action.goal) ? action.goal : GOALS.has(profile.goal) ? profile.goal : "general_health";
    const level = LEVELS.has(action.level) ? action.level : LEVELS.has(profile.experience) ? profile.experience : "intermediate";
    const programType = resolveType(action, profile);
    const style = action.style || profile.preferredTrainingStyle || "hybrid";
    const durationMinutes = clamp(action.durationMinutes || (action.constraint === "time_limit" ? 20 : 45), 5, 240);
    const preferredCount = clamp(profile.preferredExerciseCount || 5, 2, 8);
    const timeCount = clamp(Math.floor(durationMinutes / (durationMinutes <= 20 ? 7 : 8)), 2, 8);
    const count = Math.min(preferredCount, timeCount);
    const equipment = requestedEquipment(action, profile);
    const plan = prescription(goal, level, durationMinutes);

    let selected = [];
    if (["adaptWorkout", "optimizeWorkout"].includes(action.action)) {
      selected = adaptActiveExercises(action, context, catalog, count, variant);
    }
    if (!selected.length) {
      selected = selectExercises(catalog, programType, style, equipment, count, variant)
        .map(definition => ({ definition, source: null }));
    }
    if (selected.length < 1) {
      return { program: null, validation: { valid: false, errors: ["Ingen katalogøvelser matcher mål, udstyr og programtype."] } };
    }

    const exercises = selected.map(({ definition, source }, index) => programExercise(definition, source, index + 1, plan, programType));
    const typeLabel = TYPE_LABELS[programType] || "Træning";
    const goalLabel = GOAL_LABELS[goal] || "Måltilpasset";
    const titleSuffix = variant ? ` · Variant ${variant + 1}` : "";
    const activeTitle = text(context?.activeProgram?.title);
    const generatedTitle = `${goalLabel}: ${typeLabel}${titleSuffix}`;
    const programTitle = ["adaptWorkout", "optimizeWorkout"].includes(action.action) && activeTitle
      ? `${activeTitle}${titleSuffix}`
      : generatedTitle;
    const now = new Date().toISOString();
    const program = {
      id: "",
      version: 2,
      title: programTitle,
      name: programTitle,
      titleCustomized: true,
      goal,
      category: typeLabel,
      type: programType,
      programType,
      durationMinutes,
      status: "active",
      source: "ai-coach",
      generatedAt: now,
      updatedAt: now,
      activeDayIndex: 0,
      aiAdaptation: {
        level,
        style,
        equipment,
        durationMinutes,
        profileGoal: profile.goal || goal,
        constraint: action.constraint || ""
      },
      days: [{
        id: "day_1",
        title: `${typeLabel} · Dag 1`,
        goal,
        structure: programType,
        workoutIntensity: level === "beginner" ? "low" : level === "experienced" ? "high" : "medium",
        desiredExerciseCount: exercises.length,
        exercises
      }]
    };
    const validation = validate(program, catalog);
    return { program, validation };
  }

  function validate(program, catalog = []) {
    const errors = [];
    if (!program || typeof program !== "object") return { valid: false, errors: ["AI-svaret indeholder ikke et programobjekt."] };
    if (!text(program.name || program.title)) errors.push("Programnavn mangler.");
    if (!PROGRAM_TYPES.has(program.programType || program.type)) errors.push("Programtype mangler eller er ugyldig.");
    if (!text(program.category)) errors.push("Programkategori mangler.");
    if (!GOALS.has(program.goal)) errors.push("Træningsmål mangler eller er ugyldigt.");
    if (!Number.isFinite(Number(program.durationMinutes)) || Number(program.durationMinutes) < 5 || Number(program.durationMinutes) > 240) errors.push("Træningstid skal være mellem 5 og 240 minutter.");
    if (!Array.isArray(program.days) || !program.days.length) errors.push("Programmet mangler træningsdage.");
    const exercises = (program.days || []).flatMap(day => Array.isArray(day.exercises) ? day.exercises : []);
    if (!exercises.length) errors.push("Programmet indeholder ingen konkrete øvelser.");
    const names = new Set();
    exercises.forEach((exercise, index) => {
      if (!text(exercise.name)) errors.push(`Øvelse ${index + 1} mangler navn.`);
      if (!Number.isInteger(exercise.order) || exercise.order !== index + 1) errors.push(`${exercise.name || `Øvelse ${index + 1}`} har ugyldig rækkefølge.`);
      const catalogMatch = findCatalogExercise(catalog, exercise.name, exercise.muscle);
      if (catalog.length && !catalogMatch) errors.push(`${exercise.name || `Øvelse ${index + 1}`} findes ikke i Work4its øvelsesdatabase.`);
      const key = normalize(exercise.name);
      if (key && names.has(key)) errors.push(`${exercise.name} optræder flere gange.`);
      names.add(key);
      if (!Array.isArray(exercise.sets) || !exercise.sets.length) errors.push(`${exercise.name} mangler sæt.`);
      (exercise.sets || []).forEach((set, setIndex) => {
        if (!text(set.targetReps || set.reps)) errors.push(`${exercise.name}, sæt ${setIndex + 1}, mangler reps.`);
        const pauseSeconds = Number.isFinite(Number(set.pauseSeconds)) ? Number(set.pauseSeconds) : null;
        if (pauseSeconds === null || pauseSeconds < 0 || pauseSeconds > 600 || !text(set.pause)) errors.push(`${exercise.name}, sæt ${setIndex + 1}, har ugyldig pause.`);
      });
    });
    return { valid: errors.length === 0, errors };
  }

  function alternatives(action, context, catalog) {
    const labels = ["Alternativ A", "Alternativ B", "Alternativ C"];
    return labels.map((label, index) => {
      const result = generate(action, context, catalog, { variant: index + 1 });
      const names = result.program?.days?.[0]?.exercises?.slice(0, 2).map(exercise => exercise.name).join(" + ") || "andet øvelsesvalg";
      return {
        label: `${label}: ${names}`,
        action: { ...action, program: result.program, programValidation: result.validation, generationVariant: index + 1 }
      };
    }).filter(item => item.action.programValidation?.valid);
  }

  window.Work4itAICoachProgramEngine = Object.freeze({
    version: "1.0.0",
    generate,
    validate,
    alternatives,
    equipmentFor,
    categoryFor,
    programTypes: [...PROGRAM_TYPES]
  });
})();
