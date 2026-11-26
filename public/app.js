import { lessons } from "./curriculum.js";
import { renderGuide, renderCases } from "./guide.js";
import { renderLab, renderVideos } from "./studio.js";
import { renderCatalog } from "./catalog.js";
import { renderChecklist } from "./checklist.js";
import { renderGallery } from "./gallery.js";
import { renderCommunity } from "./community.js";
import { renderAdmin, renderFeedback } from "./admin.js";
import Lenis from "./vendor/lenis.mjs";

const main = document.querySelector("main");
const notice = document.querySelector("#notice");
const progressLine = document.querySelector(".mast-progress");
const notebookCount = document.querySelector("[data-notebook-count]");
const validIds = new Set(lessons.map((lesson) => lesson.id));
const key = "pulso-propio:cuaderno:v1";
const themeColors = { light: "#f5f1e6", dark: "#11110f", contrast: "#000000" };
let messageTimer;
let cleanupRoute = null;

function notify(message) {
  clearTimeout(messageTimer);
  notice.textContent = message;
  messageTimer = setTimeout(() => { notice.textContent = ""; }, 4200);
}

function readState() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(key)) || {}; }
  catch { notify("El cuaderno se abrirá en esta sesión."); }
  const ids = (field) => Array.isArray(stored[field]) ? [...new Set(stored[field].filter((id) => validIds.has(id)))] : [];
  const table = (field) => Object.fromEntries(Object.entries(stored[field] || {}).filter(([id]) => validIds.has(id)));
  return {
    completed: ids("completed"),
    favorites: ids("favorites"),
    recent: ids("recent"),
    answers: table("answers"),
    reflections: table("reflections"),
    studioMix: stored.studioMix,
    bitacora: Array.isArray(stored.bitacora) ? stored.bitacora.slice(0, 40) : [],
  };
}

const state = readState();

function updateNotebookBadge() {
  if (!notebookCount) return;
  const total = state.completed.length + state.favorites.length;
  if (total > 0) {
    notebookCount.textContent = String(state.completed.length);
    notebookCount.hidden = false;
  } else {
    notebookCount.hidden = true;
  }
}

function save() {
  updateNotebookBadge();
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { notify("Tu navegador ha bloqueado el guardado. El avance está disponible durante esta visita."); }
}

function el(tag, css, content) {
  const node = document.createElement(tag);
  if (css) node.className = css;
  if (content !== undefined) node.textContent = content;
  return node;
}

function link(href, label, css) {
  const a = el("a", css, label);
  a.href = href;
  return a;
}

const ctx = { state, save, notify, link };
const arrow = '<span class="arrow" aria-hidden="true">→</span>';

function checklistDoneCount() {
  const ids = ["materiales", "humano", "ia", "origen", "permisos", "voz", "creditos", "pendientes"];
  let count = 0;
  try {
    for (const id of ids) {
      const val = localStorage.getItem("pulso-propio:ficha:v1:" + id + "-status");
      if (val === "Revisado" || val === "No aplica") count++;
    }
  } catch {}
  return count;
}

const more = [
  ["01", "videos", "Videos de escucha"],
  ["02", "casos", "Casos prácticos"],
  ["03", "herramientas", "Catálogo de herramientas"],
  ["04", "comunidad", "Comunidad y difusión"],
  ["05", "cuaderno", "Mi cuaderno"],
  ["06", "evaluacion", "Evaluar la experiencia"],
];

const HERO_DISCS = [
  {
    id: "surco-abierto",
    side: "LADO A · 33⅓ RPM",
    meta: "0:16 · PP-01",
    title: "Surco abierto",
    subtitle: "Sesión original · Pulso Propio",
    cover: "/assets/surco-abierto.webp",
    audio: "/assets/surco-abierto.wav",
    alt: "Carátula de Surco abierto, con una onda negra impresa en tinta coral.",
  },
  {
    id: "pulso-andino",
    side: "LADO B · 33⅓ RPM",
    meta: "0:16 · PP-02",
    title: "Pulso andino",
    subtitle: "Motivo pentatónico · Huayno",
    cover: "/assets/pulso-andino.webp",
    audio: "/assets/pulso-andino.wav",
    alt: "Carátula de Pulso andino, con anillos geométricos en tinta crema sobre verde andino.",
  },
  {
    id: "aire-limeno",
    side: "LADO C · 33⅓ RPM",
    meta: "0:16 · PP-03",
    title: "Aire limeño",
    subtitle: "Cadencia y cajón · Barranco",
    cover: "/assets/aire-limeno.webp",
    audio: "/assets/aire-limeno.wav",
    alt: "Carátula de Aire limeño, con ondas doradas sobre fondo azul nocturno.",
  },
  {
    id: "silencio-final",
    side: "LADO D · 33⅓ RPM",
    meta: "0:16 · PP-04",
    title: "Silencio final",
    subtitle: "Respiro y tecla · Laboratorio",
    cover: "/assets/silencio-final.webp",
    audio: "/assets/silencio-final.wav",
    alt: "Carátula de Silencio final, con un pentagrama interrumpido sobre papel ocre.",
  },
];

function home() {
  const page = el("div", "home");
  const completedCount = state.completed.length;
  const doneChecks = checklistDoneCount();
  const resumeLesson = lessons.find((l) => l.id === state.recent[0]);
  const firstDisc = HERO_DISCS[0];

  page.innerHTML = `
    <div class="hero-band">
      <div class="hero-strip">
        <span class="hero-strip-live"><span class="pulse-dot" aria-hidden="true"></span>Edición PP-01 · Lima, Perú</span>
        <span>5 etapas · 12 lecciones · 6 videos · 5 estaciones</span>
      </div>
      <section class="hero" aria-label="Presentación">
        <div class="hero-copy">
          <p class="kicker"><span class="pulse-dot" aria-hidden="true"></span>Música e inteligencia artificial</p>
          <h1><span>La IA propone.</span><em>Tú decides.</em></h1>
          <p class="intro-copy">Una guía multimedia para artistas emergentes del Perú. Explora la IA en tu música, escucha alternativas reales y decide qué lleva tu firma.</p>
          <div class="hero-actions">
            <a class="button" href="#/guia">Explorar la guía ${arrow}</a>
            <a class="button secondary" href="#/laboratorio">Ir al laboratorio</a>
          </div>
          <div class="hero-stats" aria-label="Resumen de la plataforma">
            <div class="hero-stat"><strong>${completedCount}/12</strong><span>Lecciones en 5 etapas</span></div>
            <div class="hero-stat"><strong>6 videos</strong><span>Escucha, voces y circulación</span></div>
            <div class="hero-stat"><strong>5 estaciones</strong><span>DAW, WaveSurfer, letras y juegos</span></div>
          </div>
        </div>
        <div class="cover-player">
          <div class="disc-viewport">
            <div class="disc-track" data-disc="0">
              ${HERO_DISCS.map((d, i) => `
                <div class="disc-slide">
                  <div class="sleeve-scene" role="presentation">
                    <div class="sleeve-marks" aria-hidden="true"><span>${d.side}</span><span>${d.meta}</span></div>
                    <img class="vinyl" src="/assets/vinilo.webp" alt="" width="840" height="840" decoding="async">
                    <img class="sleeve" src="${d.cover}" width="840" height="840" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} alt="${d.alt}">
                    <svg class="tonearm" viewBox="0 0 80 180" aria-hidden="true" focusable="false">
                      <circle cx="58" cy="28" r="16" fill="currentColor" opacity="0.22"/>
                      <circle cx="58" cy="28" r="9" fill="currentColor"/>
                      <path d="M58 28 L46 118 L24 156" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <rect x="14" y="148" width="16" height="22" rx="3" transform="rotate(30 22 159)" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="player-bar">
            <button class="play-round" type="button" aria-label="Reproducir ${firstDisc.title}"><span class="play-icon" aria-hidden="true"></span></button>
            <div class="track-label">
              <strong data-disc-title>${firstDisc.title}</strong>
              <small data-disc-sub>${firstDisc.subtitle}</small>
            </div>
            <label class="track-wave">
              <canvas width="296" height="72" aria-hidden="true"></canvas>
              <input type="range" min="0" max="16" step=".1" value="0" aria-label="Posición de la pista">
            </label>
            <span class="clock">0:00 / 0:16</span>
          </div>
          <div class="player-carousel-bar" aria-label="Cambiar disco de muestra">
            <span class="carousel-status" data-carousel-status>Disco 1 de 4 · Cambio cada 5 s</span>
            <div class="carousel-controls">
              <button type="button" class="carousel-nav" data-disc-prev aria-label="Disco anterior">‹</button>
              <div class="carousel-dots" role="group" aria-label="Seleccionar disco">
                ${HERO_DISCS.map((d, i) => `<button type="button" class="carousel-dot" data-disc-idx="${i}" aria-pressed="${i === 0 ? "true" : "false"}" aria-label="Disco ${i + 1}: ${d.title}">${String(i + 1).padStart(2, "0")}</button>`).join("")}
              </div>
              <button type="button" class="carousel-nav" data-disc-next aria-label="Disco siguiente">›</button>
            </div>
          </div>
          <audio preload="none" src="${firstDisc.audio}"></audio>
        </div>
      </section>
    </div>

    <section class="home-section" aria-labelledby="mesa-heading">
      <div class="chapter-head">
        <div class="chapter-head-copy">
          <p class="eyebrow">Recorrido principal</p>
          <h2 id="mesa-heading">Tu mesa de trabajo</h2>
        </div>
        <p>${resumeLesson ? "Última lectura: «" + resumeLesson.title + "». Retoma tu avance o cambia de estación." : "Tres estaciones complementarias para estudiar, probar sonidos y documentar tu lanzamiento."}</p>
      </div>
      <div class="route-cards">
        <a class="route-card" href="#/guia">
          <div class="route-art">
            <span class="route-tag">01 · ${completedCount}/12 leídas</span>
            <img loading="lazy" decoding="async" src="/assets/guia.webp" alt="" width="720" height="240">
          </div>
          <div class="card-body">
            <span class="card-meta">Idear · Componer · Producir · Proteger · Publicar</span>
            <h3>Guía multimedia ${arrow}</h3>
            <p>El corazón de Pulso Propio: 12 lecciones en 5 etapas reales con videos integrados, cuadros comparativos, ejemplos de prompts y casos peruanos.</p>
          </div>
        </a>
        <a class="route-card" href="#/laboratorio">
          <div class="route-art">
            <span class="route-tag">02 · 4 dinámicas</span>
            <img loading="lazy" decoding="async" src="/assets/laboratorio.webp" alt="" width="720" height="240">
          </div>
          <div class="card-body">
            <span class="card-meta">Consola · Oído a Ciegas · Semáforo · Créditos</span>
            <h3>Laboratorio y juegos ${arrow}</h3>
            <p>Aprende haciendo: prueba motivos andinos y valses en vivo, entrena el oído a ciegas, evalúa permisos y construye créditos verificables.</p>
          </div>
        </a>
        <a class="route-card" href="#/checklist">
          <div class="route-art">
            <span class="route-tag">03 · ${doneChecks}/8 revisados</span>
            <img loading="lazy" decoding="async" src="/assets/checklist.webp" alt="" width="720" height="240">
          </div>
          <div class="card-body">
            <span class="card-meta">Créditos y exportación PDF</span>
            <h3>Antes de publicar ${arrow}</h3>
            <p>Registra qué hizo cada persona, en qué intervino la IA y qué permisos siguen pendientes. Descarga la ficha de tu canción.</p>
          </div>
        </a>
      </div>
    </section>

    <div class="exhibition-band">
      <section class="art-preview" aria-labelledby="afiches-heading">
        <div>
          <p class="eyebrow">Galería de afiches</p>
          <h2 id="afiches-heading">Tres miradas sobre <em>una canción</em></h2>
          <p>Un silencio en la partitura, una flor que revela sus cuerdas y un cartel chicha limeño que pide créditos. Cada pieza te invita a pensar en una decisión de tu propia música.</p>
          <a href="#/galeria" class="button secondary">Visitar la galería ${arrow}</a>
        </div>
        <a class="poster-selection" href="#/galeria" aria-label="Ver los tres afiches de Pulso Propio">
          <figure><img loading="lazy" decoding="async" src="/art/silencio-thumb.webp" alt="" width="640" height="960"></figure>
          <figure><img loading="lazy" decoding="async" src="/art/anatomia-thumb.webp" alt="" width="640" height="960"></figure>
          <figure><img loading="lazy" decoding="async" src="/art/creditos-thumb.webp" alt="" width="640" height="960"></figure>
        </a>
      </section>
    </div>

    <section class="home-section" aria-labelledby="mas-heading">
      <div class="chapter-head">
        <div class="chapter-head-copy">
          <p class="eyebrow">Directorio completo</p>
          <h2 id="mas-heading">Más para explorar</h2>
        </div>
      </div>
      <div class="tool-links"></div>
    </section>
  `;

  const linksContainer = page.querySelector(".tool-links");
  for (const [idx, route, title] of more) {
    const a = link("#/" + route, "");
    a.innerHTML = `<span class="tool-link-main"><span class="tool-link-idx">${idx}</span><span class="tool-link-title">${title}</span></span>${arrow}`;
    linksContainer.append(a);
  }

  // Interactive 4-disc horizontal carousel (auto-slides every 5s; freezes ONLY while playing audio)
  const player = page.querySelector(".cover-player");
  const discTrack = player.querySelector(".disc-track");
  const scenes = [...player.querySelectorAll(".sleeve-scene")];
  const titleLabel = player.querySelector("[data-disc-title]");
  const subLabel = player.querySelector("[data-disc-sub]");
  const carouselStatus = player.querySelector("[data-carousel-status]");
  const discDots = [...player.querySelectorAll("[data-disc-idx]")];
  const prevDiscBtn = player.querySelector("[data-disc-prev]");
  const nextDiscBtn = player.querySelector("[data-disc-next]");
  const audio = player.querySelector("audio");
  const play = player.querySelector(".play-round");
  const seek = player.querySelector("input");
  const canvas = player.querySelector("canvas");
  const c2d = canvas.getContext("2d");
  const clock = player.querySelector(".clock");
  const barCount = 32;
  const baseHeights = Array.from({ length: barCount }, (_, i) =>
    0.22 + 0.72 * Math.abs(Math.sin(i * 1.97) * Math.cos(0.49 * i))
  );

  let discIdx = 0;
  let autoTimer = 0;
  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  let rafId = 0;

  function syncCarouselLabel() {
    const isPlaying = !audio.paused;
    const baseTxt = `Disco ${discIdx + 1} de ${HERO_DISCS.length}`;
    carouselStatus.textContent = isPlaying
      ? `${baseTxt} · Reproduciendo (congelado)`
      : `${baseTxt} · Cambio cada 5 s`;
  }

  function scheduleAutoSlide() {
    clearTimeout(autoTimer);
    if (!audio.paused) return;
    autoTimer = setTimeout(() => {
      if (!page.isConnected || !audio.paused) return;
      selectDisc((discIdx + 1) % HERO_DISCS.length);
    }, 5000);
  }

  function selectDisc(nextIdx) {
    if (!audio.paused) audio.pause();
    discIdx = (nextIdx + HERO_DISCS.length) % HERO_DISCS.length;
    const disc = HERO_DISCS[discIdx];
    discTrack.dataset.disc = String(discIdx);
    titleLabel.textContent = disc.title;
    subLabel.textContent = disc.subtitle;
    audio.src = disc.audio;
    audio.currentTime = 0;
    for (const dot of discDots) {
      dot.setAttribute("aria-pressed", String(Number(dot.dataset.discIdx) === discIdx));
    }
    update();
    scheduleAutoSlide();
  }

  function drawWave() {
    const styles = getComputedStyle(document.documentElement);
    const activeColor = styles.getPropertyValue("--accent").trim() || "#9e2f1a";
    const idleColor = styles.getPropertyValue("--line-strong").trim() || "#878273";
    const w = canvas.width;
    const h = canvas.height;
    c2d.clearRect(0, 0, w, h);

    if (analyser && !audio.paused) {
      analyser.getByteFrequencyData(freqData);
    }

    const progress = audio.duration ? audio.currentTime / audio.duration : audio.currentTime / 16;
    const gap = 3;
    const barW = (w - gap * (barCount - 1)) / barCount;

    for (let i = 0; i < barCount; i++) {
      let amp = baseHeights[i];
      if (analyser && !audio.paused && freqData) {
        const bin = Math.min(freqData.length - 1, Math.floor((i / barCount) * (freqData.length * 0.65)));
        const live = freqData[bin] / 255;
        amp = Math.max(0.16, amp * 0.45 + live * 0.75);
      }
      const bh = Math.max(6, amp * (h - 8));
      const x = i * (barW + gap);
      const y = (h - bh) / 2;
      c2d.fillStyle = i / barCount <= progress ? activeColor : idleColor;
      c2d.beginPath();
      c2d.roundRect(x, y, barW, bh, 2);
      c2d.fill();
    }
  }

  function tickWave() {
    drawWave();
    if (!audio.paused && page.isConnected) {
      rafId = requestAnimationFrame(tickWave);
    }
  }

  const time = (value) => "0:" + String(Math.floor(value)).padStart(2, "0");

  function update() {
    const disc = HERO_DISCS[discIdx];
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 16;
    seek.max = String(dur);
    seek.value = String(audio.currentTime);
    seek.setAttribute("aria-valuetext", time(audio.currentTime) + " de " + Math.round(dur) + " segundos");
    clock.textContent = time(audio.currentTime) + " / " + time(dur);
    const isPlaying = !audio.paused;
    player.classList.toggle("playing", isPlaying);
    document.body.classList.toggle("is-playing", isPlaying);
    play.setAttribute("aria-label", (isPlaying ? "Pausar " : "Reproducir ") + disc.title);
    syncCarouselLabel();
    drawWave();
    if (isPlaying) {
      clearTimeout(autoTimer); // Freeze carousel completely while playing!
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tickWave);
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  async function togglePlay() {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    clearTimeout(autoTimer); // Freeze immediately when Play is clicked
    try {
      if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AC();
          const source = audioCtx.createMediaElementSource(audio);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          freqData = new Uint8Array(analyser.frequencyBinCount);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
        } catch {
          analyser = null;
        }
      }
      if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
      await audio.play();
    } catch {
      notify("No se pudo reproducir la pista. Vuelve a intentarlo.");
    }
  }

  for (const type of ["play", "timeupdate", "seeked", "loadedmetadata"]) {
    audio.addEventListener(type, update);
  }
  for (const type of ["pause", "ended"]) {
    audio.addEventListener(type, () => {
      update();
      scheduleAutoSlide(); // Resume 5-second rotation only once paused or ended
    });
  }
  play.addEventListener("click", togglePlay);
  for (const sc of scenes) sc.addEventListener("click", togglePlay);
  seek.addEventListener("input", () => {
    audio.currentTime = Number(seek.value);
    drawWave();
  });
  prevDiscBtn.addEventListener("click", () => selectDisc(discIdx - 1));
  nextDiscBtn.addEventListener("click", () => selectDisc(discIdx + 1));
  for (const dot of discDots) {
    dot.addEventListener("click", () => selectDisc(Number(dot.dataset.discIdx)));
  }

  drawWave();
  syncCarouselLabel();
  scheduleAutoSlide();
  const onThemeDraw = () => drawWave();
  window.addEventListener("pulso:theme", onThemeDraw);
  const themeObserver = new MutationObserver(onThemeDraw);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  cleanupRoute = () => {
    clearTimeout(autoTimer);
    cancelAnimationFrame(rafId);
    document.body.classList.remove("is-playing");
    window.removeEventListener("pulso:theme", onThemeDraw);
    themeObserver.disconnect();
    if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(() => {});
  };

  return page;
}

function notebook() {
  const page = el("section", "page");
  page.append(
    el("p", "eyebrow", "Progreso y bitácora personal"),
    el("h1", "", "Mi cuaderno"),
    el("p", "muted", "Aquí se guardan tus lecturas, respuestas correctas, favoritas y tu bitácora de decisiones por canción en este navegador.")
  );

  // Count exact correct answers across lessons
  const answeredIds = Object.keys(state.answers);
  const correctCount = answeredIds.filter((id) => {
    const lesson = lessons.find((item) => item.id === id);
    return lesson && Number(state.answers[id]) === lesson.answer;
  }).length;

  const stats = el("div", "note-metrics");
  for (const [count, label] of [
    [state.completed.length + "/12", "Lecciones leídas"],
    [correctCount + "/" + lessons.length, "Respuestas correctas"],
    [answeredIds.length + "/12", "Casos respondidos"],
    [String(state.favorites.length), "Favoritas"],
  ]) {
    const group = el("div");
    group.append(el("strong", "", count), el("span", "", label));
    stats.append(group);
  }
  page.append(stats);

  // Bitácora de proyectos (Elegido / Modificado / Descartado) — sugerencia del equipo
  const logSection = el("section", "bitacora-section");
  logSection.append(
    el("p", "eyebrow", "Bitácora creativa por canción"),
    el("h2", "", "Lo elegido, modificado y descartado"),
    el("p", "muted", "Anota qué tomaste de la IA, qué cambiaste y qué descartaste en cada proyecto para volver rápido a cualquier pista cuando lo necesites.")
  );

  const form = el("form", "bitacora-form");
  form.innerHTML = `
    <div class="bitacora-grid">
      <label class="bitacora-field"><span>Canción o proyecto</span><input name="song" type="text" required maxlength="80" placeholder="Ej. Lluvia en Barranco"></label>
      <label class="bitacora-field"><span>Decisión</span>
        <select name="status">
          <option value="Modificado">Modificado (editado por mí)</option>
          <option value="Elegido">Elegido (se conserva con ajuste)</option>
          <option value="Descartado">Descartado (no entra al estreno)</option>
        </select>
      </label>
      <label class="bitacora-field"><span>Herramienta o pista</span><input name="tool" type="text" maxlength="80" placeholder="Ej. Suno Pro / Basic Pitch / Voz ensayo"></label>
      <label class="bitacora-field bitacora-wide"><span>Qué propuso la IA y qué cambiaste o descartaste</span><textarea name="detail" rows="2" required maxlength="320" placeholder="Ej. Tomé la progresión del puente, bajé 6 BPM, regrabé guitarra acústica y descarté la batería automática."></textarea></label>
    </div>
    <div class="bitacora-form-actions">
      <button type="submit" class="button">Guardar en bitácora</button>
      <button type="button" class="button secondary" data-bitacora-sample>Cargar ejemplo</button>
      <button type="button" class="button secondary" data-bitacora-cancel hidden>Cancelar edición</button>
    </div>
  `;

  let editingId = null;
  let filterStatus = "Todos";
  const filterBar = el("div", "bitacora-filters");
  const filterBtns = [];
  const logList = el("div", "bitacora-list");

  function drawBitacora() {
    logList.replaceChildren();
    for (const b of filterBtns) b.setAttribute("aria-pressed", String(b.dataset.status === filterStatus));
    const items = filterStatus === "Todos" ? state.bitacora : state.bitacora.filter((it) => it.status === filterStatus);
    if (!items.length) {
      logList.append(el("p", "muted", state.bitacora.length ? "No hay registros con este estado." : "Aún no registras decisiones en tu bitácora. Agrega tu primera pista o pulsa «Cargar ejemplo»."));
      return;
    }
    for (const item of items) {
      const card = el("article", "bitacora-card");
      card.dataset.status = item.status;
      const top = el("div", "bitacora-card-top");
      top.append(
        el("strong", "", item.song),
        el("span", "bitacora-badge", item.status)
      );
      const meta = el("p", "bitacora-meta", `${item.tool || "Pista sin especificar"} · ${item.updatedAt || "Hoy"}`);
      const body = el("p", "bitacora-detail", item.detail);
      const actions = el("div", "bitacora-card-actions");

      const editBtn = el("button", "bitacora-mini", "Editar");
      editBtn.type = "button";
      editBtn.addEventListener("click", () => {
        editingId = item.id;
        form.elements.song.value = item.song;
        form.elements.status.value = item.status;
        form.elements.tool.value = item.tool || "";
        form.elements.detail.value = item.detail;
        form.querySelector("[data-bitacora-cancel]").hidden = false;
        form.querySelector('button[type="submit"]').textContent = "Actualizar registro";
        form.elements.song.focus();
      });

      const cycleOrder = ["Elegido", "Modificado", "Descartado"];
      const nextStatus = cycleOrder[(cycleOrder.indexOf(item.status) + 1) % cycleOrder.length];
      const toggleBtn = el("button", "bitacora-mini", `Pasar a ${nextStatus}`);
      toggleBtn.type = "button";
      toggleBtn.addEventListener("click", () => {
        item.status = nextStatus;
        item.updatedAt = new Date().toLocaleDateString("es-PE");
        save();
        drawBitacora();
      });

      const delBtn = el("button", "bitacora-mini bitacora-del", "Eliminar");
      delBtn.type = "button";
      delBtn.addEventListener("click", () => {
        state.bitacora = state.bitacora.filter((x) => x.id !== item.id);
        save();
        drawBitacora();
        notify("Registro eliminado de tu bitácora.");
      });

      actions.append(editBtn, toggleBtn, delBtn);
      card.append(top, meta, body, actions);
      logList.append(card);
    }
  }

  for (const st of ["Todos", "Elegido", "Modificado", "Descartado"]) {
    const b = el("button", "bitacora-pill", st);
    b.type = "button";
    b.dataset.status = st;
    b.addEventListener("click", () => { filterStatus = st; drawBitacora(); });
    filterBtns.push(b);
    filterBar.append(b);
  }

  const cancelEditBtn = form.querySelector("[data-bitacora-cancel]");
  cancelEditBtn.addEventListener("click", () => {
    editingId = null;
    form.reset();
    cancelEditBtn.hidden = true;
    form.querySelector('button[type="submit"]').textContent = "Guardar en bitácora";
  });

  form.querySelector("[data-bitacora-sample]").addEventListener("click", () => {
    const samples = [
      { id: "sample-1", song: "Lluvia en Barranco", status: "Modificado", tool: "AIVA MIDI + Guitarra real", detail: "Tomé el giro del 3er acorde en MIDI, bajé el tempo a 92 BPM y regrabé guitarra acústica y cajón.", updatedAt: "Ejemplo" },
      { id: "sample-2", song: "Lluvia en Barranco", status: "Descartado", tool: "Suno Free · Batería", detail: "Descarté la batería completa generada porque saturaba el verso y no dejaba respirar la voz.", updatedAt: "Ejemplo" },
      { id: "sample-3", song: "Huayno de Prueba", status: "Elegido", tool: "Basic Pitch (tarareo)", detail: "Mantuve el motivo pentatónico transcrito desde mi tarareo y lo pasé a charango en estudio.", updatedAt: "Ejemplo" },
    ];
    for (const s of samples) {
      if (!state.bitacora.some((x) => x.id === s.id)) state.bitacora.unshift(s);
    }
    save();
    drawBitacora();
    notify("Ejemplos cargados en tu bitácora. Puedes editarlos o borrarlos.");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const song = form.elements.song.value.trim();
    const status = form.elements.status.value;
    const tool = form.elements.tool.value.trim();
    const detail = form.elements.detail.value.trim();
    if (!song || !detail) return;
    const stamp = new Date().toLocaleDateString("es-PE");
    if (editingId) {
      const target = state.bitacora.find((x) => x.id === editingId);
      if (target) Object.assign(target, { song, status, tool, detail, updatedAt: stamp });
      editingId = null;
      cancelEditBtn.hidden = true;
      form.querySelector('button[type="submit"]').textContent = "Guardar en bitácora";
      notify("Registro actualizado en tu bitácora.");
    } else {
      state.bitacora.unshift({ id: "b-" + Date.now(), song, status, tool, detail, updatedAt: stamp });
      notify("Decisión guardada en tu bitácora.");
    }
    form.reset();
    save();
    drawBitacora();
  });

  drawBitacora();
  logSection.append(form, filterBar, logList);
  page.append(logSection);

  for (const [title, ids, empty] of [
    ["Últimas lecturas", state.recent, "Abre una lección para retomarla desde aquí."],
    ["Lecciones favoritas", state.favorites, "Guarda una lección desde su página para volver a consultarla."],
    ["Mis decisiones", answeredIds, "Al responder un caso, podrás volver a su explicación desde aquí."],
    ["Apuntes de mis canciones", Object.keys(state.reflections).filter((id) => state.reflections[id]), "Las notas que escribas en las lecciones aparecerán aquí."],
  ]) {
    const list = el("div", "notelist");
    list.append(el("h2", "", title));
    if (!ids.length) list.append(el("p", "muted", empty));
    for (const id of ids) {
      const lesson = lessons.find((item) => item.id === id);
      if (!lesson) continue;
      const suffix = title === "Mis decisiones"
        ? (Number(state.answers[id]) === lesson.answer ? " · ✓ Correcta" : " · Revisar criterio")
        : "";
      const a = link("#/guia/" + id, lesson.title + suffix);
      a.insertAdjacentHTML("beforeend", arrow);
      list.append(a);
      if (title.startsWith("Apuntes")) list.append(el("p", "note-quote", state.reflections[id]));
    }
    page.append(list);
  }
  const foot = el("div", "hero-actions");
  foot.append(link("#/guia", "Explorar la guía", "button"), link("#/checklist", "Ir a mi ficha de publicación", "button secondary"));
  page.append(foot);
  return page;
}

const routes = {
  inicio: ["Inicio", home],
  guia: ["Guía", renderGuide],
  laboratorio: ["Laboratorio", renderLab],
  videos: ["Videos", renderVideos],
  casos: ["Casos prácticos", renderCases],
  herramientas: ["Catálogo", renderCatalog],
  checklist: ["Antes de publicar", renderChecklist],
  galeria: ["Galería", renderGallery],
  comunidad: ["Comunidad", renderCommunity],
  cuaderno: ["Mi cuaderno", notebook],
  evaluacion: ["Evaluación", renderFeedback],
  admin: ["Administración", renderAdmin],
};

// Menus (Explorar + Vista)
const explore = document.querySelector(".explore");
const prefs = document.querySelector(".prefs");

document.addEventListener("click", (event) => {
  if (explore && (!explore.contains(event.target) || event.target.closest(".menu a"))) explore.open = false;
  if (prefs && !prefs.contains(event.target)) prefs.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (explore?.open) {
    explore.open = false;
    explore.querySelector("summary").focus();
  }
  if (prefs?.open) {
    prefs.open = false;
    prefs.querySelector("summary").focus();
  }
});

// Theme & Text Scale Manager
const metaTheme = document.querySelector('meta[name="theme-color"]');

function syncPrefsUI() {
  const currentTheme = document.documentElement.dataset.theme || "light";
  const currentScale = document.documentElement.dataset.scale || "md";
  for (const btn of document.querySelectorAll("[data-set-theme]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.setTheme === currentTheme));
  }
  for (const btn of document.querySelectorAll("[data-set-scale]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.setScale === currentScale));
  }
  if (metaTheme && themeColors[currentTheme]) {
    metaTheme.setAttribute("content", themeColors[currentTheme]);
  }
}

function applyTheme(next) {
  if (!Object.hasOwn(themeColors, next)) return;
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("pulso-propio:theme", next); } catch {}
  syncPrefsUI();
  window.dispatchEvent(new CustomEvent("pulso:theme", { detail: next }));
}

function applyScale(next) {
  if (!["sm", "md", "lg"].includes(next)) return;
  document.documentElement.dataset.scale = next;
  try { localStorage.setItem("pulso-propio:text-scale", next); } catch {}
  syncPrefsUI();
}

for (const btn of document.querySelectorAll("[data-set-theme]")) {
  btn.addEventListener("click", () => applyTheme(btn.dataset.setTheme));
}
for (const btn of document.querySelectorAll("[data-set-scale]")) {
  btn.addEventListener("click", () => applyScale(btn.dataset.setScale));
}
syncPrefsUI();
updateNotebookBadge();

// Smooth inertia scroll powered by Lenis (darkroomengineering/lenis), disabled for reduced motion
let lenis = null;
const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
if (!reducedMotion?.matches) {
  try {
    lenis = new Lenis({
      duration: 0.95,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
      prevent: (node) => Boolean(node?.closest?.("dialog, [data-lenis-prevent], .daw-scroll")),
    });
    const raf = (time) => {
      lenis?.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  } catch {
    lenis = null;
  }
}

// Scroll reading progress line in masthead
function updateScrollLine() {
  if (!progressLine) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 40 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
  progressLine.value = Number(pct.toFixed(1));
}
if (lenis) lenis.on("scroll", updateScrollLine);
window.addEventListener("scroll", updateScrollLine, { passive: true });
window.addEventListener("resize", updateScrollLine, { passive: true });

const skip = document.querySelector(".skip");
skip.onclick = (event) => {
  event.preventDefault();
  main.focus();
  if (lenis) lenis.scrollTo(main, { immediate: true });
  else main.scrollIntoView();
};

function mountRoute(focus) {
  const [route = "inicio", id] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const entry = Object.hasOwn(routes, route) ? routes[route] : null;
  if (explore) explore.open = false;
  if (prefs) prefs.open = false;
  if (cleanupRoute) {
    cleanupRoute();
    cleanupRoute = null;
  }
  for (const media of main.querySelectorAll("audio,video")) media.pause();
  for (const node of document.querySelectorAll("[data-nav]")) {
    if (node.dataset.nav === route) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  }
  explore?.classList.toggle("current", !["inicio", "guia", "laboratorio", "cuaderno"].includes(route));
  try {
    if (!entry) throw new Error("route");
    main.replaceChildren(entry[1](ctx, id));
    document.title = (main.querySelector("h1")?.textContent || entry[0]) + " · Pulso Propio";
  } catch (error) {
    if (entry) console.error(error);
    const page = el("div", "page");
    page.append(el("h1", "", entry ? "No se pudo abrir esta sección" : "Página no encontrada"), link("#/", "Volver al inicio", "button"));
    main.replaceChildren(page);
  }
  lenis?.resize?.();
  updateScrollLine();
  if (focus) {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

let activeTransition = null;

function render(focus = false) {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (focus && !reduced && typeof document.startViewTransition === "function") {
    try { activeTransition?.skipTransition?.(); } catch {}
    const vt = document.startViewTransition(() => mountRoute(true));
    activeTransition = vt;
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    vt.finished.catch(() => {});
  } else {
    mountRoute(focus);
  }
}

window.addEventListener("hashchange", () => render(true));
window.addEventListener("storage", (event) => {
  if (event.key === key) {
    Object.assign(state, readState());
    updateNotebookBadge();
    if (location.hash === "#/cuaderno") render();
  }
});

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

render();
