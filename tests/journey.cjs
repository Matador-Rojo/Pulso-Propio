// Run with an installed Playwright, Chrome and Python. --pipe is for
// environments that prohibit loopback. Both modes use the production handler.
const assert = require("node:assert/strict");
const {spawn} = require("node:child_process");
const {randomUUID} = require("node:crypto");
const path = require("node:path");
const readline = require("node:readline");
const {chromium} = require(process.env.PLAYWRIGHT_HOME || "playwright");

async function main() {
  const pipe = process.argv.includes("--pipe");
  const password = randomUUID();
  const server = spawn(process.env.PYTHON || "python", [path.join(__dirname,"browser_server.py"), ...(pipe?["--pipe"]:[])],
    {env:{...process.env,PULSO_TEST_PASSWORD:password},stdio:["pipe","pipe","inherit"]});
  let browser;
  try {
    const lines = readline.createInterface({input:server.stdout});
    const pending = new Map();
    const {port} = await new Promise((resolve,reject)=>{
      lines.once("line",line=>resolve(JSON.parse(line)));server.once("error",reject);
      server.once("exit",code=>reject(new Error("Python terminó con "+code)));
    });
    let serial=0;
    lines.on("line",line=>{const res=JSON.parse(line);const finish=pending.get(res.id);pending.delete(res.id);finish(res);});
    const url="http://127.0.0.1:"+port;
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN || undefined});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.setDefaultTimeout(9000);
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    if (pipe) await page.route(url+"/**",async route=>{
      const req=route.request(), dest=new URL(req.url()),id=++serial;
      const headers=await req.allHeaders();
      headers.host=dest.host;
      const packet={id,method:req.method(),path:dest.pathname+dest.search,headers,body:req.postDataBuffer()?.toString("base64")||""};
      const response=new Promise(resolve=>pending.set(id,resolve));
      server.stdin.write(JSON.stringify(packet)+"\n");
      const res=await response;
      await route.fulfill({status:res.status,headers:res.headers,body:Buffer.from(res.body,"base64")});
    });
    const goto=async route=>{
      await page.goto(url+"/#/"+route);
      await page.locator("main h1").waitFor();
      assert.doesNotMatch(await page.locator("main h1").textContent(),/No se pudo|no encontrada/);
    };
    await goto("");
    await page.getByRole("button",{name:"Reproducir Surco abierto"}).click();
    await page.waitForFunction(()=>document.querySelector("audio").currentTime>.1);
    await page.getByRole("button",{name:"Pausar Surco abierto"}).click();
    if(process.env.PULSO_SCREEN) await page.screenshot({path:process.env.PULSO_SCREEN});
    await page.locator(".hero-actions a").first().click();
    await page.locator(".guide-row").first().click();
    await page.getByRole("button",{name:"Guardar en favoritos"}).click();
    await page.getByRole("button",{name:"Marcar como leída"}).click();
    await page.locator(".guide-quiz input").first().check();
    await page.getByRole("button",{name:"Comprobar respuesta"}).click();
    await page.reload();
    assert.equal(await page.getByRole("button",{name:/En favoritos/}).getAttribute("aria-pressed"),"true");
    await goto("cuaderno");
    assert.match(await page.locator(".note-metrics").innerText(),/1\/12/);
    await goto("laboratorio");
    await page.locator("main select").selectOption("bell");
    await page.getByRole("button",{name:/Escuchar mi versión/}).click();
    await page.reload();
    assert.equal(await page.locator("main select").inputValue(),"bell");
    for (const film of ["silencio","timbre","balance"]) {
      await goto("videos/"+film);
      const result=await page.locator("video").evaluate(async v=>{
        v.muted=true;await v.play();
        await new Promise(resolve=>v.requestVideoFrameCallback(resolve));
        v.pause();return [v.videoWidth,v.duration,v.textTracks.length];
      });
      assert.ok(result[0]>=640 && Math.abs(result[1]-28)<.3 && result[2]>0);
    }
    await goto("herramientas");
    await page.locator("main input").first().fill("kits");
    assert.equal(await page.locator(".catalog-record").count(),1);
    await goto("galeria");
    await page.locator(".gallery-frame").first().click();
    assert.ok(await page.locator("dialog").isVisible());
    await page.keyboard.press("Escape");
    await goto("checklist");
    await page.locator("#release-title").fill("Ficha de control");
    await page.reload();
    assert.equal(await page.locator("#release-title").inputValue(),"Ficha de control");
    const file = page.waitForEvent("download");
    await page.locator("[data-export]").click();
    assert.match((await file).suggestedFilename(),/\.pdf$/);
    await goto("evaluacion");
    for(const field of ["navigation","usefulness","clarity"]) await page.locator('[name="'+field+'"][value="4"]').check();
    await page.locator('[name="highlight"]').fill("Registro temporal de integración");
    await page.locator('main input[type="checkbox"]').check();
    await page.getByRole("button",{name:"Enviar evaluación"}).click();
    await page.getByText("Tu evaluación quedó guardada.").waitFor();
    await goto("admin");
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button",{name:"Ingresar"}).click();
    await page.locator(".pp-record summary").first().click();
    await page.getByText("Registro temporal de integración",{exact:true}).waitFor();
    await page.getByText("Prueba simulada del cuestionario").click();
    assert.match(await page.locator("main").innerText(),/23 registros/);
    const csv=page.waitForEvent("download");
    await page.getByRole("link",{name:"Descargar CSV"}).click();
    assert.match((await csv).suggestedFilename(),/\.csv$/);
    await page.locator('textarea[name="body"]').fill("Nota editorial de prueba");
    await page.getByRole("button",{name:"Publicar nota"}).click();
    await page.getByText("Nota publicada en la lección.").waitFor();
    await page.locator('textarea[name="intro"]').fill("Introducción publicada en la prueba.");
    await page.getByRole("button",{name:"Publicar introducción"}).click();
    await page.getByText("Cambios publicados en la lección.").waitFor();
    await page.getByRole("button",{name:"Cerrar sesión"}).click();
    await page.locator('input[type="password"]').waitFor();
    await goto("guia/introduccion");
    await page.getByText("Nota editorial de prueba",{exact:true}).waitFor();
    assert.equal(await page.locator(".guide-lead").textContent(),"Introducción publicada en la prueba.");
    await page.setViewportSize({width:360,height:800});
    for(const route of ["","guia","guia/introduccion","laboratorio","videos","casos","herramientas","galeria","cuaderno","checklist","evaluacion","admin"]){
      await goto(route);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), "Desbordamiento móvil en "+route);
      if(!route && process.env.PULSO_MOBILE) await page.screenshot({path:process.env.PULSO_MOBILE});
    }
    assert.deepEqual(errors,[]);
    console.log("Recorrido integrado verificado: 12 vistas móviles, audio, 3 videos, lección, cuaderno, laboratorio, catálogo, galería, PDF, envío, admin, CSV y nota pública.");
  } finally {
    await browser?.close();
    if(pipe) server.stdin.end(); else server.kill();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
