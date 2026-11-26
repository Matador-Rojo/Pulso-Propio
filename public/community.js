// Comunidad y difusión multimedia — conectada a SQLite (/api/community) con moderación en #/admin.

const CATEGORIES = [
  "Todos",
  "Difusión multimedia",
  "Busco colaboración",
  "Debate e IA",
  "Consejo de herramienta",
];

// Ejemplos editoriales iniciales claramente diferenciados de las publicaciones reales en SQLite.
const STARTER_POSTS = [
  {
    id: "editorial-1",
    editorial: true,
    created: "Ejemplo editorial",
    author: "Colectivo Sierra Viva",
    city: "Huancayo · Huayno Fusión",
    category: "Difusión multimedia",
    title: "Cómo usamos Basic Pitch para pasar un tarareo a charango sin perder nuestro acento",
    tools: "Basic Pitch (MIDI) + Charango y cajón grabados en vivo",
    media_url: "",
    contact: "@sierraviva.pe (ejemplo)",
    body: "Tarareamos la melodía del puente en el celular, la transcribimos a MIDI con Basic Pitch para revisar las alturas y luego descartamos el audio digital para grabar charango, guitarra y cajón reales. Compartimos el proceso para otros grupos andinos que recién prueban IA.",
    likes: 12,
    replies: [
      {
        id: "ed-r1",
        author: "Equipo Pulso Propio",
        created: "Ejemplo",
        body: "Gran ejemplo de IA asistiva: conserva el 100 % de la interpretación humana y documenta exactamente qué hizo cada herramienta.",
      },
    ],
  },
  {
    id: "editorial-2",
    editorial: true,
    created: "Ejemplo editorial",
    author: "Lía & Estudio Barranco",
    city: "Lima · Indie Folk",
    category: "Busco colaboración",
    title: "Busco bajista y percusionista en Lima para regrabar maqueta hecha con AIVA",
    tools: "AIVA (progresión MIDI inicial) · Letra y voz propias",
    media_url: "",
    contact: "contacto@estudiobarranco.pe (ejemplo)",
    body: "Armamos la estructura armónica base en MIDI y grabé la voz principal en casa. Queremos reemplazar toda la base sintética con instrumentos reales antes de lanzar el sencillo y registrarlo con créditos claros.",
    likes: 8,
    replies: [],
  },
  {
    id: "editorial-3",
    editorial: true,
    created: "Ejemplo editorial",
    author: "Mateo R.",
    city: "Arequipa · Producción",
    category: "Consejo de herramienta",
    title: "Tip para limpiar ruido de cuarto sin sonar metálico",
    tools: "Lalal.ai / Adobe Podcast (comparado al mismo volumen)",
    media_url: "",
    contact: "",
    body: "Antes de aceptar una limpieza automática de voz, igualen el volumen de la pista procesada contra la original y escuchen solo las eses y las respiraciones. A veces conviene mezclar 70 % limpia + 30 % original para mantener calidez.",
    likes: 15,
    replies: [],
  },
];

function el(tag, css, text) {
  const node = document.createElement(tag);
  if (css) node.className = css;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(raw) {
  if (!raw || raw === "Ejemplo editorial" || raw === "Ejemplo") return raw || "";
  try {
    return new Date(raw).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
}

async function apiJson(path, body) {
  const opts = { cache: "no-store" };
  if (body !== undefined) {
    opts.method = "POST";
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch("/api/" + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo completar la acción.");
  return data;
}

export function renderCommunity(ctx) {
  const page = el("section", "page comm-page");

  const head = el("header", "comm-head");
  head.append(
    el("p", "eyebrow", "Red y difusión multimedia · Foro abierto moderado"),
    el("h1", "", "Comunidad y difusión"),
    el(
      "p",
      "comm-intro",
      "Comparte proyectos musicales hechos con apoyo de IA transparente, enlaza tus lanzamientos en YouTube o SoundCloud, intercambia consejos de herramientas y conecta con músicos de tu ciudad."
    )
  );
  page.append(head);

  const layout = el("div", "comm-layout");

  // Left column: Feed + filters
  const feedCol = el("div", "comm-feed-col");

  const toolbar = el("div", "comm-toolbar");
  const pills = el("div", "comm-pills");
  const pillBtns = [];
  let activeCategory = "Todos";
  let searchQuery = "";
  let livePosts = [];
  let backendOnline = true;
  const likedLocal = new Set();

  const searchWrap = el("label", "comm-search");
  const searchInput = el("input");
  searchInput.type = "search";
  searchInput.placeholder = "Buscar artista, ciudad, herramienta…";
  searchWrap.append(el("span", "sr-only", "Buscar en comunidad"), searchInput);
  toolbar.append(pills, searchWrap);

  const feedStatus = el("p", "comm-status", "Cargando publicaciones de la comunidad…");
  feedStatus.setAttribute("role", "status");
  const list = el("div", "comm-list");

  function renderPostCard(post) {
    const card = el("article", "comm-card" + (post.editorial ? " is-editorial" : ""));
    const top = el("div", "comm-card-top");
    const leftMeta = el("div", "comm-card-badges");
    leftMeta.append(el("span", "comm-cat", post.category));
    if (post.editorial) leftMeta.append(el("span", "comm-sample-badge", "Ejemplo editorial"));
    top.append(leftMeta, el("span", "comm-date", formatDate(post.created)));

    const authorLine = el("p", "comm-author");
    authorLine.append(el("strong", "", post.author));
    if (post.city) authorLine.append(document.createTextNode(" · " + post.city));

    const title = el("h2", "comm-card-title", post.title);
    const body = el("p", "comm-card-body", post.body);

    card.append(top, authorLine, title, body);

    if (post.tools) {
      const strip = el("div", "comm-tools-strip");
      strip.append(el("span", "eyebrow", "Transparencia IA y proceso"), el("p", "", post.tools));
      card.append(strip);
    }

    const linksBar = el("div", "comm-card-extras");
    if (post.media_url && post.media_url.startsWith("https://")) {
      const ext = el("a", "comm-media-link", "Escuchar / ver difusión ↗");
      ext.href = post.media_url;
      ext.target = "_blank";
      ext.rel = "noopener noreferrer";
      linksBar.append(ext);
    }
    if (post.contact) {
      linksBar.append(el("span", "comm-contact-chip", "Contacto: " + post.contact));
    }
    if (linksBar.children.length) card.append(linksBar);

    // Interaction footer: Like + Replies thread
    const foot = el("div", "comm-card-foot");
    const likeBtn = el("button", "comm-like-btn", `Apoyar · ${post.likes || 0}`);
    likeBtn.type = "button";
    likeBtn.disabled = Boolean(post.editorial) || likedLocal.has(post.id);
    likeBtn.addEventListener("click", async () => {
      if (post.editorial || likedLocal.has(post.id)) return;
      likeBtn.disabled = true;
      try {
        const res = await apiJson("community/like", { post_id: post.id });
        post.likes = res.likes;
        likedLocal.add(post.id);
        likeBtn.textContent = `Apoyado ✓ · ${post.likes}`;
      } catch {
        likeBtn.disabled = false;
      }
    });
    foot.append(likeBtn);
    card.append(foot);

    // Collapsible replies thread
    const replies = Array.isArray(post.replies) ? post.replies : [];
    const thread = el("details", "comm-thread");
    const summary = el("summary", "", `Respuestas (${replies.length})`);
    const threadBody = el("div", "comm-thread-body");
    const replyList = el("div", "comm-replies");

    function drawReplies() {
      replyList.replaceChildren();
      summary.textContent = `Respuestas (${replies.length})`;
      if (!replies.length) {
        replyList.append(el("p", "comm-empty-reply", "Todavía no hay respuestas. Sé la primera persona en comentar o proponer una colaboración."));
      } else {
        for (const r of replies) {
          const item = el("div", "comm-reply-item");
          item.append(
            el("p", "comm-reply-head", `${r.author} · ${formatDate(r.created)}`),
            el("p", "comm-reply-text", r.body)
          );
          replyList.append(item);
        }
      }
    }
    drawReplies();
    threadBody.append(replyList);

    if (!post.editorial && backendOnline) {
      const rForm = el("form", "comm-reply-form");
      rForm.innerHTML = `
        <label class="comm-mini-field"><span>Tu nombre</span><input name="author" type="text" required minlength="2" maxlength="60" placeholder="Ej. Sofía M."></label>
        <label class="comm-mini-field"><span>Responder al hilo</span><textarea name="body" rows="2" required minlength="3" maxlength="600" placeholder="Comenta su proceso, sugiere una herramienta o deja tu contacto…"></textarea></label>
        <button type="submit" class="button secondary">Publicar respuesta</button>
        <span class="comm-reply-status" role="status"></span>
      `;
      const rStatus = rForm.querySelector(".comm-reply-status");
      rForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = rForm.querySelector("button[type='submit']");
        btn.disabled = true;
        rStatus.textContent = "Enviando…";
        try {
          const res = await apiJson("community/replies", {
            post_id: post.id,
            author: rForm.elements.author.value.trim(),
            body: rForm.elements.body.value.trim(),
          });
          replies.push(res.reply);
          rForm.reset();
          rStatus.textContent = "Respuesta publicada.";
          drawReplies();
        } catch (err) {
          rStatus.textContent = err.message;
        } finally {
          btn.disabled = false;
        }
      });
      threadBody.append(rForm);
    }

    thread.append(summary, threadBody);
    card.append(thread);
    return card;
  }

  function drawFeed() {
    list.replaceChildren();
    for (const btn of pillBtns) btn.setAttribute("aria-pressed", String(btn.dataset.cat === activeCategory));
    const all = [...livePosts, ...STARTER_POSTS];
    const q = searchQuery.trim().toLowerCase();
    const filtered = all.filter((p) => {
      if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
      if (!q) return true;
      return [p.author, p.city, p.title, p.tools, p.body, p.category].join(" ").toLowerCase().includes(q);
    });
    const realCount = livePosts.length;
    feedStatus.textContent = backendOnline
      ? `${realCount} ${realCount === 1 ? "publicación real" : "publicaciones reales"} + ${STARTER_POSTS.length} ejemplos editoriales · Mostrando ${filtered.length}`
      : `Modo sin servidor · Mostrando ${filtered.length} ejemplos editoriales.`;
    if (!filtered.length) {
      list.append(el("p", "comm-empty", "No hay publicaciones que coincidan con ese filtro. Prueba otra categoría o publica la primera."));
      return;
    }
    for (const post of filtered) list.append(renderPostCard(post));
  }

  for (const cat of CATEGORIES) {
    const b = el("button", "comm-pill", cat);
    b.type = "button";
    b.dataset.cat = cat;
    b.addEventListener("click", () => { activeCategory = cat; drawFeed(); });
    pillBtns.push(b);
    pills.append(b);
  }
  searchInput.addEventListener("input", () => { searchQuery = searchInput.value; drawFeed(); });
  feedCol.append(toolbar, feedStatus, list);

  // Right column: Composer form
  const aside = el("aside", "comm-composer");
  aside.append(
    el("p", "eyebrow", "Participa en la red"),
    el("h2", "", "Publicar proyecto o consulta"),
    el("p", "comm-composer-note", "Sin cuentas obligatorias. Enlaza YouTube, SoundCloud o Spotify (solo https://) y declara qué rol cumplió la IA. El equipo modera desde Administración.")
  );

  const form = el("form", "comm-form");
  form.innerHTML = `
    <label class="comm-field"><span>Nombre artístico o banda *</span><input name="author" type="text" required minlength="2" maxlength="60" placeholder="Ej. Dúo Costa Sur"></label>
    <label class="comm-field"><span>Ciudad y género</span><input name="city" type="text" maxlength="60" placeholder="Ej. Lima · Indie / Huayno"></label>
    <label class="comm-field"><span>Tipo de publicación *</span>
      <select name="category">
        <option value="Difusión multimedia">Difusión multimedia</option>
        <option value="Busco colaboración">Busco colaboración</option>
        <option value="Debate e IA">Debate e IA</option>
        <option value="Consejo de herramienta">Consejo de herramienta</option>
      </select>
    </label>
    <label class="comm-field"><span>Título *</span><input name="title" type="text" required minlength="3" maxlength="120" placeholder="Ej. Demo híbrida con guitarra real y coro en Synth V"></label>
    <label class="comm-field"><span>Herramientas IA usadas y tu aporte humano</span><input name="tools" type="text" maxlength="140" placeholder="Ej. Basic Pitch MIDI + voz y cajón grabados en vivo"></label>
    <label class="comm-field"><span>Enlace multimedia opcional (https://)</span><input name="media_url" type="url" maxlength="240" placeholder="https://youtube.com/... o https://soundcloud.com/..."></label>
    <label class="comm-field"><span>Red o contacto opcional (para colaborar)</span><input name="contact" type="text" maxlength="100" placeholder="Ej. @tubanda en Instagram"></label>
    <label class="comm-field"><span>Cuenta tu proceso o consulta *</span><textarea name="body" rows="4" required minlength="10" maxlength="1200" placeholder="Explica qué decidiste conservar, qué descartaste o qué tipo de músico buscas para colaborar…"></textarea></label>
    <button type="submit" class="button">Publicar en comunidad</button>
    <p class="comm-form-status" role="status"></p>
  `;
  const formStatus = form.querySelector(".comm-form-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    formStatus.textContent = "Publicando en la comunidad…";
    try {
      const payload = {
        author: form.elements.author.value.trim(),
        city: form.elements.city.value.trim(),
        category: form.elements.category.value,
        title: form.elements.title.value.trim(),
        tools: form.elements.tools.value.trim(),
        media_url: form.elements.media_url.value.trim(),
        contact: form.elements.contact.value.trim(),
        body: form.elements.body.value.trim(),
      };
      const res = await apiJson("community/posts", payload);
      livePosts.unshift(res.post);
      form.reset();
      activeCategory = "Todos";
      formStatus.textContent = "Tu publicación ya está visible en la comunidad.";
      ctx?.notify?.("Publicación compartida en Comunidad.");
      drawFeed();
    } catch (err) {
      formStatus.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
  aside.append(form);

  layout.append(feedCol, aside);
  page.append(layout);

  // Load real posts from SQLite
  apiJson("community")
    .then((res) => {
      livePosts = Array.isArray(res.posts) ? res.posts : [];
      backendOnline = true;
      drawFeed();
    })
    .catch(() => {
      backendOnline = false;
      drawFeed();
    });

  return page;
}
