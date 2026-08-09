(function modernDashboardUiModule() {
  "use strict";

  const CATEGORIES = Object.freeze({
    user: {
      label: "Bruger",
      actions: [
        { id: "profile", icon: "profile", tone: "cyan", label: "Profil og konto", description: "Personlige oplysninger, konto og sikkerhed.", handler: "openProfileSetup", cta: "Åbn profil" },
        { id: "training-profile", icon: "target", tone: "orange", label: "Træningsprofil", description: "Mål, niveau, udstyr og træningssted.", handler: "openProfileWizardFromMenu", cta: "Tilpas profil" },
        { id: "membership", icon: "membership", tone: "amber", label: "Medlemskab", description: "Adgang, AI Requests og abonnement.", handler: "openMembershipView", cta: "Se medlemskab" },
        { id: "ai-coach", icon: "coach", tone: "violet", label: "AI Coach", description: "Tilpas program og profil med Work4it Coach.", handler: "openAiCoach", cta: "Åbn AI Coach" },
        { id: "settings", icon: "settings", tone: "blue", label: "Indstillinger", description: "Tema, auto-pause og appindstillinger.", handler: "openModernSettings", cta: "Åbn indstillinger" }
      ]
    },
    training: {
      label: "Træning",
      actions: [
        { id: "today", icon: "play", tone: "green", label: "Dagens træning", description: "Dit vigtigste næste skridt.", contextual: true, cta: "Åbn" },
        { id: "saved", icon: "programs", tone: "blue", label: "Mine programmer", description: "Find og redigér gemte træningspas.", handler: "openModernSavedPrograms", cta: "Se programmer" },
        { id: "generator", icon: "aiPlan", tone: "violet", label: "AI-træningsplan", description: "Opret en måltilpasset træningsplan.", handler: "openModernProgramGenerator", cta: "Opret med AI" },
        { id: "active", icon: "active", tone: "green", label: "Aktiv træning", description: "Fortsæt en igangværende eller pauset træning.", handler: "continueDashboardWorkout", cta: "Fortsæt træning", activeOnly: true },
        { id: "import", icon: "import", tone: "orange", label: "Importér screenshot", description: "Opret et program ud fra et billede.", handler: "openScreenshotImportInfo", cta: "Importér" },
        { id: "blank", icon: "blank", tone: "cyan", label: "Tomt træningspas", description: "Byg selv et styrke-, cardio- eller calisthenics-pas.", handler: "openBlankWorkoutDialog", cta: "Opret træningspas" },
        { id: "history", icon: "history", tone: "cyan", label: "Historik og dashboard", description: "Se afsluttede træninger, statistik og heatmap.", handler: "openDashboard", cta: "Se historik" },
        { id: "progress", icon: "progress", tone: "green", label: "Min udvikling", description: "Følg rekorder, styrke, kropsmål og progression.", handler: "openModernProgress", cta: "Se udvikling" },
        { id: "calories", icon: "calories", tone: "orange", label: "Kalorie-estimat", description: "Se beregning og træningsintensitet.", handler: "openCalorieView", cta: "Se estimat" }
      ]
    },
    more: {
      label: "Mere",
      actions: [
        { id: "trash", icon: "trash", tone: "red", label: "Papirkurv", description: "Gendan eller fjern slettede programmer.", handler: "openModernTrash", cta: "Åbn papirkurv" },
        { id: "export", icon: "export", tone: "cyan", label: "Eksportér data", description: "Hent en kopi af dine Work4it-data.", handler: "exportDataFromMenu", cta: "Eksportér" },
        { id: "help", icon: "help", tone: "blue", label: "Hjælp og om appen", description: "Få hjælp og læs om Work4it.", handler: "openHelpAboutDialog", cta: "Åbn hjælp" },
        { id: "privacy", icon: "privacy", tone: "green", label: "Privatliv og GDPR", description: "Læs Work4its privatlivsinformation.", href: "https://work-4it.dk/", cta: "Læs mere" },
        { id: "feedback", icon: "feedback", tone: "violet", label: "Feedback", description: "Send fejl, forslag eller forbedringsønsker.", href: "https://docs.google.com/forms/d/e/1FAIpQLScIi1YE2x3pzRQI7dmztC3kWgjysDFkcUfKJtZXcOzAeIV7Tg/viewform", cta: "Send feedback" },
        { id: "logout", icon: "logout", tone: "red", label: "Log ud", description: "Afslut den aktive Work4it-session.", handler: "logoutProfileAccount", cta: "Log ud", destructive: true }
      ]
    }
  });

  let activeCategory = "training";
  let activeAction = "today";
  let trainingDashboardScrollPosition = 0;
  let embeddedView = null;
  const TRAINING_DASHBOARD_SCROLL_KEY = "work4it:trainingDashboardScrollPosition";
  const INLINE_ACTIONS = Object.freeze({
    profile: { rootId: "profileAccountView", type: "profile", section: "personal" },
    "training-profile": { rootId: "profile-wizard-root", type: "wizard" },
    membership: { rootId: "membershipView", type: "membership" },
    "ai-coach": { rootId: "aiCoachPanel", type: "ai-coach" },
    settings: { rootId: "profileAccountView", type: "profile", section: "settings" },
    trash: { rootId: "trashDropdown", type: "trash" },
    export: { rootId: "modernInlineActionContent", type: "info" },
    help: { rootId: "modernInlineActionContent", type: "info" },
    privacy: { rootId: "modernInlineActionContent", type: "info" },
    feedback: { rootId: "modernInlineActionContent", type: "info" },
    logout: { rootId: "modernInlineActionContent", type: "info" }
  });

  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const iconMarkup = name => window.Work4itIcons?.markup?.(name) || `<span aria-hidden="true">${escapeHtml(name)}</span>`;

  function storedTrainingDashboardScrollPosition() {
    try {
      const value = Number(sessionStorage.getItem(TRAINING_DASHBOARD_SCROLL_KEY) ||
        localStorage.getItem(TRAINING_DASHBOARD_SCROLL_KEY) || 0);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function rememberTrainingDashboardScrollPosition() {
    trainingDashboardScrollPosition = Math.max(0, Number(window.scrollY) || 0);
    try {
      sessionStorage.setItem(TRAINING_DASHBOARD_SCROLL_KEY, String(trainingDashboardScrollPosition));
      localStorage.setItem(TRAINING_DASHBOARD_SCROLL_KEY, String(trainingDashboardScrollPosition));
    } catch {}
    return trainingDashboardScrollPosition;
  }

  function snapshot() {
    return window.Work4itDashboardRuntime?.getSnapshot?.() || { loading: true, view: null, programs: [] };
  }

  function currentActions() {
    return CATEGORIES[activeCategory]?.actions || CATEGORIES.training.actions;
  }

  function visibleActions() {
    const actions = currentActions();
    if (activeCategory !== "training") return actions;
    const hasActiveWorkout = Boolean(snapshot().view?.activeWorkout);
    const visible = actions.filter(action => !action.activeOnly || hasActiveWorkout);
    if (!hasActiveWorkout) return visible;
    const active = visible.find(action => action.id === "active");
    return active ? [active, ...visible.filter(action => action.id !== "active")] : visible;
  }

  function selectedAction() {
    const actions = visibleActions();
    return actions.find(action => action.id === activeAction) || actions[0];
  }

  function workoutMeta(workout) {
    if (!workout) return "";
    const meta = [];
    if (workout.exerciseCount) meta.push(`${workout.exerciseCount} ${workout.exerciseCount === 1 ? "øvelse" : "øvelser"}`);
    if (workout.estimatedMinutes) meta.push(`cirka ${workout.estimatedMinutes} min.`);
    if (workout.dayCount > 1) meta.push(`${workout.dayCount} træningsdage`);
    return meta.join(" · ");
  }

  function dashboardWorkoutState() {
    const state = snapshot();
    if (state.loading || !state.view) return {
      title: "Forbereder dit dashboard",
      description: "Henter dine træningsdata og aktive session.",
      meta: "Synkroniserer…", cta: "Indlæser…", disabled: true
    };
    if (state.view.activeWorkout) {
      const workout = state.view.activeWorkout;
      const meta = [];
      if (workout.totalSets > 0) meta.push(`${workout.completedSets} af ${workout.totalSets} sæt`);
      if (workout.status) meta.push(workout.status);
      return { title: workout.title || "Aktiv træning", description: "Din træning er klar til at blive fortsat.", meta: meta.join(" · "), cta: "Fortsæt træning", handler: "continueDashboardWorkout", disabled: false };
    }
    if (state.view.featuredWorkout) {
      const workout = state.view.featuredWorkout;
      return {
        title: workout.title || "Næste træning",
        description: workout.heading || "Dit næste program er klar.",
        meta: workoutMeta(workout),
        cta: "Åbn træningspas",
        handler: "openDashboardTodayWorkout",
        disabled: window.Work4itDashboardRuntime?.canStartProgram?.(workout.id) === false
      };
    }
    return { title: "Kom i gang med din første træning", description: "Opret med AI, byg selv eller importér et screenshot.", meta: "", cta: "Opret med AI", handler: "openModernProgramGenerator", disabled: false };
  }

  function actionState(action) {
    if (action.contextual) return { ...action, ...dashboardWorkoutState() };
    const state = { ...action, title: action.label, disabled: false };
    const data = snapshot();
    if (action.activeOnly) {
      const active = data.view?.activeWorkout;
      state.title = active?.title || action.label;
      state.meta = active ? active.status || "Aktiv" : "Ingen aktiv træning";
      state.disabled = !active;
    }
    if (action.id === "saved") {
      const count = data.programs?.length || 0;
      state.meta = count ? `${count} gemte ${count === 1 ? "program" : "programmer"}` : "Ingen gemte programmer endnu";
    }
    if (action.id === "membership") state.meta = byId("membershipNavStatus")?.textContent?.trim() || "Se status";
    return state;
  }

  function renderRail() {
    const rail = byId("modernIconRail");
    if (!rail) return;
    rail.hidden = activeCategory === "training";
    if (rail.hidden) return;
    rail.setAttribute("aria-label", `${CATEGORIES[activeCategory].label}: funktioner`);
    rail.innerHTML = visibleActions().map(action => `
      <button class="modern-icon-tab modern-tone-${escapeHtml(action.tone || "blue")}" id="modern-tab-${escapeHtml(action.id)}" type="button" role="tab"
        data-modern-action="${escapeHtml(action.id)}" tabindex="${action.id === activeAction ? "0" : "-1"}"
        aria-selected="${String(action.id === activeAction)}" aria-controls="modernFeaturePanel">
        <span class="modern-icon" aria-hidden="true">${iconMarkup(action.icon)}</span><span class="modern-icon-label">${escapeHtml(action.label)}</span>
      </button>`).join("");
  }

  function renderFeature() {
    const panel = byId("modernFeaturePanel");
    if (!panel) return;
    panel.hidden = activeCategory === "training";
    if (panel.hidden) {
      restoreEmbeddedView();
      return;
    }
    const action = actionState(selectedAction());
    if (embeddedView?.actionId === action.id && panel.contains(embeddedView.root)) return;
    restoreEmbeddedView();
    panel.dataset.tone = action.tone || "blue";
    panel.classList.remove("has-inline-content");
    panel.setAttribute("aria-labelledby", `modern-tab-${action.id}`);
    panel.innerHTML = `
      <div class="modern-feature-copy">
        <span class="modern-feature-eyebrow">${escapeHtml(CATEGORIES[activeCategory].label)}</span>
        <h2 class="modern-feature-title">${escapeHtml(action.title || action.label)}</h2>
        <p class="modern-feature-description">${escapeHtml(action.description || "")}</p>
        ${action.meta ? `<div class="modern-feature-meta">${escapeHtml(action.meta)}</div>` : ""}
      </div>
      <span class="modern-feature-art modern-icon" aria-hidden="true">${iconMarkup(action.icon)}</span>`;
  }

  function restoreEmbeddedView() {
    if (!embeddedView) return false;
    const { root, placeholder, type } = embeddedView;
    if (type === "wizard") {
      window.ProfileWizard?.close?.();
      placeholder?.remove?.();
      embeddedView = null;
      byId("modernFeaturePanel")?.classList.remove("has-inline-content");
      return true;
    }
    if (type === "profile" || type === "membership") {
      root.classList.remove("open");
      root.setAttribute("aria-hidden", "true");
    } else if (type === "ai-coach") {
      root.classList.remove("open");
      root.setAttribute("aria-hidden", "true");
      root.setAttribute("aria-modal", "true");
      document.body.classList.remove("ai-coach-open");
    } else if (type === "trash") {
      root.hidden = true;
    } else if (type === "info") {
      root.hidden = true;
      root.replaceChildren();
    }
    root.classList.remove("modern-inline-view");
    if (placeholder?.parentNode) placeholder.parentNode.insertBefore(root, placeholder);
    placeholder?.remove?.();
    embeddedView = null;
    byId("modernFeaturePanel")?.classList.remove("has-inline-content");
    return true;
  }

  function renderInlineInfoAction(actionId, root) {
    const help = window.Work4itContent?.locales?.[window.Work4itContent?.defaultLocale || "da"]?.help
      || window.Work4itContent?.locales?.da?.help || {};
    const helpFeatures = (help.features || []).map(feature => `
      <article class="modern-inline-info-item">
        <span class="modern-icon modern-tone-blue" aria-hidden="true">${iconMarkup(feature.icon || "help")}</span>
        <div><h3>${escapeHtml(feature.title || "")}</h3><p>${escapeHtml(feature.text || "")}</p></div>
      </article>`).join("");
    const views = {
      help: `<h2>${escapeHtml(help.title || "Hjælp og om Work4it")}</h2><p>${escapeHtml(help.intro || "Find hjælp til Work4its funktioner.")}</p><div class="modern-inline-info-list">${helpFeatures}</div>`,
      privacy: `<h2>Privatliv og GDPR</h2><p>Work4it gemmer profil- og træningsdata i Firebase/Firestore, når du er logget ind, og bruger lokal lagring som cache og offline-backup.</p><p>Du kan eksportere data, rydde lokal cache eller slette konto og cloud-data under Profil og konto.</p><button class="modern-inline-primary" type="button" data-modern-open="privacy">Læs privatlivspolitikken på Work-4it.dk</button>`,
      feedback: `<h2>Feedback</h2><p>Send fejl, forslag eller forbedringsønsker til Work4it. Feedbackformularen åbnes først, når du vælger knappen nedenfor.</p><button class="modern-inline-primary" type="button" data-modern-open="feedback">Åbn feedbackformular</button>`,
      export: `<h2>Eksportér data</h2><p>Hent en kopi af dine Work4it-data fra denne konto og enhed.</p><button class="modern-inline-primary" type="button" data-modern-open="export">Eksportér mine data</button>`,
      logout: `<h2>Log ud</h2><p>Afslut den aktive Work4it-session på denne enhed. Dine gemte cloud-data bevares.</p><button class="modern-inline-primary destructive" type="button" data-modern-open="logout">Log ud</button>`
    };
    root.innerHTML = views[actionId] || "";
    root.hidden = false;
  }

  function mountInlineAction(actionId) {
    const config = INLINE_ACTIONS[actionId];
    const panel = byId("modernFeaturePanel");
    if (config?.type === "wizard" && !byId(config.rootId)) window.ProfileWizard?.open?.({ mode: "edit", embedded: true });
    const root = config ? byId(config.rootId) : null;
    if (!config || !panel || !root) return false;
    if (embeddedView?.root !== root || embeddedView?.actionId !== actionId) {
      restoreEmbeddedView();
      const placeholder = document.createComment(`work4it-${config.rootId}-home`);
      root.parentNode?.insertBefore(placeholder, root);
      panel.replaceChildren(root);
      root.classList.add("modern-inline-view");
      embeddedView = { actionId, root, placeholder, type: config.type };
    }
    panel.hidden = false;
    panel.classList.add("has-inline-content");
    panel.dataset.tone = selectedAction()?.tone || "blue";
    panel.setAttribute("aria-labelledby", `modern-tab-${actionId}`);
    if (config.type === "profile") {
      window.openProfileAccountView?.({ embedded: true, section: config.section });
      window.selectProfileAccountSection?.(config.section);
    } else if (config.type === "membership") {
      window.openMembershipView?.({ embedded: true });
    } else if (config.type === "ai-coach") {
      root.setAttribute("aria-modal", "false");
      window.openAiCoach?.({ embedded: true });
    } else if (config.type === "trash") {
      window.renderTrash?.();
      root.hidden = false;
      root.style.removeProperty("display");
    } else if (config.type === "info") {
      renderInlineInfoAction(actionId, root);
    } else if (config.type === "wizard") {
      root.querySelector?.(".wizard-overlay")?.setAttribute?.("aria-modal", "false");
    }
    window.Work4itIcons?.hydrate?.(root);
    return true;
  }

  function renderCards() {
    const grid = byId("modernCardGrid");
    if (!grid) return;
    grid.hidden = activeCategory !== "training";
    if (grid.hidden) {
      grid.innerHTML = "";
      return;
    }
    grid.setAttribute("aria-label", `${CATEGORIES[activeCategory].label}: funktioner`);
    grid.innerHTML = visibleActions().map(action => {
      const state = actionState(action);
      return `<button class="modern-mini-card modern-tone-${escapeHtml(action.tone || "blue")}${action.id === "active" ? " is-active-workout" : ""}${action.destructive ? " destructive" : ""}" type="button"
        data-modern-open="${escapeHtml(action.id)}" ${state.disabled ? 'disabled aria-disabled="true"' : 'aria-disabled="false"'}>
        <span class="modern-icon" aria-hidden="true">${iconMarkup(action.icon)}</span>
        <span class="modern-mini-card-label"><strong>${escapeHtml(action.label)}</strong></span>
      </button>`;
    }).join("");
  }

  function renderBottomNavigation() {
    document.querySelectorAll("[data-modern-category]").forEach(button => {
      const active = button.dataset.modernCategory === activeCategory;
      button.setAttribute("aria-current", active ? "page" : "false");
      button.setAttribute("aria-pressed", String(active));
    });
    window.Work4itIcons?.hydrate?.(byId("modernBottomNav"));
  }

  function render() {
    const shell = byId("modernDashboardUI");
    if (!shell) return;
    const data = snapshot();
    const title = byId("modernDashboardTitle");
    if (title) title.textContent = data.view?.greeting || "Velkommen tilbage";
    renderRail();
    renderFeature();
    renderCards();
    renderBottomNavigation();
    if (byId("savedProgramsView")?.classList.contains("open")) renderSavedProgramsView();
  }

  function closeToolPanel() {
    const panel = byId("modernToolPanel");
    if (panel) panel.hidden = true;
    ["savedDropdown", "trashDropdown"].forEach(id => {
      const item = byId(id);
      if (item) item.hidden = true;
    });
    window.WorkitMenuManager?.closePanel?.("count-picker");
  }

  function openToolPanel(kind, title) {
    closeToolPanel();
    const panel = byId("modernToolPanel");
    const content = byId(kind);
    if (!panel || !content) return false;
    panel.hidden = false;
    content.hidden = false;
    content.style.removeProperty("display");
    const heading = byId("modernToolTitle");
    if (heading) heading.textContent = title;
    window.requestAnimationFrame(() => panel.scrollIntoView?.({ behavior: "smooth", block: "start" }));
    return true;
  }

  function openModernProgramGenerator(options = {}) {
    const view = byId("programCreationView");
    const access = byId("programGeneratorAccess");
    if (!view || !access) return false;
    if (!view.classList.contains("open")) {
      trainingDashboardScrollPosition = options.restoreScrollState === true
        ? storedTrainingDashboardScrollPosition()
        : rememberTrainingDashboardScrollPosition();
    }
    closeToolPanel();
    window.WorkitMenuManager?.openSurface?.("program-creation-view", {
      roots: () => [view],
      close: () => closeProgramCreationView({ fromManager: true })
    });
    view.classList.add("open");
    view.setAttribute("aria-hidden", "false");
    view.scrollTop = 0;
    access.hidden = false;
    const count = byId("countPicker");
    if (count) count.style.display = "none";
    window.saveLastActiveView?.("create-program");
    window.Work4itIcons?.hydrate?.(view);
    window.requestAnimationFrame(() => byId("programCreationViewTitle")?.focus?.({ preventScroll: true }));
    return true;
  }

  function closeProgramCreationView(options = {}) {
    const view = byId("programCreationView");
    if (!view?.classList.contains("open")) return false;
    view.classList.remove("open");
    view.setAttribute("aria-hidden", "true");
    window.WorkitMenuManager?.closePanel?.("count-picker", "program-creation-close");
    if (!options.fromManager) window.WorkitMenuManager?.notifySurfaceClosed?.("program-creation-view");
    if (options.persist !== false) window.saveLastActiveView?.("program");
    if (options.restoreScroll !== false) {
      const returnPosition = Number.isFinite(trainingDashboardScrollPosition)
        ? trainingDashboardScrollPosition
        : storedTrainingDashboardScrollPosition();
      window.requestAnimationFrame(() => window.scrollTo({ top: returnPosition, behavior: "auto" }));
    }
    return true;
  }

  function moveWorkoutEditor(host) {
    const editor = byId("workoutEditorDetails");
    if (!host || !editor) return false;
    host.appendChild(editor);
    editor.open = true;
    return true;
  }

  function restoreWorkoutEditorHome() {
    const editor = byId("workoutEditorDetails");
    const home = byId("workoutEditorHome");
    if (!editor || !home?.parentNode) return false;
    home.parentNode.insertBefore(editor, home.nextSibling);
    return true;
  }

  function openModernCalisthenicsWorkout(options = {}) {
    const view = byId("calisthenicsWorkoutView");
    const host = byId("calisthenicsWorkoutEditorHost");
    const initializeWorkout = options.initialize !== false;
    if (!view || !host) return false;
    if (initializeWorkout && window.WorkitWorkoutRouting?.hasActiveWorkout?.()) {
      window.alert?.("Der er allerede en aktiv træning. Genoptag eller afslut den, før du opretter et nyt træningspas.");
      return false;
    }
    if (!view.classList.contains("open")) {
      trainingDashboardScrollPosition = options.restoreScrollState === true
        ? storedTrainingDashboardScrollPosition()
        : rememberTrainingDashboardScrollPosition();
    }
    window.closeModal?.();
    closeToolPanel();
    if (!moveWorkoutEditor(host)) return false;
    view.classList.add("open");
    view.setAttribute("aria-hidden", "false");
    view.scrollTop = 0;
    if (initializeWorkout) window.newWorkout?.("calisthenics", "", { view: "calisthenics-workout" });
    else window.saveLastActiveView?.("calisthenics-workout");
    window.Work4itIcons?.hydrate?.(view);
    window.requestAnimationFrame(() => byId("calisthenicsWorkoutViewTitle")?.focus?.({ preventScroll: true }));
    return true;
  }

  function closeCalisthenicsWorkoutView(options = {}) {
    const view = byId("calisthenicsWorkoutView");
    if (!view?.classList.contains("open")) return false;
    window.closeExercisePicker?.();
    view.classList.remove("open");
    view.setAttribute("aria-hidden", "true");
    restoreWorkoutEditorHome();
    if (options.persist !== false) window.saveLastActiveView?.("program");
    if (options.restoreScroll !== false) {
      const returnPosition = Number.isFinite(trainingDashboardScrollPosition)
        ? trainingDashboardScrollPosition
        : storedTrainingDashboardScrollPosition();
      window.requestAnimationFrame(() => window.scrollTo({ top: returnPosition, behavior: "auto" }));
    }
    return true;
  }

  function openModernCardioWorkout(options = {}) {
    const view = byId("cardioWorkoutView");
    const host = byId("cardioWorkoutEditorHost");
    const initializeWorkout = options.initialize !== false;
    if (!view || !host) return false;
    if (initializeWorkout && window.WorkitWorkoutRouting?.hasActiveWorkout?.()) {
      window.alert?.("Der er allerede en aktiv træning. Genoptag eller afslut den, før du opretter et nyt træningspas.");
      return false;
    }
    if (!view.classList.contains("open")) {
      trainingDashboardScrollPosition = options.restoreScrollState === true
        ? storedTrainingDashboardScrollPosition()
        : rememberTrainingDashboardScrollPosition();
    }
    window.closeModal?.();
    closeToolPanel();
    if (!moveWorkoutEditor(host)) return false;
    view.classList.add("open");
    view.setAttribute("aria-hidden", "false");
    view.scrollTop = 0;
    if (initializeWorkout) window.newWorkout?.("cardio", "", { view: "cardio-workout" });
    else window.saveLastActiveView?.("cardio-workout");
    window.Work4itIcons?.hydrate?.(view);
    window.requestAnimationFrame(() => byId("cardioWorkoutViewTitle")?.focus?.({ preventScroll: true }));
    return true;
  }

  function closeCardioWorkoutView(options = {}) {
    const view = byId("cardioWorkoutView");
    if (!view?.classList.contains("open")) return false;
    window.closeExercisePicker?.();
    view.classList.remove("open");
    view.setAttribute("aria-hidden", "true");
    restoreWorkoutEditorHome();
    if (options.persist !== false) window.saveLastActiveView?.("program");
    if (options.restoreScroll !== false) {
      const returnPosition = Number.isFinite(trainingDashboardScrollPosition)
        ? trainingDashboardScrollPosition
        : storedTrainingDashboardScrollPosition();
      window.requestAnimationFrame(() => window.scrollTo({ top: returnPosition, behavior: "auto" }));
    }
    return true;
  }

  function openModernSavedPrograms(options = {}) {
    const view = byId("savedProgramsView");
    if (!view) return false;
    if (!view.classList.contains("open")) {
      trainingDashboardScrollPosition = options.restoreScrollState === true
        ? storedTrainingDashboardScrollPosition()
        : rememberTrainingDashboardScrollPosition();
    }
    closeToolPanel();
    renderSavedProgramsView();
    window.WorkitMenuManager?.openSurface?.("saved-programs-view", {
      roots: () => [view],
      close: () => closeSavedProgramsView({ fromManager: true })
    });
    view.classList.add("open");
    view.setAttribute("aria-hidden", "false");
    view.scrollTop = 0;
    window.saveLastActiveView?.("saved-programs");
    window.Work4itIcons?.hydrate?.(view);
    window.requestAnimationFrame(() => byId("savedProgramsViewTitle")?.focus?.({ preventScroll: true }));
    return true;
  }

  function renderSavedProgramsView() {
    const list = [...(snapshot().programs || [])]
      .filter(program => program && program.id)
      .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    const select = byId("savedProgramsViewSelect");
    const container = byId("savedProgramsViewList");
    const empty = byId("savedProgramsViewEmpty");
    const count = byId("savedProgramsViewCount");
    if (select) {
      select.innerHTML = list.length
        ? `<option value="">Vælg træningspas…</option>${list.map(program => `<option value="${escapeHtml(program.id)}">${escapeHtml(program.title || "Træningspas")}</option>`).join("")}`
        : `<option value="">Ingen gemte programmer</option>`;
      select.disabled = !list.length;
    }
    if (count) count.textContent = `${list.length} ${list.length === 1 ? "program" : "programmer"}`;
    if (empty) empty.hidden = Boolean(list.length);
    if (!container) return;
    container.hidden = !list.length;
    container.innerHTML = list.map(program => {
      const title = program.title || "Træningspas";
      const meta = workoutMeta({
        exerciseCount: (program.days || []).reduce((total, day) => total + (day?.exercises?.length || 0), 0),
        dayCount: program.days?.length || 1
      });
      const savedAt = new Date(program.savedAt || 0);
      const date = Number.isFinite(savedAt.getTime())
        ? savedAt.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })
        : "";
      return `<article class="saved-program-card">
        <span class="saved-program-card-icon modern-icon modern-tone-blue" aria-hidden="true">${iconMarkup("programs")}</span>
        <div class="saved-program-card-copy">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml([meta, date ? `Gemt ${date}` : ""].filter(Boolean).join(" · "))}</p>
        </div>
        <button class="saved-program-open" type="button" data-saved-program-id="${escapeHtml(program.id)}" aria-label="Åbn og redigér ${escapeHtml(title)}">Åbn og redigér</button>
      </article>`;
    }).join("");
  }

  function closeSavedProgramsView(options = {}) {
    const view = byId("savedProgramsView");
    if (!view?.classList.contains("open")) return false;
    view.classList.remove("open");
    view.setAttribute("aria-hidden", "true");
    if (!options.fromManager) window.WorkitMenuManager?.notifySurfaceClosed?.("saved-programs-view");
    if (options.persist !== false) window.saveLastActiveView?.("program");
    if (options.restoreScroll !== false) {
      const returnPosition = Number.isFinite(trainingDashboardScrollPosition)
        ? trainingDashboardScrollPosition
        : storedTrainingDashboardScrollPosition();
      window.requestAnimationFrame(() => window.scrollTo({ top: returnPosition, behavior: "auto" }));
    }
    return true;
  }

  function openModernSavedProgram(id) {
    if (!id) return false;
    window.loadSavedProgram?.(id);
    closeSavedProgramsView({ restoreScroll: false, persist: false });
    closeToolPanel();
    window.openWorkoutEditor?.();
    window.saveLastActiveView?.("program");
    render();
    return true;
  }

  function openModernTrash() {
    window.renderTrash?.();
    return openToolPanel("trashDropdown", "Papirkurv");
  }

  function openModernSettings() {
    if (!invokeHandler("openProfileSetup")) return false;
    window.setTimeout(() => window.selectProfileAccountSection?.("settings", { focus: true }), 80);
    return true;
  }

  function openModernProgress() {
    if (typeof window.openPremiumFeature === "function" && typeof window.openProgressView === "function") {
      window.openPremiumFeature("progress", window.openProgressView);
      return true;
    }
    return invokeHandler("openProgressView");
  }

  function invokeHandler(name) {
    const handler = window[name];
    if (typeof handler !== "function") {
      console.warn(`[Work4it Modern UI] Handleren ${name} er ikke tilgængelig.`);
      return false;
    }
    closeToolPanel();
    handler();
    return true;
  }

  function invokeAction(actionId) {
    const action = visibleActions().find(item => item.id === actionId);
    if (!action) return false;
    const state = actionState(action);
    if (state.disabled) return false;
    if (state.href) {
      window.open(state.href, "_blank", "noopener,noreferrer");
      return true;
    }
    return invokeHandler(state.handler);
  }

  function selectAction(actionId) {
    if (!visibleActions().some(action => action.id === actionId)) return false;
    activeAction = actionId;
    render();
    if (activeCategory !== "training") {
      const mounted = mountInlineAction(actionId);
      if (!mounted) invokeAction(actionId);
    }
    window.requestAnimationFrame(() => byId(`modern-tab-${actionId}`)?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" }));
    byId("modernFeaturePanel")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    return true;
  }

  function setCategory(category) {
    if (!CATEGORIES[category]) return false;
    activeCategory = category;
    activeAction = CATEGORIES[category].actions[0].id;
    closeToolPanel();
    render();
    if (category !== "training") window.requestAnimationFrame(() => mountInlineAction(activeAction) || invokeAction(activeAction));
    byId("modernDashboardUI")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    return true;
  }

  function bindNavigation() {
    const dashboard = byId("modernDashboardUI");
    dashboard?.addEventListener("click", event => {
      const open = event.target.closest?.("[data-modern-open]");
      if (open) return void invokeAction(open.dataset.modernOpen);
      const action = event.target.closest?.("[data-modern-action]");
      if (action) selectAction(action.dataset.modernAction);
    });
    dashboard?.addEventListener("keydown", event => {
      const tab = event.target.closest?.(".modern-icon-tab");
      if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...(byId("modernIconRail")?.querySelectorAll?.(".modern-icon-tab") || [])];
      if (!tabs.length) return;
      event.preventDefault();
      const current = Math.max(0, tabs.indexOf(tab));
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      selectAction(tabs[next].dataset.modernAction);
    });
    byId("modernBottomNav")?.addEventListener("click", event => {
      const category = event.target.closest?.("[data-modern-category]");
      if (category) setCategory(category.dataset.modernCategory);
    });
    byId("savedProgramsView")?.addEventListener("click", event => {
      const open = event.target.closest?.("[data-saved-program-id]");
      if (open) openModernSavedProgram(open.dataset.savedProgramId);
    });
  }

  function initialize() {
    bindNavigation();
    render();
  }

  window.closeModernToolPanel = closeToolPanel;
  window.openModernProgramGenerator = openModernProgramGenerator;
  window.closeProgramCreationView = closeProgramCreationView;
  window.openModernCalisthenicsWorkout = openModernCalisthenicsWorkout;
  window.closeCalisthenicsWorkoutView = closeCalisthenicsWorkoutView;
  window.openModernCardioWorkout = openModernCardioWorkout;
  window.closeCardioWorkoutView = closeCardioWorkoutView;
  window.openModernSavedPrograms = openModernSavedPrograms;
  window.openModernSavedProgram = openModernSavedProgram;
  window.closeSavedProgramsView = closeSavedProgramsView;
  window.openModernTrash = openModernTrash;
  window.openModernSettings = openModernSettings;
  window.openModernProgress = openModernProgress;
  window.Work4itModernDashboard = Object.freeze({
    CATEGORIES,
    setCategory,
    selectAction,
    invokeAction,
    mountInlineAction,
    restoreEmbeddedView,
    closeToolPanel,
    closeProgramCreationView,
    closeCalisthenicsWorkoutView,
    closeCardioWorkoutView,
    closeSavedProgramsView,
    render,
    getVisibleActionIds: () => visibleActions().map(action => action.id)
  });

  ["work4it:dashboard-updated", "firestore:data-hydrated", "firestore:sync-completed", "training-profile:updated", "firebase-auth:changed", "workout-history:changed"]
    .forEach(eventName => window.addEventListener(eventName, render));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
}());
