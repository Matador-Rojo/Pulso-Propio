const { chromium } = require("playwright-core");
const axeSource = require("axe-core").source;
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const CHROME = process.env.CHROME_BIN || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROUTES = [
  "",
  "guia",
  "guia/introduccion",
  "laboratorio",
  "laboratorio/oido",
  "laboratorio/letras",
  "laboratorio/semaforo",
  "laboratorio/creditos",
  "videos",
  "videos/circulacion",
  "casos",
  "herramientas",
  "comunidad",
  "galeria",
  "cuaderno",
  "checklist",
  "evaluacion",
  "admin",
];
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1280", width: 1280, height: 720 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
];

async function main() {
  const outDir = process.env.AUDIT_OUT || null;
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  const themes = (process.env.AUDIT_THEMES || "default").split(",").filter(Boolean);
  const password = randomUUID();
  const server = spawn(process.env.PYTHON || "python", [path.join(__dirname, "browser_server.py")], {
    env: { ...process.env, PULSO_TEST_PASSWORD: password },
    stdio: ["pipe", "pipe", "inherit"],
  });
  let browser;
  try {
    const lines = readline.createInterface({ input: server.stdout });
    const { port } = await new Promise((resolve, reject) => {
      lines.once("line", (line) => resolve(JSON.parse(line)));
      server.once("error", reject);
      server.once("exit", (code) => reject(new Error("Python exited with " + code)));
    });
    const baseUrl = `http://127.0.0.1:${port}`;
    browser = await chromium.launch({ headless: true, executablePath: CHROME });

    const report = {
      consoleErrors: [],
      pageErrors: [],
      badResponses: [],
      overflows: [],
      axeViolations: [],
      smallTouchTargets: [],
      routeCount: ROUTES.length,
      viewportCount: VIEWPORTS.length,
    };

    for (const theme of themes) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, bypassCSP: true });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on("console", (msg) => {
          if (msg.type() === "error") report.consoleErrors.push({ theme, vp: vp.name, text: msg.text() });
        });
        page.on("pageerror", (err) => {
          report.pageErrors.push({ theme, vp: vp.name, message: err.message });
        });
        page.on("response", (res) => {
          if (res.status() >= 400) {
            report.badResponses.push({ theme, vp: vp.name, status: res.status(), url: res.url() });
          }
        });

        await page.goto(baseUrl + "/#/", { waitUntil: "networkidle" });
        if (theme !== "default") {
          await page.evaluate((t) => {
            document.documentElement.dataset.theme = t;
            try { localStorage.setItem("pulso-propio:theme", t); } catch {}
          }, theme);
        }

        for (const route of ROUTES) {
          await page.goto(`${baseUrl}/#/${route}`, { waitUntil: "networkidle" });
          await page.locator("main h1").waitFor();
          await page.waitForTimeout(380);

          const overflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          if (overflow.scrollWidth > overflow.clientWidth) {
            report.overflows.push({ theme, vp: vp.name, route: route || "inicio", ...overflow });
          }

          // Run axe on desktop-1440 and mobile-390 for all themes
          if (vp.name === "desktop-1440" || (vp.name === "mobile-390" && theme === themes[0])) {
            await page.addScriptTag({ content: axeSource });
            const results = await page.evaluate(async () => {
              return await window.axe.run(document, {
                runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] },
              });
            });
            for (const v of results.violations) {
              report.axeViolations.push({
                theme,
                vp: vp.name,
                route: route || "inicio",
                id: v.id,
                impact: v.impact,
                help: v.help,
                count: v.nodes.length,
                sample: v.nodes[0]?.html?.slice(0, 140),
              });
            }
          }

          // Check small touch targets on mobile-390 for primary routes
          if (vp.name === "mobile-390" && theme === themes[0]) {
            const small = await page.evaluate(() => {
              const els = [...document.querySelectorAll("header a, header button, header summary, main button, main a.button, main input[type=checkbox], main input[type=radio]")];
              return els
                .filter((el) => {
                  const r = el.getBoundingClientRect();
                  const style = getComputedStyle(el);
                  return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.opacity !== "0" && (r.width < 44 || r.height < 44);
                })
                .map((el) => {
                  const r = el.getBoundingClientRect();
                  return { tag: el.tagName, text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 32), w: Math.round(r.width), h: Math.round(r.height) };
                });
            });
            if (small.length) {
              report.smallTouchTargets.push({ route: route || "inicio", count: small.length, sample: small.slice(0, 5) });
            }
          }

          // Capture screenshots for key pages
          if (outDir && theme === themes[0] && ["guia", "laboratorio", "laboratorio/oido", "laboratorio/letras"].includes(route)) {
            if (vp.name === "desktop-1440" || vp.name === "mobile-390") {
              const slug = (route || "inicio").replace(/\//g, "-");
              await page.screenshot({ path: path.join(outDir, `${slug}-${vp.name}.png`), fullPage: false });
            }
          }
          if (outDir && theme !== themes[0] && ["guia", "laboratorio/letras"].includes(route) && vp.name === "desktop-1440") {
            const slug = (route || "inicio").replace(/\//g, "-");
            await page.screenshot({ path: path.join(outDir, `${slug}-${theme}-${vp.name}.png`), fullPage: false });
          }
        }
        await context.close();
      }
    }

    const summary = {
      consoleErrors: report.consoleErrors.length,
      pageErrors: report.pageErrors.length,
      badResponses: report.badResponses.length,
      overflows: report.overflows.length,
      axeCriticalSerious: report.axeViolations.filter((v) => v.impact === "critical" || v.impact === "serious").length,
      axeModerateMinor: report.axeViolations.filter((v) => v.impact !== "critical" && v.impact !== "serious").length,
      smallTouchTargetRoutes: report.smallTouchTargets.length,
    };
    console.log("SUMMARY:", JSON.stringify(summary, null, 2));
    if (report.overflows.length) console.log("OVERFLOWS:", JSON.stringify(report.overflows, null, 2));
    if (report.consoleErrors.length) console.log("CONSOLE_ERRORS:", JSON.stringify(report.consoleErrors, null, 2));
    if (report.pageErrors.length) console.log("PAGE_ERRORS:", JSON.stringify(report.pageErrors, null, 2));
    if (report.badResponses.length) console.log("BAD_RESPONSES:", JSON.stringify(report.badResponses, null, 2));
    if (report.axeViolations.length) {
      const grouped = {};
      for (const v of report.axeViolations) {
        const k = `${v.impact}|${v.id}|${v.theme}`;
        if (!grouped[k]) grouped[k] = { impact: v.impact, id: v.id, theme: v.theme, help: v.help, routes: [], sample: v.sample };
        grouped[k].routes.push(`${v.route}@${v.vp}(${v.count})`);
      }
      console.log("AXE_VIOLATIONS:", JSON.stringify(Object.values(grouped), null, 2));
    }
    if (report.smallTouchTargets.length) {
      console.log("SMALL_TOUCH_TARGETS:", JSON.stringify(report.smallTouchTargets.slice(0, 6), null, 2));
    }

    if (process.env.AUDIT_STRICT === "1") {
      if (summary.consoleErrors || summary.pageErrors || summary.badResponses || summary.overflows || summary.axeCriticalSerious) {
        process.exitCode = 1;
      }
    }
  } finally {
    await browser?.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
