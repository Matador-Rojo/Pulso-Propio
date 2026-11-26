(() => {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const colors = { light: "#f5f1e6", dark: "#11110f", contrast: "#000000" };
  let theme = "";
  let scale = "";
  try {
    theme = localStorage.getItem("pulso-propio:theme") || "";
    scale = localStorage.getItem("pulso-propio:text-scale") || "";
  } catch {}
  if (!Object.hasOwn(colors, theme)) {
    theme = window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches
      ? "contrast"
      : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }
  if (!["sm", "md", "lg"].includes(scale)) scale = "md";
  root.dataset.theme = theme;
  root.dataset.scale = scale;
  if (meta) meta.setAttribute("content", colors[theme]);
})();
