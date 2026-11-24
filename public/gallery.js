const posters = [
  {
    id: 'silencio',
    title: '¿Y si dejas ese silencio?',
    theme: 'Autonomía creativa',
    alt: 'Un pentagrama se interrumpe en una página casi vacía. Al pie se lee «La IA puede llenar el compás. Tú puedes dejarlo respirar».',
    concept: 'El vacío ocupa casi todo el afiche. La pequeña pausa en la partitura plantea una decisión concreta: cuando una herramienta ofrece otra nota, el artista también puede elegir el silencio.',
    prompt: 'Escucha el final de una frase musical. ¿Qué cambia si esperas un pulso antes de volver a tocar?'
  },
  {
    id: 'anatomia',
    title: 'Anatomía de un arreglo',
    theme: 'Arreglos e instrumentación',
    alt: 'Una flor coral abierta revela cuerdas en su tallo. Dos anotaciones señalan «La IA sugirió la armonía» y «La banda eligió el timbre».',
    concept: 'Las cuerdas y los pétalos comparten un mismo cuerpo. Las anotaciones permiten distinguir dos decisiones que, al escuchar la canción terminada, podrían parecer una sola.',
    prompt: 'Imagina los mismos acordes tocados por una guitarra de cuerdas de nailon y por un sintetizador. ¿Qué timbre conservarías para tu canción?'
  },
  {
    id: 'creditos',
    title: 'Que suenen los créditos',
    theme: 'Transparencia',
    alt: 'Afiche chicha con letras amarillas, naranjas y fucsias sobre negro. El pie dice «Si la IA participó en tu canción, cuéntalo».',
    concept: 'La tipografía chicha limeña le da a una práctica habitualmente relegada a la letra pequeña el espacio de un anuncio de concierto. El crédito pasa al primer plano.',
    prompt: 'Piensa en tu última canción. ¿Qué frase breve permitiría a alguien reconocer dónde intervino la IA y qué hiciste tú?'
  }
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label, className, onClick) {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function loadPoster(img, poster) {
  img.src = './art/' + poster.id + '.png';
  img.alt = poster.alt;
  img.width = 1024;
  img.height = 1536;
}

export function renderGallery(ctx) {
  const section = element('section', 'gallery-page');
  const header = element('header', 'gallery-heading');
  header.append(
    element('h1', '', 'Galería de afiches'),
    element('p', '', 'Tres miradas sobre una canción: cuándo dejar espacio, cómo elegir su sonido y a quién dar crédito.')
  );
  const grid = element('div', 'gallery-grid');
  const dialog = element('dialog', 'gallery-dialog');
  dialog.setAttribute('aria-labelledby', 'expanded-poster-title');
  const tools = element('div', 'gallery-toolbar');
  const title = element('h2');
  title.id = 'expanded-poster-title';
  const counter = element('span', 'gallery-counter');
  counter.setAttribute('aria-live', 'polite');
  const closeButton = button('Cerrar', 'gallery-control', () => dialog.close());
  tools.append(title, counter, closeButton);
  const viewport = element('div', 'gallery-viewport');
  const large = element('img', 'gallery-full');
  viewport.append(large);
  const nav = element('div', 'gallery-dialog-nav');
  let current = 0;
  let opener;
  const zoom = button('Ver al 100 %', 'gallery-control', () => {
    const active = viewport.classList.toggle('is-zoomed');
    zoom.textContent = active ? 'Ajustar a pantalla' : 'Ver al 100 %';
    zoom.setAttribute('aria-pressed', String(active));
    if (!active) viewport.scrollTo(0, 0);
  });
  function select(index) {
    current = (index + posters.length) % posters.length;
    const poster = posters[current];
    title.textContent = poster.title;
    counter.textContent = (current + 1) + ' de ' + posters.length;
    viewport.classList.remove('is-zoomed');
    viewport.scrollTo(0, 0);
    zoom.setAttribute('aria-pressed', 'false');
    zoom.textContent = 'Ver al 100 %';
    loadPoster(large, poster);
  }
  const previous = button('← Anterior', 'gallery-control', () => select(current - 1));
  const next = button('Siguiente →', 'gallery-control', () => select(current + 1));
  nav.append(previous, zoom, next);
  dialog.append(tools, viewport, nav);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus());
  dialog.addEventListener('keydown', event => {
    if (viewport.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      select(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  posters.forEach((poster, index) => {
    const article = element('article', 'gallery-card');
    const trigger = button('', 'gallery-frame', () => {
      opener = trigger;
      select(index);
      dialog.showModal();
      closeButton.focus();
    });
    trigger.setAttribute('aria-label', 'Ampliar «' + poster.title + '»');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.classList.add('gallery-' + poster.id);
    const img = element('img');
    img.loading = 'lazy';
    loadPoster(img, poster);
    trigger.append(img, element('span', 'gallery-zoom', 'Ampliar ↗'));
    const caption = element('div', 'gallery-caption');
    caption.append(
      element('p', 'gallery-theme', poster.theme),
      element('h2', '', poster.title),
      element('p', '', poster.concept)
    );
    const reflection = element('details', 'gallery-reflection');
    reflection.append(element('summary', '', 'Llévalo a tu música'), element('p', '', poster.prompt));
    article.append(trigger, caption, reflection);
    grid.append(article);
  });
  section.append(header, grid, dialog);
  return section;
}
