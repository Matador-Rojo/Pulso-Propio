// Herramientas avanzadas del Laboratorio: Exportar MIDI/WAV, Comparador A/B con WaveSurfer.js y Taller de Letras + Prompts ROCEF.
import WaveSurfer from "./vendor/wavesurfer.esm.js";

function el(tag, css, text) {
  const node = document.createElement(tag);
  if (css) node.className = css;
  if (text !== undefined) node.textContent = text;
  return node;
}

function btn(label, onClick, css) {
  const b = el("button", css, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ==================== 1. EXPORTAR .MIDI ESTÁNDAR (SMF FORMAT 0) ====================
function vlq(value) {
  let v = Math.max(0, Math.floor(value));
  const out = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return out;
}

export function exportMidiFromMix(mix, scales) {
  const sc = scales[mix.scale] || Object.values(scales)[0];
  const ppq = 480;
  const stepTicks = ppq / 4; // 16th note = 120 ticks
  const events = [];

  // Set Tempo meta event at tick 0
  const mpqn = Math.round(60000000 / mix.bpm);
  events.push({ tick: 0, order: 0, bytes: [0xff, 0x51, 0x03, (mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255] });

  // Export 2 loops (32 steps) so it drops cleanly as a 2-bar clip into any DAW
  for (let rep = 0; rep < 2; rep++) {
    for (let s = 0; s < 16; s++) {
      const tick = (rep * 16 + s) * stepTicks;
      const noteRow = mix.melody[s];
      if (noteRow >= 0 && sc.notes[noteRow]) {
        const midi = sc.notes[noteRow].midi;
        events.push({ tick, order: 2, bytes: [0x90, midi, 96] });
        events.push({ tick: tick + Math.floor(stepTicks * 0.9), order: 1, bytes: [0x80, midi, 0] });
      }
      if (mix.bass[s]) {
        const bmidi = sc.bass[Math.floor(s / 2)];
        events.push({ tick, order: 2, bytes: [0x91, bmidi, 84] });
        events.push({ tick: tick + Math.floor(stepTicks * 1.4), order: 1, bytes: [0x81, bmidi, 0] });
      }
    }
  }

  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const track = [];
  let prevTick = 0;
  for (const ev of events) {
    track.push(...vlq(ev.tick - prevTick), ...ev.bytes);
    prevTick = ev.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00); // End of track

  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const header = [
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, // MThd
    0, 0, 0, 1, (ppq >> 8) & 255, ppq & 255, // Format 0, 1 track, 480 PPQ
    0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), // MTrk
  ];
  const bytes = new Uint8Array([...header, ...track]);
  downloadBlob(new Blob([bytes], { type: "audio/midi" }), `pulso-propio-${mix.scale}-${mix.bpm}bpm.mid`);
}

// ==================== 2. EXPORTAR .WAV REAL (OFFLINE AUDIO CONTEXT) ====================
function encodeWav16(audioBuffer) {
  const samples = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const scale = peak > 0.01 ? 0.88 / peak : 1;
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * scale));
    view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buf], { type: "audio/wav" });
}

export async function exportWavFromMix(mix, scales, mute, playVoiceNote, playBassNote, playDrumHit) {
  const OfflineAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const rate = 22050;
  const sc = scales[mix.scale] || Object.values(scales)[0];
  const sixteenth = (60 / mix.bpm) / 4;
  const totalSec = sixteenth * 32 + 0.8;
  const offline = new OfflineAC(1, Math.ceil(totalSec * rate), rate);
  const melVol = 0.08 + (mix.balance / 100) * 0.28;
  const baseVol = 0.34 - (mix.balance / 100) * 0.22;
  const swingRatio = (mix.swing || 0) / 100;

  let cursor = 0.04;
  for (let rep = 0; rep < 2; rep++) {
    for (let s = 0; s < 16; s++) {
      if (mix.melody[s] >= 0 && !mute.melody) {
        playVoiceNote(offline, offline.destination, sc.notes[mix.melody[s]].midi, cursor, mix.timbre, melVol, mix.brightness, mix.echo / 100);
      }
      if (mix.bass[s] && !mute.bass) {
        playBassNote(offline, offline.destination, sc.bass[Math.floor(s / 2)], cursor, baseVol * 0.9);
      }
      if (mix.kick[s] && !mute.drums) {
        playDrumHit(offline, offline.destination, "kick", cursor, baseVol * 1.05);
      }
      if (mix.snare[s] && !mute.drums) {
        playDrumHit(offline, offline.destination, "snare", cursor, baseVol * 0.78);
      }
      cursor += s % 2 === 0 ? sixteenth * (1 + swingRatio * 0.6) : sixteenth * (1 - swingRatio * 0.6);
    }
  }
  const rendered = await offline.startRendering();
  downloadBlob(encodeWav16(rendered), `pulso-propio-${mix.scale}-${mix.bpm}bpm.wav`);
}

// ==================== 3. COMPARADOR A/B CON WAVESURFER.JS (100 % LOCAL) ====================
export function renderWaveSurferComparator(ctx, onCleanup) {
  const card = el("section", "game-card ab-comparator");
  card.append(
    el("p", "eyebrow", "IA asistiva · WaveSurfer.js · 100 % local en tu navegador"),
    el("h2", "", "Comparador A/B de tus propios audios (Stems, Limpieza y Máster)"),
    el(
      "p",
      "game-hint",
      "Más del 70 % de músicos independientes usan IA para separar stems, limpiar ruido vocal o masterizar. Carga tu toma original (A) y tu versión procesada (B) —sin subirlas a ningún servidor—, iguala el volumen percibido y alterna A ↔ B en el mismo segundo exacto."
    )
  );

  // File pickers + instant demo
  const pickers = el("div", "ab-pickers");
  const fileAWrap = el("label", "ab-file-field");
  const fileA = el("input");
  fileA.type = "file";
  fileA.accept = "audio/*";
  fileAWrap.append(el("span", "", "Pista A · Original / Mezcla"), fileA);

  const fileBWrap = el("label", "ab-file-field");
  const fileB = el("input");
  fileB.type = "file";
  fileB.accept = "audio/*";
  fileBWrap.append(el("span", "", "Pista B · Procesada con IA / Máster"), fileB);

  const demoBtn = btn("Cargar demo instantánea (A vs. B)", loadDemo, "button secondary");
  pickers.append(fileAWrap, fileBWrap, demoBtn);

  // WaveSurfer dual visual containers
  const wavesGrid = el("div", "ab-waves");
  const boxA = el("div", "ab-wave-box is-active");
  const lblA = el("div", "ab-wave-head");
  lblA.append(el("strong", "", "PISTA A · ORIGINAL"), el("span", "ab-file-name", "Sin archivo cargado"));
  const hostA = el("div", "ab-wave-host");
  boxA.append(lblA, hostA);

  const boxB = el("div", "ab-wave-box");
  const lblB = el("div", "ab-wave-head");
  lblB.append(el("strong", "", "PISTA B · IA / MÁSTER"), el("span", "ab-file-name", "Sin archivo cargado"));
  const hostB = el("div", "ab-wave-host");
  boxB.append(lblB, hostB);
  wavesGrid.append(boxA, boxB);

  // Live A/B transport + volume matching slider
  const transport = el("div", "ab-transport");
  const playBtn = btn("▶ Reproducir sincronizado", togglePlay, "button");
  const switchA = btn("Escuchar A (Original)", () => setActive("A"), "button secondary");
  const switchB = btn("Escuchar B (Procesada)", () => setActive("B"), "button secondary");
  switchA.setAttribute("aria-pressed", "true");
  switchB.setAttribute("aria-pressed", "false");

  const gainWrap = el("label", "ab-gain-field");
  const gainRow = el("span", "studio-row");
  const gainOut = el("output", "", "0 dB");
  gainRow.append(el("span", "", "Igualar volumen de Pista B (evita sesgo de sonoridad)"), gainOut);
  const gainSlider = el("input");
  gainSlider.type = "range";
  gainSlider.min = "-12";
  gainSlider.max = "6";
  gainSlider.step = "0.5";
  gainSlider.value = "0";
  gainWrap.append(gainRow, gainSlider);

  const logBtn = btn("Guardar conclusión en mi Bitácora", () => {
    const verdict = activeChannel === "A"
      ? "Tras igualar volumen en el Comparador A/B, conservé la Pista A (original) por mejor naturalidad."
      : `Tras igualar volumen (${gainSlider.value} dB) en el Comparador A/B, elegí la Pista B procesada con IA.`;
    ctx.state.bitacora ??= [];
    ctx.state.bitacora.unshift({
      id: "ab-" + Date.now(),
      song: lblA.lastChild.textContent.replace(/\.[^.]+$/, "") || "Comparación A/B",
      status: activeChannel === "A" ? "Descartado" : "Modificado",
      tool: "Comparador A/B WaveSurfer",
      detail: verdict,
      updatedAt: new Date().toLocaleDateString("es-PE"),
    });
    ctx.save();
    status.textContent = "Veredicto guardado en tu Bitácora de Mi Cuaderno.";
    ctx.notify?.("Veredicto A/B guardado en Mi Cuaderno.");
  }, "button secondary");

  const status = el("p", "game-hint", "Carga tus dos archivos o pulsa «Cargar demo instantánea» para probar el cambio A ↔ B en vivo.");
  status.setAttribute("role", "status");

  transport.append(playBtn, switchA, switchB, logBtn);
  card.append(pickers, wavesGrid, transport, gainWrap, status);

  let wsA = null;
  let wsB = null;
  let activeChannel = "A";
  let objectUrls = [];

  function themeWaveColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      wave: cs.getPropertyValue("--line-strong").trim() || "#7b7669",
      prog: cs.getPropertyValue("--accent").trim() || "#9e2f1a",
      cursor: cs.getPropertyValue("--ink").trim() || "#181814",
    };
  }

  function applyVolumes() {
    const db = Number(gainSlider.value);
    gainOut.textContent = (db > 0 ? "+" : "") + db + " dB";
    const gainB = Math.min(1, Math.max(0.05, Math.pow(10, db / 20) * 0.85));
    if (wsA) wsA.setVolume(activeChannel === "A" ? 0.85 : 0);
    if (wsB) wsB.setVolume(activeChannel === "B" ? gainB : 0);
  }

  function setActive(ch) {
    activeChannel = ch;
    boxA.classList.toggle("is-active", ch === "A");
    boxB.classList.toggle("is-active", ch === "B");
    switchA.setAttribute("aria-pressed", String(ch === "A"));
    switchB.setAttribute("aria-pressed", String(ch === "B"));
    applyVolumes();
    status.textContent = ch === "A"
      ? "Escuchando Pista A (Original). Cambia a B en cualquier instante sin perder el compás."
      : "Escuchando Pista B (Procesada / Máster). Baja el volumen hasta igualar A antes de juzgar.";
  }

  function ensureWaves() {
    const c = themeWaveColors();
    if (!wsA) {
      wsA = WaveSurfer.create({ container: hostA, waveColor: c.wave, progressColor: c.prog, cursorColor: c.cursor, height: 64, barWidth: 2, barGap: 2, normalize: false });
      wsA.on("interaction", (t) => { if (wsB && wsB.getDuration()) wsB.setTime(Math.min(t, wsB.getDuration())); });
      wsA.on("finish", () => { playBtn.textContent = "▶ Reproducir sincronizado"; });
    }
    if (!wsB) {
      wsB = WaveSurfer.create({ container: hostB, waveColor: c.wave, progressColor: c.prog, cursorColor: c.cursor, height: 64, barWidth: 2, barGap: 2, normalize: false });
      wsB.on("interaction", (t) => { if (wsA && wsA.getDuration()) wsA.setTime(Math.min(t, wsA.getDuration())); });
    }
  }

  async function loadPair(urlA, nameA, urlB, nameB) {
    ensureWaves();
    lblA.lastChild.textContent = nameA;
    lblB.lastChild.textContent = nameB;
    status.textContent = "Dibujando formas de onda con WaveSurfer.js…";
    await Promise.all([wsA.load(urlA), wsB.load(urlB)]);
    applyVolumes();
    status.textContent = "Listo: pulsa «Reproducir sincronizado» y alterna entre Pista A y Pista B.";
  }

  function loadDemo() {
    loadPair("/assets/surco-abierto.wav", "Surco abierto (Original)", "/assets/silencio-final.wav", "Silencio final (Variante con aire)")
      .catch(() => { status.textContent = "No se pudo cargar la demo."; });
  }

  function togglePlay() {
    if (!wsA || !wsB || !wsA.getDuration()) {
      loadDemo();
      return;
    }
    if (wsA.isPlaying()) {
      wsA.pause();
      wsB.pause();
      playBtn.textContent = "▶ Reproducir sincronizado";
    } else {
      const t = wsA.getCurrentTime();
      if (wsB.getDuration()) wsB.setTime(Math.min(t, wsB.getDuration()));
      applyVolumes();
      wsA.play();
      wsB.play();
      playBtn.textContent = "■ Pausar comparación";
    }
  }

  fileA.addEventListener("change", () => {
    const f = fileA.files?.[0];
    if (!f) return;
    ensureWaves();
    const u = URL.createObjectURL(f);
    objectUrls.push(u);
    lblA.lastChild.textContent = f.name;
    wsA.load(u).then(applyVolumes).catch(() => {});
  });
  fileB.addEventListener("change", () => {
    const f = fileB.files?.[0];
    if (!f) return;
    ensureWaves();
    const u = URL.createObjectURL(f);
    objectUrls.push(u);
    lblB.lastChild.textContent = f.name;
    wsB.load(u).then(applyVolumes).catch(() => {});
  });
  gainSlider.addEventListener("input", applyVolumes);

  const mo = new MutationObserver(() => {
    const c = themeWaveColors();
    wsA?.setOptions?.({ waveColor: c.wave, progressColor: c.prog, cursorColor: c.cursor });
    wsB?.setOptions?.({ waveColor: c.wave, progressColor: c.prog, cursorColor: c.cursor });
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  onCleanup(() => {
    mo.disconnect();
    try { wsA?.destroy(); } catch {}
    try { wsB?.destroy(); } catch {}
    for (const u of objectUrls) URL.revokeObjectURL(u);
  });

  return card;
}

// ==================== 4. TALLER DE LETRAS, SÍLABAS EN ESPAÑOL Y PROMPTS ROCEF ====================
function countSpanishWordSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
  if (!clean) return 0;
  // Normalize qu/gu before e/i so silent 'u' isn't counted as a vowel
  const norm = clean.replace(/([qg])u(?=[eiéí])/g, "$1");
  const groups = norm.match(/[aeiouáéíóúü]+/g);
  if (!groups) return 0;
  const strong = /[aeoáéóíú]/;
  let count = 0;
  for (const g of groups) {
    if (g.length === 1) {
      count += 1;
    } else {
      // Split hiatus (two strong vowels or accented weak vowel next to strong)
      let pieces = 1;
      for (let i = 0; i < g.length - 1; i++) {
        const a = g[i], b = g[i + 1];
        if (strong.test(a) && strong.test(b)) pieces++;
        else if (/[íú]/.test(a) || /[íú]/.test(b)) pieces++;
      }
      count += pieces;
    }
  }
  return Math.max(1, count);
}

function countSpanishLineSyllables(line) {
  const trimmed = line.trim();
  if (!trimmed || /^\[.*\]$/.test(trimmed)) return 0;
  const words = trimmed.split(/\s+/).filter(Boolean);
  let total = 0;
  for (let i = 0; i < words.length; i++) {
    total += countSpanishWordSyllables(words[i]);
    // Basic sinalefa: word ends in vowel and next starts with vowel/h+vowel
    if (i < words.length - 1) {
      const a = words[i].toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
      const b = words[i + 1].toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
      if (/[aeiouáéíóú]$/.test(a) && /^h?[aeiouáéíóú]/.test(b) && !/[áéíóú]$/.test(a)) {
        total = Math.max(1, total - 1);
      }
    }
  }
  return total;
}

const LYRIC_TEMPLATES = {
  huayno: `[Intro: Charango suave y respiración]\n[Verse 1, Voz cálida, Close-mic]\nBajo la lluvia de Huancayo\nVuelve tu nombre en el camino\nGuardo el silencio en mi guitarra\nMientras despierta el aire andino\n\n[Chorus, Coro a dos voces]\nPulso que nace de mi mano\nRitmo que nadie me inventó\nCanta mi voz sobre la cuerda\nLleva mi firma esta canción`,
  indie: `[Intro: Guitarra eléctrica limpia, 94 BPM]\n[Verse 1, Susurrado]\nSe apaga el puente de Barranco\nQueda la niebla en el balcón\nBusco una frase que respire\nAntes que empiece la canción\n\n[Pre-Chorus]\nNo quiero ruido en cada pulso\nQuiero un espacio para hablar\n\n[Chorus, Voz al frente]\nDeja el silencio en el compás\nQue aquí mi voz puede brillar`,
  cumbia: `[Intro: Cajón y bajo eléctrico]\n[Verse 1, Ritmo bailable]\nSale la noche en la avenida\nSuena el tambor en el salón\nTraigo mi letra desde casa\nPara encender el corazón\n\n[Chorus, Coro festivo]\nBaila mi gente hasta el alba\nCon este golpe y esta voz`,
};

const METATAG_CHIPS = [
  "[Intro]",
  "[Verse 1, Close-mic]",
  "[Pre-Chorus]",
  "[Chorus, Harmonized]",
  "[Bridge]",
  "[Instrumental Break]",
  "[Voz femenina cálida]",
  "[Voz masculina rasposa]",
  "[Susurrado]",
  "[Outro, Fade Out]",
];

export function renderLyricsPromptWorkshop(ctx) {
  const layout = el("div", "lyrics-layout");

  // Left: Lyric & Syllable Cadence Editor
  const left = el("section", "game-card lyrics-editor-card");
  left.append(
    el("p", "eyebrow", "Etapa 01 · Idear letras y dirección vocal"),
    el("h2", "", "Editor de versos, sílabas y metatags"),
    el("p", "game-hint", "Escribe tu letra propia y comprueba el conteo de sílabas (con sinalefas en español) para que ni un cantante humano ni herramientas como Suno, Udio o Synthesizer V rompan el pulso.")
  );

  const tplBar = el("div", "lyrics-bar");
  tplBar.append(el("span", "eyebrow", "Plantillas:"));
  for (const [k, label] of [["huayno", "Huayno contemporáneo"], ["indie", "Indie limeño"], ["cumbia", "Cumbia urbana"]]) {
    tplBar.append(btn(label, () => { textarea.value = LYRIC_TEMPLATES[k]; analyze(); }, "lyrics-mini-btn"));
  }

  const tagBar = el("div", "lyrics-bar");
  tagBar.append(el("span", "eyebrow", "Insertar metatag:"));
  for (const tag of METATAG_CHIPS) {
    tagBar.append(btn(tag, () => {
      const start = textarea.selectionStart ?? textarea.value.length;
      const prefix = start > 0 && textarea.value[start - 1] !== "\n" ? "\n" : "";
      textarea.value = textarea.value.slice(0, start) + prefix + tag + "\n" + textarea.value.slice(start);
      analyze();
      textarea.focus();
    }, "lyrics-tag-btn"));
  }

  const fieldLabel = el("label", "lyrics-field");
  fieldLabel.append(el("span", "", "Tu letra con etiquetas de estructura [ ]"));
  const textarea = el("textarea");
  textarea.rows = 11;
  textarea.value = LYRIC_TEMPLATES.indie;
  fieldLabel.append(textarea);

  const meterBox = el("div", "lyrics-meter");
  const meterSummary = el("p", "lyrics-meter-summary", "");
  const meterLines = el("div", "lyrics-lines");
  meterLines.tabIndex = 0;
  meterLines.setAttribute("role", "region");
  meterLines.setAttribute("aria-label", "Conteo de sílabas por verso");
  meterLines.setAttribute("data-lenis-prevent", "");
  meterBox.append(meterSummary, meterLines);

  left.append(tplBar, tagBar, fieldLabel, meterBox);

  // Right: ROCEF + Production Style Prompt Builder
  const right = el("aside", "game-card lyrics-prompt-card");
  right.append(
    el("p", "eyebrow", "Constructor de Prompt ROCEF · Suno / Udio / Ollama"),
    el("h2", "", "Brief profesional listo para copiar"),
    el("p", "game-hint", "Regla de estudio: usa solo 2 o 3 instrumentos principales para que la IA no sature la mezcla y especifica siempre la dirección vocal.")
  );

  function selectField(labelText, options) {
    const wrap = el("label", "studio-field");
    const sel = el("select");
    for (const opt of options) sel.append(new Option(opt, opt));
    wrap.append(el("span", "", labelText), sel);
    sel.addEventListener("change", buildPrompt);
    return { wrap, sel };
  }

  const goal = selectField("Objetivo del encargo", [
    "Maqueta cantada (Suno / Udio con mis metatags)",
    "Lluvia de ideas / destrabar rimas (Ollama / LLM)",
    "Guía vocal editable nota por nota (Synthesizer V)",
    "Solo referencia instrumental (sin voz, para cantar yo)",
  ]);
  const genre = selectField("Género musical", [
    "Indie folk peruano contemporáneo",
    "Huayno fusión andino moderno",
    "Cumbia limeña urbana",
    "Pop alternativo acústico",
    "Rock independiente noventero",
  ]);
  const mood = selectField("Clima emocional", [
    "Nostálgico y cálido, con aire y silencios",
    "Luminoso, bailable y orgánico",
    "Íntimo, cercano a micrófono (close-mic)",
    "Enérgico, con contraste entre verso suave y coro fuerte",
  ]);
  const instruments = selectField("2–3 instrumentos principales (sin saturar)", [
    "Guitarra acústica, bajo suave y cajón peruano",
    "Charango, guitarra eléctrica limpia y percusión seca",
    "Piano eléctrico cálido, bajo sub y batería minimalista",
    "Guitarra eléctrica jangly, bajo melódico y batería acústica",
  ]);
  const vocal = selectField("Dirección de voz", [
    "Voz femenina cálida en español peruano, dicción natural",
    "Voz masculina expresiva, leve rasgado en el coro",
    "Voz susurrada en verso + coro armonizado a dos voces",
    "Sin voz generada (instrumental con espacio libre en medios para mi voz real)",
  ]);

  const bpmWrap = el("label", "studio-field");
  const bpmRow = el("span", "studio-row");
  const bpmOut = el("output", "", "94 BPM");
  bpmRow.append(el("span", "", "Tempo objetivo"), bpmOut);
  const bpmInput = el("input");
  bpmInput.type = "range";
  bpmInput.min = "70";
  bpmInput.max = "136";
  bpmInput.step = "2";
  bpmInput.value = "94";
  bpmInput.addEventListener("input", () => { bpmOut.textContent = bpmInput.value + " BPM"; buildPrompt(); });
  bpmWrap.append(bpmRow, bpmInput);

  const outputLabel = el("label", "lyrics-field");
  outputLabel.append(el("span", "", "Prompt generado (ROCEF + Estilo + Metatags)"));
  const promptOut = el("textarea", "lyrics-prompt-out");
  promptOut.rows = 10;
  promptOut.readOnly = true;
  outputLabel.append(promptOut);

  const outStatus = el("p", "game-hint", "");
  outStatus.setAttribute("role", "status");

  const copyBtn = btn("Copiar prompt completo", async () => {
    try {
      await navigator.clipboard.writeText(promptOut.value);
      outStatus.textContent = "Prompt copiado al portapapeles. Pégalo en Suno, Udio u Ollama.";
    } catch {
      promptOut.select();
      outStatus.textContent = "Texto seleccionado: presiona Ctrl + C para copiar.";
    }
  }, "button");

  const saveLogBtn = btn("Guardar en Bitácora", () => {
    ctx.state.bitacora ??= [];
    ctx.state.bitacora.unshift({
      id: "pr-" + Date.now(),
      song: genre.sel.value,
      status: "Elegido",
      tool: goal.sel.value,
      detail: `Prompt ROCEF (${bpmInput.value} BPM · ${instruments.sel.value}) + estructura propia verificada en sílabas.`,
      updatedAt: new Date().toLocaleDateString("es-PE"),
    });
    ctx.save();
    outStatus.textContent = "Prompt registrado en tu Bitácora de Mi Cuaderno.";
    ctx.notify?.("Prompt guardado en Mi Cuaderno.");
  }, "button secondary");

  const actions = el("div", "game-actions");
  actions.append(copyBtn, saveLogBtn);

  right.append(goal.wrap, genre.wrap, mood.wrap, instruments.wrap, vocal.wrap, bpmWrap, outputLabel, actions, outStatus);

  function buildPrompt() {
    const styleLine = `${genre.sel.value}, ${mood.sel.value}, ${instruments.sel.value}, ${bpmInput.value} BPM, ${vocal.sel.value}, mezcla limpia con espacio y dinámica natural.`;
    if (goal.sel.value.includes("Ollama")) {
      promptOut.value = `ROL: Asistente de composición lírica en español peruano.\nOBJETIVO: Propón 3 alternativas de cierre para los versos de abajo conservando el mismo número de sílabas y acento natural.\nCONTEXTO: ${styleLine}\nRESTRICCIÓN: Evita clichés genéricos; conserva mis imágenes originales.\n\nBORRADOR:\n${textarea.value.trim()}`;
    } else {
      promptOut.value = `=== STYLE / ESTILO ===\n${styleLine}\n\n=== LYRICS & METATAGS ===\n${textarea.value.trim()}`;
    }
  }

  function analyze() {
    const rawLines = textarea.value.split("\n");
    meterLines.replaceChildren();
    const counts = [];
    for (const line of rawLines) {
      const t = line.trim();
      if (!t) continue;
      if (/^\[.*\]$/.test(t)) {
        meterLines.append(el("div", "lyrics-line-tag", t));
        continue;
      }
      const syl = countSpanishLineSyllables(t);
      counts.push(syl);
    }
    const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    let unbalanced = 0;
    let idx = 0;
    for (const line of rawLines) {
      const t = line.trim();
      if (!t || /^\[.*\]$/.test(t)) continue;
      const syl = counts[idx++];
      const diff = Math.abs(syl - avg);
      const warn = counts.length >= 2 && (diff >= 4 || syl > 14);
      if (warn) unbalanced++;
      const row = el("div", "lyrics-line-row" + (warn ? " is-warn" : ""));
      row.append(
        el("span", "lyrics-syl-badge", `${syl} síl.`),
        el("span", "lyrics-line-txt", t)
      );
      meterLines.append(row);
    }
    meterSummary.textContent = counts.length
      ? `Promedio: ${avg.toFixed(1)} sílabas por verso · ${unbalanced === 0 ? "Ritmo equilibrado y cantable ✓" : `${unbalanced} verso(s) largo(s) o desbalanceado(s): acorta para no tropezar al cantar.`}`
      : "Escribe tus versos arriba para analizar las sílabas en tiempo real.";
    buildPrompt();
  }

  textarea.addEventListener("input", analyze);
  analyze();

  layout.append(left, right);
  return layout;
}
