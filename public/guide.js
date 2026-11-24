import { lessons } from "./curriculum.js";

const stages = [
  { name: "Componer", title: "Darle forma a una idea" },
  { name: "Producir", title: "Encontrar el sonido" },
  { name: "Publicar", title: "Preparar el lanzamiento" },
];

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
  page.append(heading("Guía multimedia", "Tu ruta de creación", "Recorre el proceso de una canción, desde el primer verso hasta los créditos. Puedes empezar por la decisión que tienes entre manos."));
  const resume = lessons.find(lesson => lesson.id === ctx.state.recent[0]);
  const status = element("div", "guide-status");
  status.append(element("span", "", ctx.state.completed.length + " de " + lessons.length + " lecciones leídas"));
  if (resume) status.append(anchor(lessonUrl(resume), "Retomar «" + resume.title + "» →", "guide-inline"));
  page.append(status);
  const index = element("div", "guide-index");
  for (const stage of stages) {
    const group = element("section", "guide-index-group");
    group.append(element("p", "eyebrow", stage.name), element("h2", "", stage.title));
    const list = element("ul", "guide-entries");
    for (const [position, lesson] of lessons.entries()) {
      if (lesson.stage !== stage.name) continue;
      const item = element("li");
      item.append(indexEntry(ctx, lesson, position));
      list.append(item);
    }
    group.append(list);
    index.append(group);
  }
  page.append(index);
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
  form.addEventListener("submit", event => {
    event.preventDefault();
    const index = options.findIndex(input => input.checked);
    if (index < 0) return;
    ctx.state.answers[lesson.id] = index;
    ctx.save();
    showFeedback(index);
  });
  return form;
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
  form.addEventListener("submit", event => {
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
  section.append(element("h2", "", "Para profundizar"));
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

function relatedActivity(id) {
  if (["arreglos", "melodias", "mezcla"].includes(id)) return ["#/laboratorio", "Comparar sonidos en el laboratorio"];
  if (["identidad", "creditos"].includes(id)) return ["#/galeria", "Ver los afiches de Pulso Propio"];
  if (["permisos", "publicacion"].includes(id)) return ["#/checklist", "Preparar mi ficha de publicación"];
  return ["#/videos", "Ver las demostraciones en video"];
}

export function renderGuide(ctx, id) {
  if (!id) return guideIndex(ctx);
  const index = lessons.findIndex(lesson => lesson.id === id);
  const page = element("article", "page guide-page");
  if (index < 0) {
    page.append(heading("Guía multimedia", "Lección no encontrada"), anchor("#/guia", "Ver las doce lecciones", "button"));
    return page;
  }
  const lesson = lessons[index];
  ctx.state.recent = [id, ...ctx.state.recent.filter(item => item !== id)].slice(0, lessons.length);
  ctx.save();
  page.append(anchor("#/guia", "← Volver al índice", "guide-inline"));
  page.append(heading("Lección " + (index + 1) + " de " + lessons.length + " · " + lesson.stage, lesson.title, lesson.intro));
  const layout = element("div", "guide-layout");
  const copy = element("div", "guide-copy");
  for (const paragraph of lesson.paragraphs) copy.append(element("p", "guide-body", paragraph));
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
  aside.append(markButton(ctx, lesson, "favorites", "Guardar en favoritos", "En favoritos ✓"));
  aside.append(markButton(ctx, lesson, "completed", "Marcar como leída", "Lección leída ✓"));
  const [url, label] = relatedActivity(id);
  aside.append(anchor(url, label + " →", "guide-inline"));
  const controls = element("nav", "guide-next");
  controls.setAttribute("aria-label", "Navegación entre lecciones");
  if (index > 0) controls.append(anchor(lessonUrl(lessons[index - 1]), "← " + lessons[index - 1].title));
  const next = lessons[index + 1];
  controls.append(next ? anchor(lessonUrl(next), next.title + " →") : anchor("#/guia", "Volver a la guía →"));
  layout.append(copy, aside);
  page.append(layout, controls);
  return page;
}

export function renderCases(ctx) {
  const page = element("section", "page guide-page");
  page.append(heading("Ejercicios", "Casos de estudio", "Escoge una situación, toma una decisión y descubre qué puedes comprobar antes de actuar."));
  const filter = element("div", "guide-filter");
  const label = element("label", "", "Etapa de creación");
  const select = element("select");
  select.id = "filtrar-casos";
  label.htmlFor = select.id;
  for (const name of ["Todas", ...stages.map(stage => stage.name)]) select.append(new Option(name, name));
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
      body.append(element("p", "", lesson.example), activity(ctx, lesson), anchor(lessonUrl(lesson), "Leer la lección →", "guide-inline"));
      details.append(summary, body);
      list.append(details);
    }
  }
  select.addEventListener("change", update);
  update();
  page.append(filter, list);
  return page;
}
