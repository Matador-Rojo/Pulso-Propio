import { lessons } from "./curriculum.js";

const style = document.createElement("link");
style.rel = "stylesheet";
style.href = "./admin.css";
document.head.append(style);

function el(tag, text = "", className = "") {
  const element = document.createElement(tag);
  if (text !== "") element.textContent = text;
  if (className) element.className = className;
  return element;
}

function notice() {
  const node = el("p", "", "pp-notice");
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  return node;
}

function button(label, type = "button", secondary = false) {
  const node = el("button", label, secondary ? "pp-btn pp-secondary" : "pp-btn");
  node.type = type;
  return node;
}

async function request(path, body, csrf) {
  const options = { credentials: "same-origin", cache: "no-store" };
  if (body !== undefined) {
    options.method = "POST";
    options.headers = { "Content-Type": "application/json" };
    if (csrf) options.headers["X-CSRF-Token"] = csrf;
    options.body = JSON.stringify(body);
  }
  let reply;
  try {
    reply = await fetch("/api/" + path, options);
  } catch {
    throw new Error("Se interrumpió la conexión. Tus campos siguen aquí para que puedas reintentar.");
  }
  const result = await reply.json().catch(() => ({}));
  if (!reply.ok) {
    const error = new Error(result.error || "El servidor no pudo completar la solicitud.");
    error.status = reply.status;
    throw error;
  }
  return result;
}

function page(title, description, eyebrow) {
  const node = el("section", "", "pp-forms");
  const mast = el("header", "", "pp-formhead");
  const tag = el("span", eyebrow, "pp-formtag");
  mast.append(tag, el("h1", title), el("p", description));
  node.append(mast);
  return node;
}

const questions = [
  ["navigation", "¿Qué tan fácil te resultó encontrar lo que buscabas?", "Muy difícil", "Muy fácil"],
  ["clarity", "¿Qué tan claras fueron las explicaciones?", "Poco claras", "Muy claras"],
  ["usefulness", "¿Qué tan útil fue la guía para tomar una decisión musical?", "Poco útil", "Muy útil"],
];

function scale([name, question, low, high]) {
  const group = el("fieldset", "", "pp-scale");
  group.append(el("legend", question));
  const row = el("div", "", "pp-stars");
  for (let value = 1; value <= 5; value++) {
    const label = el("label");
    const input = el("input");
    input.type = "radio";
    input.name = name;
    input.value = String(value);
    input.required = true;
    input.setAttribute("aria-label", value + " de 5" + (value === 1 ? ", " + low : value === 5 ? ", " + high : ""));
    label.append(input, el("span", String(value)));
    row.append(label);
  }
  const range = el("div", "", "pp-range");
  range.append(el("span", low), el("span", high));
  group.append(row, range);
  return group;
}

function field(caption, name, limit) {
  const label = el("label", "", "pp-field");
  const input = el("textarea");
  input.name = name;
  input.maxLength = limit;
  input.rows = 3;
  label.append(el("span", caption), input);
  return label;
}

function submissionId() {
  // getRandomValues también funciona en un teléfono conectado por HTTP a la red local.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export function renderFeedback() {
  const root = page("Tu experiencia", "Cuéntanos cómo te fue al aprender, escuchar y decidir con Pulso Propio.", "Evaluación");
  const layout = el("div", "", "pp-formlayout");
  const aside = el("aside", "", "pp-aside");
  aside.append(el("h2", "Antes de responder"), el("p", "Prueba una lección y una actividad del laboratorio. Piensa en un momento concreto que te ayudó o te costó."),
    el("p", "El equipo del curso revisará tus respuestas para mejorar la guía. Evita incluir nombres, correos y datos de terceros."));
  const form = el("form", "", "pp-formbody");
  form.append(...questions.map(scale), field("¿Qué te ayudó a decidir? (opcional)", "highlight", 1000),
    field("¿Dónde te trabaste o qué cambiarías? (opcional)", "improvement", 1000));
  const consent = el("label", "", "pp-consent");
  const check = el("input");
  check.type = "checkbox";
  check.required = true;
  consent.append(check, el("span", "Acepto que el equipo de Pulso Propio guarde estas respuestas anónimas y las analice con fines de evaluación académica. Mi participación es voluntaria."));
  const send = button("Enviar evaluación", "submit");
  const status = notice();
  form.append(consent, send, status);
  // Se reutiliza el identificador si una respuesta se pierde durante el envío.
  const id = submissionId();
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (send.disabled) return;
    const data = Object.fromEntries(new FormData(form));
    for (const [name] of questions) data[name] = Number(data[name]);
    send.disabled = true;
    status.textContent = "Guardando tu evaluación…";
    try {
      await request("feedback", { ...data, submission_id: id, consent_version: "pulso-1", consent: check.checked });
      const heading = el("h2", "Tu evaluación quedó guardada.");
      heading.tabIndex = -1;
      const link = el("a", "Volver al inicio", "pp-btn");
      link.href = "#/";
      form.replaceChildren(heading, el("p", "Gracias por compartir lo que viviste en la guía."), link);
      heading.focus();
    } catch (error) {
      status.textContent = error.message;
      send.disabled = false;
    }
  });
  layout.append(aside, form);
  root.append(layout);
  return root;
}

function simulatedReport() {
  const details = el("details", "", "pp-simulated");
  details.append(el("summary", "Prueba simulada del cuestionario"), el("p",
    "El 19 de noviembre de 2026 se generaron 23 registros con IA para probar el cuestionario de preferencias entre las tres propuestas. La evaluación de esta plataforma requiere experiencias de usuarios reales."));
  const table = el("table");
  const head = table.createTHead().insertRow();
  head.append(el("th", "Primera preferencia"), el("th", "Registros simulados"));
  const body = table.createTBody();
  for (const [label, number] of [["Taller", 10], ["Pasaporte", 5], ["Guía", 4], ["Ninguna", 4]]) {
    const row = body.insertRow();
    row.insertCell().textContent = label;
    row.insertCell().textContent = number;
  }
  details.append(table, el("p", "Fuente: Informe de evaluación de propuestas para el uso responsable de IA en la creación musical, apartado de prueba del cuestionario. Estos conteos se presentan aparte de las evaluaciones recibidas por el sitio."));
  return details;
}

function evaluations(root, authError) {
  const panel = el("section", "", "pp-panel");
  panel.append(el("h2", "Evaluaciones recibidas"));
  const status = notice();
  const content = el("div");
  const previous = button("Anterior", "button", true);
  const next = button("Siguiente", "button", true);
  const download = el("a", "Descargar CSV", "pp-btn");
  download.href = "/api/admin/export.csv";
  download.download = "pulso-evaluaciones.csv";
  const actions = el("div", "", "pp-actions");
  actions.append(previous, next, download);
  let current = 1;
  async function load(pageNumber) {
    previous.disabled = next.disabled = true;
    status.textContent = "Consultando evaluaciones…";
    try {
      const { rows, total, page } = await request("admin/feedback?page=" + pageNumber);
      current = page;
      status.textContent = total ? total + " evaluaciones · Página " + page + " de " + Math.ceil(total / 20) : "Todavía no se han recibido evaluaciones.";
      const entries = rows.map(row => {
        const record = el("details", "", "pp-record");
        const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.created));
        record.append(el("summary", "Evaluación " + row.id + " · " + date));
        const scores = el("dl", "", "pp-scores");
        for (const [label, key] of [["Navegación", "navigation"], ["Claridad", "clarity"], ["Utilidad", "usefulness"]]) {
          scores.append(el("dt", label), el("dd", row[key] + " / 5"));
        }
        record.append(scores, el("h3", "Qué ayudó"), el("p", row.highlight || "Sin comentario."),
          el("h3", "Qué mejorar"), el("p", row.improvement || "Sin comentario."));
        return record;
      });
      content.replaceChildren(...entries);
      previous.disabled = page <= 1;
      next.disabled = page * 20 >= total;
    } catch (error) {
      status.textContent = error.message;
      authError(error);
    }
  }
  previous.onclick = () => load(current - 1);
  next.onclick = () => load(current + 1);
  panel.append(status, content, actions);
  root.append(panel);
  load(1);
}

function noteEditor(root, csrf, authError) {
  const panel = el("section", "", "pp-panel");
  const form = el("form", "", "pp-formbody");
  const lessonLabel = el("label", "", "pp-field");
  const select = el("select");
  lessons.forEach(lesson => select.add(new Option(lesson.title, lesson.id)));
  lessonLabel.append(el("span", "Lección"), select);
  const introLabel = field("Introducción de la lección", "intro", 2000);
  const intro = introLabel.querySelector("textarea");
  const bodyLabel = field("Nota pública de la lección", "body", 2000);
  const body = bodyLabel.querySelector("textarea");
  const save = button("Publicar nota", "submit");
  const refresh = button("Cargar versión guardada", "button", true);
  const actions = el("div", "", "pp-actions");
  actions.append(save, refresh);
  const status = notice();
  let notes = {};
  let activeId = select.value;
  let loaded = false;
  function originalIntro() {
    return lessons.find(lesson => lesson.id === activeId).intro;
  }
  function publishedIntro() {
    return notes[activeId]?.intro || originalIntro();
  }
  function updateAction() {
    const introChanged = intro.value !== publishedIntro();
    const bodyChanged = body.value !== (notes[activeId]?.body ?? "");
    save.textContent = introChanged ? (bodyChanged ? "Publicar cambios" : "Publicar introducción") : "Publicar nota";
  }
  form.addEventListener("input", updateAction);
  function show() {
    activeId = select.value;
    body.value = notes[activeId]?.body ?? "";
    intro.value = publishedIntro();
    updateAction();
  }
  function hasEdits() {
    return loaded && (body.value !== (notes[activeId]?.body ?? "") || intro.value !== publishedIntro());
  }
  function keepEdits() {
    return hasEdits() && !window.confirm("Hay cambios sin publicar. ¿Descartarlos?");
  }
  select.onchange = () => {
    if (keepEdits()) {
      select.value = activeId;
      return;
    }
    show();
    status.textContent = "";
  };
  async function reload() {
    if (keepEdits()) return;
    save.disabled = select.disabled = intro.disabled = body.disabled = refresh.disabled = true;
    loaded = false;
    try {
      const response = await request("admin/notes");
      notes = response.notes;
      show();
      loaded = true;
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message;
      authError(error);
    } finally {
      refresh.disabled = false;
      save.disabled = select.disabled = intro.disabled = body.disabled = !loaded;
    }
  }
  refresh.onclick = reload;
  form.onsubmit = async event => {
    event.preventDefault();
    if (!loaded || save.disabled) return;
    const introChanged = intro.value !== publishedIntro();
    save.disabled = select.disabled = intro.disabled = body.disabled = refresh.disabled = true;
    status.textContent = "Guardando…";
    try {
      const result = await request("admin/notes", {
        lesson: activeId, body: body.value,
        intro: intro.value.trim() === originalIntro() ? "" : intro.value.trim(),
        revision: notes[activeId]?.revision ?? 0,
      }, csrf);
      notes[activeId] = result;
      show();
      status.textContent = introChanged ? "Cambios publicados en la lección."
        : result.body ? "Nota publicada en la lección." : "Nota retirada de la lección.";
    } catch (error) {
      status.textContent = error.message;
      authError(error);
    } finally {
      save.disabled = select.disabled = intro.disabled = body.disabled = refresh.disabled = false;
    }
  };
  form.append(lessonLabel, introLabel, el("small", "Aparece debajo del título. Vacía este campo para recuperar la introducción original."),
    bodyLabel, el("small", "Hasta 2000 caracteres por campo. Vacía la nota si deseas retirarla."), actions, status);
  panel.append(el("h2", "Edición de lecciones"), form);
  root.append(panel);
  reload();
}

export function renderAdmin() {
  const root = page("Mesa de edición", "Revisa las evaluaciones del prototipo y edita las introducciones y las notas de la guía.", "Acceso del equipo");
  const region = el("div", "", "pp-adminbody");
  const initial = notice();
  initial.textContent = "Comprobando acceso…";
  region.append(initial);
  root.append(region);

  function login(message = "") {
    const form = el("form", "", "pp-panel pp-formbody pp-login");
    const label = el("label", "", "pp-field");
    const input = el("input");
    input.type = "password";
    input.autocomplete = "current-password";
    input.required = true;
    input.maxLength = 128;
    label.append(el("span", "Clave del equipo"), input);
    const submit = button("Ingresar", "submit");
    const status = notice();
    status.textContent = message;
    form.append(el("h2", "Acceso administrativo"), label, submit, status);
    form.onsubmit = async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        const { csrf } = await request("admin/login", { password: input.value });
        input.value = "";
        dashboard(csrf);
      } catch (error) {
        status.textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    };
    region.replaceChildren(form);
  }
  function dashboard(csrf) {
    const logout = button("Cerrar sesión", "button", true);
    const status = notice();
    logout.onclick = async () => {
      logout.disabled = true;
      try {
        await request("admin/logout", {}, csrf);
        login("Sesión cerrada.");
      } catch (error) {
        if (error.status === 401) login("Sesión finalizada.");
        else status.textContent = error.message;
      } finally {
        logout.disabled = false;
      }
    };
    const top = el("div", "", "pp-actions");
    top.append(logout, status);
    region.replaceChildren(top);
    const authError = error => { if (error.status === 401) login("La sesión caducó. Vuelve a ingresar."); };
    evaluations(region, authError);
    noteEditor(region, csrf, authError);
    region.append(simulatedReport());
  }
  request("admin/session").then(({ csrf }) => dashboard(csrf)).catch(error => login(error.status === 401 ? "" : error.message));
  return root;
}
