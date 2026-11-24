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

export function renderChecklist(ctx) {
  const root = el('section', 'release-sheet');
  const data = loadFields();
  const indicators = new Map();
  root.innerHTML = `
    <header class="release-head">
      <p class="release-overline">Cuaderno de producción</p>
      <h1>Antes de publicar</h1>
      <p>De la primera idea al máster final, deja por escrito cómo hiciste tu canción.</p>
    </header>
    <div class="release-layout">
      <div class="release-form">
        <div class="release-title-field"><label for="release-title">Título de la canción</label><input id="release-title" type="text" maxlength="180" autocomplete="off" placeholder="Escribe el título de tu obra"></div>
        <div class="release-reviews"></div>
        <section class="release-statement"><h2>Tu declaración de transparencia</h2>
          <p>Redacta el crédito que acompañará la canción. Puedes partir de tus notas sobre el aporte humano, la IA y las voces.</p>
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
    const row = el('li');
    const smallState = el('span', 'release-small-state');
    row.append(el('span', '', s.title), smallState);
    pick('.release-summary').append(row);
    indicators.set(s.id, [badge, smallState]);
  }
  updateSummary();
  pick('[data-compose]').addEventListener('click', () => {
    const notes = [['humano','Aporte humano'], ['ia','Intervención de IA'], ['voz','Voces']]
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
      await downloadSheet({ ...data }, sections.map(s => ({title: s.title, note: data[s.id], status: statusOf(data, s.id)})));
      message.textContent = 'PDF preparado para descargar.';
    } catch (error) {
      console.error('Exportación de la ficha', error);
      message.textContent = 'No se pudo generar el PDF. Tu ficha sigue abierta. Inténtalo otra vez.';
    } finally { button.disabled = false; }
  });
  return root;
}
