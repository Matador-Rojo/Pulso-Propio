import { decisionSteps, lessons, stages } from "./curriculum.js";
import { realCases, internationalRefs } from "./cases.js";
import { films } from "./media/films.js";
import Plyr from "./vendor/plyr.min.mjs";

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function anchor(url, label, className) {
  const link = element("a", className, label);
  link.href = url;
  return link;
}

function action(label, className, handler) {
  const button = element("button", className, label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function lessonUrl(lesson) {
  return "#/guia/" + lesson.id;
}

function toggleItem(list, id) {
  const index = list.indexOf(id);
  if (index === -1) list.push(id);
  else list.splice(index, 1);
}

function markButton(ctx, lesson, field, offLabel, onLabel) {
  const button = action("", "button secondary", () => {
    toggleItem(ctx.state[field], lesson.id);
    ctx.save();
    update();
  });
  function update() {
    const active = ctx.state[field].includes(lesson.id);
    button.textContent = active ? onLabel : offLabel;
    button.setAttribute("aria-pressed", String(active));
  }
  update();
  return button;
}

function heading(kicker, title, description) {
  const header = element("header", "guide-heading");
  header.append(element("p", "eyebrow", kicker), element("h1", "section-title", title));
  if (description) header.append(element("p", "guide-lead", description));
  return header;
}

function indexEntry(ctx, lesson, index) {
  const row = anchor(lessonUrl(lesson), "", "guide-row");
  row.dataset.step = lesson.step || "";
  const number = element("span", "guide-number", String(index + 1).padStart(2, "0"));
  const labels = element("span", "guide-row-main");
  labels.append(element("strong", "", lesson.title));
  if (ctx.state.completed.includes(lesson.id)) labels.append(element("small", "guide-read", "Leída"));
  if (ctx.state.favorites.includes(lesson.id)) labels.append(element("small", "guide-read", "Favorita"));
  const arrow = element("span", "guide-arrow", "↗");
  arrow.setAttribute("aria-hidden", "true");
  row.append(number, labels, arrow);
  return row;
}

function guideIndex(ctx) {
  const page = element("section", "page guide-page");
  page.append(heading(
    "Guía práctica digital multimedia · 5 etapas · 12 lecciones",
    "Tu ruta de creación",
    "Hacer música con IA abarca cinco momentos reales: idear, componer, producir, proteger y circular. Cada lección combina explicación clara, cuadro «IA propone vs. Tú decides», ejemplo de prompt, video y dinámica interactiva."
  ));

  // Progress strip
  const resume = lessons.find((lesson) => lesson.id === ctx.state.recent[0]);
  const status = element("div", "guide-status");
  const progWrap = element("div", "guide-progress-wrap");
  const progText = element("span", "", ctx.state.completed.length + " de " + lessons.length + " lecciones leídas");
  const prog = element("progress", "guide-progress");
  prog.max = lessons.length;
  prog.value = ctx.state.completed.length;
  prog.setAttribute("aria-label", "Avance en las doce lecciones");
  progWrap.append(progText, prog);
  status.append(progWrap);
  if (resume) status.append(anchor(lessonUrl(resume), "Retomar «" + resume.title + "» →", "guide-inline"));
  page.append(status);

  // Assistive-AI-First Reality Strip (Ditto Music, Sonarworks, LANDR, Deezer/UMG 2025–2026)
  const insightBand = element("section", "guide-insight-band");
  insightBand.setAttribute("aria-labelledby", "guide-insight-title");
  insightBand.append(
    element("p", "eyebrow", "Enfoque basado en datos reales · Informes 2025–2026"),
    Object.assign(element("h2", "", "Cómo usan realmente la IA los músicos independientes"), { id: "guide-insight-title" })
  );
  const insightGrid = element("div", "guide-insight-grid");
  for (const [stat, title, body, href, cta] of [
    [
      "+70 %",
      "Priorizan IA asistiva (stems, limpieza y máster)",
      "Según encuestas de Ditto Music, Sonarworks y LANDR, la mayoría de artistas independientes usa IA para separar pistas, limpiar ruido vocal, masterizar y destrabar ideas — no para reemplazar su composición.",
      "#/laboratorio/oido",
      "Comparar tus audios A/B con WaveSurfer →",
    ],
    [
      "Letra y voz",
      "Cuidan su acento usando sílabas y metatags",
      "La escritura y la voz son las áreas más personales: antes de generar guías en Suno, Udio o Synthesizer V, conviene medir sílabas y dirigir cada sección con etiquetas claras ([Verse], [Chorus], timbre vocal).",
      "#/laboratorio/letras",
      "Abrir Taller de Letras y Prompts →",
    ],
    [
      "+80 %",
      "Del público exige transparencia y créditos claros",
      "Estudios de Deezer y UMG muestran que la audiencia pide distinguir pistas asistidas de pistas automatizadas. Declarar tu aporte humano y exportar tu ficha PDF respalda tu firma.",
      "#/checklist",
      "Armar mi ficha PDF de lanzamiento →",
    ],
  ]) {
    const c = element("article", "guide-insight-card");
    c.append(
      element("span", "guide-insight-stat", stat),
      element("h3", "", title),
      element("p", "", body),
      anchor(href, cta, "guide-inline")
    );
    insightGrid.append(c);
  }
  insightBand.append(insightGrid);
  page.append(insightBand);

  // Interactive 4-step editorial infographic
  const mapSection = element("section", "guide-steps-section");
  mapSection.setAttribute("aria-labelledby", "guide-steps-title");
  const mapHead = element("div", "guide-steps-head");
  const mapTitle = element("h2", "", "Los 4 criterios transversales");
  mapTitle.id = "guide-steps-title";
  const filterNote = element("p", "guide-steps-note", "Pulsa un criterio para destacar sus lecciones en las 5 etapas.");
  filterNote.setAttribute("role", "status");
  mapHead.append(mapTitle, filterNote);

  const stepsGrid = element("div", "guide-steps-grid");
  let activeStep = "";
  const stepButtons = [];

  for (const step of decisionSteps) {
    const count = lessons.filter((l) => l.step === step.id).length;
    const card = action("", "guide-step-card", () => {
      activeStep = activeStep === step.id ? "" : step.id;
      applyStepFilter();
    });
    card.dataset.stepId = step.id;
    card.setAttribute("aria-pressed", "false");
    card.append(
      element("span", "guide-step-num", "PASO " + step.num + " · " + count + " LECCIONES"),
      element("strong", "", step.title),
      element("span", "guide-step-desc", step.summary)
    );
    stepButtons.push(card);
    stepsGrid.append(card);
  }
  mapSection.append(mapHead, stepsGrid);
  page.append(mapSection);

  // 5-Stage Lesson Index
  const index = element("div", "guide-index guide-index-5");
  const rowRefs = [];
  for (const stage of stages) {
    const group = element("section", "guide-index-group");
    group.append(
      element("p", "eyebrow", "Etapa " + stage.num + " · " + stage.id),
      element("h2", "", stage.title),
      element("p", "guide-stage-desc", stage.summary)
    );
    const list = element("ul", "guide-entries");
    for (const [position, lesson] of lessons.entries()) {
      if (lesson.stage !== stage.id) continue;
      const item = element("li");
      const entry = indexEntry(ctx, lesson, position);
      rowRefs.push({ item, step: lesson.step });
      item.append(entry);
      list.append(item);
    }
    group.append(list);
    index.append(group);
  }
  page.append(index);

  function applyStepFilter() {
    for (const btn of stepButtons) {
      btn.setAttribute("aria-pressed", String(btn.dataset.stepId === activeStep));
    }
    for (const ref of rowRefs) {
      ref.item.classList.toggle("is-dimmed", Boolean(activeStep) && ref.step !== activeStep);
      ref.item.classList.toggle("is-matched", Boolean(activeStep) && ref.step === activeStep);
    }
    if (!activeStep) {
      filterNote.textContent = "Mostrando las 12 lecciones en 5 etapas. Pulsa un criterio para destacar las que corresponden.";
    } else {
      const current = decisionSteps.find((s) => s.id === activeStep);
      const matched = rowRefs.filter((r) => r.step === activeStep).length;
      filterNote.textContent = `Destacando ${matched} lecciones del Paso ${current.num}: ${current.title}. Vuelve a pulsarlo para ver todas.`;
    }
  }

  // Practice dynamics banner linking Guide <-> Lab
  const labBanner = element("aside", "guide-lab-banner");
  const labCopy = element("div");
  labCopy.append(
    element("p", "eyebrow", "Aprender haciendo"),
    element("h2", "", "Conecta cada etapa con el Laboratorio"),
    element("p", "", "Pon a prueba lo leído con la Consola de Arreglo, el juego Oído a Ciegas, el Semáforo de Derechos y el Taller de Créditos.")
  );
  labBanner.append(labCopy, anchor("#/laboratorio", "Abrir Laboratorio y dinámicas →", "button"));
  page.append(labBanner);

  // Sober scope/legal note
  const disclaimer = element("aside", "guide-disclaimer");
  disclaimer.append(
    element("strong", "", "Alcance educativo"),
    element("p", "", "Esta guía ofrece criterios prácticos y fuentes peruanas verificables (Indecopi, APDAYC, Código Civil y PCM) para acompañar tus decisiones musicales. No sustituye asesoría legal especializada en casos particulares.")
  );
  page.append(disclaimer);

  return page;
}

function activity(ctx, lesson) {
  const form = element("form", "guide-quiz");
  const fieldset = element("fieldset");
  fieldset.append(element("legend", "", lesson.question));
  const feedback = element("p", "guide-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  const options = [];
  const previous = ctx.state.answers[lesson.id];
  function showFeedback(index) {
    const correct = index === lesson.answer;
    feedback.textContent = (correct ? "Así es. " : "Vuelve a pensarlo. ") + lesson.feedback[index];
    feedback.dataset.correct = String(correct);
    feedback.hidden = false;
  }
  for (const [i, text] of lesson.options.entries()) {
    const label = element("label", "guide-option");
    const input = element("input");
    input.type = "radio";
    input.name = "respuesta-" + lesson.id;
    input.value = String(i);
    input.required = true;
    input.checked = i === previous;
    input.addEventListener("change", () => { feedback.hidden = true; });
    options.push(input);
    label.append(input, element("span", "", text));
    fieldset.append(label);
  }
  const submit = element("button", "button", "Comprobar respuesta");
  submit.type = "submit";
  feedback.hidden = true;
  if (Number.isInteger(previous) && previous >= 0 && previous < options.length) showFeedback(previous);
  form.append(fieldset, submit, feedback);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const index = options.findIndex((input) => input.checked);
    if (index < 0) return;
    ctx.state.answers[lesson.id] = index;
    ctx.save();
    showFeedback(index);
  });
  return form;
}

function vsComparison(lesson) {
  if (!Array.isArray(lesson.vsTable) || !lesson.vsTable.length) return null;
  const section = element("section", "guide-vs-box");
  section.append(element("p", "eyebrow", "Criterio editorial"), element("h2", "", "La IA propone vs. Tú decides"));
  const table = element("table", "guide-vs-table");
  const head = table.createTHead().insertRow();
  head.append(element("th", "", "Lo que propone la IA"), element("th", "", "Lo que decides tú"));
  const body = table.createTBody();
  for (const [ai, human] of lesson.vsTable) {
    const row = body.insertRow();
    row.insertCell().textContent = ai;
    row.insertCell().textContent = human;
  }
  section.append(table);
  return section;
}

function promptExample(lesson) {
  if (!lesson.prompt) return null;
  const box = element("section", "guide-prompt-box");
  box.append(
    element("p", "eyebrow", "Instrucción práctica · Método ROCEF"),
    element("h2", "", "Cómo pedir sin perder tu firma"),
    element("p", "guide-prompt-text", lesson.prompt)
  );
  return box;
}

function embeddedFilm(filmId) {
  const film = films.find((item) => item.id === filmId);
  if (!film) return null;
  const dur = "0:" + String(film.duration || 28).padStart(2, "0");
  const section = element("section", "guide-video-box");
  const head = element("div", "guide-video-head");
  head.append(
    element("p", "eyebrow", "Video demostrativo · " + dur + " · " + film.subject),
    element("h2", "", film.title),
    element("p", "muted", film.intro + " " + film.result)
  );
  const video = element("video");
  video.controls = true;
  video.playsInline = true;
  video.preload = "none";
  video.width = 800;
  video.height = 450;
  video.poster = "/media/" + film.id + ".webp";
  video.src = "/media/" + film.id + ".webm";
  video.setAttribute("aria-label", "Video demostrativo: " + film.title);
  const track = document.createElement("track");
  Object.assign(track, { kind: "captions", src: "/media/" + film.id + ".vtt", srclang: "es", label: "Español", default: true });
  video.append(track);

  const alt = element("details", "guide-video-transcript");
  alt.append(element("summary", "", "Leer transcripción (alternativa sin consumir datos)"));
  const list = element("ol");
  for (const line of film.captions) list.append(element("li", "", line));
  alt.append(list);

  const foot = element("div", "guide-video-foot");
  foot.append(anchor("#/videos/" + film.id, "Abrir en la videoteca completa →", "guide-inline"));
  section.append(head, video, alt, foot);
  try {
    const plyr = new Plyr(video, {
      iconUrl: "/vendor/plyr.svg",
      loadSprite: false,
      controls: ["play-large", "play", "progress", "current-time", "duration", "mute", "volume", "captions", "settings", "fullscreen"],
      settings: ["captions", "speed"],
      speed: { selected: 1, options: [0.75, 1, 1.25, 1.5] },
      captions: { active: true, update: true, language: "es" },
      tooltips: { controls: false, seek: true },
    });
    window.addEventListener("hashchange", () => { try { plyr.destroy(); } catch {} }, { once: true });
  } catch {}
  return section;
}

function decisionChecklist(lesson) {
  if (!Array.isArray(lesson.checklist) || !lesson.checklist.length) return null;
  const section = element("section", "guide-checklist-box");
  section.append(element("p", "eyebrow", "Criterios rápidos"), element("h2", "", "Preguntas antes de decidir"));
  const list = element("ul");
  for (const q of lesson.checklist) list.append(element("li", "", q));
  section.append(list);
  return section;
}

function lessonTask(ctx, lesson) {
  const section = element("section", "guide-practice");
  section.append(element("h2", "", "Pruébalo en tu canción"), element("p", "", lesson.task));
  const form = element("form", "guide-notebook");
  const label = element("label", "", "Tus notas de práctica");
  const input = element("textarea");
  input.id = "notas-de-practica";
  input.rows = 3;
  input.maxLength = 1800;
  input.value = ctx.state.reflections?.[lesson.id] || "";
  label.htmlFor = input.id;
  const save = element("button", "button secondary", "Guardar nota");
  save.type = "submit";
  const result = element("span", "guide-save-message");
  result.setAttribute("role", "status");
  input.addEventListener("input", () => { result.textContent = ""; });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ctx.state.reflections ??= {};
    const value = input.value.trim();
    if (value) ctx.state.reflections[lesson.id] = value;
    else delete ctx.state.reflections[lesson.id];
    ctx.save();
    result.textContent = value ? "Nota guardada en este navegador." : "Nota eliminada.";
  });
  form.append(label, input, save, result);
  section.append(form);
  return section;
}

async function loadEditorial(container, lead, id) {
  try {
    const response = await fetch("/api/notes", { cache: "no-store" });
    if (!response.ok) return;
    const { notes, intros } = await response.json();
    if (typeof intros?.[id] === "string" && intros[id].trim()) lead.textContent = intros[id];
    if (typeof notes?.[id] !== "string" || !notes[id].trim()) return;
    container.append(element("h2", "", "Nota del equipo"), element("p", "", notes[id]));
    container.hidden = false;
  } catch {
    // La lectura y las actividades también funcionan si la nota editorial no está disponible.
  }
}

function resources(lesson) {
  const section = element("section", "guide-resources");
  section.append(element("h2", "", "Fuentes y referencias verificables"));
  const list = element("ul");
  for (const source of lesson.resources) {
    const item = element("li");
    const link = anchor(source.url, source.title);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    item.append(link);
    list.append(item);
  }
  section.append(list);
  return section;
}

export function renderGuide(ctx, id) {
  if (!id) return guideIndex(ctx);
  const index = lessons.findIndex((lesson) => lesson.id === id);
  const page = element("article", "page guide-page");
  if (index < 0) {
    page.append(heading("Guía multimedia", "Lección no encontrada"), anchor("#/guia", "Ver las doce lecciones", "button"));
    return page;
  }
  const lesson = lessons[index];
  const stageInfo = stages.find((s) => s.id === lesson.stage);
  ctx.state.recent = [id, ...ctx.state.recent.filter((item) => item !== id)].slice(0, lessons.length);
  ctx.save();
  page.append(anchor("#/guia", "← Volver al índice", "guide-inline"));
  page.append(heading(
    `Lección ${index + 1} de ${lessons.length} · Etapa ${stageInfo ? stageInfo.num + " (" + stageInfo.id + ")" : lesson.stage}`,
    lesson.title,
    lesson.intro
  ));

  const layout = element("div", "guide-layout");
  const copy = element("div", "guide-copy");
  for (const paragraph of lesson.paragraphs) copy.append(element("p", "guide-body", paragraph));

  const vsBlock = vsComparison(lesson);
  if (vsBlock) copy.append(vsBlock);

  const promptBlock = promptExample(lesson);
  if (promptBlock) copy.append(promptBlock);

  const videoBlock = embeddedFilm(lesson.film);
  if (videoBlock) copy.append(videoBlock);

  const checks = decisionChecklist(lesson);
  if (checks) copy.append(checks);

  if (lesson.realCase) {
    const refBox = element("aside", "guide-real-case");
    refBox.append(
      element("p", "eyebrow", "Caso real analizado"),
      element("p", "", lesson.realCase),
      anchor("#/casos", "Ver todos los casos reales (Perú y Latinoamérica) →", "guide-inline")
    );
    copy.append(refBox);
  }

  const example = element("section", "guide-example");
  example.append(element("h2", "", "En el estudio"), element("p", "", lesson.example));

  const quiz = element("section", "guide-case");
  quiz.append(element("h2", "", "Decide en este caso"), activity(ctx, lesson));

  const note = element("aside", "guide-editor-note");
  note.hidden = true;
  void loadEditorial(note, page.querySelector(".guide-lead"), id);

  copy.append(example, lessonTask(ctx, lesson), quiz, note, resources(lesson));

  const aside = element("aside", "guide-side");
  aside.append(element("h2", "", "Mi lección"));
  if (stageInfo) aside.append(element("p", "guide-side-step", `Etapa ${stageInfo.num}: ${stageInfo.title}`));
  aside.append(markButton(ctx, lesson, "favorites", "Guardar en favoritos", "En favoritos ✓"));
  const completedBtn = markButton(ctx, lesson, "completed", "Marcar como leída", "Lección leída ✓");
  let userToggledRead = false;
  completedBtn.addEventListener("click", () => { userToggledRead = true; });
  aside.append(completedBtn);
  if (lesson.lab) aside.append(anchor(lesson.lab.href, lesson.lab.label + " →", "guide-inline"));
  aside.append(anchor("#/casos", "Explorar casos reales →", "guide-inline"));
  if (lesson.lab?.href !== "#/checklist") aside.append(anchor("#/checklist", "Abrir checklist PDF →", "guide-inline"));

  const controls = element("nav", "guide-next");
  controls.setAttribute("aria-label", "Navegación entre lecciones");
  if (index > 0) controls.append(anchor(lessonUrl(lessons[index - 1]), "← " + lessons[index - 1].title));
  const next = lessons[index + 1];
  controls.append(next ? anchor(lessonUrl(next), next.title + " →") : anchor("#/guia", "Volver a la guía →"));
  layout.append(copy, aside);
  page.append(layout, controls);

  // Auto-mark lesson as read when the user scrolls down to the end of the lesson
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      if (window.scrollY < 180 || userToggledRead || ctx.state.completed.includes(lesson.id)) return;
      ctx.state.completed = [...new Set([...ctx.state.completed, lesson.id])];
      ctx.save();
      completedBtn.setAttribute("aria-pressed", "true");
      completedBtn.textContent = "Lección leída ✓";
      ctx.notify("Lección marcada como leída automáticamente al llegar al final.");
      observer.disconnect();
    }, { threshold: 0.4 });
    observer.observe(controls);
    window.addEventListener("hashchange", () => observer.disconnect(), { once: true });
  }

  return page;
}

export function renderCases(ctx) {
  const page = element("section", "page guide-page");
  page.append(heading(
    "Casos reales y ejercicios",
    "Casos de estudio",
    "Analiza seis casos reales del Perú y Latinoamérica (folclore, mashups urbanos y proyectos virtuales) y entrena tu criterio en las doce situaciones de decisión."
  ));

  // Section A: Real documented cases (Peru & LatAm)
  const realSection = element("section", "cases-real-section");
  const realHead = element("div", "cases-section-head");
  realHead.append(
    element("p", "eyebrow", "Observatorio · Perú y Latinoamérica"),
    element("h2", "", "Seis casos reales para analizar")
  );
  const categories = ["Todos", ...new Set(realCases.map((c) => c.category))];
  const pills = element("div", "cases-pills");
  let activeCat = "Todos";
  const pillButtons = [];
  const realGrid = element("div", "cases-real-grid");

  function drawReal() {
    realGrid.replaceChildren();
    for (const btn of pillButtons) btn.setAttribute("aria-pressed", String(btn.dataset.cat === activeCat));
    const filtered = activeCat === "Todos" ? realCases : realCases.filter((c) => c.category === activeCat);
    for (const item of filtered) {
      const card = element("article", "case-real-card");
      card.append(
        element("p", "eyebrow", item.origin + " · " + item.category),
        element("h3", "", item.title),
        element("p", "case-real-summary", item.summary)
      );
      const grid = element("dl", "case-real-dl");
      grid.append(
        element("dt", "", "Aporte humano / origen"),
        element("dd", "", item.humanRole),
        element("dt", "", "Intervención de IA"),
        element("dd", "", item.aiRole),
        element("dt", "", "Debate que abre"),
        element("dd", "", item.debate),
        element("dt", "", "Criterio para tu proyecto"),
        element("dd", "", item.takeaway)
      );
      const foot = element("div", "case-real-foot");
      const firstLesson = lessons.find((l) => l.id === item.lessons[0]);
      if (firstLesson) foot.append(anchor(lessonUrl(firstLesson), "Lección: " + firstLesson.title + " →", "guide-inline"));
      if (item.labTab) foot.append(anchor("#/laboratorio/" + item.labTab, "Practicar en el Laboratorio →", "guide-inline"));
      const src = anchor(item.sourceUrl, item.sourceLabel + " ↗", "guide-inline");
      src.target = "_blank";
      src.rel = "noopener noreferrer";
      foot.append(src);
      card.append(grid, foot);
      realGrid.append(card);
    }
  }

  for (const cat of categories) {
    const b = action(cat, "case-pill", () => { activeCat = cat; drawReal(); });
    b.dataset.cat = cat;
    pillButtons.push(b);
    pills.append(b);
  }
  drawReal();
  realSection.append(realHead, pills, realGrid);
  page.append(realSection);

  // Section B: 12 Interactive Decision Cases across 5 stages
  const decSection = element("section", "cases-dec-section");
  decSection.append(
    element("p", "eyebrow", "Práctica interactiva"),
    element("h2", "", "Doce decisiones en el estudio")
  );
  const filter = element("div", "guide-filter");
  const label = element("label", "", "Filtrar por etapa de creación");
  const select = element("select");
  select.id = "filtrar-casos";
  label.htmlFor = select.id;
  for (const name of ["Todas", ...stages.map((stage) => stage.id)]) select.append(new Option(name, name));
  filter.append(label, select);
  const list = element("div", "guide-cases");
  function update() {
    list.replaceChildren();
    for (const lesson of lessons) {
      if (select.value !== "Todas" && select.value !== lesson.stage) continue;
      const details = element("details", "guide-case-item");
      const summary = element("summary");
      summary.append(element("span", "eyebrow", lesson.stage), element("strong", "", lesson.title));
      const body = element("div", "guide-case-body");
      body.append(element("p", "", lesson.example), activity(ctx, lesson), anchor(lessonUrl(lesson), "Leer la lección completa →", "guide-inline"));
      details.append(summary, body);
      list.append(details);
    }
  }
  select.addEventListener("change", update);
  update();
  decSection.append(filter, list);
  page.append(decSection);

  // Section C: International Multilingual Library (EN · FR · ES)
  const intlSection = element("section", "cases-intl-section");
  const intlHead = element("div", "cases-section-head");
  intlHead.append(
    element("p", "eyebrow", "Biblioteca internacional · EN · FR · ES"),
    element("h2", "", "Guías, laboratorios e informes del mundo"),
    element("p", "guide-lead", "Referencias globales que respaldan la metodología de Pulso Propio en inglés, francés y español.")
  );
  const langs = ["Todos", "Inglés", "Francés", "Español"];
  let activeLang = "Todos";
  const langPills = element("div", "cases-pills");
  const langBtns = [];
  const intlGrid = element("div", "intl-grid");

  function drawIntl() {
    intlGrid.replaceChildren();
    for (const b of langBtns) b.setAttribute("aria-pressed", String(b.dataset.lang === activeLang));
    const items = activeLang === "Todos" ? internationalRefs : internationalRefs.filter((r) => r.lang === activeLang);
    for (const ref of items) {
      const card = element("article", "intl-card");
      const meta = element("div", "intl-meta");
      meta.append(element("span", "intl-lang", ref.lang), element("span", "eyebrow", ref.kind));
      const ext = anchor(ref.url, `Abrir ${ref.org} ↗`, "guide-inline");
      ext.target = "_blank";
      ext.rel = "noopener noreferrer";
      card.append(meta, element("h3", "", `${ref.org} · ${ref.title}`), element("p", "", ref.summary), ext);
      intlGrid.append(card);
    }
  }
  for (const lang of langs) {
    const b = action(lang, "case-pill", () => { activeLang = lang; drawIntl(); });
    b.dataset.lang = lang;
    langBtns.push(b);
    langPills.append(b);
  }
  drawIntl();
  intlSection.append(intlHead, langPills, intlGrid);
  page.append(intlSection);

  return page;
}
