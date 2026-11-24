import { films } from "./media/films.js";

const pitches = [64, 67, 69, 67, 64, 62, 60, 57];
const noteNames = ["Mi", "Sol", "La", "Sol", "Mi", "Re", "Do", "La"];
const timbres = { pluck: "Cuerda pulsada", keys: "Tecla sostenida", bell: "Campana suave" };
const base = { bpm: 96, timbre: "pluck", rest: false, drums: false };
const freshMix = { bpm: 96, timbre: "keys", rest: true, drums: false };

function el(tag, cls, value) {
  const item = document.createElement(tag);
  if (cls) item.className = cls;
  if (value !== undefined) item.textContent = value;
  return item;
}

function link(label, url, cls = "studio-link") {
  const item = el("a", cls, label);
  item.href = url;
  return item;
}

function button(label, fn) {
  const item = el("button", "studio-button", label);
  item.type = "button";
  item.addEventListener("click", fn);
  return item;
}

function header(kicker, title, intro) {
  const head = el("header", "studio-head");
  head.append(el("p", "studio-kicker", kicker), el("h1", "", title), el("p", "studio-intro", intro));
  return head;
}

function makeSound(engine, mix) {
  const rate = 24000;
  const beat = 60 / mix.bpm;
  const buffer = engine.createBuffer(1, Math.ceil(8 * beat * rate), rate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < 8; i++) {
    const offset = Math.round(i * beat * rate);
    const duration = beat * .89;
    const frequency = 440 * 2 ** ((pitches[i] - 69) / 12);
    for (let n = 0; n < duration * rate; n++) {
      const t = n / rate;
      const phase = 2 * Math.PI * frequency * t;
      let value = 0;
      if (!mix.rest || i < 6) {
        const release = Math.min(1, (duration - t) / .04);
        if (mix.timbre === "keys") {
          const env = Math.min(1, t / .065, (duration - t) / .13);
          value = env * (Math.sin(phase) + .12 * Math.sin(2 * phase) + .07 * Math.sin(3 * phase)) / 1.19;
        } else if (mix.timbre === "bell") {
          const env = Math.min(1, t / .006) * Math.exp(-4 * t) * release;
          value = env * (Math.sin(phase) + .44 * Math.sin(phase * 2.71) + .07 * Math.sin(phase * 4.12)) / 1.51;
        } else {
          const env = Math.min(1, t / .008) * Math.exp(-7.4 * t) * release;
          value = env * (Math.sin(phase) + .4 * Math.sin(2 * phase) + .26 * Math.sin(3 * phase)) / 1.66;
        }
      }
      let drum = 0;
      if (mix.drums && t < .16) {
        const drumHz = i % 2 ? 180 : 55;
        drum = Math.sin(2 * Math.PI * (drumHz * t + 4 * (1 - Math.exp(-22 * t)))) *
          Math.exp(-27 * t) * Math.min(1, (.16 - t) / .015);
      }
      samples[offset + n] = .55 * value + .21 * drum;
    }
  }
  return buffer;
}

export function renderLab(ctx) {
  const page = el("section", "studio-page");
  page.append(header("Taller de escucha", "Laboratorio musical",
    "Una frase de ocho pulsos, dos maneras de tocarla. Escucha la base, modifica el arreglo y compara qué decisión cambia su carácter."));
  const layout = el("div", "studio-layout");
  const deck = el("article", "studio-deck");
  const deckHead = el("div", "studio-deck-head");
  deckHead.append(el("span", "", "Partitura de escucha"), el("span", "", "La menor   ·   4/4"));
  const name = el("h2", "", "Ocho pulsos");
  const now = el("p", "studio-now", "Partitura de tu versión");
  const score = el("div", "studio-score");
  score.setAttribute("aria-hidden", "true");
  const slots = pitches.map((pitch, i) => {
    const cell = el("div", "studio-slot");
    const tone = el("span", "studio-note");
    tone.style.setProperty("--pitch", String((69 - pitch) / 12));
    cell.append(tone, el("span", "studio-note-name", noteNames[i]));
    score.append(cell);
    return cell;
  });
  const pitchesText = el("p", "sr-only");
  const actions = el("div", "studio-actions");
  const playA = button("▶  Escuchar base", () => play("A"));
  const playB = button("▶  Escuchar mi versión", () => play("B"));
  playB.classList.add("studio-primary");
  const status = el("p", "studio-status", "La base usa cuerda pulsada a 96 BPM.");
  status.setAttribute("role", "status");
  actions.append(playA, playB);
  deck.append(deckHead, name, now, score, pitchesText, actions, status);

  const saved = ctx.state?.studioMix;
  const mix = { ...freshMix };
  if (saved && Object.hasOwn(timbres, saved.timbre) && Number.isInteger(saved.bpm) &&
      saved.bpm >= 64 && saved.bpm <= 144) {
    Object.assign(mix, { timbre: saved.timbre, bpm: saved.bpm, rest: saved.rest === true, drums: saved.drums === true });
  }
  const panel = el("section", "studio-controls");
  panel.append(el("h2", "", "Tu arreglo"));
  const instrument = el("label", "studio-field");
  instrument.append(el("span", "", "Timbre"));
  const select = el("select");
  Object.entries(timbres).forEach(([value, label]) => select.add(new Option(label, value)));
  select.value = mix.timbre;
  instrument.append(select);
  const tempo = el("label", "studio-field");
  const tempoLabel = el("span", "studio-row");
  const bpm = el("output", "", mix.bpm + " BPM");
  tempoLabel.append(el("span", "", "Tempo"), bpm);
  const range = el("input");
  range.type = "range"; range.min = "64"; range.max = "144"; range.value = String(mix.bpm);
  range.setAttribute("aria-label", "Tempo en pulsos por minuto");
  tempo.append(tempoLabel, range);
  panel.append(instrument, tempo);
  const switches = [
    ["rest", "Dejar dos pulsos de silencio"],
    ["drums", "Añadir percusión de apoyo"]
  ];
  switches.forEach(([key, label]) => {
    const row = el("label", "studio-toggle");
    const input = el("input");
    input.type = "checkbox"; input.checked = mix[key];
    input.addEventListener("change", () => { mix[key] = input.checked; update(); });
    row.append(input, el("span", "", label));
    panel.append(row);
  });
  select.addEventListener("change", () => { mix.timbre = select.value; update(); });
  range.addEventListener("input", () => { bpm.textContent = range.value + " BPM"; });
  range.addEventListener("change", () => { mix.bpm = Number(range.value); update(); });
  const description = el("p", "studio-summary");
  panel.append(description);
  layout.append(deck, panel);
  page.append(layout);
  const note = el("aside", "studio-aside");
  note.append(el("strong", "", "Simulación educativa"),
    el("p", "", "El navegador sintetiza un motivo original. La base representa una propuesta de partida. Cada cambio que eliges se puede escuchar y documentar como decisión de arreglo."),
    link("Estudiar arreglos e instrumentación →", "#/guia/arreglos"),
    link("Ver las comparaciones en video →", "#/videos"));
  page.append(note);
  let engine, source, frame, mode = "", generation = 0;

  function draw(settings, step = -1) {
    slots.forEach((slot, i) => {
      slot.classList.toggle("playing", i === step);
      const muted = settings.rest && i >= 6;
      slot.classList.toggle("rest", muted);
      slot.lastChild.textContent = muted ? "Pausa" : noteNames[i];
    });
    pitchesText.textContent = "Partitura: " + noteNames.map((n, i) => settings.rest && i >= 6 ? "pausa" : n).join(", ") + ".";
  }
  function summarize() {
    description.textContent = timbres[mix.timbre] + " a " + mix.bpm + " BPM, " +
      (mix.rest ? "con dos pulsos de silencio" : "con ocho notas") +
      (mix.drums ? " y una base de percusión." : " sin percusión.");
  }
  function stop() {
    generation++;
    if (source) { source.onended = null; source.stop(); source.disconnect(); source = null; }
    cancelAnimationFrame(frame);
    mode = "";
    playA.textContent = "▶  Escuchar base";
    playB.textContent = "▶  Escuchar mi versión";
    now.textContent = "Partitura de tu versión";
    draw(mix);
  }
  function update() {
    stop();
    if (ctx.state) { ctx.state.studioMix = { ...mix }; ctx.save?.(); }
    summarize();
    status.textContent = "Arreglo actualizado. Pulsa «Escuchar mi versión» para oírlo.";
  }
  async function play(selection) {
    const stopping = mode === selection;
    stop();
    if (stopping) { status.textContent = "Reproducción detenida."; return; }
    const token = generation;
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!engine) engine = new AudioEngine();
      if (engine.state !== "running") await engine.resume();
      if (token !== generation || !page.isConnected) return;
      const settings = selection === "A" ? base : mix;
      const label = selection === "A" ? "la base" : "tu versión";
      source = engine.createBufferSource();
      source.buffer = makeSound(engine, settings);
      source.connect(engine.destination);
      mode = selection;
      (selection === "A" ? playA : playB).textContent = "■  Detener";
      now.textContent = "Partitura de " + label;
      status.textContent = "Reproduciendo " + label + " a " + settings.bpm + " BPM.";
      const start = engine.currentTime;
      function advance() {
        if (!page.isConnected) { stop(); return; }
        draw(settings, Math.floor((engine.currentTime - start) * settings.bpm / 60));
        frame = requestAnimationFrame(advance);
      }
      source.onended = () => {
        source.disconnect(); source = null; stop();
        status.textContent = "Terminó " + label + ". Puedes escuchar la otra versión.";
      };
      source.start(start);
      advance();
    } catch {
      stop();
      status.textContent = "El audio no pudo iniciarse. Prueba otra vez o abre las comparaciones en video.";
    }
  }
  window.addEventListener("hashchange", () => {
    stop();
    if (engine && engine.state !== "closed") engine.close().catch(() => {});
  }, { once: true });
  summarize(); draw(mix);
  return page;
}

export function renderVideos(ctx, id) {
  const page = el("section", "studio-page");
  if (id && !films.some(item => item.id === id)) {
    page.append(header("Videoteca", "Video no encontrado", "Selecciona una sesión disponible para escucharla."),
      link("Ver todos los videos →", "#/videos"));
    return page;
  }
  const film = films.find(item => item.id === id) || films[0];
  page.append(header("Videoteca", "Sesiones de escucha",
    "Tres comparaciones audiovisuales para entrenar el oído. En cada sesión cambia una decisión del arreglo."));
  const layout = el("div", "studio-video-layout");
  const playerCard = el("div", "studio-player");
  const player = el("video");
  player.controls = true; player.playsInline = true; player.preload = "metadata";
  player.width = 800; player.height = 450;
  player.poster = "/media/" + film.id + ".webp";
  player.src = "/media/" + film.id + ".webm";
  player.setAttribute("aria-label", film.title);
  const captions = document.createElement("track");
  Object.assign(captions, { kind: "captions", src: "/media/" + film.id + ".vtt", srclang: "es", label: "Español", default: true });
  player.append(captions);
  const error = el("p", "studio-error");
  error.hidden = true; error.setAttribute("role", "alert");
  player.addEventListener("error", () => {
    error.hidden = false;
    error.textContent = "No se pudo reproducir este video. Puedes abrir el archivo en otro reproductor o leer la transcripción.";
  });
  playerCard.append(player, error);
  const credits = el("div", "studio-video-credit");
  credits.append(el("span", "", "Música y animación originales · 0:28"), link("Abrir archivo ↗", player.src));
  playerCard.append(credits);
  const nav = el("nav", "studio-program"); nav.setAttribute("aria-label", "Elegir una sesión de escucha");
  nav.append(el("h2", "", "Programa"));
  films.forEach((entry, i) => {
    const item = link("", "#/videos/" + entry.id, "studio-program-item");
    if (film === entry) item.setAttribute("aria-current", "page");
    item.append(el("span", "studio-index", "0" + (i + 1)), el("span", "", entry.title), el("small", "", "0:28"));
    nav.append(item);
  });
  layout.append(playerCard, nav);
  page.append(layout);
  const detail = el("article", "studio-film-detail");
  detail.append(el("p", "studio-kicker", film.subject), el("h2", "", film.title), el("p", "", film.intro));
  const transcript = el("details", "studio-transcript");
  transcript.append(el("summary", "", "Transcripción y capítulos"));
  const list = el("ol");
  [0, 3, 13, 23].forEach((start, index) => {
    const li = el("li");
    const stamp = "0:" + String(start).padStart(2, "0");
    const chapter = button(stamp, () => { player.currentTime = start; player.focus(); });
    chapter.setAttribute("aria-label", "Ir a " + start + " segundos del video");
    li.append(chapter, el("span", "", film.captions[index])); list.append(li);
  });
  transcript.append(list); detail.append(transcript, link("Probar mi arreglo en el laboratorio →", "#/laboratorio"));
  page.append(detail);
  return page;
}
