// Editorial records are bundled with the site. Filtering never calls an external service.
export const catalog = [
  {
    name: 'AIVA', category: 'Composición', access: 'Freemium',
    summary: 'Explora una composición instrumental y llévala a tu editor como MIDI.',
    practice: 'Prueba una armonía para tu introducción. Cambia la inversión del segundo acorde y compara cómo conduce al estribillo.',
    accessNote: 'El plan gratuito permite tres descargas al mes, en MP3 o MIDI, de piezas de hasta tres minutos.',
    limit: 'AIVA exige crédito en el plan gratuito y limita esas composiciones a usos sin monetización. Revisa el plan con el que descargas la pieza.',
    links: [['Abrir AIVA', 'https://www.aiva.ai/'], ['Planes y condiciones de uso', 'https://www.aiva.ai/about-us']]
  },
  {
    name: 'Ollama · Qwen2.5 1.5B', category: 'Letras', access: 'Local',
    summary: 'Trabaja con un modelo de texto en tu computadora para ensayar variantes de una estrofa.',
    practice: 'Escribe dos versos sobre una esquina que conoces. Pide tres remates de ocho sílabas. Cántalos y conserva el que mejor acomode tu acento.',
    accessNote: 'Ollama se distribuye con licencia MIT. La variante Qwen2.5 de 1,5 mil millones de parámetros usa Apache 2.0. Descarga el modelo para ejecutarlo localmente.',
    limit: 'El tamaño del modelo cambia el consumo de memoria y puede cambiar la licencia. Cuenta las sílabas tú mismo y revisa las frases que parezcan prestadas.',
    links: [['Ver el modelo', 'https://ollama.com/library/qwen2.5:1.5b'], ['Código y licencia de Ollama', 'https://github.com/ollama/ollama']]
  },
  {
    name: 'Kits AI', category: 'Voces', access: 'Freemium',
    summary: 'Cambia el timbre de una toma cantada y escucha qué rasgos de la interpretación se conservan.',
    practice: 'Graba una línea propia. Prueba una voz de la biblioteca y escucha la dicción de la última palabra. Anota la toma de origen y el modelo elegido.',
    accessNote: 'El plan gratuito incluye 15 minutos de conversión al mes y cero minutos de descarga.',
    limit: 'La licencia del modelo regula el resultado. Usa una toma propia o autorizada y comprueba si elegiste una voz de artista o una voz con licencia royalty-free.',
    links: [['Abrir Kits AI', 'https://www.kits.ai/'], ['Planes', 'https://www.kits.ai/pricing'], ['Licencia de biblioteca', 'https://app.kits.ai/static/legal/royalty-free-license.pdf'], ['Licencia de artista', 'https://app.kits.ai/static/legal/artist-model-license.pdf']]
  },
  {
    name: 'Basic Pitch', category: 'Melodía', access: 'Código abierto',
    summary: 'Convierte un tarareo o una toma instrumental en notas MIDI editables.',
    practice: 'Tararea cuatro compases y escucha el MIDI con otro instrumento. Contrasta cada nota con la grabación, especialmente donde hayas deslizado la voz.',
    accessNote: 'Spotify ofrece una demostración web gratuita y una biblioteca Python bajo Apache 2.0.',
    limit: 'El equipo recomienda un instrumento por toma. La transcripción admite polifonía, pero conviene revisar alturas, duración y notas duplicadas.',
    links: [['Probar el conversor', 'https://basicpitch.spotify.com/'], ['Código y documentación', 'https://github.com/spotify/basic-pitch']]
  },
  {
    name: 'Suno', category: 'Canciones completas', access: 'Freemium',
    summary: 'Escucha una maqueta cantada a partir de una idea o de tu propia letra.',
    practice: 'Genera dos lecturas del mismo estribillo. Marca qué palabras caen en el pulso fuerte y canta una tercera versión con tus propias decisiones.',
    accessNote: 'El plan gratuito admite creación para fines no comerciales. Suno distingue las canciones generadas durante una suscripción Pro o Premier.',
    limit: 'Una suscripción posterior no otorga automáticamente uso comercial a la canción anterior. Guarda la fecha, el plan y la procedencia de la letra.',
    links: [['Explorar la creación con letra', 'https://suno.com/tools/lyrics-generator'], ['Condiciones de distribución', 'https://help.suno.com/en/articles/2410177']]
  },
  {
    name: 'Moises', category: 'Producción', access: 'Freemium',
    summary: 'Separa voces, batería y bajo de una mezcla para escuchar cómo dialogan las capas.',
    practice: 'Usa una maqueta propia. Silencia la batería durante el segundo verso y decide si ese espacio favorece la entrada del coro.',
    accessNote: 'El plan gratuito admite cinco archivos al mes de hasta cinco minutos y separaciones predefinidas de dos o cuatro pistas.',
    limit: 'Elegir otros instrumentos requiere un plan superior. Trabaja con grabaciones cuyo uso tengas autorizado y escucha los residuos de separación antes de reutilizar una pista.',
    links: [['Abrir Moises', 'https://moises.ai/'], ['Límites de separación', 'https://help.moises.ai/hc/en-us/articles/29530482524316-Which-instruments-can-be-separated-on-the-Free-plan']]
  },
  {
    name: 'BandLab Mastering', category: 'Masterización', access: 'Freemium',
    summary: 'Compara tratamientos de masterización sobre una misma mezcla estéreo.',
    practice: 'Compara Tape y Clarity con el original a un volumen percibido parecido. Escucha los platos y las consonantes antes de elegir.',
    accessNote: 'Universal, Fire, Clarity y Tape están disponibles de forma gratuita. BandLab reserva otros ajustes para su membresía.',
    limit: 'Los ajustes actúan sobre la mezcla que entregas. Si una frase queda tapada por el bajo, vuelve al proyecto multipista para corregir su balance.',
    links: [['Abrir BandLab Mastering', 'https://www.bandlab.com/mastering'], ['Ajustes y planes', 'https://help.bandlab.com/hc/en-us/articles/360001374513-Using-BandLab-Mastering-on-your-songs']]
  },
  {
    name: 'Mubert Render', category: 'Música para video', access: 'Freemium',
    summary: 'Explora acompañamientos para sincronizar música con una pieza audiovisual.',
    practice: 'Monta el mismo plano con dos ambientes musicales. Escoge el que deje entender la voz y guarda la licencia junto al archivo.',
    accessNote: 'Ambassador es el plan gratuito para acompañar contenidos propios sin monetización. Exige crédito y enlace a Mubert.',
    limit: 'El acuerdo gratuito excluye promociones pagadas, trabajo para clientes y uso en aplicaciones o juegos. Comprueba el destino de la pieza antes de descargar.',
    links: [['Abrir Mubert Render', 'https://mubert.com/render'], ['Acuerdo de suscripción', 'https://mubert.com/es/render/docs/subscription-agreement']]
  },
  {
    name: 'Adobe Podcast', category: 'Producción', access: 'Freemium',
    summary: 'Mejora la inteligibilidad de una voz hablada para una presentación, entrevista o introducción musical.',
    practice: 'Graba una presentación de diez segundos. Compara cómo suenan las eses y la respiración en la toma original y en Enhance Speech.',
    accessNote: 'La tabla oficial del plan gratuito indica un máximo de 30 minutos por archivo y una hora de mejora al día.',
    limit: 'Enhance Speech está orientado al habla. Conserva el original para escuchar si el tratamiento cambia el carácter de tu toma.',
    links: [['Abrir Adobe Podcast', 'https://podcast.adobe.com/'], ['Comparar planes', 'https://podcast.adobe.com/en/plans']]
  },
  {
    name: 'MusicGen', category: 'Composición', access: 'Modelo local',
    summary: 'Estudia cómo una descripción de ritmo, instrumentación o una melodía de referencia condiciona la generación.',
    practice: 'Cambia solo una instrucción de timbre entre dos ejemplos. Escucha si también cambió la densidad rítmica y documenta ambas diferencias.',
    accessNote: 'El código de AudioCraft usa MIT. Meta publica los pesos de MusicGen bajo CC BY-NC 4.0 para uso no comercial.',
    limit: 'La instalación necesita modelos y recursos de cómputo adicionales. Distingue en tus créditos el código, el modelo y cualquier melodía que hayas aportado.',
    links: [['Ficha oficial del modelo', 'https://github.com/facebookresearch/audiocraft/blob/main/model_cards/MUSICGEN_MODEL_CARD.md'], ['Proyecto AudioCraft', 'https://github.com/facebookresearch/audiocraft']]
  }
];

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function normalized(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function filterSelect(label, all, values) {
  const control = node('label', 'catalog-field');
  const select = node('select');
  select.add(new Option(all, ''));
  for (const value of values) select.add(new Option(value, value));
  control.append(node('span', '', label), select);
  return {control, select};
}

function toolDetails(item) {
  const details = node('details', 'catalog-record');
  const summary = node('summary', 'catalog-summary');
  const title = node('span', 'catalog-identity');
  title.append(node('span', 'catalog-name', item.name), node('span', 'catalog-description', item.summary));
  const indicator = node('span', 'catalog-toggle', '+');
  indicator.setAttribute('aria-hidden', 'true');
  summary.append(title, node('span', 'catalog-meta', item.category), node('span', 'catalog-access', item.access), indicator);
  const body = node('div', 'catalog-body');
  for (const [label, description] of [['Prueba de escucha', item.practice], ['Acceso', item.accessNote], ['Antes de usar el resultado', item.limit]]) {
    const section = node('div');
    section.append(node('h3', '', label), node('p', '', description));
    body.append(section);
  }
  const links = node('div', 'catalog-links');
  for (const [label, url] of item.links) {
    const anchor = node('a', '', label + ' ↗');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('aria-label', label + ' (se abre en una pestaña nueva)');
    links.append(anchor);
  }
  body.append(links);
  details.append(summary, body);
  return details;
}

export function renderCatalog(ctx) {
  const page = node('section', 'catalog-page');
  const header = node('header', 'catalog-header');
  header.append(node('h1', '', 'Catálogo de herramientas'), node('p', '', 'Elige una etapa de tu canción. Abre cada ficha para probar una idea, comparar planes y consultar las condiciones del creador.'));
  const filters = node('div', 'catalog-filters');
  const searchLabel = node('label', 'catalog-field');
  const search = node('input');
  search.type = 'search';
  search.placeholder = 'Voz, MIDI, Suno…';
  searchLabel.append(node('span', '', 'Buscar herramienta'), search);
  const unique = (field) => [...new Set(catalog.map(item => item[field]))].sort((a, b) => a.localeCompare(b, 'es'));
  const category = filterSelect('Etapa musical', 'Todas las etapas', unique('category'));
  const access = filterSelect('Tipo de acceso', 'Todos los accesos', unique('access'));
  const reset = node('button', 'catalog-reset', 'Limpiar filtros');
  reset.type = 'button';
  filters.append(searchLabel, category.control, access.control, reset);
  const status = node('p', 'catalog-status');
  status.setAttribute('role', 'status');
  const results = node('div', 'catalog-list');
  function update() {
    const term = normalized(search.value.trim());
    const matches = catalog.filter(item => (!category.select.value || item.category === category.select.value)
      && (!access.select.value || item.access === access.select.value)
      && normalized([item.name, item.category, item.access, item.summary, item.practice, item.limit].join(' ')).includes(term));
    status.textContent = matches.length + (matches.length === 1 ? ' herramienta' : ' herramientas');
    reset.disabled = !search.value && !category.select.value && !access.select.value;
    results.replaceChildren(...matches.map(toolDetails));
    if (!matches.length) results.append(node('p', 'catalog-empty', 'No encontramos una herramienta con esos filtros. Prueba con otra etapa o limpia la búsqueda.'));
  }
  reset.addEventListener('click', () => {
    search.value = category.select.value = access.select.value = '';
    update();
    search.focus();
  });
  search.addEventListener('input', update);
  category.select.addEventListener('change', update);
  access.select.addEventListener('change', update);
  const source = node('p', 'catalog-source', 'Condiciones consultadas el 23 de noviembre de 2026. Confirma el plan y la licencia en la fuente oficial antes de publicar.');
  page.append(header, filters, status, results, source);
  update();
  return page;
}
