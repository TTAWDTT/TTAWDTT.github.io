const routes = {
  home: {
    type: "home",
    title: "首页",
    eyebrow: "首页",
    subtitle: ""
  },
  about: {
    type: "md",
    title: "关于我",
    eyebrow: "关于",
    subtitle: "自我介绍",
    mdPath: "content/aboutme.md"
  },
  docs: {
    type: "md",
    title: "文章",
    eyebrow: "文章",
    subtitle: "写作与思考",
    mdPath: "docs/index.md"
  }
};

const docAliases = {
  "design-notes": "GraphSkills"
};

const pageEls = {
  home: document.querySelector('[data-page="home"]'),
  md: document.querySelector('[data-page="md"]')
};

const headerEls = {
  eyebrow: document.getElementById("page-eyebrow"),
  title: document.getElementById("page-title"),
  subtitle: document.getElementById("page-subtitle")
};

const contentEl = document.getElementById("page-content");
const navLinks = Array.from(document.querySelectorAll("[data-route]"));
const homeListEl = document.getElementById("home-posts");
const themeToggle = document.getElementById("theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const snowCanvas = document.getElementById("snow-canvas");
let snowState = null;

function setActiveNav(routeKey) {
  navLinks.forEach((link) => {
    const isDocs = routeKey === "docs" && link.dataset.route === "docs";
    const isActive = link.dataset.route === routeKey || isDocs;
    link.classList.toggle("active", isActive);
  });
}

function showPage(pageKey) {
  Object.entries(pageEls).forEach(([key, el]) => {
    if (el) {
      el.classList.toggle("active", key === pageKey);
    }
  });
}

function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw || raw === "home") {
    return { ...routes.home, routeKey: "home" };
  }
  if (raw === "about") {
    return { ...routes.about, routeKey: "about" };
  }
  if (raw === "docs") {
    return { ...routes.docs, routeKey: "docs" };
  }
  if (raw.startsWith("docs/")) {
    let slug = raw.slice(5).replace(/\.md$/, "");
    if (docAliases[slug]) {
      slug = docAliases[slug];
    }
    return {
      type: "md",
      routeKey: "docs",
      title: slugToTitle(slug),
      eyebrow: "文章",
      subtitle: "",
      mdPath: `docs/${slug}.md`
    };
  }
  return { ...routes.home, routeKey: "home" };
}

function slugToTitle(slug) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function setHeader({ eyebrow, title, subtitle }) {
  headerEls.eyebrow.textContent = eyebrow || "";
  headerEls.title.textContent = title || "";
  headerEls.subtitle.textContent = subtitle || "";
  document.title = title ? `TTAWDTT | ${title}` : "TTAWDTT";
}

function splitTitle(markdown) {
  const lines = markdown.split(/\r?\n/);
  let title = null;
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    const match = line.match(/^#\s+(.+)/);
    if (match) {
      title = match[1].trim();
      bodyStart = i + 1;
    }
    break;
  }
  const body = lines.slice(bodyStart).join("\n").replace(/^\s*\n/, "");
  return { title, body };
}

function initMarked() {
  if (window.marked && typeof window.marked.setOptions === "function") {
    const renderer = new window.marked.Renderer();
    renderer.br = () => "<br><br>";
    window.marked.setOptions({
      mangle: false,
      headerIds: true,
      breaks: true,
      renderer
    });
  }
}

function initSnow() {
  if (!snowCanvas) {
    return;
  }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const ctx = snowCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  snowState = {
    ctx,
    width: 0,
    height: 0,
    flakes: [],
    color: getSnowColor(),
    lastTime: 0
  };
  resizeSnow();
  const count = Math.min(Math.floor(window.innerWidth / 18), 120);
  snowState.flakes = Array.from({ length: count }, () => createFlake());
  window.addEventListener("resize", resizeSnow);
  requestAnimationFrame(stepSnow);
}

function getSnowColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--snow").trim() || "rgba(255,255,255,0.6)";
}

function resizeSnow() {
  if (!snowState) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  snowCanvas.width = Math.floor(width * dpr);
  snowCanvas.height = Math.floor(height * dpr);
  snowCanvas.style.width = `${width}px`;
  snowCanvas.style.height = `${height}px`;
  snowState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  snowState.width = width;
  snowState.height = height;
}

function createFlake() {
  const size = 0.8 + Math.random() * 2.2;
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: size,
    speed: 0.25 + Math.random() * 0.9,
    drift: -0.4 + Math.random() * 0.8,
    opacity: 0.35 + Math.random() * 0.55
  };
}

function stepSnow(timestamp) {
  if (!snowState) {
    return;
  }
  const delta = snowState.lastTime ? timestamp - snowState.lastTime : 16;
  snowState.lastTime = timestamp;
  const speedFactor = delta / 16;
  const { ctx, width, height } = snowState;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = snowState.color;

  snowState.flakes.forEach((flake) => {
    flake.y += flake.speed * speedFactor;
    flake.x += flake.drift * speedFactor;
    if (flake.y > height + 10) {
      flake.y = -10;
      flake.x = Math.random() * width;
    }
    if (flake.x > width + 10) {
      flake.x = -10;
    }
    if (flake.x < -10) {
      flake.x = width + 10;
    }
    ctx.globalAlpha = flake.opacity;
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  requestAnimationFrame(stepSnow);
}

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures for file:// or privacy-restricted contexts.
  }
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  safeSetItem("theme", next);
  if (themeToggle) {
    themeToggle.textContent = next === "dark" ? "浅色模式" : "深色模式";
  }
  if (themeMeta) {
    themeMeta.setAttribute("content", next === "dark" ? "#141413" : "#faf9f5");
  }
  if (snowState) {
    snowState.color = getSnowColor();
  }
}

function getPreferredTheme() {
  const stored = safeGetItem("theme");
  if (stored) {
    return stored;
  }
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function renderMarkdown(markdown) {
  if (window.marked && typeof window.marked.parse === "function") {
    return window.marked.parse(markdown);
  }
  return `<pre>${escapeHtml(markdown)}</pre>`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveAssetPath(assetPath, mdPath) {
  if (!assetPath) {
    return assetPath;
  }
  if (/^(https?:|data:|#|\/)/.test(assetPath)) {
    return assetPath;
  }
  if (assetPath.startsWith("docs/") || assetPath.startsWith("content/")) {
    return assetPath;
  }
  const clean = assetPath.replace(/^\.\/+/, "");
  const baseDir = mdPath.split("/").slice(0, -1).join("/");
  if (mdPath.startsWith("docs/docs/")) {
    return `docs/${clean}`;
  }
  return baseDir ? `${baseDir}/${clean}` : clean;
}

function normalizeMarkdown(raw, mdPath) {
  let output = raw.replace(/!\[\[([^\]]+)\]\]/g, (match, inner) => {
    const parts = inner.split("|");
    const file = parts[0].trim();
    const alt = (parts[1] || file).trim();
    const resolved = resolveAssetPath(file, mdPath);
    return `![${alt}](${normalizeUrl(resolved)})`;
  });
  output = output.replace(/(^|[^!])\[\[([^\]]+)\]\]/g, (match, prefix, inner) => {
    const parts = inner.split("|");
    const target = parts[0].trim();
    const text = (parts[1] || target).trim();
    const file = target.split("#")[0].trim();
    if (!file) {
      return match;
    }
    const hasExt = /\.[a-z0-9]+$/i.test(file);
    const href = hasExt ? file : `docs/${file}.md`;
    return `${prefix}[${text}](${href})`;
  });
  return output;
}

function rewriteLinks(container) {
  const links = Array.from(container.querySelectorAll("a[href]"));
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) {
      return;
    }
    if (href.endsWith(".md")) {
      const clean = href.replace(/^\.?\//, "").replace(/^docs\//, "").replace(/\.md$/, "");
      link.setAttribute("href", `#/docs/${clean}`);
      return;
    }
    if (/^https?:\/\//.test(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
    }
  });
}

function rewriteAssets(container, mdPath) {
  const images = Array.from(container.querySelectorAll("img[src]"));
  images.forEach((img) => {
    const src = img.getAttribute("src");
    if (!src || /^(https?:|data:|#|\/)/.test(src)) {
      return;
    }
    const resolved = resolveAssetPath(src, mdPath);
    const normalized = normalizeUrl(resolved);
    img.setAttribute("src", normalized);
    attachImageFallback(img, normalized, mdPath);
  });
}

function normalizeUrl(url) {
  try {
    return encodeURI(decodeURI(url));
  } catch (error) {
    return encodeURI(url);
  }
}

function attachImageFallback(img, src, mdPath) {
  const fallbacks = buildImageFallbacks(src, mdPath);
  if (!fallbacks.length) {
    return;
  }
  let index = 0;
  const handler = () => {
    if (index >= fallbacks.length) {
      img.removeEventListener("error", handler);
      return;
    }
    const next = fallbacks[index];
    index += 1;
    img.setAttribute("src", next);
  };
  img.addEventListener("error", handler);
}

function buildImageFallbacks(src, mdPath) {
  const basename = src.split("/").pop();
  if (!basename) {
    return [];
  }
  const candidates = [];
  if (mdPath.startsWith("docs/docs/")) {
    candidates.push(`docs/${basename}`);
  } else if (mdPath.startsWith("docs/")) {
    candidates.push(`docs/docs/${basename}`);
  } else if (mdPath.startsWith("content/")) {
    candidates.push(`content/${basename}`);
    candidates.push(`content/images/${basename}`);
  }
  candidates.push(`content/${basename}`);
  candidates.push(`content/images/${basename}`);
  candidates.push(`docs/${basename}`);
  candidates.push(`docs/images/${basename}`);
  return Array.from(new Set(candidates.map(normalizeUrl))).filter((item) => item !== src);
}

function extractDocLinks(markdown) {
  const links = [];
  const regex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  let match = regex.exec(markdown);
  while (match) {
    links.push({ text: match[1].trim(), href: match[2].trim() });
    match = regex.exec(markdown);
  }
  return links;
}

function toDocRoute(href) {
  const clean = href
    .replace(/^\.?\//, "")
    .replace(/^docs\//, "")
    .replace(/\.md$/, "");
  return `#/docs/${clean}`;
}

async function hydrateHomeList() {
  if (!homeListEl) {
    return;
  }
  try {
    const raw = await loadMarkdown("docs/index.md");
    const normalized = normalizeMarkdown(raw, "docs/index.md");
    const links = extractDocLinks(normalized)
      .filter((item) => item.href.includes(".md"))
      .map((item) => ({
        text: item.text || "未命名",
        href: toDocRoute(item.href)
      }));
    if (!links.length) {
      return;
    }
    homeListEl.innerHTML = links
      .map(
        (item) =>
          `<li><a href="${item.href}">${escapeHtml(item.text)}</a></li>`
      )
      .join("");
  } catch (error) {
    // Keep the static list if docs index cannot be loaded.
  }
}

async function loadMarkdown(path) {
  const response = await fetch(encodeURI(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

async function loadMarkdownWithFallback(mdPath) {
  try {
    return { raw: await loadMarkdown(mdPath), path: mdPath };
  } catch (error) {
    let altPath = null;
    if (mdPath.startsWith("docs/docs/")) {
      altPath = mdPath.replace(/^docs\/docs\//, "docs/");
    } else if (mdPath.startsWith("docs/")) {
      altPath = mdPath.replace(/^docs\//, "docs/docs/");
    }
    if (!altPath) {
      throw error;
    }
    return { raw: await loadMarkdown(altPath), path: altPath };
  }
}

async function renderRoute() {
  const route = parseRoute();
  setActiveNav(route.routeKey);

  if (route.type === "home") {
    showPage("home");
    document.title = "TTAWDTT | 首页";
    return;
  }

  if (route.type === "md") {
    showPage("md");
    setHeader(route);
    try {
      const { raw, path } = await loadMarkdownWithFallback(route.mdPath);
      const normalized = normalizeMarkdown(raw, path);
      const { title: mdTitle, body } = splitTitle(normalized);
      if (mdTitle) {
        setHeader({ ...route, title: mdTitle });
      }
      contentEl.innerHTML = renderMarkdown(body);
      rewriteLinks(contentEl);
      rewriteAssets(contentEl, path);
    } catch (error) {
      window.location.hash = "#/home";
    }
    return;
  }
}

initMarked();
function initPage() {
  applyTheme(getPreferredTheme());
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
  initSnow();
  hydrateHomeList();
  renderRoute();
}

window.addEventListener("hashchange", renderRoute);
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}
