import { films } from "./media/films.js";
import { lessons } from "./curriculum.js";
import Plyr from "./vendor/plyr.min.mjs";
import {
  exportMidiFromMix,
  exportWavFromMix,
  renderWaveSurferComparator,
  renderLyricsPromptWorkshop,
} from "./lab-tools.js";

// ==================== DATA: MINI-DAW 16-STEP MULTITRACK ====================
const SCALES = {
  menor: {
    label: "La menor (Estudio)",
    notes: [
      { midi: 72, name: "Do5" },
      { midi: 69, name: "La4" },
      { midi: 67, name: "Sol4" },
      { midi: 64, name: "Mi4" },
      { midi: 62, name: "Re4" },
      { midi: 57, name: "La3" },
    ],
    bass: [45, 45, 48, 48, 43, 43, 45, 45],
  },
  andino: {
    label: "Huayno pentatónico",
    notes: [
      { midi: 72, name: "Do5" },
      { midi: 69, name: "La4" },
      { midi: 67, name: "Sol4" },
      { midi: 64, name: "Mi4" },
      { midi: 62, name: "Re4" },
      { midi: 60, name: "Do4" },
    ],
    bass: [45, 48, 45, 43, 45, 48, 43, 45],
  },
  cumbia: {
    label: "Cumbia limeña",
    notes: [
      { midi: 72, name: "Do5" },
      { midi: 70, name: "Sib4" },
      { midi: 67, name: "Sol4" },
      { midi: 65, name: "Fa4" },
      { midi: 63, name: "Mib4" },
      { midi: 60, name: "Do4" },
    ],
    bass: [48, 48, 43, 43, 46, 46, 48, 48],
  },
  dorica: {
    label: "Dórica urbana",
    notes: [
      { midi: 74, name: "Re5" },
      { midi: 72, name: "Do5" },
      { midi: 69, name: "La4" },
      { midi: 67, name: "Sol4" },
      { midi: 65, name: "Fa4" },
      { midi: 62, name: "Re4" },
    ],
    bass: [50, 50, 48, 48, 45, 45, 50, 50],
  },
};

const TIMBRES = {
  pluck: "Cuerda pulsada",
  keys: "Tecla sostenida",
  bell: "Campana suave",
  synth: "Sinte cálido",
};

// Saturated AI loop (16 steps, no rests, cluttered percussion)
const AI_SATURATED_PATTERN = {
  scale: "menor",
  bpm: 108,
  timbre: "pluck",
  balance: 42,
  brightness: 6800,
  swing: 0,
  echo: 10,
  melody: [3, 2, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 4],
  bass:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  kick:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  snare:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
};

const DAW_PRESETS = [
  {
    id: "andino",
    label: "Respiro andino",
    data: {
      scale: "andino",
      bpm: 94,
      timbre: "keys",
      balance: 68,
      brightness: 4200,
      swing: 12,
      echo: 28,
      melody: [3, -1, 2, 1, -1, 0, 1, 2, 3, -1, 4, 3, -1, -1, 5, -1],
      bass:   [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      kick:   [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      snare:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    },
  },
  {
    id: "cumbia",
    label: "Cumbia con aire",
    data: {
      scale: "cumbia",
      bpm: 98,
      timbre: "pluck",
      balance: 64,
      brightness: 5200,
      swing: 16,
      echo: 20,
      melody: [5, -1, 4, -1, 2, 1, 2, -1, 3, -1, 4, -1, 5, -1, -1, -1],
      bass:   [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
      kick:   [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare:  [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0],
    },
  },
  {
    id: "nocturno",
    label: "Sinte nocturno",
    data: {
      scale: "dorica",
      bpm: 86,
      timbre: "synth",
      balance: 74,
      brightness: 2600,
      swing: 10,
      echo: 42,
      melody: [2, -1, -1, 1, 0, -1, 2, -1, 3, -1, 4, -1, 5, -1, -1, -1],
      bass:   [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      kick:   [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    },
  },
  {
    id: "ia",
    label: "Loop IA saturado",
    data: AI_SATURATED_PATTERN,
  },
];

// ==================== DATA: GAME 02 (OÍDO A CIEGAS ARCADE) ====================
const BLIND_MISSIONS = [
  {
    tag: "Misión 01 · Espacio y silencio",
    prompt: "Escucha Toma A y Toma B. ¿Cuál deja respirar el compás final con silencio antes de volver a empezar?",
    a: { scale: "andino", bpm: 94, timbre: "pluck", balance: 68, brightness: 4600, melody: [3, 2, 1, 0, 1, 2, 3, 4], drums: false },
    b: { scale: "andino", bpm: 94, timbre: "pluck", balance: 68, brightness: 4600, melody: [3, 2, 1, 0, 1, 2, -1, -1], drums: false },
    answer: "B",
    explanation: "Toma B corta los dos últimos pulsos y abre aire para la voz o un cambio de sección, evitando el relleno constante.",
    lesson: "identidad",
  },
  {
    tag: "Misión 02 · Balance de mezcla",
    prompt: "¿En cuál de las dos tomas la melodía se escucha clara al frente sin ser tapada por la percusión?",
    a: { scale: "cumbia", bpm: 98, timbre: "keys", balance: 24, brightness: 4400, melody: [5, -1, 4, 2, 1, 2, 3, -1], drums: true },
    b: { scale: "cumbia", bpm: 98, timbre: "keys", balance: 78, brightness: 4400, melody: [5, -1, 4, 2, 1, 2, 3, -1], drums: true },
    answer: "B",
    explanation: "Toma B reduce el peso de la percusión para abrir espacio al motivo melódico sin tener que subir el volumen maestro.",
    lesson: "mezcla",
  },
  {
    tag: "Misión 03 · Timbre y carácter",
    prompt: "Mismas notas y mismo tempo. ¿Qué toma usa un timbre de ataque corto y percusivo (cuerda pulsada)?",
    a: { scale: "menor", bpm: 96, timbre: "pluck", balance: 70, brightness: 5000, melody: [3, 2, 1, 2, 3, 4, 5, -1], drums: false },
    b: { scale: "menor", bpm: 96, timbre: "keys", balance: 70, brightness: 5000, melody: [3, 2, 1, 2, 3, 4, 5, -1], drums: false },
    answer: "A",
    explanation: "Toma A ataca rápido y cae pronto, creando huecos rítmicos entre notas; Toma B sostiene el sonido hasta el pulso siguiente.",
    lesson: "arreglos",
  },
  {
    tag: "Misión 04 · Filtro y brillo",
    prompt: "Compara el color de ambas tomas. ¿Cuál mantiene un filtro cálido (más suave en agudos) en lugar de un brillo agresivo?",
    a: { scale: "dorica", bpm: 88, timbre: "synth", balance: 72, brightness: 1350, melody: [2, -1, 1, 0, 2, -1, 3, 5], drums: true },
    b: { scale: "dorica", bpm: 88, timbre: "synth", balance: 72, brightness: 8600, melody: [2, -1, 1, 0, 2, -1, 3, 5], drums: true },
    answer: "A",
    explanation: "El filtro pasabajos a 1.35 kHz en Toma A controla armónicos agudos para dejar sitio a las consonantes de la voz humana.",
    lesson: "produccion",
  },
  {
    tag: "Misión 05 · Energía y tempo",
    prompt: "La misma frase andina en dos pulsos distintos. ¿Cuál acelera el tempo para generar un carácter bailable?",
    a: { scale: "andino", bpm: 74, timbre: "bell", balance: 68, brightness: 4600, melody: [3, 2, 1, 0, 1, 2, -1, 4], drums: true },
    b: { scale: "andino", bpm: 118, timbre: "bell", balance: 68, brightness: 4600, melody: [3, 2, 1, 0, 1, 2, -1, 4], drums: true },
    answer: "B",
    explanation: "Cambiar solo de 74 a 118 BPM transforma la intención emocional de una misma melodía antes de tocar un solo plugin.",
    lesson: "introduccion",
  },
];

// ==================== DATA: GAME 03 (INSPECTOR DE ESTRENOS · PAPERS PLEASE) ====================
const INSPECTOR_CASES = [
  {
    code: "EXP-01",
    release: "«Noche en Miraflores» · Sencillo Indie",
    artist: "Dúo Costa Sur",
    docs: [
      { id: "audio", label: "Informe de Audio y Voz", tag: "PISTA VOCAL", text: "Voz principal clonada entrenando un modelo RVC con una grabación de ensayo de una exintegrante de la banda." },
      { id: "plan", label: "Comprobante de Herramienta", tag: "SOFTWARE", text: "Modelo open-source local (RVC). Sin pagos de suscripción; el audio fue procesado en computadora propia." },
      { id: "permiso", label: "Carpeta de Permisos", tag: "AUTORIZACIÓN", text: "NO CONSTA autorización escrita ni verbal de la cantante original. El dúo sostiene que «la letra es nuestra»." },
    ],
    answer: "bloquear",
    stampLabel: "BLOQUEADO",
    verdict: "Riesgo legal alto (Art. 15 Código Civil y Ley 28131): escribir la letra no da permiso para usar la voz ni la interpretación de otra persona sin consentimiento expreso.",
    penalty: "Alerta de reclamo: la cantante solicitó retiro inmediato (takedown) por uso no autorizado de su voz.",
  },
  {
    code: "EXP-02",
    release: "«Puente de Piedra» · Huayno Fusión",
    artist: "Colectivo Sierra Viva",
    docs: [
      { id: "audio", label: "Informe de Audio y Voz", tag: "GRABACIÓN", text: "Guitarras, charango, cajón y voz principal grabados en vivo por la banda. Se descartó el audio guía inicial." },
      { id: "plan", label: "Comprobante de Herramienta", tag: "APOYO IA", text: "AIVA usado únicamente para explorar 4 acordes MIDI de referencia; la banda modificó el puente y el ritmo final." },
      { id: "permiso", label: "Carpeta de Permisos", tag: "CRÉDITOS", text: "Todos los músicos firmaron reparto de créditos y el equipo anotó en su ficha PDF el apoyo MIDI en preproducción." },
    ],
    answer: "aprobar",
    stampLabel: "APROBADO",
    verdict: "Estreno sólido y transparente: la obra publicada tiene contribución creativa e interpretación humana verificable y créditos documentados.",
    penalty: "Frenaste un lanzamiento limpio: la banda regrabó todo en vivo y documentó su apoyo MIDI con honestidad.",
  },
  {
    code: "EXP-03",
    release: "«Mix Huaylarsh Viral 2026» · Remix",
    artist: "DJ Pulso Nocturno",
    docs: [
      { id: "audio", label: "Informe de Audio y Voz", tag: "STEMS", text: "Voz extraída con Moises desde un video de YouTube de una intérprete peruana reconocida de huaylarsh." },
      { id: "plan", label: "Comprobante de Herramienta", tag: "PLAN DE PAGO", text: "Suscripción Moises Pro activa (US$ 9.99/mes) usada para separar la voz del fonograma original." },
      { id: "permiso", label: "Carpeta de Permisos", tag: "DERECHOS", text: "Sin licencia del sello ni permiso de la intérprete. El DJ planea monetizar el remix en Spotify y YouTube." },
    ],
    answer: "bloquear",
    stampLabel: "BLOQUEADO",
    verdict: "Pagar una herramienta de separación (Moises Pro) NO te otorga derechos sobre una grabación ajena. Requiere autorización de titulares o grabar una voz propia.",
    penalty: "Sanción por infracción fonográfica: Content ID bloqueó la monetización y el distribuidor suspendió el estreno.",
  },
  {
    code: "EXP-04",
    release: "«Brisa del Sur» · Instrumental Lo-Fi",
    artist: "Mateo R. (Solista)",
    docs: [
      { id: "audio", label: "Informe de Audio y Voz", tag: "BASE SONORA", text: "Base instrumental completa generada el 12 de agosto en Suno + guitarra acústica grabada encima por Mateo." },
      { id: "plan", label: "Comprobante de Herramienta", tag: "CONTRADICCIÓN", text: "El 12 de agosto Mateo tenía PLAN GRATUITO (no comercial). Recién pagó Suno Pro el 20 de octubre." },
      { id: "permiso", label: "Carpeta de Permisos", tag: "TÉRMINOS", text: "Mateo aún no confirmó si la pista vieja tiene derechos comerciales retroactivos ni ha regrabado la base." },
    ],
    answer: "retener",
    stampLabel: "RETENIDO",
    verdict: "Detente a revisar: en muchos servicios cuenta el plan vigente en la FECHA de generación. Conviene retener el estreno y regrabar la base o regenerar bajo plan comercial vigente.",
    penalty: "No detectaste la contradicción de fechas en la boleta: la pista fue generada bajo un plan gratuito no comercial.",
  },
  {
    code: "EXP-05",
    release: "«Cumbia de la Esquina» · Sencillo",
    artist: "Orquesta Barrio Nuevo",
    docs: [
      { id: "audio", label: "Informe de Audio y Voz", tag: "SAMPLES", text: "Voz y bajo grabados en estudio; incorpora un loop de congas descargado de Freesound bajo licencia CC BY 4.0." },
      { id: "plan", label: "Comprobante de Herramienta", tag: "MASTERING", text: "BandLab Mastering gratuito (perfil Clarity) sobre mezcla propia. Sin voces ni composiciones sintéticas." },
      { id: "permiso", label: "Carpeta de Permisos", tag: "ATRIBUCIÓN", text: "Enlace original de Freesound guardado, licencia CC BY 4.0 verificada y crédito del percusionista listo en descripción." },
    ],
    answer: "aprobar",
    stampLabel: "APROBADO",
    verdict: "Cumple todas las reglas: CC BY 4.0 autoriza uso comercial siempre que acredites al autor e indiques cambios, y el master actúa sobre tu propia mezcla.",
    penalty: "Retuviste o bloqueaste un estreno que cumplía perfectamente la licencia CC BY 4.0 y los créditos.",
  },
  {
    code: "EXP-06",
    release: "«Sabor Virtual» · Maqueta de Coros",
    artist: "Valeria & Estudio Lima",
    docs: [
      { id: "audio", label: "Informe de Audio y Voz", tag: "COROS IA", text: "Voz principal cantada por Valeria; coros de fondo creados nota por nota en Synthesizer V con banco comercial licenciado." },
      { id: "plan", label: "Comprobante de Herramienta", tag: "LICENCIA", text: "Licencia perpetua de Synthesizer V + banco vocal con derechos comerciales pagados y recibo guardado." },
      { id: "permiso", label: "Carpeta de Permisos", tag: "DECLARACIÓN", text: "Falta completar el texto de créditos públicos: aún figura como «Coros humanos por estudio invitado» (dato inexacto)." },
    ],
    answer: "retener",
    stampLabel: "RETENIDO",
    verdict: "Las licencias están en orden, pero la declaración pública es engañosa: hay que retener hasta corregir el crédito e indicar que los coros fueron sintetizados con Synthesizer V.",
    penalty: "Dejaste pasar un crédito falso («coros humanos») cuando en realidad los coros fueron sintetizados.",
  },
];

// ==================== DATA: GAME 04 (MESA DE CRÉDITOS · DRAG & DROP) ====================
const CREDIT_BOARDS = [
  {
    id: "barranco",
    title: "Lluvia en Barranco",
    genre: "Indie Folk · Lima",
    diary: [
      "Ana escribió la letra completa en su cuaderno y cantó la voz definitiva en estudio casero.",
      "Pidió a Suno (Plan Pro) una maqueta armónica de referencia, luego su banda regrabó guitarra y cajón.",
      "Pasaron la mezcla estéreo por BandLab Mastering (perfil Clarity) como pulido final.",
    ],
    motif: { scale: "menor", bpm: 92, timbre: "keys", melody: [3, -1, 2, 1, 2, -1, 4, -1] },
    channels: [
      { id: "letra", label: "01 · Letra", expected: "human-lyrics" },
      { id: "melodia", label: "02 · Arreglo / Instrumentos", expected: "hybrid-regrabado" },
      { id: "voz", label: "03 · Voz principal", expected: "human-voice" },
      { id: "master", label: "04 · Masterización", expected: "ai-master" },
    ],
    chips: [
      { id: "human-lyrics", tag: "HUMANO", text: "Letra escrita por Ana", okFor: "letra", why: "Verificable con sus borradores fechados." },
      { id: "hybrid-regrabado", tag: "HÍBRIDO", text: "Maqueta IA (Suno Pro) regrabada por banda", okFor: "melodia", why: "Distingue la referencia IA del audio final regrabado." },
      { id: "human-voice", tag: "HUMANO", text: "Voz grabada por Ana en estudio", okFor: "voz", why: "La interpretación final es 100 % humana." },
      { id: "ai-master", tag: "IA ASISTIVA", text: "Master asistido con BandLab (Clarity)", okFor: "master", why: "Declara el rol exacto y acotado de la IA en el cierre." },
      { id: "trap-all-human", tag: "TRAMPA", text: "100 % orgánico sin software de IA", okFor: null, why: "Oculta la referencia de Suno y el master asistido." },
      { id: "trap-all-ai", tag: "TRAMPA", text: "Canción creada completamente por IA", okFor: null, why: "Borra la autoría de la letra, la voz y las guitarras grabadas." },
    ],
  },
  {
    id: "huaylas",
    title: "Eco del Mantaro",
    genre: "Huayno Electrónico · Junín",
    diary: [
      "Letra popular tradicional adaptada por Diego, quien además programó el charango MIDI y el bajo.",
      "Los coros de respaldo fueron editados nota por nota en Synthesizer V (licencia comercial).",
      "La mezcla y masterización final fueron hechas manualmente por Diego en su DAW.",
    ],
    motif: { scale: "andino", bpm: 102, timbre: "pluck", melody: [3, 2, 1, 0, 1, -1, 3, -1] },
    channels: [
      { id: "letra", label: "01 · Letra", expected: "trad-adapt" },
      { id: "melodia", label: "02 · Arreglo / Instrumentos", expected: "human-daw" },
      { id: "voz", label: "03 · Coros / Voces", expected: "synthv-choir" },
      { id: "master", label: "04 · Mezcla y Master", expected: "human-mix" },
    ],
    chips: [
      { id: "trad-adapt", tag: "HUMANO", text: "Adaptación de copla tradicional por Diego", okFor: "letra", why: "Respeta el origen tradicional y precisa la adaptación." },
      { id: "human-daw", tag: "HUMANO", text: "Arreglo y programación MIDI por Diego", okFor: "melodia", why: "Trabajo compositivo hecho directamente por el productor." },
      { id: "synthv-choir", tag: "IA VOCAL", text: "Coros sintetizados en Synthesizer V (licenciado)", okFor: "voz", why: "Informa con transparencia el banco vocal y su licencia." },
      { id: "human-mix", tag: "HUMANO", text: "Mezcla y master manual en DAW", okFor: "master", why: "Proceso técnico ejecutado sin masterización automática." },
      { id: "trap-invitado", tag: "TRAMPA", text: "Coros cantados por invitados en vivo", okFor: null, why: "Engaña al oyente presentando síntesis vocal como coro en vivo." },
      { id: "trap-generica", tag: "TRAMPA", text: "Hecho con apoyo tecnológico moderno", okFor: null, why: "Demasiado vago: no aclara en qué pista intervino la IA." },
    ],
  },
  {
    id: "cumbia-demo",
    title: "Cumbia de Medianoche",
    genre: "Cumbia Urbana · Callao",
    diary: [
      "Mateo usó Ollama (modelo local) para destrabar 3 rimas y reescribió la letra final a su estilo.",
      "Tarareó el riff principal, lo pasó a MIDI con Basic Pitch y grabó guitarra eléctrica encima.",
      "Cantó él mismo la voz principal y limpió ruido de cuarto con Lalal.ai (plan comercial).",
    ],
    motif: { scale: "cumbia", bpm: 98, timbre: "bell", melody: [5, -1, 4, 2, 1, 2, 3, -1] },
    channels: [
      { id: "letra", label: "01 · Letra", expected: "lyrics-assisted" },
      { id: "melodia", label: "02 · Riff / Guitarra", expected: "basic-pitch" },
      { id: "voz", label: "03 · Voz principal", expected: "voice-cleaned" },
      { id: "master", label: "04 · Criterio final", expected: "human-edit" },
    ],
    chips: [
      { id: "lyrics-assisted", tag: "HÍBRIDO", text: "Letra de Mateo (lluvia de rimas con Ollama local)", okFor: "letra", why: "Reconoce el apoyo de borrador y la reescritura humana." },
      { id: "basic-pitch", tag: "HÍBRIDO", text: "Tarareo pasado a MIDI (Basic Pitch) + guitarra real", okFor: "melodia", why: "Acredita la transcripción MIDI y la ejecución humana." },
      { id: "voice-cleaned", tag: "IA ASISTIVA", text: "Voz de Mateo limpiada de ruido con Lalal.ai", okFor: "voz", why: "Aclara que la voz es humana y la IA solo limpió ruido." },
      { id: "human-edit", tag: "HUMANO", text: "Dirección, mezcla y selección final por Mateo", okFor: "master", why: "Refleja la curaduría y cierre del productor." },
      { id: "trap-clone", tag: "TRAMPA", text: "Voz clonada con inteligencia artificial", okFor: null, why: "Falso: limpiar ruido de sala no convierte tu voz en un clon IA." },
      { id: "trap-secret", tag: "TRAMPA", text: "Sin mención de herramientas para evitar críticas", okFor: null, why: "Ocultar herramientas asistivas daña la transparencia del proyecto." },
    ],
  },
];

// ==================== SHARED DOM & WEB AUDIO HELPERS ====================
function el(tag, css, text) {
  const node = document.createElement(tag);
  if (css) node.className = css;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(label, href, css) {
  const a = el("a", css, label);
  a.href = href;
  return a;
}

function button(label, onClick, css) {
  const b = el("button", css, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function header(kicker, title, intro) {
  const head = el("header", "studio-head");
  head.append(el("p", "eyebrow", kicker), el("h1", "", title), el("p", "studio-intro", intro));
  return head;
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playSfx(shared, kind) {
  shared.ensureEngine().then((engine) => {
    const now = engine.currentTime + 0.01;
    const gain = engine.createGain();
    gain.connect(shared.analyser);
    if (kind === "paper") {
      const len = Math.floor(engine.sampleRate * 0.07);
      const buf = engine.createBuffer(1, len, engine.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = engine.createBufferSource();
      const filter = engine.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      src.buffer = buf;
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      src.connect(filter).connect(gain);
      src.start(now);
      return;
    }
    if (kind === "stamp") {
      const osc = engine.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.11);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }
    const notes = kind === "ok" ? [523.25, 659.25, 783.99] : kind === "bad" ? [280, 210] : [440, 554.37];
    notes.forEach((hz, i) => {
      const osc = engine.createOscillator();
      const g = engine.createGain();
      osc.type = kind === "bad" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(hz, now + i * 0.075);
      g.gain.setValueAtTime(0.001, now + i * 0.075);
      g.gain.linearRampToValueAtTime(0.14, now + i * 0.075 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.075 + 0.22);
      osc.connect(g).connect(shared.analyser);
      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.24);
    });
  }).catch(() => {});
}

function playVoiceNote(engine, dest, midi, time, timbre, gainLevel, cutoff = 4800, echoAmt = 0) {
  const osc = engine.createOscillator();
  const filter = engine.createBiquadFilter();
  const env = engine.createGain();
  const hz = midiToHz(midi);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, time);

  if (timbre === "pluck") {
    osc.type = "triangle";
    env.gain.setValueAtTime(0.0008, time);
    env.gain.linearRampToValueAtTime(gainLevel, time + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0008, time + 0.26);
    osc.frequency.setValueAtTime(hz, time);
    osc.connect(filter).connect(env).connect(dest);
    osc.start(time);
    osc.stop(time + 0.29);
  } else if (timbre === "keys") {
    osc.type = "sine";
    const overtone = engine.createOscillator();
    const overGain = engine.createGain();
    overtone.type = "triangle";
    overtone.frequency.setValueAtTime(hz * 2, time);
    overGain.gain.value = 0.22;
    env.gain.setValueAtTime(0.0008, time);
    env.gain.linearRampToValueAtTime(gainLevel * 0.9, time + 0.035);
    env.gain.exponentialRampToValueAtTime(0.0008, time + 0.44);
    osc.frequency.setValueAtTime(hz, time);
    osc.connect(filter);
    overtone.connect(overGain).connect(filter);
    filter.connect(env).connect(dest);
    osc.start(time);
    overtone.start(time);
    osc.stop(time + 0.47);
    overtone.stop(time + 0.47);
  } else if (timbre === "bell") {
    osc.type = "sine";
    const mod = engine.createOscillator();
    const modGain = engine.createGain();
    mod.type = "sine";
    mod.frequency.setValueAtTime(hz * 2.756, time);
    modGain.gain.setValueAtTime(hz * 0.45, time);
    modGain.gain.exponentialRampToValueAtTime(1, time + 0.34);
    mod.connect(modGain).connect(osc.frequency);
    osc.frequency.setValueAtTime(hz, time);
    env.gain.setValueAtTime(0.0008, time);
    env.gain.linearRampToValueAtTime(gainLevel * 0.85, time + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0008, time + 0.48);
    osc.connect(filter).connect(env).connect(dest);
    osc.start(time);
    mod.start(time);
    osc.stop(time + 0.5);
    mod.stop(time + 0.5);
  } else {
    osc.type = "sawtooth";
    filter.frequency.setValueAtTime(Math.min(cutoff, 2800), time);
    env.gain.setValueAtTime(0.0008, time);
    env.gain.linearRampToValueAtTime(gainLevel * 0.65, time + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0008, time + 0.38);
    osc.frequency.setValueAtTime(hz, time);
    osc.connect(filter).connect(env).connect(dest);
    osc.start(time);
    osc.stop(time + 0.41);
  }

  if (echoAmt > 0.04) {
    const delay = engine.createDelay(0.6);
    const wet = engine.createGain();
    delay.delayTime.value = 0.24;
    wet.gain.value = echoAmt * 0.42;
    env.connect(delay).connect(wet).connect(dest);
  }
}

function playBassNote(engine, dest, midi, time, gainLevel) {
  const osc = engine.createOscillator();
  const filter = engine.createBiquadFilter();
  const env = engine.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(midiToHz(midi), time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(340, time);
  env.gain.setValueAtTime(0.001, time);
  env.gain.linearRampToValueAtTime(gainLevel, time + 0.015);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  osc.connect(filter).connect(env).connect(dest);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playDrumHit(engine, dest, kind, time, gainLevel) {
  const env = engine.createGain();
  if (kind === "kick") {
    const osc = engine.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(128, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
    env.gain.setValueAtTime(gainLevel, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(env).connect(dest);
    osc.start(time);
    osc.stop(time + 0.2);
  } else {
    const len = Math.floor(engine.sampleRate * 0.09);
    const buf = engine.createBuffer(1, len, engine.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
    const noise = engine.createBufferSource();
    noise.buffer = buf;
    const bp = engine.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1650, time);
    env.gain.setValueAtTime(gainLevel * 0.85, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.095);
    noise.connect(bp).connect(env).connect(dest);
    noise.start(time);
    noise.stop(time + 0.1);
  }
}

function mountSpectrumCanvas(canvas, shared, isPlayingRef) {
  const c2d = canvas.getContext("2d");
  let rafId = 0;
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      bg: cs.getPropertyValue("--deck-surface").trim() || "#25342c",
      bar: cs.getPropertyValue("--deck-lime").trim() || "#dbe8a8",
      accent: cs.getPropertyValue("--deck-accent").trim() || "#f2b488",
      line: cs.getPropertyValue("--deck-line").trim() || "#495e52",
    };
  }
  let cols = readColors();
  const mo = new MutationObserver(() => { cols = readColors(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function draw() {
    const { width, height } = canvas;
    c2d.fillStyle = cols.bg;
    c2d.fillRect(0, 0, width, height);

    // Subtle grid line
    c2d.strokeStyle = cols.line;
    c2d.lineWidth = 1;
    c2d.beginPath();
    c2d.moveTo(0, height / 2);
    c2d.lineTo(width, height / 2);
    c2d.stroke();

    if (isPlayingRef() && shared.analyser && shared.freqData && shared.scopeData) {
      shared.analyser.getByteFrequencyData(shared.freqData);
      shared.analyser.getByteTimeDomainData(shared.scopeData);
      const bars = 28;
      const bw = width / bars;
      for (let i = 0; i < bars; i++) {
        const v = shared.freqData[i * 2] / 255;
        const bh = Math.max(3, v * (height - 10));
        c2d.fillStyle = i % 2 === 0 ? cols.bar : cols.accent;
        c2d.globalAlpha = 0.45 + v * 0.55;
        c2d.fillRect(i * bw + 2, height - bh, Math.max(2, bw - 4), bh);
      }
      c2d.globalAlpha = 1;
      c2d.strokeStyle = cols.bar;
      c2d.lineWidth = 2;
      c2d.beginPath();
      const slice = width / shared.scopeData.length;
      for (let i = 0; i < shared.scopeData.length; i++) {
        const y = ((shared.scopeData[i] - 128) / 128) * (height * 0.36) + height / 2;
        if (i === 0) c2d.moveTo(0, y);
        else c2d.lineTo(i * slice, y);
      }
      c2d.stroke();
      rafId = requestAnimationFrame(draw);
    } else {
      c2d.strokeStyle = cols.bar;
      c2d.lineWidth = 2;
      c2d.globalAlpha = 0.72;
      c2d.beginPath();
      for (let x = 0; x <= width; x += 6) {
        const y = height / 2 + Math.sin(x * 0.032) * 7;
        if (x === 0) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      }
      c2d.stroke();
      c2d.globalAlpha = 1;
      rafId = 0;
    }
  }
  draw();
  return {
    kick() { if (!rafId) rafId = requestAnimationFrame(draw); },
    redraw() { draw(); },
    stop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
      mo.disconnect();
    },
  };
}

// ==================== GAME 01: ESTUDIO MULTIPISTA (MINI-DAW 16 PASOS) ====================
function normalizeDawMix(raw) {
  const base = DAW_PRESETS[0].data;
  const r = raw && typeof raw === "object" ? raw : {};
  const arr = (v, fallback, min, max) =>
    Array.isArray(v) && v.length === 16 ? v.map((n) => (Number.isInteger(n) && n >= min && n <= max ? n : min)) : [...fallback];
  return {
    scale: SCALES[r.scale] ? r.scale : base.scale,
    bpm: Number.isFinite(r.bpm) ? Math.min(148, Math.max(68, Math.round(r.bpm))) : base.bpm,
    timbre: TIMBRES[r.timbre] ? r.timbre : base.timbre,
    balance: Number.isFinite(r.balance) ? Math.min(85, Math.max(20, Math.round(r.balance))) : base.balance,
    brightness: Number.isFinite(r.brightness) ? Math.min(9000, Math.max(700, Math.round(r.brightness))) : base.brightness,
    swing: Number.isFinite(r.swing) ? Math.min(35, Math.max(0, Math.round(r.swing))) : base.swing,
    echo: Number.isFinite(r.echo) ? Math.min(60, Math.max(0, Math.round(r.echo))) : base.echo,
    melody: arr(r.melody, base.melody, -1, 5),
    bass: arr(r.bass, base.bass, 0, 1),
    kick: arr(r.kick, base.kick, 0, 1),
    snare: arr(r.snare, base.snare, 0, 1),
  };
}

function renderConsoleTab(ctx, shared) {
  const mix = normalizeDawMix(ctx.state.studioMix);
  const mute = { melody: false, bass: false, drums: false };
  let playingMode = null; // null | "user" | "ai"
  let stepIndex = 0;
  let timer = 0;
  let tapTimes = [];

  const layout = el("div", "daw-layout");
  const deck = el("section", "studio-deck daw-deck");

  // Top studio HUD
  const deckHead = el("div", "studio-deck-head");
  const led = el("span", "studio-led", "MINI-DAW · 16 PASOS");
  const scaleBadge = el("span", "", SCALES[mix.scale].label.toUpperCase());
  deckHead.append(led, scaleBadge);

  // Title + human signature meter
  const titleRow = el("div", "studio-deck-title");
  const h2 = el("h2", "", "Estudio multipista");
  const nowLabel = el("p", "studio-now", "Pinta notas o compara contra el loop IA");
  titleRow.append(h2, nowLabel);

  // Live spectrum + human-air meter bar
  const meterRow = el("div", "daw-meter-row");
  const scopeWrap = el("div", "studio-scope-wrap daw-scope-wrap");
  const canvas = el("canvas", "studio-scope");
  canvas.width = 560;
  canvas.height = 68;
  canvas.setAttribute("aria-hidden", "true");
  scopeWrap.append(canvas, el("span", "studio-scope-tag", "ESPECTRO EN VIVO"));

  const sigBox = el("div", "daw-sig-box");
  const sigTitle = el("span", "daw-sig-kicker", "AIRE Y FIRMA HUMANA");
  const sigVal = el("strong", "daw-sig-val", "");
  const sigHint = el("small", "daw-sig-hint", "");
  sigBox.append(sigTitle, sigVal, sigHint);
  meterRow.append(scopeWrap, sigBox);

  const scope = mountSpectrumCanvas(canvas, shared, () => Boolean(playingMode));

  // Scale chips bar
  const scaleBar = el("div", "studio-presets studio-motif-bar");
  scaleBar.append(el("span", "studio-presets-label", "Escala:"));
  const scaleBtns = {};
  for (const [key, sc] of Object.entries(SCALES)) {
    const b = button(sc.label, () => {
      mix.scale = key;
      persistAndSync();
      playSfx(shared, "ui");
    }, "studio-chip");
    scaleBtns[key] = b;
    scaleBar.append(b);
  }

  // Interactive 16-step Piano Roll + 3 Rhythm Tracks inside safe horizontal scroll wrapper
  const scrollBox = el("div", "daw-scroll");
  scrollBox.setAttribute("data-lenis-prevent", "");
  const grid = el("div", "daw-grid");
  scrollBox.append(grid);

  // Step number header
  const stepCells = [];
  const melodyButtons = Array.from({ length: 6 }, () => []);
  const bassButtons = [];
  const kickButtons = [];
  const snareButtons = [];

  function buildGrid() {
    grid.replaceChildren();
    stepCells.length = 0;
    for (let r = 0; r < 6; r++) melodyButtons[r] = [];
    bassButtons.length = 0;
    kickButtons.length = 0;
    snareButtons.length = 0;

    // Header row
    const headLabel = el("div", "daw-row-label daw-corner", "PISTA / PASO");
    grid.append(headLabel);
    for (let s = 0; s < 16; s++) {
      const cell = el("div", "daw-step-head" + (s % 4 === 0 ? " is-downbeat" : ""), String(s + 1));
      stepCells.push(cell);
      grid.append(cell);
    }

    // 6 Melody rows (piano roll)
    const notes = SCALES[mix.scale].notes;
    for (let r = 0; r < 6; r++) {
      const lbl = el("div", "daw-row-label daw-note-lbl");
      const nameSpan = el("span", "", notes[r].name);
      if (r === 0) {
        const mBtn = button(mute.melody ? "M" : "M", () => {
          mute.melody = !mute.melody;
          mBtn.setAttribute("aria-pressed", String(mute.melody));
          status.textContent = mute.melody ? "Melodía silenciada (Mute)." : "Melodía activa.";
        }, "daw-mute");
        mBtn.setAttribute("aria-label", "Silenciar melodía");
        mBtn.setAttribute("aria-pressed", String(mute.melody));
        lbl.append(nameSpan, mBtn);
      } else {
        lbl.append(nameSpan);
      }
      grid.append(lbl);

      for (let s = 0; s < 16; s++) {
        const active = mix.melody[s] === r;
        const pad = el("button", "daw-pad daw-pad-melody" + (s % 4 === 0 ? " is-downbeat" : "") + (active ? " is-on" : ""));
        pad.type = "button";
        pad.setAttribute("aria-pressed", String(active));
        pad.setAttribute("aria-label", `Paso ${s + 1}, nota ${notes[r].name}`);
        pad.addEventListener("click", () => {
          mix.melody[s] = mix.melody[s] === r ? -1 : r;
          if (mix.melody[s] === r) {
            shared.ensureEngine().then((eng) => {
              playVoiceNote(eng, shared.analyser, notes[r].midi, eng.currentTime + 0.01, mix.timbre, 0.24, mix.brightness, mix.echo / 100);
            }).catch(() => {});
          }
          persistAndSync();
        });
        melodyButtons[r].push(pad);
        grid.append(pad);
      }
    }

    // Divider label + Bass + Kick + Snare rows
    const drumDefs = [
      { key: "bass", name: "Bajo Sub", arr: bassButtons, muteKey: "bass", css: "daw-pad-bass", preview: (eng) => playBassNote(eng, shared.analyser, SCALES[mix.scale].bass[0], eng.currentTime + 0.01, 0.28) },
      { key: "kick", name: "Cajón Grave", arr: kickButtons, muteKey: "drums", css: "daw-pad-kick", preview: (eng) => playDrumHit(eng, shared.analyser, "kick", eng.currentTime + 0.01, 0.34) },
      { key: "snare", name: "Cajón Agudo", arr: snareButtons, muteKey: null, css: "daw-pad-snare", preview: (eng) => playDrumHit(eng, shared.analyser, "snare", eng.currentTime + 0.01, 0.24) },
    ];

    for (const def of drumDefs) {
      const lbl = el("div", "daw-row-label daw-rhythm-lbl");
      lbl.append(el("span", "", def.name));
      if (def.muteKey) {
        const mBtn = button("M", () => {
          mute[def.muteKey] = !mute[def.muteKey];
          mBtn.setAttribute("aria-pressed", String(mute[def.muteKey]));
          status.textContent = mute[def.muteKey] ? `${def.name} silenciado.` : `${def.name} activo.`;
        }, "daw-mute");
        mBtn.setAttribute("aria-label", "Silenciar " + def.name);
        mBtn.setAttribute("aria-pressed", String(mute[def.muteKey]));
        lbl.append(mBtn);
      }
      grid.append(lbl);

      for (let s = 0; s < 16; s++) {
        const active = mix[def.key][s] === 1;
        const pad = el("button", `daw-pad ${def.css}` + (s % 4 === 0 ? " is-downbeat" : "") + (active ? " is-on" : ""));
        pad.type = "button";
        pad.setAttribute("aria-pressed", String(active));
        pad.setAttribute("aria-label", `Paso ${s + 1}, ${def.name}`);
        pad.addEventListener("click", () => {
          mix[def.key][s] = mix[def.key][s] ? 0 : 1;
          if (mix[def.key][s]) {
            shared.ensureEngine().then((eng) => def.preview(eng)).catch(() => {});
          }
          persistAndSync();
        });
        def.arr.push(pad);
        grid.append(pad);
      }
    }
  }

  // Transport actions (keeps /Escuchar mi versión/ exact button contract!)
  const actions = el("div", "studio-actions daw-actions");
  const playUserBtn = button("▶ Escuchar mi versión", () => togglePlay("user"), "studio-button studio-primary");
  const playAiBtn = button("⚡ Comparar loop IA (saturado)", () => togglePlay("ai"), "studio-button");
  const randBtn = button("🎲 Variar motivo", () => {
    for (let s = 0; s < 16; s++) {
      mix.melody[s] = (s === 13 || s === 14 || s === 15 || Math.random() < 0.35) ? -1 : Math.floor(Math.random() * 6);
    }
    persistAndSync();
    status.textContent = "Nuevo motivo generado dejando aire al cierre. Edita las celdas que prefieras.";
  }, "studio-button");
  const clearBtn = button("Limpiar", () => {
    mix.melody.fill(-1);
    mix.bass.fill(0);
    mix.kick.fill(0);
    mix.snare.fill(0);
    persistAndSync();
    status.textContent = "Rejilla limpia. Haz clic en cualquier casilla para componer desde cero.";
  }, "studio-button");
  const exportMidiBtn = button("⬇ Exportar .MIDI", () => {
    exportMidiFromMix(mix, SCALES);
    status.textContent = `Archivo MIDI exportado (${SCALES[mix.scale].label} · ${mix.bpm} BPM). Arrástralo a BandLab, FL Studio o Ableton.`;
  }, "studio-button");
  const exportWavBtn = button("⬇ Exportar .WAV", async () => {
    exportWavBtn.disabled = true;
    status.textContent = "Renderizando archivo WAV estéreo en tu navegador…";
    try {
      await exportWavFromMix(mix, SCALES, mute, playVoiceNote, playBassNote, playDrumHit);
      status.textContent = "Archivo WAV descargado listo para escuchar o usar como maqueta.";
    } catch {
      status.textContent = "No se pudo exportar el WAV en este navegador.";
    } finally {
      exportWavBtn.disabled = false;
    }
  }, "studio-button");
  actions.append(playUserBtn, playAiBtn, randBtn, clearBtn, exportMidiBtn, exportWavBtn);

  // Preset strip
  const presetBar = el("div", "studio-presets");
  presetBar.append(el("span", "studio-presets-label", "Plantillas:"));
  for (const preset of DAW_PRESETS) {
    presetBar.append(button(preset.label, () => {
      Object.assign(mix, normalizeDawMix(preset.data));
      persistAndSync();
      status.textContent = `Plantilla «${preset.label}» cargada. Modifica notas o silencio para dejar tu firma.`;
    }, "studio-chip"));
  }

  const status = el("p", "studio-status", "Haz clic en el piano roll o en el cajón para construir tu arreglo de 16 pasos.");
  status.setAttribute("role", "status");

  deck.append(deckHead, titleRow, meterRow, scaleBar, scrollBox, actions, presetBar, status);

  // ==================== RIGHT CONTROLS PANEL (FIRST <select> = TIMBRE!) ====================
  const controls = el("aside", "studio-controls");
  controls.append(el("p", "eyebrow", "Consola de sonido"), el("h2", "", "Tu arreglo"));

  const timbreField = el("label", "studio-field");
  const timbreSelect = el("select");
  for (const [val, label] of Object.entries(TIMBRES)) timbreSelect.append(new Option(label, val));
  timbreSelect.value = mix.timbre;
  timbreSelect.addEventListener("change", () => {
    mix.timbre = timbreSelect.value;
    persistAndSync();
  });
  timbreField.append(el("span", "", "Timbre de melodía"), timbreSelect);

  function sliderControl(labelText, min, max, step, val, formatFn, onChange) {
    const field = el("label", "studio-field");
    const row = el("span", "studio-row");
    const out = el("output", "", formatFn(val));
    row.append(el("span", "", labelText), out);
    const input = el("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(val);
    input.addEventListener("input", () => {
      const num = Number(input.value);
      out.textContent = formatFn(num);
      onChange(num);
    });
    field.append(row, input);
    return { field, input, out };
  }

  const bpmCtrl = sliderControl("Tempo", 68, 148, 2, mix.bpm, (v) => v + " BPM", (v) => { mix.bpm = v; saveMix(); });
  const tapBtn = button("Marcar tempo (Tap)", () => {
    const now = performance.now();
    if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 1800) tapTimes = [];
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    if (tapTimes.length >= 2) {
      let sum = 0;
      for (let i = 1; i < tapTimes.length; i++) sum += tapTimes[i] - tapTimes[i - 1];
      const bpm = Math.round(Math.min(148, Math.max(68, 60000 / (sum / (tapTimes.length - 1)))) / 2) * 2;
      mix.bpm = bpm;
      bpmCtrl.input.value = String(bpm);
      bpmCtrl.out.textContent = bpm + " BPM";
      saveMix();
      status.textContent = `Tempo ajustado al tacto: ${bpm} BPM.`;
    }
  }, "studio-tap");

  const balCtrl = sliderControl("Balance melodía / base", 20, 85, 1, mix.balance, (v) => v + " % melodía", (v) => { mix.balance = v; saveMix(); });
  const brCtrl = sliderControl("Brillo (Filtro pasabajos)", 700, 9000, 100, mix.brightness, (v) => (v / 1000).toFixed(1) + " kHz", (v) => { mix.brightness = v; saveMix(); });
  const echoCtrl = sliderControl("Aire de sala (Eco)", 0, 60, 2, mix.echo, (v) => v + " %", (v) => { mix.echo = v; saveMix(); });
  const swingCtrl = sliderControl("Swing humano", 0, 35, 1, mix.swing, (v) => v + " %", (v) => { mix.swing = v; saveMix(); });

  const guideLinks = el("div", "studio-links");
  guideLinks.append(
    el("p", "eyebrow", "Sigue aprendiendo"),
    link("Lección: Melodías y arreglos →", "#/guia/arreglos", "guide-inline"),
    link("Lección: Mezcla y balance →", "#/guia/mezcla", "guide-inline"),
    link("Jugar Oído a Ciegas →", "#/laboratorio/oido", "guide-inline")
  );

  controls.append(
    timbreField,
    bpmCtrl.field,
    tapBtn,
    balCtrl.field,
    brCtrl.field,
    echoCtrl.field,
    swingCtrl.field,
    guideLinks
  );

  function saveMix() {
    ctx.state.studioMix = {
      ...mix,
      melody: [...mix.melody],
      bass: [...mix.bass],
      kick: [...mix.kick],
      snare: [...mix.snare],
    };
    ctx.save();
  }

  function updateSignatureMeter() {
    const rests = mix.melody.filter((n) => n === -1).length;
    let diffs = 0;
    for (let i = 0; i < 16; i++) {
      if (mix.melody[i] !== AI_SATURATED_PATTERN.melody[i]) diffs++;
      if (mix.kick[i] !== AI_SATURATED_PATTERN.kick[i]) diffs++;
      if (mix.snare[i] !== AI_SATURATED_PATTERN.snare[i]) diffs++;
    }
    const pct = Math.min(100, Math.round((diffs / 32) * 100));
    sigVal.textContent = `${pct} % propio · ${rests}/16 silencios`;
    if (rests === 0) sigHint.textContent = "Sin respiros: prueba apagar 2 o 3 notas para dar aire.";
    else if (rests >= 13) sigHint.textContent = "Muy vacío: añade algunos pulsos de motivo o cajón.";
    else sigHint.textContent = "Buen equilibrio entre motivo musical y silencio creativo.";
  }

  function persistAndSync() {
    scaleBadge.textContent = SCALES[mix.scale].label.toUpperCase();
    for (const [k, btn] of Object.entries(scaleBtns)) btn.setAttribute("aria-pressed", String(k === mix.scale));
    timbreSelect.value = mix.timbre;
    bpmCtrl.input.value = String(mix.bpm);
    bpmCtrl.out.textContent = mix.bpm + " BPM";
    balCtrl.input.value = String(mix.balance);
    balCtrl.out.textContent = mix.balance + " % melodía";
    brCtrl.input.value = String(mix.brightness);
    brCtrl.out.textContent = (mix.brightness / 1000).toFixed(1) + " kHz";
    echoCtrl.input.value = String(mix.echo);
    echoCtrl.out.textContent = mix.echo + " %";
    swingCtrl.input.value = String(mix.swing);
    swingCtrl.out.textContent = mix.swing + " %";
    buildGrid();
    updateSignatureMeter();
    saveMix();
  }

  function clearPlayhead() {
    for (const c of stepCells) c.classList.remove("is-now");
  }

  function stopPlayback() {
    clearTimeout(timer);
    timer = 0;
    playingMode = null;
    deck.classList.remove("is-active");
    playUserBtn.textContent = "▶ Escuchar mi versión";
    playAiBtn.textContent = "⚡ Comparar loop IA (saturado)";
    nowLabel.textContent = "Detenido · Pulsa cualquier casilla o reproduce";
    clearPlayhead();
    scope.redraw();
  }

  function scheduleStep() {
    if (!playingMode) return;
    const src = playingMode === "ai" ? AI_SATURATED_PATTERN : mix;
    const sc = SCALES[src.scale];
    const s = stepIndex % 16;

    clearPlayhead();
    if (stepCells[s]) stepCells[s].classList.add("is-now");
    nowLabel.textContent = (playingMode === "ai" ? "LOOP IA SATURADO" : "TU VERSIÓN") + ` · PASO ${s + 1}/16 · ${src.bpm} BPM`;

    if (shared.engine) {
      const t = shared.engine.currentTime + 0.015;
      const melVol = 0.08 + (src.balance / 100) * 0.28;
      const baseVol = 0.34 - (src.balance / 100) * 0.22;
      if (src.melody[s] >= 0 && (playingMode === "ai" || !mute.melody)) {
        const midi = sc.notes[src.melody[s]].midi;
        playVoiceNote(shared.engine, shared.analyser, midi, t, src.timbre, melVol, src.brightness, src.echo / 100);
      }
      if (src.bass[s] && (playingMode === "ai" || !mute.bass)) {
        playBassNote(shared.engine, shared.analyser, sc.bass[Math.floor(s / 2)], t, baseVol * 0.9);
      }
      if (src.kick[s] && (playingMode === "ai" || !mute.drums)) {
        playDrumHit(shared.engine, shared.analyser, "kick", t, baseVol * 1.05);
      }
      if (src.snare[s] && (playingMode === "ai" || !mute.drums)) {
        playDrumHit(shared.engine, shared.analyser, "snare", t, baseVol * 0.78);
      }
    }

    const sixteenthMs = (60000 / src.bpm) / 4;
    const swingRatio = (src.swing || 0) / 100;
    const waitMs = s % 2 === 0 ? sixteenthMs * (1 + swingRatio * 0.6) : sixteenthMs * (1 - swingRatio * 0.6);
    stepIndex = (s + 1) % 16;
    timer = setTimeout(scheduleStep, Math.max(60, waitMs));
  }

  async function togglePlay(mode) {
    if (playingMode === mode) {
      stopPlayback();
      return;
    }
    stopPlayback();
    try {
      await shared.ensureEngine();
    } catch {
      status.textContent = "El navegador bloqueó el audio. Haz clic nuevamente para activarlo.";
      return;
    }
    playingMode = mode;
    stepIndex = 0;
    deck.classList.add("is-active");
    playUserBtn.textContent = mode === "user" ? "■ Detener mi versión" : "▶ Escuchar mi versión";
    playAiBtn.textContent = mode === "ai" ? "■ Detener loop IA" : "⚡ Comparar loop IA (saturado)";
    status.textContent = mode === "ai"
      ? "Escuchando el loop saturado de IA (sin silencios). Cambia a tu versión para notar el aire."
      : "Reproduciendo tu arreglo en vivo. Puedes activar o borrar notas mientras suena.";
    scope.kick();
    scheduleStep();
  }

  shared.onCleanup(() => {
    stopPlayback();
    scope.stop();
  });

  persistAndSync();
  layout.append(deck, controls);
  return layout;
}

// ==================== GAME 02: OÍDO A CIEGAS · DUELO DE PRODUCTOR ====================
function renderBlindEarTab(shared) {
  const wrap = el("div", "game-stage");
  let roundIdx = 0;
  let lives = 3;
  let streak = 0;
  let score = 0;
  let isPlaying = false;
  let playTimers = [];
  let activeScope = null;

  function stopAudio() {
    for (const id of playTimers) clearTimeout(id);
    playTimers = [];
    isPlaying = false;
    activeScope?.redraw();
  }

  async function playSnippet(spec, onDone) {
    stopAudio();
    const eng = await shared.ensureEngine();
    isPlaying = true;
    activeScope?.kick();
    const sc = SCALES[spec.scale];
    const stepMs = (60000 / spec.bpm) / 2;
    const melVol = 0.08 + (spec.balance / 100) * 0.28;
    const drumVol = 0.34 - (spec.balance / 100) * 0.22;

    spec.melody.forEach((noteRow, i) => {
      const id = setTimeout(() => {
        const t = eng.currentTime + 0.01;
        if (noteRow >= 0) playVoiceNote(eng, shared.analyser, sc.notes[noteRow].midi, t, spec.timbre, melVol, spec.brightness, 0.16);
        if (spec.drums) {
          if (i % 2 === 0) playDrumHit(eng, shared.analyser, "kick", t, drumVol);
          else playDrumHit(eng, shared.analyser, "snare", t, drumVol * 0.72);
        }
      }, i * stepMs);
      playTimers.push(id);
    });
    playTimers.push(setTimeout(() => {
      isPlaying = false;
      activeScope?.redraw();
      onDone?.();
    }, spec.melody.length * stepMs + 280));
  }

  function renderHud() {
    const hud = el("div", "game-hud");
    const hearts = "♥".repeat(lives) + "♡".repeat(Math.max(0, 3 - lives));
    hud.append(
      el("div", "hud-stat", `Misión ${Math.min(roundIdx + 1, BLIND_MISSIONS.length)}/${BLIND_MISSIONS.length}`),
      el("div", "hud-stat hud-lives", `Vidas ${hearts}`),
      el("div", "hud-stat", `Racha ×${streak}`),
      el("div", "hud-stat hud-score", `Puntos ${score}`)
    );
    return hud;
  }

  function draw() {
    stopAudio();
    activeScope?.stop();
    activeScope = null;
    wrap.replaceChildren();

    if (roundIdx >= BLIND_MISSIONS.length || lives <= 0) {
      const rank = score >= 450 ? "Oído de Estudio" : score >= 250 ? "Productor en Camino" : "Oído en Entrenamiento";
      const end = el("article", "game-card game-finish");
      end.append(
        el("p", "eyebrow", lives <= 0 ? "Partida terminada · Sin vidas" : "Duelo completado"),
        el("h2", "", `Rango obtenido: ${rank}`),
        el("p", "game-lead", `Puntaje final: ${score} puntos · Vidas restantes: ${lives}/3. Entrenar el oído antes de publicar evita aceptar mezclas saturadas por costumbre.`)
      );
      const btns = el("div", "game-actions");
      btns.append(
        button("Jugar duelo otra vez", () => { roundIdx = 0; lives = 3; streak = 0; score = 0; draw(); }, "button"),
        link("Ir al Inspector de Estrenos →", "#/laboratorio/semaforo", "button secondary")
      );
      end.append(btns);
      wrap.append(end);
      return;
    }

    const m = BLIND_MISSIONS[roundIdx];
    let locked = false;
    let listenedA = false;
    let listenedB = false;

    const card = el("article", "game-card");
    const hud = renderHud();
    const specCanvas = el("canvas", "studio-scope game-scope");
    specCanvas.width = 620;
    specCanvas.height = 72;
    specCanvas.setAttribute("aria-hidden", "true");
    const specWrap = el("div", "studio-scope-wrap");
    specWrap.append(specCanvas, el("span", "studio-scope-tag", "ANALIZADOR A / B"));
    activeScope = mountSpectrumCanvas(specCanvas, shared, () => isPlaying);

    const status = el("p", "game-hint", "Escucha ambas tomas al mismo volumen y detecta cuál cumple el criterio.");
    const feedback = el("div", "studio-game-feedback");
    feedback.hidden = true;
    feedback.setAttribute("role", "status");

    const nextBtn = button(roundIdx + 1 < BLIND_MISSIONS.length ? "Siguiente misión →" : "Ver rango final →", () => {
      roundIdx++;
      draw();
    }, "button");
    nextBtn.hidden = true;

    const listenRow = el("div", "game-duel-row");
    const btnPlayA = button("▶ Escuchar Toma A", () => {
      listenedA = true;
      status.textContent = "Reproduciendo Toma A…";
      playSnippet(m.a, () => { status.textContent = listenedB ? "Ambas escuchadas. ¡Elige tu veredicto!" : "Ahora escucha Toma B para comparar."; });
    }, "button secondary");
    const btnPlayB = button("▶ Escuchar Toma B", () => {
      listenedB = true;
      status.textContent = "Reproduciendo Toma B…";
      playSnippet(m.b, () => { status.textContent = listenedA ? "Ambas escuchadas. ¡Elige tu veredicto!" : "Escucha también Toma A antes de apostar."; });
    }, "button secondary");
    listenRow.append(btnPlayA, btnPlayB);

    const pickRow = el("div", "game-duel-row");
    function pick(choice) {
      if (locked) return;
      locked = true;
      stopAudio();
      const ok = choice === m.answer;
      if (ok) {
        streak++;
        score += 100 + (streak > 1 ? (streak - 1) * 25 : 0);
        playSfx(shared, "ok");
      } else {
        streak = 0;
        lives = Math.max(0, lives - 1);
        playSfx(shared, "bad");
      }
      feedback.dataset.correct = String(ok);
      feedback.replaceChildren(
        el("strong", "", ok ? `¡Acierto! (+${100 + (streak > 1 ? (streak - 1) * 25 : 0)} pts) ` : "Fallaste (−1 vida). "),
        document.createTextNode(m.explanation + " "),
        link("Ver lección relacionada →", "#/guia/" + m.lesson, "guide-inline")
      );
      feedback.hidden = false;
      nextBtn.textContent = lives <= 0 ? "Ver resultado →" : roundIdx + 1 < BLIND_MISSIONS.length ? "Siguiente misión →" : "Ver rango final →";
      nextBtn.hidden = false;
      card.replaceChild(renderHud(), card.firstChild);
    }
    pickRow.append(
      button("Elegir Toma A", () => pick("A"), "button"),
      button("Elegir Toma B", () => pick("B"), "button")
    );

    card.append(hud, el("p", "eyebrow", m.tag), el("h2", "", m.prompt), specWrap, listenRow, status, pickRow, feedback, nextBtn);
    wrap.append(card);
  }

  shared.onCleanup(() => {
    stopAudio();
    activeScope?.stop();
  });

  draw();
  return wrap;
}

// ==================== GAME 03: INSPECTOR DE ESTRENOS (ESTILO PAPERS, PLEASE) ====================
function renderTrafficLightTab(shared) {
  const wrap = el("div", "game-stage");
  let idx = 0;
  let lives = 3;
  let streak = 0;
  let score = 0;

  function renderHud() {
    const hud = el("div", "game-hud");
    const hearts = "♥".repeat(lives) + "♡".repeat(Math.max(0, 3 - lives));
    hud.append(
      el("div", "hud-stat", `Expediente ${Math.min(idx + 1, INSPECTOR_CASES.length)}/${INSPECTOR_CASES.length}`),
      el("div", "hud-stat hud-lives", `Reputación ${hearts}`),
      el("div", "hud-stat", `Racha ×${streak}`),
      el("div", "hud-stat hud-score", `Puntos ${score}`)
    );
    return hud;
  }

  function draw() {
    wrap.replaceChildren();
    if (idx >= INSPECTOR_CASES.length || lives <= 0) {
      const rank = lives === 3 && score >= 500 ? "Auditor Jefe de Estrenos" : score >= 300 ? "Inspector de Sello" : "Aprendiz de Derechos";
      const end = el("article", "game-card game-finish");
      end.append(
        el("p", "eyebrow", lives <= 0 ? "Licencia de inspector suspendida" : "Turno de auditoría completado"),
        el("h2", "", `Rango: ${rank}`),
        el("p", "game-lead", `Puntaje: ${score} pts · Reputación restante: ${lives}/3. Cruzar voz, boleta del plan y permisos antes de estampar evita retiros de plataformas y reclamos legales.`)
      );
      const btns = el("div", "game-actions");
      btns.append(
        button("Nuevo turno de inspección", () => { idx = 0; lives = 3; streak = 0; score = 0; draw(); }, "button"),
        link("Jugar Mesa de Créditos (Drag & Drop) →", "#/laboratorio/creditos", "button secondary")
      );
      end.append(btns);
      wrap.append(end);
      return;
    }

    const c = INSPECTOR_CASES[idx];
    const opened = new Set();
    let stamped = false;

    const card = el("article", "game-card inspector-desk");
    const hud = renderHud();

    // Folder dossier header
    const folder = el("div", "dossier-folder");
    const folderTop = el("div", "dossier-top");
    folderTop.append(
      el("span", "dossier-code", c.code),
      el("span", "dossier-artist", c.artist)
    );
    const stampOverlay = el("div", "dossier-stamp");
    stampOverlay.hidden = true;
    const progressDocs = el("p", "dossier-progress", "Abre e inspecciona los 3 sobres de evidencia antes de estampar (0/3 revisados).");
    folder.append(folderTop, el("h2", "", c.release), progressDocs, stampOverlay);

    // 3 Sealed interactive evidence envelopes
    const docsGrid = el("div", "dossier-docs");
    for (const doc of c.docs) {
      const envBtn = el("button", "evidence-envelope");
      envBtn.type = "button";
      envBtn.setAttribute("aria-expanded", "false");
      const badge = el("span", "evidence-seal", "CERRADO · PULSA PARA ABRIR");
      const title = el("strong", "", doc.label);
      const body = el("p", "evidence-text", doc.text);
      body.hidden = true;
      envBtn.append(el("span", "eyebrow", doc.tag), title, badge, body);
      envBtn.addEventListener("click", () => {
        if (!opened.has(doc.id)) {
          opened.add(doc.id);
          envBtn.classList.add("is-open");
          envBtn.setAttribute("aria-expanded", "true");
          badge.textContent = "INSPECCIONADO ✓";
          body.hidden = false;
          playSfx(shared, "paper");
          progressDocs.textContent = opened.size < 3
            ? `Evidencias revisadas: ${opened.size}/3. Sigue abriendo los sobres para cruzar datos.`
            : "3/3 evidencias revisadas. ¡Elige el sello correcto para este lanzamiento!";
        }
      });
      docsGrid.append(envBtn);
    }

    const feedback = el("div", "studio-game-feedback");
    feedback.hidden = true;
    feedback.setAttribute("role", "status");

    const nextBtn = button(idx + 1 < INSPECTOR_CASES.length ? "Siguiente expediente →" : "Cerrar turno →", () => {
      idx++;
      draw();
    }, "button");
    nextBtn.hidden = true;

    // 3 Physical ink stamps
    const stampsRow = el("div", "stamp-tray");
    const stampDefs = [
      ["aprobar", "APROBAR ESTRENO", "stamp-green"],
      ["retener", "RETENER · REVISAR", "stamp-amber"],
      ["bloquear", "BLOQUEAR · RIESGO", "stamp-red"],
    ];

    for (const [val, label, css] of stampDefs) {
      const sBtn = button(label, () => {
        if (stamped) return;
        if (opened.size < 3) {
          progressDocs.textContent = `¡Espera! Te faltan ${3 - opened.size} sobre(s) por abrir antes de estampar tu sello.`;
          playSfx(shared, "bad");
          return;
        }
        stamped = true;
        playSfx(shared, "stamp");
        const ok = val === c.answer;
        stampOverlay.textContent = val === "aprobar" ? "APROBADO" : val === "retener" ? "RETENIDO" : "BLOQUEADO";
        stampOverlay.dataset.kind = val;
        stampOverlay.hidden = false;

        if (ok) {
          streak++;
          score += 120 + (streak > 1 ? 30 : 0);
          setTimeout(() => playSfx(shared, "ok"), 130);
        } else {
          streak = 0;
          lives = Math.max(0, lives - 1);
          setTimeout(() => playSfx(shared, "bad"), 130);
        }
        feedback.dataset.correct = String(ok);
        feedback.textContent = ok
          ? `¡Sello correcto (${c.stampLabel})! ${c.verdict}`
          : `Sello incorrecto (−1 reputación). ${c.penalty} Criterio correcto: ${c.verdict}`;
        feedback.hidden = false;
        nextBtn.textContent = lives <= 0 ? "Ver reporte final →" : idx + 1 < INSPECTOR_CASES.length ? "Siguiente expediente →" : "Cerrar turno →";
        nextBtn.hidden = false;
        card.replaceChild(renderHud(), card.firstChild);
      }, `stamp-btn ${css}`);
      stampsRow.append(sBtn);
    }

    card.append(hud, folder, docsGrid, stampsRow, feedback, nextBtn);
    wrap.append(card);
  }

  draw();
  return wrap;
}

// ==================== GAME 04: MESA DE CRÉDITOS (DRAG & DROP DE 4 PISTAS) ====================
function renderCreditsTab(shared) {
  const wrap = el("div", "game-stage");
  let boardIdx = 0;
  let totalScore = 0;
  let playTimers = [];

  function stopMotif() {
    for (const id of playTimers) clearTimeout(id);
    playTimers = [];
  }

  async function playBoardRef(motif) {
    stopMotif();
    const eng = await shared.ensureEngine();
    const sc = SCALES[motif.scale];
    const stepMs = (60000 / motif.bpm) / 2;
    motif.melody.forEach((row, i) => {
      playTimers.push(setTimeout(() => {
        if (row >= 0) playVoiceNote(eng, shared.analyser, sc.notes[row].midi, eng.currentTime + 0.01, motif.timbre, 0.22, 4600, 0.18);
      }, i * stepMs));
    });
  }

  function draw() {
    stopMotif();
    wrap.replaceChildren();

    if (boardIdx >= CREDIT_BOARDS.length) {
      const end = el("article", "game-card game-finish");
      end.append(
        el("p", "eyebrow", "Mesa de créditos completada"),
        el("h2", "", `Puntaje de transparencia: ${totalScore} / ${CREDIT_BOARDS.length * 100} pts`),
        el("p", "game-lead", "Ya dominas cómo separar el rol humano del rol de la IA pista por pista. Ahora arma la ficha PDF real de tu propia canción.")
      );
      const btns = el("div", "game-actions");
      btns.append(
        button("Repetir las 3 canciones", () => { boardIdx = 0; totalScore = 0; draw(); }, "button secondary"),
        link("Abrir ficha Antes de publicar (PDF) →", "#/checklist", "button")
      );
      end.append(btns);
      wrap.append(end);
      return;
    }

    const board = CREDIT_BOARDS[boardIdx];
    const assigned = {}; // channelId -> chipId
    let selectedChipId = null; // supports tap/click-to-place + keyboard in addition to HTML5 Drag & Drop!
    let audited = false;

    // Shuffle chips deterministically-ish per render
    const shuffled = [...board.chips].sort((a, b) => a.text.localeCompare(b.text, "es"));

    const card = el("article", "game-card dnd-board");
    const hud = el("div", "game-hud");
    const placedStat = el("div", "hud-stat", "Canales listos 0/4");
    hud.append(
      el("div", "hud-stat", `Canción ${boardIdx + 1}/${CREDIT_BOARDS.length}`),
      placedStat,
      el("div", "hud-stat hud-score", `Puntos ${totalScore}`)
    );

    const headRow = el("div", "dnd-head-row");
    const titleBox = el("div");
    titleBox.append(el("p", "eyebrow", board.genre), el("h2", "", `«${board.title}»`));
    const refBtn = button("▶ Escuchar referencia", () => playBoardRef(board.motif), "button secondary");
    headRow.append(titleBox, refBtn);

    // Session diary
    const diaryBox = el("div", "dnd-diary");
    diaryBox.append(el("p", "eyebrow", "Diario real de la sesión"));
    const ul = el("ul");
    for (const line of board.diary) ul.append(el("li", "", line));
    diaryBox.append(ul);

    const helper = el("p", "game-hint", "Arrastra cada ficha hacia su canal en la consola (o haz clic en una ficha y luego en el canal destino). Evita las fichas trampa.");

    const channelsGrid = el("div", "dnd-channels");
    const tray = el("div", "dnd-tray");
    const feedback = el("div", "studio-game-feedback");
    feedback.hidden = true;
    feedback.setAttribute("role", "status");

    const auditBtn = button("Auditar ficha en consola", runAudit, "button");
    const nextBtn = button(boardIdx + 1 < CREDIT_BOARDS.length ? "Siguiente canción →" : "Ver resultado final →", () => {
      boardIdx++;
      draw();
    }, "button");
    nextBtn.hidden = true;

    function assignChip(channelId, chipId) {
      if (audited) return;
      // Remove chip from any previous channel
      for (const k of Object.keys(assigned)) {
        if (assigned[k] === chipId) delete assigned[k];
      }
      assigned[channelId] = chipId;
      selectedChipId = null;
      playSfx(shared, "paper");
      syncBoard();
    }

    function unassignChannel(channelId) {
      if (audited || !assigned[channelId]) return;
      delete assigned[channelId];
      syncBoard();
    }

    function syncBoard() {
      const count = Object.keys(assigned).length;
      placedStat.textContent = `Canales listos ${count}/4`;
      auditBtn.disabled = count < 4 || audited;

      // Render 4 console channels (dropzones)
      channelsGrid.replaceChildren();
      for (const ch of board.channels) {
        const slot = el("div", "dnd-channel");
        const chipId = assigned[ch.id];
        const chip = chipId ? board.chips.find((c) => c.id === chipId) : null;
        if (audited && chip) {
          slot.dataset.state = chip.id === ch.expected ? "ok" : "bad";
        }

        const slotHead = el("div", "dnd-channel-head");
        slotHead.append(el("span", "eyebrow", ch.label));
        if (chip && !audited) {
          const rm = button("Quitar", () => unassignChannel(ch.id), "dnd-remove");
          slotHead.append(rm);
        }

        const dropzone = el("button", "dnd-dropzone" + (chip ? " has-chip" : "") + (selectedChipId && !chip ? " is-target" : ""));
        dropzone.type = "button";
        dropzone.setAttribute("aria-label", chip ? `${ch.label}: ${chip.text}. Pulsa para cambiar o quitar.` : `${ch.label}: ranura vacía. Pulsa o suelta aquí una ficha.`);

        if (chip) {
          dropzone.append(el("span", "dnd-chip-tag", chip.tag), el("strong", "", chip.text));
        } else {
          dropzone.append(el("span", "dnd-placeholder", selectedChipId ? "Pulsa aquí para colocar la ficha" : "Suelta aquí la ficha de crédito"));
        }

        dropzone.addEventListener("click", () => {
          if (audited) return;
          if (selectedChipId) assignChip(ch.id, selectedChipId);
          else if (chip) unassignChannel(ch.id);
        });
        dropzone.addEventListener("dragover", (e) => {
          if (audited) return;
          e.preventDefault();
          dropzone.classList.add("is-over");
        });
        dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-over"));
        dropzone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropzone.classList.remove("is-over");
          const dragged = e.dataTransfer?.getData("text/plain");
          if (dragged) assignChip(ch.id, dragged);
        });

        slot.append(slotHead, dropzone);
        if (audited && chip) {
          slot.append(el("p", "dnd-channel-note", chip.id === ch.expected ? "✓ " + chip.why : "✕ " + chip.why));
        }
        channelsGrid.append(slot);
      }

      // Render tray of unplaced chips
      tray.replaceChildren();
      const placedSet = new Set(Object.values(assigned));
      for (const chip of shuffled) {
        if (placedSet.has(chip.id)) continue;
        const cBtn = el("button", "dnd-chip" + (selectedChipId === chip.id ? " is-selected" : ""));
        cBtn.type = "button";
        cBtn.draggable = !audited;
        cBtn.setAttribute("aria-pressed", String(selectedChipId === chip.id));
        cBtn.append(el("span", "dnd-chip-tag", chip.tag === "TRAMPA" ? "ETIQUETA" : chip.tag), el("span", "", chip.text));
        cBtn.addEventListener("click", () => {
          if (audited) return;
          selectedChipId = selectedChipId === chip.id ? null : chip.id;
          syncBoard();
        });
        cBtn.addEventListener("dragstart", (e) => {
          if (audited) return;
          e.dataTransfer?.setData("text/plain", chip.id);
          selectedChipId = chip.id;
        });
        tray.append(cBtn);
      }
      if (!tray.children.length && !audited) {
        tray.append(el("p", "game-hint", "Todas las fichas en juego. Pulsa «Auditar ficha en consola»."));
      }
    }

    function runAudit() {
      if (audited) return;
      audited = true;
      let okCount = 0;
      for (const ch of board.channels) {
        if (assigned[ch.id] === ch.expected) okCount++;
      }
      const earned = okCount * 25;
      totalScore += earned;
      playSfx(shared, okCount === 4 ? "ok" : "bad");
      feedback.dataset.correct = String(okCount === 4);
      feedback.textContent = okCount === 4
        ? `¡Transparencia verificada (4/4 canales · +100 pts)! Tu ficha pasa la revisión de Indecopi y plataformas sin exagerar ni ocultar la IA.`
        : `Resultado: ${okCount}/4 canales verificables (+${earned} pts). Revisa las pistas marcadas en rojo arriba para ver qué ficha era imprecisa o engañosa.`;
      feedback.hidden = false;
      nextBtn.hidden = false;
      hud.lastChild.textContent = `Puntos ${totalScore}`;
      syncBoard();
    }

    const actionsRow = el("div", "game-actions");
    const retryBtn = button("Reiniciar esta canción", () => draw(), "button secondary");
    actionsRow.append(auditBtn, retryBtn, nextBtn);

    card.append(hud, headRow, diaryBox, helper, channelsGrid, el("p", "eyebrow dnd-tray-title", "Bandeja de fichas arrastrables (incluye 2 etiquetas trampa)"), tray, feedback, actionsRow);
    wrap.append(card);
    syncBoard();
  }

  shared.onCleanup(stopMotif);
  draw();
  return wrap;
}

// ==================== LAB SHELL & VIDEOS ====================
export function renderLab(ctx, subroute) {
  const page = el("section", "page studio-page");
  const tabs = [
    ["consola", "01 · Estudio Multipista", "Mini-DAW · MIDI / WAV"],
    ["oido", "02 · Oído y A/B WaveSurfer", "Arcade + Tus audios"],
    ["letras", "03 · Letras y Prompts", "Sílabas y metatags"],
    ["semaforo", "04 · Inspector de Estrenos", "Audita sobres y sella"],
    ["creditos", "05 · Mesa de Créditos", "Juego Drag & Drop"],
  ];
  const activeTab = tabs.some(([id]) => id === subroute) ? subroute : "consola";

  page.append(header(
    "Laboratorio interactivo · 5 estaciones conectadas a las 5 etapas",
    "Laboratorio musical",
    "Aprende haciendo en las cinco etapas reales: compone y exporta MIDI/WAV, compara tus stems o masters A/B con WaveSurfer.js, mide sílabas y metatags vocales, audita permisos con sellos físicos y arma créditos arrastrando fichas."
  ));

  const tabNav = el("nav", "studio-tabs studio-tabs-5");
  tabNav.setAttribute("aria-label", "Juegos y herramientas del laboratorio");
  for (const [id, title, sub] of tabs) {
    const a = link("", id === "consola" ? "#/laboratorio" : "#/laboratorio/" + id, "studio-tab");
    if (id === activeTab) a.setAttribute("aria-current", "page");
    a.append(el("strong", "", title), el("span", "", sub));
    tabNav.append(a);
  }
  page.append(tabNav);

  const cleanups = [];
  const shared = {
    engine: null,
    analyser: null,
    scopeData: null,
    freqData: null,
    async ensureEngine() {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!this.engine) {
        this.engine = new AudioEngine();
        this.analyser = this.engine.createAnalyser();
        this.analyser.fftSize = 256;
        this.scopeData = new Uint8Array(this.analyser.fftSize);
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.connect(this.engine.destination);
      }
      if (this.engine.state !== "running") await this.engine.resume();
      return this.engine;
    },
    onCleanup(fn) { cleanups.push(fn); },
  };

  window.addEventListener("hashchange", () => {
    for (const fn of cleanups) fn();
    if (shared.engine && shared.engine.state !== "closed") shared.engine.close().catch(() => {});
  }, { once: true });

  if (activeTab === "oido") {
    const combo = el("div", "oido-stack");
    combo.append(renderWaveSurferComparator(ctx, (fn) => shared.onCleanup(fn)), renderBlindEarTab(shared));
    page.append(combo);
  } else if (activeTab === "letras") {
    page.append(renderLyricsPromptWorkshop(ctx));
  } else if (activeTab === "semaforo") {
    page.append(renderTrafficLightTab(shared));
  } else if (activeTab === "creditos") {
    page.append(renderCreditsTab(shared));
  } else {
    page.append(renderConsoleTab(ctx, shared));
  }

  return page;
}

export function renderVideos(ctx, id) {
  const page = el("section", "page studio-page");
  if (id && !films.some((item) => item.id === id)) {
    page.append(
      header("Videoteca", "Video no encontrado", "Selecciona una sesión disponible para escucharla."),
      link("Ver todos los videos →", "#/videos", "button")
    );
    return page;
  }
  const film = films.find((item) => item.id === id) || films[0];
  const dur = "0:" + String(film.duration || 28).padStart(2, "0");

  page.append(header(
    "Videoteca · 6 estudios audiovisuales",
    "Sesiones de escucha y criterios",
    "Tres estudios rápidos de escucha A/B (0:28) y tres guías visuales por capítulos (0:48) sobre voces con IA, créditos y circulación en plataformas. Todas incluyen subtítulos y saltos por tiempo."
  ));

  const layout = el("div", "studio-video-layout");
  const playerCard = el("div", "studio-player");
  const player = el("video");
  player.controls = true;
  player.playsInline = true;
  player.preload = "metadata";
  player.width = 800;
  player.height = 450;
  player.poster = "/media/" + film.id + ".webp";
  player.src = "/media/" + film.id + ".webm";
  player.setAttribute("aria-label", film.title);
  const captions = document.createElement("track");
  Object.assign(captions, { kind: "captions", src: "/media/" + film.id + ".vtt", srclang: "es", label: "Español", default: true });
  player.append(captions);

  const error = el("p", "studio-error");
  error.hidden = true;
  error.setAttribute("role", "alert");
  player.addEventListener("error", () => {
    error.hidden = false;
    error.textContent = "No se pudo reproducir este video. Puedes abrir el archivo en otro reproductor o leer la transcripción.";
  });
  playerCard.append(player, error);

  // Enhance native <video> with local Plyr (sampotts/plyr) keeping native <video> intact
  let plyrInstance = null;
  try {
    plyrInstance = new Plyr(player, {
      iconUrl: "/vendor/plyr.svg",
      loadSprite: false,
      controls: ["play-large", "play", "progress", "current-time", "duration", "mute", "volume", "captions", "settings", "pip", "fullscreen"],
      settings: ["captions", "speed"],
      speed: { selected: 1, options: [0.75, 1, 1.25, 1.5] },
      captions: { active: true, update: true, language: "es" },
      tooltips: { controls: false, seek: true },
      i18n: {
        restart: "Reiniciar",
        play: "Reproducir",
        pause: "Pausar",
        mute: "Silenciar",
        unmute: "Activar sonido",
        enableCaptions: "Activar subtítulos",
        disableCaptions: "Ocultar subtítulos",
        enterFullscreen: "Pantalla completa",
        exitFullscreen: "Salir de pantalla completa",
        settings: "Ajustes",
        speed: "Velocidad",
        normal: "Normal",
        captions: "Subtítulos",
        pip: "Ventana flotante",
      },
    });
    window.addEventListener("hashchange", () => { try { plyrInstance?.destroy(); } catch {} }, { once: true });
  } catch {
    plyrInstance = null;
  }

  const credits = el("div", "studio-video-credit");
  credits.append(el("span", "", `Reproductor Plyr · Música y animación originales · ${dur} · VP8/Opus`), link("Abrir archivo ↗", player.src));
  playerCard.append(credits);

  const nav = el("nav", "studio-program");
  nav.setAttribute("aria-label", "Elegir una sesión de escucha");
  nav.append(el("p", "eyebrow", "Programa"), el("h2", "", "Seis estudios"));
  films.forEach((entry, i) => {
    const item = link("", "#/videos/" + entry.id, "studio-program-item");
    if (film === entry) item.setAttribute("aria-current", "page");
    const mainSpan = el("span", "studio-program-title");
    mainSpan.append(el("strong", "", entry.title), el("span", "studio-program-sub", `${entry.a} vs. ${entry.b}`));
    const entryDur = "0:" + String(entry.duration || 28).padStart(2, "0");
    item.append(el("span", "studio-index", "0" + (i + 1)), mainSpan, el("small", "", entryDur));
    nav.append(item);
  });

  layout.append(playerCard, nav);
  page.append(layout);

  const detail = el("article", "studio-film-detail");
  detail.append(
    el("p", "eyebrow", `${film.subject} · ${film.result}`),
    el("h2", "", film.title),
    el("p", "", film.intro)
  );

  if (Array.isArray(film.takeaways) && film.takeaways.length) {
    const keyBox = el("div", "studio-takeaways");
    keyBox.append(el("h3", "", "Ideas clave de esta sesión"));
    const ul = el("ul");
    for (const point of film.takeaways) ul.append(el("li", "", point));
    keyBox.append(ul);
    detail.append(keyBox);
  }

  const transcript = el("details", "studio-transcript");
  transcript.open = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  transcript.append(el("summary", "", `Transcripción y capítulos (${film.captions.length} tramos)`));
  const list = el("ol");
  const starts = Array.isArray(film.cuts) ? film.cuts.slice(0, film.captions.length) : [0, 3, 13, 23];
  starts.forEach((start, index) => {
    const li = el("li");
    const stamp = "0:" + String(start).padStart(2, "0");
    const chapter = button(stamp, () => { player.currentTime = start; player.focus(); }, "studio-chapter");
    chapter.setAttribute("aria-label", "Ir a " + start + " segundos del video");
    li.append(chapter, el("span", "", film.captions[index]));
    list.append(li);
  });
  transcript.append(list);

  const nextLinks = el("div", "studio-video-actions");
  const labTarget = film.labTab && film.labTab !== "consola" ? "#/laboratorio/" + film.labTab : "#/laboratorio";
  nextLinks.append(link("Practicar en el laboratorio →", labTarget, "button"));
  if (Array.isArray(film.lessons) && film.lessons.length) {
    const first = lessons.find((l) => l.id === film.lessons[0]);
    if (first) nextLinks.append(link("Leer «" + first.title + "» →", "#/guia/" + first.id, "button secondary"));
  }
  detail.append(transcript, nextLinks);
  page.append(detail);
  return page;
}
