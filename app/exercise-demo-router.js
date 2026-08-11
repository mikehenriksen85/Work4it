(function () {
  "use strict";

  const DEFAULT_PROVIDER = "youtube";
  const TRUSTED_VIDEO_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "google.com",
    "www.google.com"
  ]);

  function clean(value) {
    return String(value || "").trim();
  }

  function tutorialQuery(exerciseName) {
    return `${clean(exerciseName)} exercise proper form tutorial`.trim();
  }

  function youtubeSearchUrl(exerciseName) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(tutorialQuery(exerciseName))}`;
  }

  function googleVideoSearchUrl(exerciseName) {
    return `https://www.google.com/search?tbm=vid&q=${encodeURIComponent(`${clean(exerciseName)} exercise form`)}`;
  }

  function trustedExistingDemoUrl(value) {
    const candidate = clean(value);
    if (!candidate) return "";
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === "https:" && TRUSTED_VIDEO_HOSTS.has(parsed.hostname.toLowerCase())
        ? parsed.href
        : "";
    } catch {
      return "";
    }
  }

  function externalDemoUrl({ name, demoUrl = "", provider = DEFAULT_PROVIDER } = {}) {
    const existing = trustedExistingDemoUrl(demoUrl);
    if (existing) return existing;
    return provider === "google" ? googleVideoSearchUrl(name) : youtubeSearchUrl(name);
  }

  function internalAnimationReady(metadata) {
    if (!metadata || metadata.generationStatus !== "approved") return false;
    if (clean(metadata.animationUrl)) return true;
    const validation = metadata.specification
      ? window.Work4itExerciseAnimations?.validateSpecification?.(metadata.specification)
      : null;
    return validation?.valid === true;
  }

  function cachedAnimation(exerciseId, suppliedMetadata) {
    if (suppliedMetadata) return suppliedMetadata;
    return window.Work4itExerciseAnimationCloud?.peekAnimation?.(exerciseId) || null;
  }

  function openExternal(url, openWindow = window.open?.bind(window)) {
    if (typeof openWindow !== "function") return false;
    try {
      const opened = openWindow(url, "_blank", "noopener,noreferrer");
      if (opened && typeof opened === "object") opened.opener = null;
      return true;
    } catch (error) {
      console.warn("[Work4it Demo] Ekstern videosøgning kunne ikke åbnes", error);
      return false;
    }
  }

  function open(input = {}, options = {}) {
    const exercise = typeof input === "string" ? { name: input } : { ...input };
    exercise.name = clean(exercise.name);
    exercise.muscle = clean(exercise.muscle);
    exercise.exerciseId = clean(exercise.exerciseId)
      || window.Work4itExerciseAnimations?.exerciseId?.(exercise.name, exercise.muscle)
      || "";
    if (!exercise.name) return { source: "none", opened: false, url: "" };

    const metadata = cachedAnimation(exercise.exerciseId, exercise.animationMetadata);
    if (internalAnimationReady(metadata) && typeof window.Work4itExerciseAnimations?.openViewer === "function") {
      window.Work4itExerciseAnimations.openViewer({ ...exercise, animationMetadata: metadata });
      return { source: "internal", opened: true, url: clean(metadata.animationUrl) };
    }

    const url = externalDemoUrl(exercise);
    return {
      source: "external",
      opened: openExternal(url, options.openWindow),
      url
    };
  }

  window.Work4itExerciseDemo = Object.freeze({
    DEFAULT_PROVIDER,
    youtubeSearchUrl,
    googleVideoSearchUrl,
    trustedExistingDemoUrl,
    externalDemoUrl,
    internalAnimationReady,
    open
  });
})();
