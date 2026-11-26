const sections = [
  { id: 'materiales', title: 'Materiales empleados', prompt: 'Haz un inventario de las pistas que entraron en la canción.', placeholder: 'Letra propia, cajón grabado en casa y un loop de percusión…' },
  { id: 'humano', title: 'Participación humana', prompt: 'Describe quién escribió, interpretó o cambió partes de la obra.', placeholder: 'Escribí las estrofas y elegí el timbre del bajo…' },
  { id: 'ia', title: 'Intervención de IA', prompt: 'Identifica la herramienta, la etapa y qué conservaste de su propuesta.', placeholder: 'Usé una herramienta para proponer armonías. Conservé el segundo acorde…' },
  { id: 'origen', title: 'Procedencia de recursos', prompt: 'Relaciona cada recurso externo con su origen y su versión.', placeholder: 'Nombre del loop, biblioteca, enlace y fecha de descarga…' },
  { id: 'permisos', title: 'Autorizaciones', prompt: 'Anota el alcance de los permisos que revisaste y dónde guardas la evidencia.', placeholder: 'La licencia del loop permite distribución digital. Guardé una copia en…' },
  { id: 'voz', title: 'Uso de voces', prompt: 'Distingue las voces grabadas, sintetizadas o transformadas y registra sus condiciones de uso.', placeholder: 'La voz principal es propia. Para el coro utilicé…' },
  { id: 'creditos', title: 'Transparencia y créditos', prompt: 'Decide dónde figurarán los créditos y quién revisará su redacción.', placeholder: 'En la descripción del lanzamiento acreditaré a…' },
  { id: 'pendientes', title: 'Asuntos pendientes', prompt: 'Escribe qué necesitas resolver, quién lo hará y antes de qué fecha.', placeholder: 'Consultar al productor el origen del sample antes de enviar el máster…' }
];

const fictitiousExample = {
  title: 'Lluvia en Barranco (Ejemplo ficticio)',
  materiales: 'Letra original en español, guitarra acústica y cajón peruano grabados en home studio, bajo eléctrico y una progresión armónica de referencia exportada en MIDI.',
  'materiales-status': 'Revisado',
  humano: 'Valeria escribió la letra y cantó todas las tomas finales. Diego eligió el timbre de guitarra, modificó el puente y grabó el cajón y el bajo.',
  'humano-status': 'Revisado',
  ia: 'Se usó AIVA (plan de prueba) para sugerir tres variaciones armónicas del coro en MIDI; se conservó únicamente el cambio al cuarto acorde y se regrabó con guitarra propia.',
  'ia-status': 'Revisado',
  origen: 'MIDI de referencia generado el 18/11/2026 (no entra audio generado en la mezcla final). Grabaciones propias registradas en el proyecto Multipista v3.',
  'origen-status': 'Revisado',
  permisos: 'Dado que el audio final es 100 % interpretado por la banda y se modificó la armonía, se verificaron las condiciones del plan y se guardó captura fechada de la sesión.',
  'permisos-status': 'Revisado',
  voz: 'La voz guía de ensayo se probó con un sintetizador, pero fue eliminada. Todas las voces publicadas fueron cantadas y grabadas por Valeria con su consentimiento expreso.',
  'voz-status': 'Revisado',
  creditos: 'Incluir la declaración breve en la descripción de YouTube y en la ficha de prensa del sencillo antes de enviar a distribución.',
  'creditos-status': 'Revisado',
  pendientes: 'Confirmar con el ingeniero de mezcla la versión final del máster antes de subir la obra al distribuidor.',
  'pendientes-status': 'Pendiente',
  declaration: 'Ejemplo ilustrativo ficticio · Letra, voces, guitarra, bajo y cajón interpretados y grabados por la banda. Se utilizó IA únicamente como apoyo inicial para explorar variaciones armónicas en MIDI durante la preproducción; ningún audio generado por IA forma parte de la grabación publicada.'
};

const statementTemplates = [
  {
    label: 'Apoyo en ideas y letras',
    text: 'La letra definitiva, la melodía, la interpretación y la grabación fueron realizadas por el equipo humano. Se utilizó IA únicamente en etapa de borrador para explorar variantes de texto e ideas, seleccionadas y reescritas por el artista.'
  },
  {
    label: 'Arreglo asistido + banda real',
    text: 'La IA sugirió una progresión armónica de referencia durante la composición. La banda eligió los timbres, reorganizó la estructura e interpretó y grabó todas las pistas instrumentales y vocales de la versión publicada.'
  },
  {
    label: 'Voz guía regrabada',
    text: 'Se utilizó una voz sintética únicamente como maqueta interna de ensayo. Todas las voces incluidas en la publicación final fueron cantadas y grabadas por intérpretes humanos con su autorización.'
  }
];

const statuses = ['Sin revisar', 'Pendiente', 'Revisado', 'No aplica'];
const storeName = 'pulso-propio:ficha:v1:';
const keys = ['title', 'declaration', ...sections.flatMap(s => [s.id, s.id + '-status'])];
let volatile = new Map();

function loadFields() {
  const result = {};
  for (const key of keys) {
    try {
      result[key] = volatile.get(key) ?? localStorage.getItem(storeName + key) ?? '';
    } catch { result[key] = volatile.get(key) || ''; }
  }
  return result;
}

function el(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value) element.textContent = value;
  return element;
}

function statusOf(data, id) {
  const value = data[id + '-status'];
  return statuses.includes(value) ? value : statuses[0];
}

export function renderChecklist() {
  const root = el('section', 'release-sheet');
  const data = loadFields();
  const indicators = new Map();
  const fieldNodes = new Map();
  root.innerHTML = `
    <header class="release-head">
      <p class="release-overline">Cuaderno de producción · Paso 4 de la guía</p>
      <h1>Antes de publicar</h1>
      <p>De la primera idea al máster final, deja por escrito qué hiciste tú, qué aportó la IA y qué permisos revisaste. No constituye certificación legal, pero respalda tu transparencia.</p>
      <div class="release-quickbar">
        <button class="release-outline" type="button" data-sample>Ver ejemplo ficticio completado</button>
        <button class="release-outline release-clear" type="button" data-clear>Limpiar ficha</button>
      </div>
    </header>
    <div class="release-layout">
      <div class="release-form">
        <div class="release-title-field"><label for="release-title">Título de la canción</label><input id="release-title" type="text" maxlength="180" autocomplete="off" placeholder="Escribe el título de tu obra"></div>
        <div class="release-reviews"></div>
        <section class="release-statement"><h2>Tu declaración de transparencia</h2>
          <p>Redacta el crédito que acompañará la canción. Puedes partir de tus notas o adaptar uno de estos modelos breves:</p>
          <div class="release-templates" data-templates></div>
          <button class="release-outline" type="button" data-compose>Redactar con mis notas</button>
          <label for="release-declaration">Texto para los créditos</label><textarea id="release-declaration" rows="5" maxlength="8000" placeholder="Cuenta qué aportó cada persona y cómo intervino la tecnología."></textarea>
          <p class="release-inline-msg" data-compose-msg role="status"></p>
        </section>
      </div>
      <aside class="release-side" aria-label="Resumen de la ficha">
        <div class="release-side-inner"><div class="release-overline">Ficha de la obra</div><h2 data-work-title></h2>
          <p class="release-count" data-count></p><progress value="0" max="8" aria-label="Apartados revisados o que no aplican"></progress>
          <ul class="release-summary"></ul>
          <button class="release-export" data-export type="button">Descargar ficha PDF <span aria-hidden="true">↓</span></button>
          <p class="release-export-msg" data-export-msg role="status"></p>
          <p class="release-storage" data-save role="status">Los datos se guardan en este navegador. Evita incluir documentos o datos personales de terceros.</p>
        </div>
      </aside>
    </div>`;

  const pick = selector => root.querySelector(selector);
  const title = pick('#release-title');
  const statement = pick('#release-declaration');
  title.value = data.title;
  statement.value = data.declaration;

  function updateSummary() {
    let resolved = 0;
    for (const s of sections) {
      const value = statusOf(data, s.id);
      if (value === 'Revisado' || value === 'No aplica') resolved++;
      indicators.get(s.id).forEach(node => {
        node.textContent = value;
        node.dataset.state = String(statuses.indexOf(value));
      });
    }
    pick('[data-work-title]').textContent = data.title.trim() || 'Obra sin título';
    pick('[data-count]').textContent = resolved + ' de 8 apartados revisados o que no aplican';
    pick('progress').value = resolved;
  }

  function save(key, value) {
    data[key] = value;
    try {
      localStorage.setItem(storeName + key, value);
      volatile.delete(key);
      pick('[data-save]').textContent = 'Borrador guardado en este navegador. Evita incluir datos personales de terceros.';
    } catch {
      volatile.set(key, value);
      pick('[data-save]').textContent = 'El navegador bloqueó el guardado. Descarga el PDF para conservar tu ficha.';
    }
    if (key === 'title' || key.endsWith('-status')) updateSummary();
    pick('[data-export-msg]').textContent = '';
  }

  title.addEventListener('input', () => save('title', title.value));
  statement.addEventListener('input', () => save('declaration', statement.value));

  const reviews = pick('.release-reviews');
  for (const [index, s] of sections.entries()) {
    const details = el('details', 'release-review');
    details.open = index === 0;
    const summary = el('summary');
    const number = el('span', 'release-index', String(index + 1).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    const badge = el('span', 'release-state');
    summary.append(number, el('span', 'release-label', s.title), badge, el('span', 'release-toggle'));
    const body = el('div', 'release-body');
    const prompt = el('p', '', s.prompt);
    prompt.id = 'release-help-' + s.id;
    const statLabel = el('label', '', 'Estado de la revisión');
    const select = el('select');
    select.id = 'release-status-' + s.id;
    statLabel.htmlFor = select.id;
    for (const value of statuses) select.add(new Option(value, value));
    select.value = statusOf(data, s.id);
    select.addEventListener('change', () => save(s.id + '-status', select.value));
    const label = el('label', '', 'Notas de ' + s.title.toLowerCase());
    const notes = el('textarea');
    notes.id = 'release-note-' + s.id;
    notes.setAttribute('aria-describedby', prompt.id);
    notes.rows = 3;
    notes.maxLength = 2000;
    notes.placeholder = s.placeholder;
    notes.value = data[s.id];
    label.htmlFor = notes.id;
    notes.addEventListener('input', () => save(s.id, notes.value));
    body.append(prompt, statLabel, select, label, notes);
    details.append(summary, body);
    reviews.append(details);
    fieldNodes.set(s.id, { select, notes });
    const row = el('li');
    const smallState = el('span', 'release-small-state');
    row.append(el('span', '', s.title), smallState);
    pick('.release-summary').append(row);
    indicators.set(s.id, [badge, smallState]);
  }
  updateSummary();

  // Transparency statement templates
  const tplBox = pick('[data-templates]');
  for (const tpl of statementTemplates) {
    const btn = el('button', 'release-tpl-chip', tpl.label);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (statement.value.trim() && statement.value !== tpl.text && !window.confirm('¿Reemplazar la declaración actual con este modelo?')) return;
      statement.value = tpl.text;
      save('declaration', tpl.text);
      pick('[data-compose-msg]').textContent = 'Modelo insertado. Adapta cada verbo a lo que ocurrió en tu canción.';
      statement.focus();
    });
    tplBox.append(btn);
  }

  // Fictitious example loader (requested in Informe de evaluación Anexo B)
  function applyAll(values, statusMessage) {
    title.value = values.title || '';
    statement.value = values.declaration || '';
    save('title', title.value);
    save('declaration', statement.value);
    for (const s of sections) {
      const pair = fieldNodes.get(s.id);
      const st = statuses.includes(values[s.id + '-status']) ? values[s.id + '-status'] : statuses[0];
      pair.select.value = st;
      pair.notes.value = values[s.id] || '';
      save(s.id + '-status', st);
      save(s.id, pair.notes.value);
    }
    updateSummary();
    pick('[data-save]').textContent = statusMessage;
  }

  pick('[data-sample]').addEventListener('click', () => {
    const hasContent = keys.some(k => !k.endsWith('-status') && data[k].trim());
    if (hasContent && !window.confirm('¿Cargar el ejemplo ficticio «Lluvia en Barranco»? Reemplazará el borrador actual.')) return;
    applyAll(fictitiousExample, 'Ejemplo ilustrativo ficticio cargado. Edítalo o pulsa «Limpiar ficha» para registrar tu propia obra.');
  });

  pick('[data-clear]').addEventListener('click', () => {
    const hasContent = keys.some(k => data[k] && data[k] !== statuses[0]);
    if (hasContent && !window.confirm('¿Vaciar todos los campos de la ficha?')) return;
    applyAll({}, 'Ficha limpiada. Lista para registrar tu canción.');
  });

  pick('[data-compose]').addEventListener('click', () => {
    const notes = [['humano', 'Aporte humano'], ['ia', 'Intervención de IA'], ['voz', 'Voces']]
      .filter(([key]) => data[key].trim())
      .map(([key, label]) => label + ': ' + data[key].trim());
    const msg = pick('[data-compose-msg]');
    if (!notes.length) {
      msg.textContent = 'Añade una nota en Participación humana, Intervención de IA o Uso de voces para empezar.';
      return;
    }
    const draft = notes.join('\n\n');
    if (statement.value.trim() && statement.value !== draft && !window.confirm('¿Reemplazar la declaración actual con el texto de tus notas?')) return;
    if (draft.length > statement.maxLength) return;
    statement.value = draft;
    save('declaration', draft);
    msg.textContent = 'Revisa y adapta el texto antes de compartirlo.';
    statement.focus();
  });

  pick('[data-export]').addEventListener('click', async event => {
    const button = event.currentTarget;
    const message = pick('[data-export-msg]');
    button.disabled = true;
    message.textContent = 'Preparando el PDF…';
    try {
      const { downloadSheet } = await import('./sheet-pdf.js');
      await downloadSheet({ ...data }, sections.map(s => ({ title: s.title, note: data[s.id], status: statusOf(data, s.id) })));
      message.textContent = 'PDF preparado para descargar.';
    } catch (error) {
      console.error('Exportación de la ficha', error);
      message.textContent = 'No se pudo generar el PDF. Tu ficha sigue abierta. Inténtalo otra vez.';
    } finally { button.disabled = false; }
  });
  return root;
}
