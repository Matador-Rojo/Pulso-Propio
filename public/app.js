import { lessons } from "./curriculum.js";
import { renderGuide, renderCases } from "./guide.js";
import { renderLab, renderVideos } from "./studio.js";
import { renderCatalog } from "./catalog.js";
import { renderChecklist } from "./checklist.js";
import { renderGallery } from "./gallery.js";
import { renderAdmin, renderFeedback } from "./admin.js";

const main = document.querySelector("main");
const notice = document.querySelector("#notice");
const validIds = new Set(lessons.map(lesson => lesson.id));
const key = "pulso-propio:cuaderno:v1";
let messageTimer;
function notify(message) {
  clearTimeout(messageTimer);
  notice.textContent = message;
  messageTimer = setTimeout(() => {notice.textContent = "";}, 4200);
}
function readState() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(key)) || {}; }
  catch { notify("El cuaderno se abrirá en esta sesión."); }
  const ids = field => Array.isArray(stored[field]) ? [...new Set(stored[field].filter(id => validIds.has(id)))] : [];
  const table = field => Object.fromEntries(Object.entries(stored[field] || {}).filter(([id]) => validIds.has(id)));
  return {completed:ids("completed"),favorites:ids("favorites"),recent:ids("recent"),answers:table("answers"),reflections:table("reflections"),studioMix:stored.studioMix};
}
const state = readState();
function save() {
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
const ctx = {state, save, notify, link};
const arrow = '<span class="arrow" aria-hidden="true">→</span>';
const sections = [
  ["guia", "Guía multimedia", "Recorre las 12 lecciones, desde la primera idea hasta los créditos."],
  ["laboratorio", "Laboratorio musical", "Cambia el timbre, mueve el tempo y escucha tu versión."],
  ["checklist", "Antes de publicar", "Revisa permisos y aportes. Descarga la ficha de tu canción."]
];
const more = [
  ["videos","Videos de escucha"],["casos","Casos prácticos"],["herramientas","Catálogo de herramientas"],
  ["cuaderno","Mi cuaderno"],["evaluacion","Evaluar la experiencia"]
];
function home() {
  const page = el("div","home");
  page.innerHTML = `<section class="hero">
    <div class="hero-copy"><p class="kicker"><span class="pulse-dot"></span>Música e inteligencia artificial</p>
    <h1><span>La IA propone.</span><em>Tú decides.</em></h1>
    <p class="intro-copy">Una guía multimedia para artistas emergentes del Perú. Explora la IA en tu música, escucha alternativas y decide qué lleva tu firma.</p>
    <div class="hero-actions"><a class="button" href="#/guia">Explorar la guía ${arrow}</a><a class="button secondary" href="#/laboratorio">Ir al laboratorio</a></div></div>
    <div class="cover-player"><div class="sleeve-scene"><img class="vinyl" src="/assets/vinilo.webp" alt="" width="840" height="840"><img class="sleeve" src="/assets/surco-abierto.webp" width="840" height="840" alt="Carátula de Surco abierto, con una onda negra impresa en tinta coral."></div>
    <div class="player-bar"><button class="play-round" type="button" aria-label="Reproducir Surco abierto"><span class="play-icon" aria-hidden="true"></span></button>
    <div class="track-label"><strong>Surco abierto</strong><small>Sesión original · Pulso Propio</small></div>
    <label class="track-wave"><input type="range" min="0" max="16" step=".1" value="0" aria-label="Posición de la pista"></label>
    <span class="clock">0:00 / 0:16</span></div><audio preload="none" src="/assets/surco-abierto.wav"></audio></div></section>
    <section><div class="chapter-head"><h2>Tu mesa de trabajo</h2></div><div class="route-cards"></div></section>
    <section class="art-preview"><div><p class="eyebrow">Galería de afiches</p><h2>Tres miradas sobre una canción</h2><p>Un silencio en la partitura, una flor que revela sus cuerdas y un cartel chicha que pide créditos. Cada pieza te invita a pensar en una decisión de tu propia música.</p><a href="#/galeria" class="button secondary">Visitar la galería ${arrow}</a></div><a class="poster-selection" href="#/galeria" aria-label="Ver los tres afiches de Pulso Propio"><img loading="lazy" src="/art/silencio.png" alt="" width="1024" height="1536"><img loading="lazy" src="/art/anatomia.png" alt="" width="1024" height="1536"><img loading="lazy" src="/art/creditos.png" alt="" width="1024" height="1536"></a></section>
    <section><div class="chapter-head"><h2>Más para explorar</h2></div><div class="tool-links"></div></section>`;
  const cards = page.querySelector(".route-cards");
  for (const [route,title,detail] of sections) {
    const item = link("#/"+route, "", "route-card");
    item.innerHTML = `<div class="route-art"><img src="/assets/${route}.webp" alt="" width="720" height="240"></div><div class="card-body"><h3>${title}${arrow}</h3><p>${detail}</p></div>`;
    cards.append(item);
  }
  for (const [route,title] of more) {
    const a = link("#/"+route,title);
    a.insertAdjacentHTML("beforeend",arrow);
    page.querySelector(".tool-links").append(a);
  }
  const player = page.querySelector(".cover-player");
  const audio = player.querySelector("audio");
  const play = player.querySelector("button");
  const seek = player.querySelector("input");
  const wave = player.querySelector(".track-wave");
  const bars = [];
  for(let i=0;i<28;i++) {
    const bar = el("i");
    bar.style.setProperty("--bar",(16+73*Math.abs(Math.sin(i*2.11)*Math.cos(.47*i)))+"%");
    bar.setAttribute("aria-hidden","true");
    wave.prepend(bar);
    bars.unshift(bar);
  }
  const clock = player.querySelector(".clock");
  const time = value => "0:"+String(Math.floor(value)).padStart(2,"0");
  function update() {
    seek.value = audio.currentTime;
    seek.setAttribute("aria-valuetext",time(audio.currentTime)+" de 16 segundos");
    clock.textContent = time(audio.currentTime)+" / 0:16";
    bars.forEach((bar,i) => bar.classList.toggle("done",i/28 < audio.currentTime/16));
    player.classList.toggle("playing",!audio.paused);
    play.setAttribute("aria-label",(audio.paused?"Reproducir":"Pausar")+" Surco abierto");
  }
  for(const type of ["play","pause","timeupdate","ended","seeked"]) audio.addEventListener(type,update);
  play.onclick = async () => {
    if (!audio.paused) {audio.pause(); return;}
    try {await audio.play();} catch {notify("No se pudo reproducir la pista. Vuelve a intentarlo.");}
  };
  seek.oninput = () => { audio.currentTime = Number(seek.value); };
  return page;
}
function notebook() {
  const page = el("section","page");
  page.append(el("p","eyebrow","Progreso de aprendizaje"),el("h1","","Mi cuaderno"),el("p","muted","Aquí se guardan tus lecturas, respuestas y favoritas en este navegador."));
  const stats = el("div","note-metrics");
  for(const [count,label] of [[state.completed.length+"/12","Lecciones leídas"],[Object.keys(state.answers).length,"Casos respondidos"],[state.favorites.length,"Favoritas"]]) {
    const group = el("div"); group.append(el("strong","",count),el("span","",label)); stats.append(group);
  }
  page.append(stats);
  for (const [title,ids,empty] of [
    ["Últimas lecturas",state.recent,"Abre una lección para retomarla desde aquí."],
    ["Lecciones favoritas",state.favorites,"Guarda una lección desde su página para volver a consultarla."],
    ["Mis decisiones",Object.keys(state.answers),"Al responder un caso, podrás volver a su explicación desde aquí."],
    ["Apuntes de mis canciones",Object.keys(state.reflections).filter(id=>state.reflections[id]),"Las notas que escribas en las lecciones aparecerán aquí."]
  ]) {
    const list = el("div","notelist");
    list.append(el("h2","",title));
    if (!ids.length) list.append(el("p","muted",empty));
    for(const id of ids) {
      const lesson=lessons.find(item=>item.id===id);
      if(!lesson) continue;
      const a=link("#/guia/"+id,lesson.title); a.insertAdjacentHTML("beforeend",arrow); list.append(a);
      if(title.startsWith("Apuntes")) list.append(el("p","",state.reflections[id]));
    }
    page.append(list);
  }
  page.append(link("#/guia","Explorar la guía","button"));
  return page;
}
const routes = {
  inicio:["Inicio",home],guia:["Guía",renderGuide],laboratorio:["Laboratorio",renderLab],
  videos:["Videos",renderVideos],casos:["Casos prácticos",renderCases],herramientas:["Catálogo",renderCatalog],
  checklist:["Antes de publicar",renderChecklist],galeria:["Galería",renderGallery],cuaderno:["Mi cuaderno",notebook],
  evaluacion:["Evaluación",renderFeedback],admin:["Administración",renderAdmin]
};
const explore=document.querySelector(".explore");
document.addEventListener("click",event=>{if(!explore.contains(event.target)||event.target.closest(".menu a")) explore.open=false;});
document.addEventListener("keydown",event=>{if(event.key==="Escape" && explore.open){explore.open=false;explore.querySelector("summary").focus();}});
const skip=document.querySelector(".skip");
skip.onclick=event=>{event.preventDefault();main.focus();main.scrollIntoView();};
function render(focus=false) {
  const [route="inicio",id] = location.hash.replace(/^#\/?/,"").split("/").filter(Boolean);
  const entry=Object.hasOwn(routes,route)?routes[route]:null;
  explore.open=false;
  for(const media of main.querySelectorAll("audio,video")) media.pause();
  for(const node of document.querySelectorAll("[data-nav]")) {
    if(node.dataset.nav===route) node.setAttribute("aria-current","page"); else node.removeAttribute("aria-current");
  }
  explore.classList.toggle("current",!["inicio","guia","laboratorio","cuaderno"].includes(route));
  try {
    if(!entry) throw new Error("route");
    main.replaceChildren(entry[1](ctx,id));
    document.title=(main.querySelector("h1")?.textContent || entry[0])+" · Pulso Propio";
  } catch(error) {
    if(entry) console.error(error);
    const page=el("div","page");
    page.append(el("h1","",entry?"No se pudo abrir esta sección":"Página no encontrada"),link("#/","Volver al inicio","button"));
    main.replaceChildren(page);
  }
  if(focus) {window.scrollTo(0,0);main.focus({preventScroll:true});}
}
window.addEventListener("hashchange",()=>render(true));
window.addEventListener("storage",event=>{if(event.key===key){Object.assign(state,readState());if(location.hash==="#/cuaderno") render();}});
render();
