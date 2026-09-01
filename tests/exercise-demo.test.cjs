const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const routerSource = fs.readFileSync(path.join(root, "app", "exercise-demo-router.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
const workerSource = fs.readFileSync(path.join(root, "app", "service-worker.js"), "utf8");
const cloudSource = fs.readFileSync(path.join(root, "app", "exercise-animation-cloud-service.js"), "utf8");

const opened = [];
const internal = [];
let cachedMetadata = null;
const sandbox = {
  URL,
  console,
  window: {
    open: (...args) => {
      opened.push(args);
      return { opener: {} };
    },
    Work4itExerciseAnimations: {
      exerciseId: name => `ex_${String(name).toLowerCase().replace(/\W+/g, "-")}`,
      validateSpecification: specification => ({ valid: specification?.valid === true }),
      openViewer: input => internal.push(input)
    },
    Work4itExerciseAnimationCloud: {
      peekAnimation: () => cachedMetadata
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(routerSource, sandbox);
const demo = sandbox.window.Work4itExerciseDemo;

assert.ok(demo, "Den centrale Demo-resolver eksponeres");

const youtube = demo.youtubeSearchUrl("Dumbbell Curl");
assert.equal(new URL(youtube).hostname, "www.youtube.com");
assert.match(new URL(youtube).searchParams.get("search_query"), /Dumbbell Curl exercise proper form tutorial/);

const external = demo.open({ name: "Back Squat", muscle: "Ben" });
assert.equal(external.source, "external");
assert.equal(opened.length, 1);
assert.equal(opened[0][1], "_blank");
assert.match(opened[0][2], /noopener/);
assert.match(opened[0][2], /noreferrer/);
assert.match(decodeURIComponent(external.url), /Back Squat exercise proper form tutorial/);

const existing = "https://youtu.be/originalWork4itLink";
assert.equal(demo.externalDemoUrl({ name: "Push-Up", demoUrl: existing }), existing);
assert.notEqual(
  demo.externalDemoUrl({ name: "Push-Up", demoUrl: "javascript:alert(1)" }),
  "javascript:alert(1)",
  "Kun sikre, eksisterende Google/YouTube-links genbruges"
);

cachedMetadata = {
  generationStatus: "approved",
  animationUrl: "https://firebasestorage.googleapis.com/work4it/exercise-animations/push-up.webm"
};
const preferred = demo.open({ name: "Push-Up", exerciseId: "ex_push-up" });
assert.equal(preferred.source, "internal", "En godkendt Work4it-animation prioriteres");
assert.equal(internal.length, 1);
assert.equal(opened.length, 1, "Ekstern søgning åbnes ikke ved godkendt intern animation");

cachedMetadata = { generationStatus: "pending_review", animationUrl: "https://example.com/draft.webm" };
const pending = demo.open({ name: "Push-Up", exerciseId: "ex_push-up" });
assert.equal(pending.source, "external", "Kladder og afventende animationer eksponeres ikke som Demo");

assert.match(indexSource, /function openExerciseDemo\(slot\)[\s\S]*Work4itExerciseDemo\?\.open/);
assert.match(indexSource, /data-exercise-action="demo"/);
assert.match(indexSource, /block\.dataset\.demoUrl = plan\.demoUrl \|\| plan\.videoUrl \|\| plan\.youtubeUrl/, "Eksisterende øvelseslinks bevares");
assert.match(indexSource, /demoUrl: block\.dataset\.demoUrl \|\| ""/, "Eksisterende øvelseslinks gemmes med programmet");
assert.match(indexSource, /service-worker\.js\?v=20260823-ai-coach-program1/, "PWA'en registrerer den nye worker-version straks");
assert.match(workerSource, /exercise-demo-router\.js\?v=20260811-external-demo1/, "Demo-resolveren caches af PWA'en");
assert.match(workerSource, /work4it-shell-v151-ai-coach-program1/, "PWA app-shell-versionen er løftet");
assert.match(cloudSource, /function peekAnimation\(exerciseId\)/, "Godkendt animationsmetadata kan prioriteres synkront");
assert.match(cloudSource, /primeAnimation/, "Animationsmetadata kan forudindlæses uden at ændre Demo-arkitekturen");

console.log("Exercise Demo fallback tests passed");
