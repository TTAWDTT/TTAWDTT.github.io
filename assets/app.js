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
  },
  images: {
    type: "images",
    title: "相册",
    eyebrow: "相册",
    subtitle: "",
    dataPath: "images/manifest.json"
  }
};

const docAliases = {
  "design-notes": "GraphSkills"
};

const pageEls = {
  home: document.querySelector('[data-page="home"]'),
  md: document.querySelector('[data-page="md"]'),
  images: document.querySelector('[data-page="images"]')
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
const atmosphereToggle = document.getElementById("atmos-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const snowCanvas = document.getElementById("snow-canvas");
let snowState = null;
const imagesTitleEl = document.getElementById("images-title");
const imagesSubtitleEl = document.getElementById("images-subtitle");
const imagesAlbumsEl = document.getElementById("images-albums");
const albumFiltersEl = document.getElementById("album-filters");
const docSearchEl = document.getElementById("doc-search");
const docSearchInput = document.getElementById("doc-search-input");
const docSearchResults = document.getElementById("doc-search-results");
const docTagsEl = document.getElementById("doc-tags");
const tocEl = document.getElementById("doc-toc");
const tocBodyEl = document.getElementById("toc-body");
const docNavEl = document.getElementById("doc-nav");
const docSeriesEl = document.getElementById("doc-series");
const docBacklinksEl = document.getElementById("doc-backlinks");
const readingProgressEl = document.getElementById("reading-progress");
const lightboxEl = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxTitle = document.getElementById("lightbox-title");
const lightboxCount = document.getElementById("lightbox-count");
const lightboxNote = document.getElementById("lightbox-note");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");
const backToTop = document.getElementById("back-to-top");

const bgmRoot = document.getElementById("bgm");
const bgmToggle = document.getElementById("bgm-toggle");
const bgmPanel = document.getElementById("bgm-panel");
const bgmTitleEl = document.getElementById("bgm-title");
const bgmSubtitle = document.getElementById("bgm-subtitle");
const bgmVisCanvas = document.getElementById("bgm-vis");
const bgmVolumeInput = document.getElementById("bgm-volume");
const bgmPrevBtn = document.getElementById("bgm-prev");
const bgmNextBtn = document.getElementById("bgm-next");

const bgmState = {
  enabled: false,
  preferredEnabled: false,
  volume: 0.4,
  manifestSrc: "assets/music/manifest.json",
  playlist: [],
  trackIndex: 0,
  trackTitle: "",
  audioEl: null,
  mediaSource: null,
  context: null,
  master: null,
  musicBus: null,
  compressor: null,
  reverbIn: null,
  reverbOut: null,
  convolver: null,
  analyser: null,
  analyserData: null,
  timeData: null,
  noiseBuffer: null,
  visCtx: null,
  visRaf: 0,
  nextNoteTime: 0,
  interval: 0,
  startedAt: 0,
  lastChordIndex: -1,
  nodeRefs: [],
  vis: {
    dpr: 1,
    width: 0,
    height: 0,
    particles: []
  }
};

const docState = {
  loaded: false,
  loadingPromise: null,
  list: [],
  meta: {},
  backlinks: {},
  series: {}
};

const lightboxState = {
  items: [],
  index: 0
};

const atmosphereModes = ["snow", "rain", "none"];
const calloutLabels = {
  note: "提示",
  info: "信息",
  tip: "想法",
  warning: "注意",
  quote: "引用"
};
const albumState = {};
const activeAlbumFilters = {
  album: "全部",
  tag: "全部",
  year: "全部",
  month: "全部"
};

let docSearchBound = false;
let scrollBound = false;
let keyBindingsBound = false;
let imageRevealObserver = null;
let aboutViewState = null;
let tocClickBound = false;
let bgmCloseTimer = 0;

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // ignore
  }
}

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
  if (raw === "images") {
    return { ...routes.images, routeKey: "images" };
  }
  if (raw.startsWith("docs/")) {
    let slug = raw.slice(5).replace(/\.md$/, "");
    try {
      slug = decodeURIComponent(slug);
    } catch (error) {
      // Keep original slug if decoding fails.
    }
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

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
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

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }
  const raw = match[1];
  const body = markdown.slice(match[0].length);
  const frontmatter = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const idx = trimmed.indexOf(":");
    if (idx === -1) {
      return;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) {
      return;
    }
    frontmatter[key] = parseFrontmatterValue(value, key);
  });
  return { frontmatter, body };
}

function parseFrontmatterValue(value, key) {
  if (!value) {
    return "";
  }
  const trimmed = value.replace(/^['"]|['"]$/g, "");
  if (key === "tags" || key === "tag") {
    return parseListValue(trimmed);
  }
  if (/^\[.*\]$/.test(trimmed)) {
    return parseListValue(trimmed);
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return { raw, timestamp: parsed };
  }
  const match = raw.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (match) {
    const normalized = `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
    const normalizedParsed = Date.parse(normalized);
    return {
      raw: normalized,
      timestamp: Number.isNaN(normalizedParsed) ? null : normalizedParsed
    };
  }
  return { raw, timestamp: null };
}

function parseListValue(value) {
  const cleaned = value.replace(/^\[|\]$/g, "");
  return cleaned
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*?\]\([^)]+\)/g, "")
    .replace(/\[[^\]]*?\]\([^)]+\)/g, "")
    .replace(/#+\s/g, "")
    .replace(/>\s/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadingTime(text) {
  const length = text.replace(/\s/g, "").length;
  const minutes = Math.max(1, Math.ceil(length / 500));
  return minutes;
}

function extractDocLinksFromMarkdown(markdown) {
  const links = new Set();
  const mdRegex = /\[[^\]]+]\(([^)]+\.md)\)/g;
  let mdMatch = mdRegex.exec(markdown);
  while (mdMatch) {
    links.add(mdMatch[1]);
    mdMatch = mdRegex.exec(markdown);
  }
  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  let wikiMatch = wikiRegex.exec(markdown);
  while (wikiMatch) {
    const target = wikiMatch[1].split("|")[0].trim();
    if (target) {
      links.add(target);
    }
    wikiMatch = wikiRegex.exec(markdown);
  }
  return Array.from(links);
}

function normalizeDocLink(link) {
  if (!link) {
    return null;
  }
  const cleaned = link.replace(/^\.?\//, "").replace(/^docs\//, "");
  if (cleaned.endsWith(".md")) {
    return `docs/${cleaned.replace(/\.md$/, "")}.md`;
  }
  return `docs/${cleaned}.md`;
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
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = snowCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  snowState = {
    ctx,
    width: 0,
    height: 0,
    flakes: [],
    color: getAtmosphereColor("snow"),
    lastTime: null,
    mode: "snow",
    rafId: null,
    frameInterval: reducedMotion ? 1000 / 18 : 1000 / 30,
    reducedMotion
  };
  resizeSnow();
  window.addEventListener("resize", resizeSnow);
}

function getSnowColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--snow").trim() || "rgba(255,255,255,0.6)";
}

function getAtmosphereColor(mode) {
  if (mode === "rain") {
    return getComputedStyle(document.documentElement).getPropertyValue("--rain").trim() || "rgba(255,255,255,0.6)";
  }
  return getSnowColor();
}

function resizeSnow() {
  if (!snowState) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ctx = snowCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  snowState.ctx = ctx;
  snowCanvas.width = Math.floor(width * dpr);
  snowCanvas.height = Math.floor(height * dpr);
  snowCanvas.style.width = `${width}px`;
  snowCanvas.style.height = `${height}px`;
  snowState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  snowState.width = width;
  snowState.height = height;
  resetAtmosphereParticles();
}

function createFlake() {
  const size = 1.4 + Math.random() * 3.6;
  const shapeRoll = Math.random();
  const shape = shapeRoll > 0.55 ? "star" : "dot";
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: size,
    speed: 0.35 + Math.random() * 1.2,
    drift: -0.5 + Math.random() * 1,
    opacity: 0.4 + Math.random() * 0.55,
    rotation: Math.random() * Math.PI * 2,
    shape
  };
}

function createRainDrop() {
  const length = 10 + Math.random() * 16;
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    length,
    speed: 6 + Math.random() * 6,
    drift: -1 + Math.random() * 2,
    opacity: 0.3 + Math.random() * 0.4
  };
}

function resetAtmosphereParticles() {
  if (!snowState) {
    return;
  }
  const density = snowState.mode === "rain" ? 18 : 12;
  const maxCount = snowState.mode === "rain" ? 140 : 180;
  const count = Math.min(Math.floor(window.innerWidth / density), maxCount);
  snowState.flakes = Array.from({ length: count }, () =>
    snowState.mode === "rain" ? createRainDrop() : createFlake()
  );
}

function startAtmosphere() {
  if (!snowState) {
    return;
  }
  if (snowState.rafId) {
    cancelAnimationFrame(snowState.rafId);
    snowState.rafId = null;
  }
  snowState.lastTime = null;
  snowState.rafId = requestAnimationFrame(stepSnow);
}

function stopAtmosphere() {
  if (!snowState) {
    return;
  }
  if (snowState.rafId) {
    cancelAnimationFrame(snowState.rafId);
    snowState.rafId = null;
  }
  snowState.ctx.clearRect(0, 0, snowState.width, snowState.height);
}

function updateAtmosphereToggle(mode) {
  if (!atmosphereToggle) {
    return;
  }
  const label = mode === "rain" ? "雨幕" : mode === "none" ? "无氛围" : "雪景";
  atmosphereToggle.textContent = label;
}

function applyAtmosphere(mode) {
  const next = atmosphereModes.includes(mode) ? mode : "snow";
  document.documentElement.dataset.atmosphere = next;
  safeSetItem("atmosphere", next);
  updateAtmosphereToggle(next);
  if (!snowCanvas) {
    return;
  }
  if (!snowState) {
    snowCanvas.style.display = next === "none" ? "none" : "block";
    return;
  }
  snowState.mode = next;
  snowState.color = getAtmosphereColor(next);
  if (next === "none") {
    snowCanvas.style.display = "none";
    stopAtmosphere();
    return;
  }
  snowCanvas.style.display = "block";
  stopAtmosphere();
  resizeSnow();
  startAtmosphere();
}

function getPreferredAtmosphere() {
  const stored = safeGetItem("atmosphere");
  if (stored) {
    return stored;
  }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "none";
  }
  return "snow";
}

function stepSnow(timestamp) {
  if (!snowState) {
    return;
  }
  if (snowState.mode === "none") {
    stopAtmosphere();
    return;
  }
  if (snowState.lastTime === null) {
    snowState.lastTime = timestamp;
  }
  const delta = timestamp - snowState.lastTime;
  if (delta < snowState.frameInterval) {
    snowState.rafId = requestAnimationFrame(stepSnow);
    return;
  }
  snowState.lastTime = timestamp;
  const speedFactor = delta / 16;
  const { ctx, width, height } = snowState;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = snowState.color;

  snowState.flakes.forEach((flake) => {
    flake.y += flake.speed * speedFactor;
    flake.x += flake.drift * speedFactor;
    flake.rotation = flake.rotation ? flake.rotation + 0.004 * speedFactor : 0;
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
    if (snowState.mode === "rain") {
      ctx.strokeStyle = snowState.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(flake.x, flake.y);
      ctx.lineTo(flake.x + flake.drift * 4, flake.y + flake.length);
      ctx.stroke();
    } else if (flake.shape === "star") {
      ctx.save();
      ctx.translate(flake.x, flake.y);
      ctx.rotate(flake.rotation);
      ctx.strokeStyle = snowState.color;
      ctx.lineWidth = Math.max(1, flake.r * 0.18);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-flake.r, 0);
      ctx.lineTo(flake.r, 0);
      ctx.moveTo(0, -flake.r);
      ctx.lineTo(0, flake.r);
      ctx.moveTo(-flake.r * 0.7, -flake.r * 0.7);
      ctx.lineTo(flake.r * 0.7, flake.r * 0.7);
      ctx.moveTo(-flake.r * 0.7, flake.r * 0.7);
      ctx.lineTo(flake.r * 0.7, -flake.r * 0.7);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
  snowState.rafId = requestAnimationFrame(stepSnow);
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
    snowState.color = getAtmosphereColor(snowState.mode || "snow");
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

async function loadDocMeta(docPath) {
  const canonicalPath = docPath;
  const { raw, path } = await loadMarkdownWithFallback(canonicalPath);
  const normalized = normalizeMarkdown(raw, path);
  const { frontmatter, body } = parseFrontmatter(normalized);
  const { title: headerTitle, body: bodyWithoutTitle } = splitTitle(body);
  const title = frontmatter.title || headerTitle || slugToTitle(canonicalPath.split("/").pop().replace(/\.md$/, ""));
  const tags = frontmatter.tags || frontmatter.tag || [];
  const series = frontmatter.series || "";
  const order = frontmatter.order || 0;
  const dateValue = frontmatter.date || frontmatter.time || frontmatter.updated || "";
  const parsedDate = parseDateValue(dateValue);
  const summarySource = frontmatter.summary || frontmatter.description || "";
  const plain = stripMarkdown(bodyWithoutTitle);
  const summary = summarySource || plain.slice(0, 140);
  const readingTime = estimateReadingTime(plain);
  return {
    path: canonicalPath,
    realPath: path,
    title,
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    series,
    order,
    date: parsedDate ? parsedDate.raw : "",
    dateMs: parsedDate ? parsedDate.timestamp : null,
    summary,
    readingTime,
    plain,
    body: bodyWithoutTitle,
    raw: normalized
  };
}

async function ensureDocState() {
  if (docState.loaded) {
    return docState;
  }
  if (docState.loadingPromise) {
    return docState.loadingPromise;
  }
  docState.loadingPromise = (async () => {
    const raw = await loadMarkdown("docs/index.md");
    const normalized = normalizeMarkdown(raw, "docs/index.md");
    const links = extractDocLinks(normalized);
    const docs = links
      .map((item, index) => {
        const href = item.href || "";
        const text = item.text || "";
        const path = normalizeDocLink(href);
        if (!path) {
          return null;
        }
        return {
          path,
          title: text || slugToTitle((path || "").split("/").pop().replace(/\.md$/, "")),
          index
        };
      })
      .filter(Boolean);

    const metas = await Promise.all(
      docs.map(async (doc) => {
        try {
          const meta = await loadDocMeta(doc.path);
          return { ...meta, index: doc.index };
        } catch (error) {
          return {
            path: doc.path,
            realPath: doc.path,
            title: doc.title,
            tags: [],
            series: "",
            index: doc.index,
            date: "",
            dateMs: null,
            summary: "",
            readingTime: 1,
            plain: "",
            body: "",
            raw: ""
          };
        }
      })
    );
    docState.list = metas;
    docState.meta = metas.reduce((acc, item) => {
      acc[item.path] = item;
      return acc;
    }, {});
    buildDocGraph(metas);
    docState.loaded = true;
    return docState;
  })();
  return docState.loadingPromise;
}

function buildDocGraph(docs) {
  const backlinks = {};
  const seriesMap = {};
  docs.forEach((doc) => {
    if (doc.series) {
      if (!seriesMap[doc.series]) {
        seriesMap[doc.series] = [];
      }
      seriesMap[doc.series].push(doc);
    }
  });
  Object.keys(seriesMap).forEach((key) => {
    seriesMap[key].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.title.localeCompare(b.title, "zh");
    });
  });

  docs.forEach((doc) => {
    const links = extractDocLinksFromMarkdown(doc.raw || "");
    links.forEach((link) => {
      const target = normalizeDocLink(link);
      if (!target) {
        return;
      }
      if (!backlinks[target]) {
        backlinks[target] = [];
      }
      backlinks[target].push(doc);
    });
  });
  docState.backlinks = backlinks;
  docState.series = seriesMap;
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
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    if (!img.dataset.caption) {
      img.dataset.caption = img.getAttribute("alt") || "";
    }
    attachImageFallback(img, normalized, mdPath);
  });
}

function renderCallouts(container) {
  const blocks = Array.from(container.querySelectorAll("blockquote"));
  blocks.forEach((block) => {
    const first = block.querySelector("p");
    if (!first) {
      return;
    }
    const text = (first.textContent || "").trim();
    const match = text.match(/^\[!([A-Za-z]+)\]\s*(.*)$/);
    if (!match) {
      return;
    }
    const type = match[1].toLowerCase();
    const title = match[2] || calloutLabels[type] || "提示";
    block.classList.add("callout");
    block.dataset.callout = type;
    first.textContent = title;
    first.classList.add("callout-title");
  });
}

function setupImageReveal(scopeEl) {
  if (!scopeEl) {
    return;
  }
  if (typeof IntersectionObserver === "undefined") {
    return;
  }
  const images = Array.from(scopeEl.querySelectorAll("img"));
  if (!images.length) {
    return;
  }
  if (!imageRevealObserver) {
    imageRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            imageRevealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
  }
  images.forEach((img) => {
    if (img.dataset.revealBound) {
      return;
    }
    img.dataset.revealBound = "true";
    img.classList.add("img-reveal");
    imageRevealObserver.observe(img);
  });
}

function renderDocSkeleton() {
  if (!contentEl) {
    return;
  }
  contentEl.innerHTML = `
    <div class="skeleton">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>
  `;
}

function renderImagesSkeleton() {
  if (!imagesAlbumsEl) {
    return;
  }
  imagesAlbumsEl.innerHTML = `
    <div class="photo-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  `;
}

function extractAboutViews(markdown) {
  const resumeMatch = markdown.match(/<!--\s*resume:start\s*-->([\s\S]*?)<!--\s*resume:end\s*-->/i);
  const storyMatch = markdown.match(/<!--\s*story:start\s*-->([\s\S]*?)<!--\s*story:end\s*-->/i);
  if (!resumeMatch && !storyMatch) {
    return null;
  }
  return {
    resume: resumeMatch ? resumeMatch[1].trim() : "",
    story: storyMatch ? storyMatch[1].trim() : ""
  };
}

function renderAboutViewContent(viewKey) {
  if (!aboutViewState || !contentEl) {
    return [];
  }
  const container = contentEl.querySelector("#about-view-content");
  if (!container) {
    return [];
  }
  const markdown = aboutViewState.views[viewKey] || "";
  const { body } = splitTitle(markdown);
  container.innerHTML = renderMarkdown(body);
  renderCallouts(container);
  rewriteLinks(container);
  rewriteAssets(container, aboutViewState.mdPath);
  setupCopyButtons();
  bindLightbox(container);
  return buildTocFromContent();
}

function renderAboutViews(views, mdPath) {
  if (!contentEl) {
    return [];
  }
  const available = Object.entries(views).filter(([, value]) => value);
  if (!available.length) {
    contentEl.innerHTML = renderMarkdown("");
    return [];
  }
  const labels = {
    story: "故事视图",
    resume: "简历视图"
  };
  const defaultView = views.story ? "story" : available[0][0];
  aboutViewState = {
    views,
    mdPath,
    active: defaultView
  };
  const buttons = available
    .map(([key]) => {
      const active = key === defaultView ? "active" : "";
      return `<button type="button" class="about-toggle-btn ${active}" data-view="${key}">${escapeHtml(labels[key] || key)}</button>`;
    })
    .join("");
  contentEl.innerHTML = `
    <div class="about-toggle" role="tablist" aria-label="关于我视图切换">
      ${buttons}
    </div>
    <div class="about-view-content" id="about-view-content"></div>
  `;
  const headings = renderAboutViewContent(defaultView);
  contentEl.querySelectorAll(".about-toggle-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.getAttribute("data-view");
      if (!view || !aboutViewState) {
        return;
      }
      aboutViewState.active = view;
      contentEl.querySelectorAll(".about-toggle-btn").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      const updatedHeadings = renderAboutViewContent(view);
      setupTocObserver(updatedHeadings);
    });
  });
  return headings;
}

function normalizeUrl(url) {
  try {
    return encodeURI(decodeURI(url));
  } catch (error) {
    return encodeURI(url);
  }
}

function openBgmPanel(open) {
  if (!bgmRoot || !bgmPanel) {
    return;
  }
  if (bgmCloseTimer) {
    window.clearTimeout(bgmCloseTimer);
    bgmCloseTimer = 0;
  }
  bgmRoot.classList.toggle("is-open", Boolean(open));
  bgmPanel.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    if (bgmState.enabled && !bgmState.visRaf) {
      bgmState.visRaf = window.requestAnimationFrame(drawBgmVisualization);
    }
    return;
  }
  if (bgmState.visRaf) {
    window.cancelAnimationFrame(bgmState.visRaf);
    bgmState.visRaf = 0;
  }
}

function scheduleCloseBgmPanel(delayMs = 140) {
  if (!bgmRoot || !bgmPanel) {
    return;
  }
  if (bgmCloseTimer) {
    window.clearTimeout(bgmCloseTimer);
  }
  bgmCloseTimer = window.setTimeout(() => {
    bgmCloseTimer = 0;
    openBgmPanel(false);
  }, delayMs);
}

function setBgmSubtitle(text) {
  if (bgmSubtitle) {
    bgmSubtitle.textContent = text || "";
  }
}

function updateBgmButton() {
  if (!bgmToggle) {
    return;
  }
  bgmToggle.classList.toggle("is-playing", bgmState.enabled);
  bgmToggle.setAttribute("aria-pressed", bgmState.enabled ? "true" : "false");
}

function readCssVar(name, fallback) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

function ensureAudioContext() {
  if (bgmState.context) {
    return bgmState.context;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    setBgmSubtitle("当前浏览器不支持音频。");
    return null;
  }
  const context = new AudioContextCtor();
  const master = context.createGain();
  master.gain.value = 0.0001;

  const musicBus = context.createGain();
  musicBus.gain.value = 1;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -22;
  compressor.knee.value = 24;
  compressor.ratio.value = 2.6;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.22;

  musicBus.connect(compressor);
  compressor.connect(master);

  const reverbIn = context.createGain();
  reverbIn.gain.value = 1;
  const convolver = context.createConvolver();
  convolver.buffer = buildReverbImpulse(context, 1.9, 2.4);
  const reverbOut = context.createGain();
  reverbOut.gain.value = 0.28;
  reverbIn.connect(convolver);
  convolver.connect(reverbOut);
  reverbOut.connect(compressor);

  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.9;
  master.connect(analyser);
  analyser.connect(context.destination);

  bgmState.context = context;
  bgmState.master = master;
  bgmState.musicBus = musicBus;
  bgmState.compressor = compressor;
  bgmState.reverbIn = reverbIn;
  bgmState.reverbOut = reverbOut;
  bgmState.convolver = convolver;
  bgmState.analyser = analyser;
  bgmState.analyserData = new Uint8Array(analyser.frequencyBinCount);
  bgmState.timeData = new Uint8Array(analyser.fftSize);
  bgmState.visCtx = bgmVisCanvas ? bgmVisCanvas.getContext("2d") : null;
  bgmState.noiseBuffer = buildNoiseBuffer(context, 2.0);
  return context;
}

function ensureBgmVisCanvas() {
  if (!bgmVisCanvas || !bgmState.visCtx) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = bgmVisCanvas.clientWidth || bgmVisCanvas.width;
  const cssHeight = bgmVisCanvas.clientHeight || bgmVisCanvas.height;
  const targetWidth = Math.max(1, Math.floor(cssWidth * dpr));
  const targetHeight = Math.max(1, Math.floor(cssHeight * dpr));
  if (bgmVisCanvas.width !== targetWidth || bgmVisCanvas.height !== targetHeight) {
    bgmVisCanvas.width = targetWidth;
    bgmVisCanvas.height = targetHeight;
  }
  bgmState.vis.dpr = dpr;
  bgmState.vis.width = targetWidth;
  bgmState.vis.height = targetHeight;

  if (!bgmState.vis.particles.length) {
    const count = Math.min(70, Math.max(24, Math.floor(cssWidth / 6)));
    bgmState.vis.particles = Array.from({ length: count }, () => ({
      x: Math.random() * targetWidth,
      y: Math.random() * targetHeight,
      r: 0.8 + Math.random() * 2.1,
      vx: -0.18 + Math.random() * 0.36,
      vy: 0.25 + Math.random() * 0.85,
      drift: -0.35 + Math.random() * 0.7
    }));
  }
}

function avgRange(array, start, end) {
  const a = array || [];
  const s = Math.max(0, start | 0);
  const e = Math.min(a.length, end | 0);
  if (e <= s) {
    return 0;
  }
  let sum = 0;
  for (let i = s; i < e; i += 1) {
    sum += a[i];
  }
  return sum / (e - s);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function ensureBgmAudioGraph() {
  const context = ensureAudioContext();
  if (!context || !bgmState.musicBus) {
    return null;
  }

  if (!bgmState.audioEl) {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.loop = false;
    audio.volume = Math.min(1, Math.max(0, bgmState.volume));
    bgmState.audioEl = audio;

    audio.addEventListener("error", () => {
      setBgmSubtitle("音频加载失败：请检查文件路径。");
      bgmState.enabled = false;
      updateBgmButton();
    });

    audio.addEventListener("ended", () => {
      if (!bgmState.enabled) {
        return;
      }
      void playNextTrack();
    });
  }

  if (!bgmState.mediaSource) {
    try {
      bgmState.mediaSource = context.createMediaElementSource(bgmState.audioEl);
      bgmState.mediaSource.connect(bgmState.musicBus);
    } catch (error) {
      setBgmSubtitle("音频初始化失败（可能重复创建 MediaElementSource）。");
      return null;
    }
  }

  return bgmState.audioEl;
}

function getDefaultPlaylist() {
  return [
    { title: "『ユイカ』 - 好きだから。 (因为我喜欢你。)", src: "assets/music/『ユイカ』 - 好きだから。 (因为我喜欢你。)_EM.mp3" },
    { title: "羊文学 - more than words", src: "assets/music/羊文学 - more than words.mp3" },
    { title: "back number - 水平線", src: "assets/music/back number - 水平線_EM.mp3" },
    { title: "DISH__ - 猫 (THE FIRST TAKE ver_)", src: "assets/music/DISH__ - 猫 (THE FIRST TAKE ver_)_EM.mp3" },
    { title: "RADWIMPS - かたわれ時 (黄昏之时)", src: "assets/music/RADWIMPS - かたわれ時 (黄昏之时)_EM.mp3" },
    { title: "tuki_ - 晩餐歌", src: "assets/music/tuki_ - 晩餐歌_EM.mp3" },
    { title: "ヨルシカ - 老人と海 (老人与海)", src: "assets/music/ヨルシカ - 老人と海 (老人与海)_EM.mp3" }
  ];
}

async function loadBgmPlaylist() {
  if (bgmState.playlist.length) {
    return bgmState.playlist;
  }
  try {
    const data = await loadJson(bgmState.manifestSrc);
    const tracks = Array.isArray(data.tracks) ? data.tracks : [];
    bgmState.playlist = tracks
      .map((track) => ({
        title: String(track.title || "").trim(),
        src: String(track.src || "").trim()
      }))
      .filter((track) => track.src);
  } catch (error) {
    bgmState.playlist = getDefaultPlaylist();
  }
  if (!bgmState.playlist.length) {
    bgmState.playlist = getDefaultPlaylist();
  }
  return bgmState.playlist;
}

function normalizeTrackIndex(index, playlistLength) {
  const length = Math.max(0, playlistLength | 0);
  if (!length) {
    return 0;
  }
  const raw = index | 0;
  return ((raw % length) + length) % length;
}

function applyTrack(index) {
  const playlist = bgmState.playlist || [];
  const idx = normalizeTrackIndex(index, playlist.length);
  bgmState.trackIndex = idx;
  setStored("ttawdtt.bgm.trackIndex", idx);
  const track = playlist[idx] || {};
  bgmState.trackTitle = (track.title || "").trim();
  if (bgmState.audioEl && track.src) {
    bgmState.audioEl.src = normalizeUrl(track.src);
  }
}

async function ensureTrackSelected() {
  await loadBgmPlaylist();
  const stored = Number(getStored("ttawdtt.bgm.trackIndex", 0));
  applyTrack(Number.isFinite(stored) ? stored : 0);
}

function getCurrentTrackLabel() {
  const title = (bgmState.trackTitle || "").trim();
  if (title) {
    return title;
  }
  const playlist = bgmState.playlist || [];
  const track = playlist[bgmState.trackIndex] || {};
  const src = String(track.src || "");
  const basename = src.split("/").pop() || "";
  return basename ? basename.replace(/\.[a-z0-9]+$/i, "") : "BGM";
}

function updateNowPlayingUI() {
  const label = getCurrentTrackLabel();
  const total = (bgmState.playlist || []).length || 0;
  const indexText = total ? `${bgmState.trackIndex + 1}/${total}` : "";
  if (bgmTitleEl) {
    bgmTitleEl.textContent = indexText ? `${label} · ${indexText}` : label;
  }
  if (!bgmState.enabled) {
    setBgmSubtitle(total ? `歌单循环 · 当前 ${indexText || "-"}` : "歌单循环");
  }
}

async function playCurrentTrack() {
  const audio = ensureBgmAudioGraph();
  if (!audio) {
    return;
  }
  await ensureTrackSelected();
  applyTrack(bgmState.trackIndex);
  updateNowPlayingUI();
  try {
    audio.currentTime = 0;
  } catch (error) {
    // ignore
  }
  audio.loop = false;
  return audio
    .play()
    .then(() => {
      setBgmSubtitle(`播放中 · ${getCurrentTrackLabel()}`);
      updateNowPlayingUI();
    })
    .catch(() => {
      setBgmSubtitle("播放失败：需要用户点击或浏览器拦截了播放。");
    });
}

async function playNextTrack() {
  await loadBgmPlaylist();
  applyTrack(bgmState.trackIndex + 1);
  updateNowPlayingUI();
  return playCurrentTrack();
}

async function playPrevTrack() {
  await loadBgmPlaylist();
  applyTrack(bgmState.trackIndex - 1);
  updateNowPlayingUI();
  if (bgmState.enabled) {
    return playCurrentTrack();
  }
}

function buildReverbImpulse(context, seconds, decay) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let c = 0; c < impulse.numberOfChannels; c += 1) {
    const channel = impulse.getChannelData(c);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const amp = Math.pow(1 - t, decay);
      channel[i] = (Math.random() * 2 - 1) * amp;
    }
  }
  return impulse;
}

function buildNoiseBuffer(context, seconds) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.6;
  }
  return buffer;
}

function stopAllNodes() {
  bgmState.nodeRefs.forEach((node) => {
    try {
      if (typeof node.stop === "function") {
        node.stop(0);
      }
      node.disconnect();
    } catch (error) {
      // ignore
    }
  });
  bgmState.nodeRefs = [];
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createEnvGain(context, time, { attack, decay, sustain, release, gain }) {
  const g = context.createGain();
  const a = Math.max(0.001, attack ?? 0.01);
  const d = Math.max(0.001, decay ?? 0.12);
  const s = Math.max(0.0001, sustain ?? 0.5);
  const r = Math.max(0.001, release ?? 0.22);
  const peak = Math.max(0.0001, gain ?? 0.1);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), time + a + d);
  g.gain.exponentialRampToValueAtTime(0.0001, time + a + d + r);
  bgmState.nodeRefs.push(g);
  return g;
}

function schedulePianoNote(context, time, midi, velocity, { bright, sustain }) {
  if (!bgmState.musicBus || !bgmState.reverbIn || !bgmState.noiseBuffer) {
    return;
  }
  const freq = midiToFreq(midi);

  const voiceGain = context.createGain();
  const amp = Math.max(0.0001, Math.min(1, velocity)) * 0.18;
  const sustainSeconds = Math.max(0.6, sustain ?? (midi < 55 ? 2.8 : 1.9));
  voiceGain.gain.setValueAtTime(0.0001, time);
  voiceGain.gain.exponentialRampToValueAtTime(amp, time + 0.008);
  voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * 0.42), time + 0.12);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + sustainSeconds);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200 + (bright ? 2400 : 1400), time);
  filter.Q.setValueAtTime(0.7, time);

  voiceGain.connect(filter);
  filter.connect(bgmState.musicBus);

  const send = context.createGain();
  send.gain.setValueAtTime(bright ? 0.22 : 0.18, time);
  filter.connect(send);
  send.connect(bgmState.reverbIn);

  const partials = [
    { ratio: 1, gain: 1.0 },
    { ratio: 2, gain: 0.22 },
    { ratio: 3, gain: 0.12 },
    { ratio: 4, gain: 0.07 }
  ];

  partials.forEach((p) => {
    const g = context.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(p.gain, time + 0.008);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p.gain * (p.ratio === 1 ? 0.55 : 0.3)), time + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(2.4, sustainSeconds + 0.3));

    if (p.ratio === 1) {
      const oscA = context.createOscillator();
      oscA.type = "triangle";
      oscA.frequency.setValueAtTime(freq, time);
      oscA.detune.setValueAtTime(-3.2, time);
      const oscB = context.createOscillator();
      oscB.type = "triangle";
      oscB.frequency.setValueAtTime(freq, time);
      oscB.detune.setValueAtTime(3.2, time);
      oscA.connect(g);
      oscB.connect(g);
      g.connect(voiceGain);
      oscA.start(time);
      oscB.start(time);
      oscA.stop(time + sustainSeconds + 0.45);
      oscB.stop(time + sustainSeconds + 0.45);
      bgmState.nodeRefs.push(oscA, oscB, g);
      return;
    }

    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * p.ratio, time);
    osc.connect(g);
    g.connect(voiceGain);
    osc.start(time);
    osc.stop(time + sustainSeconds + 0.35);
    bgmState.nodeRefs.push(osc, g);
  });

  const hammer = context.createBufferSource();
  hammer.buffer = bgmState.noiseBuffer;
  const hammerFilter = context.createBiquadFilter();
  hammerFilter.type = "bandpass";
  hammerFilter.frequency.setValueAtTime(freq * 2.2, time);
  hammerFilter.Q.setValueAtTime(0.9, time);
  const hammerGain = createEnvGain(context, time, {
    attack: 0.001,
    decay: 0.03,
    sustain: 0.0001,
    release: 0.04,
    gain: amp * 0.55
  });
  hammer.connect(hammerFilter);
  hammerFilter.connect(hammerGain);
  hammerGain.connect(voiceGain);
  hammer.start(time);
  hammer.stop(time + 0.12);

  bgmState.nodeRefs.push(voiceGain, filter, send, hammer, hammerFilter);
}

function schedulePianoChord(context, time, chord, velocity, options) {
  chord.forEach((midi) => schedulePianoNote(context, time, midi, velocity, options));
}

function startSnowLoop() {
  const audio = ensureBgmAudioGraph();
  if (!audio) {
    return;
  }
  const context = bgmState.context;
  if (!context || !bgmState.master) {
    return;
  }
  const volume = Math.min(1, Math.max(0, bgmState.volume));
  bgmState.master.gain.setValueAtTime(Math.max(0.0001, volume), context.currentTime);
  audio.volume = volume;
  void playCurrentTrack();
}

function stopSnowLoop() {
  const context = bgmState.context;
  if (bgmState.interval) {
    window.clearInterval(bgmState.interval);
    bgmState.interval = 0;
  }
  if (bgmState.audioEl) {
    try {
      bgmState.audioEl.pause();
    } catch (error) {
      // ignore
    }
  }
  if (context && bgmState.master) {
    bgmState.master.gain.cancelScheduledValues(context.currentTime);
    bgmState.master.gain.setValueAtTime(bgmState.master.gain.value || 0.0001, context.currentTime);
    bgmState.master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
  }
  window.setTimeout(() => {
    stopAllNodes();
  }, 400);
}

async function toggleBgm() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  try {
    if (context.state === "suspended") {
      await context.resume();
    }
  } catch (error) {
    // ignore
  }

  bgmState.enabled = !bgmState.enabled;
  bgmState.preferredEnabled = bgmState.enabled;
  setStored("ttawdtt.bgm.enabled", bgmState.preferredEnabled);
  updateBgmButton();

  if (bgmState.enabled) {
    startSnowLoop();
    setBgmSubtitle(`播放中 · ${getCurrentTrackLabel()}`);
  } else {
    stopSnowLoop();
    setBgmSubtitle("已暂停");
  }
}

function normalizeImageSrc(src) {
  if (!src) {
    return src;
  }
  if (/^(https?:|data:|#|\/)/.test(src)) {
    return src;
  }
  if (src.startsWith("images/") || src.startsWith("docs/") || src.startsWith("content/")) {
    return src;
  }
  return `images/${src.replace(/^\.\/+/, "")}`;
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
  return `#/docs/${encodeURIComponent(clean)}`;
}

function getDocSlug(path) {
  const slug = (path || "").split("/").pop().replace(/\.md$/, "");
  return encodeURIComponent(slug);
}

function renderDocTags(tags) {
  if (!docTagsEl) {
    return;
  }
  if (!tags || !tags.length) {
    docTagsEl.innerHTML = "";
    return;
  }
  docTagsEl.innerHTML = tags.map((tag) => `<span class="doc-tag">${escapeHtml(tag)}</span>`).join("");
}

function renderDocNav(currentPath) {
  if (!docNavEl || !docState.list.length) {
    return;
  }
  const index = docState.list.findIndex((item) => item.path === currentPath);
  if (index === -1) {
    docNavEl.innerHTML = "";
    return;
  }
  const prev = docState.list[index - 1];
  const next = docState.list[index + 1];
  const prevHtml = prev
    ? `<a href="#/docs/${getDocSlug(prev.path)}">上一篇<span>${escapeHtml(prev.title)}</span></a>`
    : "";
  const nextHtml = next
    ? `<a href="#/docs/${getDocSlug(next.path)}">下一篇<span>${escapeHtml(next.title)}</span></a>`
    : "";
  if (!prevHtml && !nextHtml) {
    docNavEl.innerHTML = "";
    return;
  }
  docNavEl.innerHTML = prevHtml + nextHtml;
}

function renderDocSeries(meta) {
  if (!docSeriesEl) {
    return;
  }
  if (!meta || !meta.series || !docState.series[meta.series]) {
    docSeriesEl.innerHTML = "";
    docSeriesEl.style.display = "none";
    return;
  }
  docSeriesEl.style.display = "block";
  const items = docState.series[meta.series];
  const listHtml = items
    .map((item) => {
      const active = item.path === meta.path ? "active" : "";
      return `<li><a class="${active}" href="#/docs/${getDocSlug(item.path)}">${escapeHtml(item.title)}</a></li>`;
    })
    .join("");
  docSeriesEl.innerHTML = `
    <h3>系列：${escapeHtml(meta.series)}</h3>
    <ul>${listHtml}</ul>
  `;
}

function renderBacklinks(meta) {
  if (!docBacklinksEl) {
    return;
  }
  const links = docState.backlinks[meta.path] || [];
  if (!links.length) {
    docBacklinksEl.innerHTML = "";
    docBacklinksEl.style.display = "none";
    return;
  }
  docBacklinksEl.style.display = "block";
  const listHtml = links
    .map((item) => `<li><a href="#/docs/${getDocSlug(item.path)}">${escapeHtml(item.title)}</a></li>`)
    .join("");
  docBacklinksEl.innerHTML = `
    <h3>反向链接</h3>
    <ul>${listHtml}</ul>
  `;
}

function buildTocFromContent() {
  if (!tocBodyEl || !tocEl) {
    return [];
  }
  const headings = Array.from(contentEl.querySelectorAll("h2, h3"));
  if (!headings.length) {
    tocBodyEl.innerHTML = "";
    tocEl.style.display = "none";
    return [];
  }
  tocEl.style.display = "block";
  const tocHtml = headings
    .map((heading) => {
      if (!heading.id) {
        heading.id = slugify(heading.textContent || "");
      }
      const indent = heading.tagName === "H3" ? " style=\"margin-left:12px;\"" : "";
      return `<a href="#" data-target="${escapeHtml(heading.id)}"${indent}>${escapeHtml(heading.textContent || "")}</a>`;
    })
    .join("");
  tocBodyEl.innerHTML = tocHtml;
  bindTocClicks();
  return headings;
}

let tocObserver = null;
function setupTocObserver(headings) {
  if (tocObserver) {
    tocObserver.disconnect();
  }
  if (!headings || !headings.length || !tocBodyEl) {
    return;
  }
  const links = Array.from(tocBodyEl.querySelectorAll("a"));
  tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        const link = links.find((item) => item.dataset.target === id);
        if (entry.isIntersecting && link) {
          links.forEach((item) => item.classList.remove("active"));
          link.classList.add("active");
        }
      });
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );
  headings.forEach((heading) => tocObserver.observe(heading));
}

function bindTocClicks() {
  if (!tocBodyEl || tocClickBound) {
    return;
  }
  tocBodyEl.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-target]");
    if (!link) {
      return;
    }
    event.preventDefault();
    const targetId = link.getAttribute("data-target");
    if (!targetId) {
      return;
    }
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  tocClickBound = true;
}

function setupReadingProgress(active) {
  if (!readingProgressEl) {
    return;
  }
  readingProgressEl.classList.toggle("active", active);
}

function updateReadingProgress() {
  if (!readingProgressEl || !readingProgressEl.classList.contains("active")) {
    return;
  }
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? window.scrollY / docHeight : 0;
  const bar = readingProgressEl.querySelector("span");
  if (bar) {
    bar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
  }
}

function updateBackToTop() {
  if (!backToTop) {
    return;
  }
  backToTop.classList.toggle("active", window.scrollY > 420);
}

function updateScrollUI() {
  updateReadingProgress();
  updateBackToTop();
}

function setupCopyButtons() {
  const blocks = Array.from(contentEl.querySelectorAll("pre"));
  blocks.forEach((block) => {
    if (block.querySelector(".copy-button")) {
      return;
    }
    const button = document.createElement("button");
    button.className = "copy-button";
    button.type = "button";
    button.textContent = "复制";
    button.addEventListener("click", async () => {
      const code = block.querySelector("code");
      const text = code ? code.textContent : block.textContent;
      try {
        await navigator.clipboard.writeText(text || "");
        button.textContent = "已复制";
        setTimeout(() => {
          button.textContent = "复制";
        }, 1200);
      } catch (error) {
        button.textContent = "失败";
        setTimeout(() => {
          button.textContent = "复制";
        }, 1200);
      }
    });
    block.appendChild(button);
  });
}

function renderDocSearchResults(list) {
  if (!docSearchResults) {
    return;
  }
  if (!list.length) {
    docSearchResults.innerHTML = `<div class="empty-state">没有匹配的文章。</div>`;
    return;
  }
  docSearchResults.innerHTML = list
    .map((item) => {
      const slug = getDocSlug(item.path);
      const tags = item.tags && item.tags.length ? item.tags.join(" · ") : "";
      const time = item.readingTime ? `${item.readingTime} 分钟` : "";
      const date = item.date || "";
      const meta = [date, time, tags].filter(Boolean).join(" · ");
      return `
        <a href="#/docs/${slug}">
          ${escapeHtml(item.title)}
          <span>${escapeHtml(item.summary)}${meta ? ` · ${escapeHtml(meta)}` : ""}</span>
        </a>
      `;
    })
    .join("");
}


function setupDocSearch(active) {
  if (!docSearchEl || !docSearchInput) {
    return;
  }
  docSearchEl.classList.toggle("active", active);
  if (!active) {
    docSearchResults.innerHTML = "";
    return;
  }
  docSearchInput.value = "";
  renderDocSearchResults(docState.list);
  if (!docSearchBound) {
    docSearchInput.addEventListener("input", () => {
      const query = docSearchInput.value.trim().toLowerCase();
      if (!query) {
        renderDocSearchResults(docState.list);
        return;
      }
      const filtered = docState.list.filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.tags.join(" ").toLowerCase().includes(query)
        );
      });
      renderDocSearchResults(filtered);
    });
    docSearchBound = true;
  }
}

function bindGlobalKeys() {
  if (keyBindingsBound) {
    return;
  }
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }
    if (event.key.toLowerCase() === "k") {
      if (docSearchEl && docSearchEl.classList.contains("active")) {
        docSearchInput.focus();
        event.preventDefault();
      }
    }
  });
  keyBindingsBound = true;
}

function resetDocUI() {
  if (docTagsEl) {
    docTagsEl.innerHTML = "";
  }
  if (docNavEl) {
    docNavEl.innerHTML = "";
  }
  if (docSeriesEl) {
    docSeriesEl.innerHTML = "";
  }
  if (docBacklinksEl) {
    docBacklinksEl.innerHTML = "";
  }
  if (tocBodyEl) {
    tocBodyEl.innerHTML = "";
  }
  if (tocEl) {
    tocEl.style.display = "none";
  }
  if (docSearchEl) {
    docSearchEl.classList.remove("active");
  }
  setupReadingProgress(false);
  aboutViewState = null;
}

function applyDocMeta(meta) {
  if (!meta) {
    return;
  }
  renderDocTags(meta.tags || []);
  renderDocNav(meta.path);
  renderDocSeries(meta);
  renderBacklinks(meta);
  if (headerEls.subtitle && meta.readingTime) {
    const base = headerEls.subtitle.textContent.trim();
    const timeText = `${meta.readingTime} 分钟阅读`;
    headerEls.subtitle.textContent = base ? `${base} · ${timeText}` : timeText;
  }
}

function drawBgmVisualization() {
  if (
    !bgmState.enabled ||
    !bgmState.analyser ||
    !bgmState.analyserData ||
    !bgmState.timeData ||
    !bgmState.visCtx ||
    !bgmVisCanvas ||
    !bgmRoot ||
    !bgmRoot.classList.contains("is-open")
  ) {
    return;
  }

  ensureBgmVisCanvas();
  const ctx = bgmState.visCtx;
  const width = bgmState.vis.width || bgmVisCanvas.width;
  const height = bgmState.vis.height || bgmVisCanvas.height;

  bgmState.analyser.getByteFrequencyData(bgmState.analyserData);
  bgmState.analyser.getByteTimeDomainData(bgmState.timeData);

  const bins = bgmState.analyserData;
  const bass = clamp01(avgRange(bins, 0, 10) / 255);
  const mid = clamp01(avgRange(bins, 12, 70) / 255);
  const air = clamp01(avgRange(bins, 80, 160) / 255);
  const energy = clamp01(0.45 * bass + 0.35 * mid + 0.2 * air);

  const ink = readCssVar("--ink", "#141413");
  const muted = readCssVar("--muted", "#6f6b63");
  const accent = readCssVar("--accent", "#d97757");
  const accent2 = readCssVar("--accent-2", "#6a9bcc");
  const accent3 = readCssVar("--accent-3", "#788c5d");
  const isDark = (document.documentElement.dataset.theme || "light") === "dark";

  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  if (isDark) {
    bg.addColorStop(0, "rgba(250,249,245,0.04)");
    bg.addColorStop(1, "rgba(250,249,245,0.01)");
  } else {
    bg.addColorStop(0, "rgba(20,20,19,0.04)");
    bg.addColorStop(1, "rgba(20,20,19,0.01)");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.5, height);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.06)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const particles = bgmState.vis.particles || [];
  const driftBoost = (bass * 1.2 + 0.2) * 0.8;
  ctx.save();
  ctx.globalAlpha = isDark ? 0.6 : 0.42;
  ctx.fillStyle = isDark ? "rgba(250,249,245,0.75)" : "rgba(20,20,19,0.35)";
  particles.forEach((p) => {
    p.x += (p.vx + p.drift * driftBoost) * (1 + energy * 0.9);
    p.y += p.vy * (1 + bass * 1.4);
    if (p.y > height + 8) {
      p.y = -8;
      p.x = Math.random() * width;
    }
    if (p.x > width + 8) {
      p.x = -8;
    }
    if (p.x < -8) {
      p.x = width + 8;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.9 + bass * 0.8), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  const time = bgmState.timeData;
  const padding = Math.floor(Math.min(width, height) * 0.12);
  const ribbonTop = Math.floor(height * 0.24);
  const ribbonBottom = Math.floor(height * 0.76);
  const ribbonMid = (ribbonTop + ribbonBottom) * 0.5;
  const ribbonAmp = (ribbonBottom - ribbonTop) * (0.18 + mid * 0.24);

  ctx.save();
  ctx.lineWidth = Math.max(1, Math.floor((bgmState.vis.dpr || 1) * 1.2));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = accent2;
  ctx.shadowBlur = 14 * (0.6 + energy);
  const grad = ctx.createLinearGradient(padding, 0, width - padding, 0);
  grad.addColorStop(0, accent3);
  grad.addColorStop(0.55, accent2);
  grad.addColorStop(1, accent);
  ctx.strokeStyle = grad;
  ctx.globalAlpha = isDark ? 0.9 : 0.8;

  ctx.beginPath();
  const samples = 140;
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const idx = Math.floor(t * (time.length - 1));
    const v = (time[idx] - 128) / 128;
    const x = padding + t * (width - padding * 2);
    const y = ribbonMid + v * ribbonAmp;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();

  const cx = width * 0.5;
  const cy = height * 0.56;
  const radius = Math.min(width, height) * 0.22;
  const bars = 64;
  const step = Math.max(1, Math.floor(bins.length / bars));
  const baseAlpha = isDark ? 0.85 : 0.65;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.lineCap = "round";
  ctx.shadowColor = accent2;
  ctx.shadowBlur = 16 * (0.4 + energy);
  for (let i = 0; i < bars; i += 1) {
    const b = bins[i * step] / 255;
    const a = (i / bars) * Math.PI * 2;
    const len = (Math.min(width, height) * 0.09) * (0.22 + Math.pow(b, 1.15));
    const x0 = Math.cos(a) * radius;
    const y0 = Math.sin(a) * radius;
    const x1 = Math.cos(a) * (radius + len);
    const y1 = Math.sin(a) * (radius + len);

    ctx.globalAlpha = baseAlpha * (0.55 + b * 0.75);
    ctx.strokeStyle = i % 3 === 0 ? accent : i % 3 === 1 ? accent2 : accent3;
    ctx.lineWidth = Math.max(1, Math.floor((bgmState.vis.dpr || 1) * (1.0 + b * 0.9)));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = isDark ? 0.9 : 0.8;
  ctx.fillStyle = ink;
  ctx.font = `600 ${Math.max(12, Math.floor(12 * (bgmState.vis.dpr || 1)))}px var(--font-display)`;
  ctx.fillText("Huanghun", Math.floor(padding), Math.floor(height - padding * 0.55));
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = muted;
  ctx.font = `500 ${Math.max(10, Math.floor(10 * (bgmState.vis.dpr || 1)))}px var(--font-display)`;
  ctx.fillText("twilight visual", Math.floor(padding), Math.floor(height - padding * 0.2));
  ctx.restore();

  bgmState.visRaf = window.requestAnimationFrame(drawBgmVisualization);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function initBgm() {
  if (!bgmToggle || !bgmRoot || !bgmPanel) {
    return;
  }
  bgmState.preferredEnabled = Boolean(getStored("ttawdtt.bgm.enabled", false));
  bgmState.enabled = false;
  bgmState.volume = Number(getStored("ttawdtt.bgm.volume", 0.4));
  if (bgmVolumeInput) {
    bgmVolumeInput.value = String(Math.min(1, Math.max(0, bgmState.volume)));
    bgmVolumeInput.addEventListener("input", () => {
      const next = Number(bgmVolumeInput.value);
      bgmState.volume = Number.isFinite(next) ? next : 0.4;
      setStored("ttawdtt.bgm.volume", bgmState.volume);
      if (bgmState.audioEl) {
        bgmState.audioEl.volume = Math.min(1, Math.max(0, bgmState.volume));
      }
      if (bgmState.master && bgmState.context) {
        bgmState.master.gain.setValueAtTime(Math.max(0.0001, bgmState.volume), bgmState.context.currentTime);
      }
    });
  }
  updateBgmButton();
  setBgmSubtitle(bgmState.preferredEnabled ? "上次已开启 · 点击继续播放" : "点击 BGM 播放（歌单循环）");
  ensureBgmVisCanvas();
  void ensureTrackSelected().then(updateNowPlayingUI);

  bgmToggle.addEventListener("click", () => {
    toggleBgm();
    openBgmPanel(true);
  });

  if (bgmPrevBtn) {
    bgmPrevBtn.addEventListener("click", () => {
      void playPrevTrack();
      openBgmPanel(true);
    });
  }
  if (bgmNextBtn) {
    bgmNextBtn.addEventListener("click", () => {
      void playNextTrack();
      openBgmPanel(true);
    });
  }

  bgmRoot.addEventListener("mouseenter", () => {
    openBgmPanel(true);
  });
  bgmRoot.addEventListener("mouseleave", () => {
    scheduleCloseBgmPanel();
  });
  bgmPanel.addEventListener("mouseenter", () => {
    openBgmPanel(true);
  });
  bgmPanel.addEventListener("mouseleave", () => {
    scheduleCloseBgmPanel();
  });
  bgmRoot.addEventListener("focusin", () => openBgmPanel(true));
  bgmRoot.addEventListener("focusout", () => scheduleCloseBgmPanel(60));

  document.addEventListener("click", (event) => {
    if (!bgmRoot.classList.contains("is-open")) {
      return;
    }
    if (bgmRoot.contains(event.target)) {
      return;
    }
    openBgmPanel(false);
  });
}

function initLightbox() {
  if (!lightboxEl) {
    return;
  }
  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => moveLightbox(-1));
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => moveLightbox(1));
  }
  lightboxEl.addEventListener("click", (event) => {
    if (event.target === lightboxEl) {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!lightboxEl.classList.contains("active")) {
      return;
    }
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowRight") {
      moveLightbox(1);
    } else if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    }
  });
}

function bindLightbox(scopeEl) {
  if (!scopeEl || !lightboxEl) {
    return;
  }
  const images = Array.from(scopeEl.querySelectorAll("img"));
  if (!images.length) {
    return;
  }
  setupImageReveal(scopeEl);
  images.forEach((img, index) => {
    if (img.dataset.lightboxBound) {
      return;
    }
    img.dataset.lightboxBound = "true";
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
      const latestItems = images.map((item) => ({
        src: item.currentSrc || item.getAttribute("src"),
        title: item.dataset.caption || item.getAttribute("alt") || "",
        note: item.dataset.note || ""
      }));
      openLightbox(latestItems, index);
    });
  });
}

function openLightbox(items, index) {
  lightboxState.items = items || [];
  lightboxState.index = index || 0;
  updateLightbox();
  if (lightboxPrev && lightboxNext) {
    const showNav = lightboxState.items.length > 1;
    lightboxPrev.style.display = showNav ? "flex" : "none";
    lightboxNext.style.display = showNav ? "flex" : "none";
  }
  lightboxEl.classList.add("active");
  lightboxEl.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightboxEl.classList.remove("active");
  lightboxEl.setAttribute("aria-hidden", "true");
}

function moveLightbox(direction) {
  if (!lightboxState.items.length) {
    return;
  }
  const count = lightboxState.items.length;
  lightboxState.index = (lightboxState.index + direction + count) % count;
  updateLightbox();
}

function updateLightbox() {
  const item = lightboxState.items[lightboxState.index];
  if (!item || !lightboxImage) {
    return;
  }
  lightboxImage.src = item.src || "";
  if (lightboxTitle) {
    lightboxTitle.textContent = item.title || "";
  }
  if (lightboxCount) {
    const total = lightboxState.items.length;
    lightboxCount.textContent = total ? `${lightboxState.index + 1} / ${total}` : "";
  }
  if (lightboxNote) {
    lightboxNote.textContent = item.note ? `--${item.note}` : "";
  }
}

async function hydrateHomeList() {
  if (!homeListEl) {
    return;
  }
  try {
    await ensureDocState();
    const latest = docState.list.slice(0, 5);
    if (!latest.length) {
      return;
    }
    homeListEl.innerHTML = latest
      .map((item) => `<li><a href="#/docs/${getDocSlug(item.path)}">${escapeHtml(item.title)}</a></li>`)
      .join("");
  } catch (error) {
    // Keep the static list if docs index cannot be loaded.
  }
}

function renderEmptyState(message) {
  if (!imagesAlbumsEl) {
    return;
  }
  imagesAlbumsEl.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  if (albumFiltersEl) {
    albumFiltersEl.innerHTML = "";
  }
  Object.keys(albumState).forEach((key) => {
    delete albumState[key];
  });
}

function normalizeTags(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDateParts(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = String(value.getFullYear());
    const month = `${year}-${String(value.getMonth() + 1).padStart(2, "0")}`;
    return { year, month };
  }
  const raw = String(value).trim();
  const match = raw.match(/(\d{4})(?:[-/.](\d{1,2}))?/);
  if (!match) {
    return null;
  }
  const year = match[1];
  const month = match[2] ? `${year}-${String(match[2]).padStart(2, "0")}` : null;
  return { year, month };
}

function collectAlbumMeta(album) {
  const tags = new Set(normalizeTags(album.tags || album.tag));
  const years = new Set();
  const months = new Set();
  const photos = Array.isArray(album.photos) ? album.photos : [];
  photos.forEach((photo) => {
    normalizeTags(photo.tags || photo.tag).forEach((tag) => tags.add(tag));
    const parts = parseDateParts(photo.date || photo.takenAt || photo.time);
    if (parts) {
      years.add(parts.year);
      if (parts.month) {
        months.add(parts.month);
      }
    }
  });
  const entries = Array.isArray(album.entries) ? album.entries : [];
  entries.forEach((entry) => {
    normalizeTags(entry.tags || entry.tag).forEach((tag) => tags.add(tag));
    const parts = parseDateParts(entry.date || entry.time);
    if (parts) {
      years.add(parts.year);
      if (parts.month) {
        months.add(parts.month);
      }
    }
  });
  return {
    tags: Array.from(tags),
    years: Array.from(years),
    months: Array.from(months)
  };
}

function buildAlbumState(album, index, defaults) {
  const title = album.title || defaults.title || "未命名合集";
  const key = `${slugify(title) || "album"}-${index}`;
  const note = album.note || album.notes || "";
  const layout = album.layout || defaults.layout || "grid";
  const archiveBy = album.archiveBy || album.groupBy || defaults.archiveBy || "";
  const photos = Array.isArray(album.photos) ? album.photos : [];
  const entries = Array.isArray(album.entries) ? album.entries : [];
  const pageSizeRaw = Number(album.pageSize || defaults.pageSize || 0);
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : photos.length;
  const meta = collectAlbumMeta({ ...album, photos, entries });
  return {
    key,
    title,
    note,
    layout,
    archiveBy,
    photos,
    entries,
    pageSize,
    visibleCount: Math.min(pageSize, photos.length),
    tags: meta.tags,
    years: meta.years,
    months: meta.months
  };
}

function buildPhotoCard(photo) {
  const item = typeof photo === "string" ? { src: photo } : photo || {};
  const src = normalizeImageSrc(item.src || item.url || "");
  const caption = item.caption || item.title || "";
  const note = item.note || item.notes || "";
  const dataCaption = escapeHtml(caption);
  const dataNote = escapeHtml(note);
  const imgTag = src
    ? `<img src="${normalizeUrl(src)}" alt="${escapeHtml(caption || "照片")}" data-caption="${dataCaption}" data-note="${dataNote}" loading="lazy" decoding="async">`
    : "";
  const captionTag = caption ? `<p class="photo-caption">${escapeHtml(caption)}</p>` : "";
  const noteTag = note
    ? `<p class="photo-note"><span class="note-prefix">--</span><em>${escapeHtml(note)}</em></p>`
    : "";
  return `<figure class="photo-card">${imgTag}${captionTag}${noteTag}</figure>`;
}

function normalizeEntryPhotos(entry) {
  if (!entry) {
    return [];
  }
  const photos = [];
  if (Array.isArray(entry.photos)) {
    entry.photos.forEach((item) => photos.push(item));
  } else if (entry.photo) {
    photos.push({ src: entry.photo, caption: entry.caption || "", note: entry.note || "" });
  } else if (entry.src) {
    photos.push({ src: entry.src, caption: entry.caption || "", note: entry.note || "" });
  }
  return photos;
}

function renderJournalEntry(entry) {
  const date = entry.date || entry.time || "";
  const text = entry.text || entry.content || "";
  const photos = normalizeEntryPhotos(entry);
  const photosHtml = photos.length ? `<div class="photo-grid">${photos.map(buildPhotoCard).join("")}</div>` : "";
  const textHtml = text ? `<p class="journal-text">${escapeHtml(text)}</p>` : "";
  return `
    <article class="journal-entry">
      ${date ? `<div class="journal-date">${escapeHtml(date)}</div>` : ""}
      ${textHtml}
      ${photosHtml}
    </article>
  `;
}

function renderJournalSection(state, dataAttrs) {
  const entries = state.entries || [];
  const entryHtml = entries.length
    ? entries.map(renderJournalEntry).join("")
    : `<div class="empty-state">这个合集还没有内容。</div>`;
  return `
    <section class="album-block" ${dataAttrs}>
      <h2>${escapeHtml(state.title)}</h2>
      ${state.note ? `<p class="album-note">${escapeHtml(state.note)}</p>` : ""}
      <div class="journal-list">${entryHtml}</div>
    </section>
  `;
}

function groupPhotosByDate(photos, mode) {
  const groups = {};
  const misc = [];
  photos.forEach((photo) => {
    const parts = parseDateParts(photo.date || photo.takenAt || photo.time);
    if (!parts) {
      misc.push(photo);
      return;
    }
    const key = mode === "month" && parts.month ? parts.month : parts.year;
    if (!key) {
      misc.push(photo);
      return;
    }
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(photo);
  });
  const entries = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a, "zh"))
    .map((key) => ({ label: key, photos: groups[key] }));
  if (misc.length) {
    entries.push({ label: "其他", photos: misc });
  }
  return entries;
}

function renderArchiveSection(state, dataAttrs) {
  const layout = state.layout || "grid";
  const gridClass = layout === "masonry" ? "photo-grid masonry" : "photo-grid";
  const groups = groupPhotosByDate(state.photos || [], state.archiveBy);
  const groupHtml = groups.length
    ? groups
        .map(
          (group) => `
        <div class="album-group">
          <h3>${escapeHtml(group.label)}</h3>
          <div class="${gridClass}">
            ${group.photos.map(buildPhotoCard).join("")}
          </div>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">这个合集还没有照片。</div>`;
  return `
    <section class="album-block" ${dataAttrs}>
      <h2>${escapeHtml(state.title)}</h2>
      ${state.note ? `<p class="album-note">${escapeHtml(state.note)}</p>` : ""}
      ${groupHtml}
    </section>
  `;
}

function renderAlbumSection(state) {
  const dataTags = escapeHtml(state.tags.join(","));
  const dataYears = escapeHtml(state.years.join(","));
  const dataMonths = escapeHtml(state.months.join(","));
  const dataAttrs = `data-album="${escapeHtml(state.title)}" data-album-key="${state.key}" data-tags="${dataTags}" data-years="${dataYears}" data-months="${dataMonths}"`;
  if (state.layout === "journal" && state.entries.length) {
    return renderJournalSection(state, dataAttrs);
  }
  if ((state.archiveBy === "year" || state.archiveBy === "month") && state.photos.length) {
    return renderArchiveSection(state, dataAttrs);
  }
  const layout = state.layout || "grid";
  const gridClass = layout === "masonry" ? "photo-grid masonry" : "photo-grid";
  const photos = state.photos || [];
  const visiblePhotos = photos.slice(0, state.visibleCount);
  const photoHtml = visiblePhotos.length
    ? visiblePhotos.map(buildPhotoCard).join("")
    : `<div class="empty-state">这个合集还没有照片。</div>`;
  const loadMore =
    state.visibleCount < photos.length
      ? `<button class="load-more" type="button" data-album-key="${state.key}">加载更多</button>`
      : "";
  return `
    <section class="album-block" ${dataAttrs}>
      <h2>${escapeHtml(state.title)}</h2>
      ${state.note ? `<p class="album-note">${escapeHtml(state.note)}</p>` : ""}
      <div class="${gridClass}">${photoHtml}</div>
      ${loadMore}
    </section>
  `;
}

function renderFilterGroup(type, label, values) {
  const buttons = ["全部", ...values]
    .map((value) => {
      const active = activeAlbumFilters[type] === value ? "active" : "";
      return `<button class="filter-chip ${active}" type="button" data-filter-type="${type}" data-filter-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`;
    })
    .join("");
  return `
    <div class="filter-group" data-filter-group="${type}">
      <span class="filter-label">${escapeHtml(label)}</span>
      ${buttons}
    </div>
  `;
}

function renderAlbumFilters(states, filterConfig) {
  if (!albumFiltersEl) {
    return;
  }
  activeAlbumFilters.album = "全部";
  activeAlbumFilters.tag = "全部";
  activeAlbumFilters.year = "全部";
  activeAlbumFilters.month = "全部";
  const filters = Array.isArray(filterConfig) && filterConfig.length ? filterConfig : ["album"];
  const groups = [];
  if (filters.includes("album")) {
    const names = states.map((state) => state.title);
    const unique = Array.from(new Set(names));
    if (unique.length > 1) {
      groups.push({ type: "album", label: "合集", values: unique });
    }
  }
  if (filters.includes("tag")) {
    const tags = states.flatMap((state) => state.tags || []);
    const unique = Array.from(new Set(tags));
    if (unique.length) {
      groups.push({ type: "tag", label: "标签", values: unique });
    }
  }
  if (filters.includes("year")) {
    const years = states.flatMap((state) => state.years || []);
    const unique = Array.from(new Set(years)).sort((a, b) => b.localeCompare(a, "zh"));
    if (unique.length) {
      groups.push({ type: "year", label: "年份", values: unique });
    }
  }
  if (filters.includes("month")) {
    const months = states.flatMap((state) => state.months || []);
    const unique = Array.from(new Set(months)).sort((a, b) => b.localeCompare(a, "zh"));
    if (unique.length) {
      groups.push({ type: "month", label: "月份", values: unique });
    }
  }
  if (!groups.length) {
    albumFiltersEl.innerHTML = "";
    return;
  }
  albumFiltersEl.innerHTML = groups.map((group) => renderFilterGroup(group.type, group.label, group.values)).join("");
  albumFiltersEl.querySelectorAll("button[data-filter-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.getAttribute("data-filter-type");
      const value = button.getAttribute("data-filter-value");
      updateActiveAlbumFilter(type, value);
    });
  });
}

function updateActiveAlbumFilter(type, value) {
  if (!type) {
    return;
  }
  activeAlbumFilters[type] = value || "全部";
  if (albumFiltersEl) {
    const group = albumFiltersEl.querySelector(`.filter-group[data-filter-group="${type}"]`);
    if (group) {
      group.querySelectorAll(".filter-chip").forEach((btn) => btn.classList.remove("active"));
      const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value;
      const active = group.querySelector(`[data-filter-value="${escaped}"]`);
      if (active) {
        active.classList.add("active");
      }
    }
  }
  applyAlbumFilters();
}

function applyAlbumFilters() {
  if (!imagesAlbumsEl) {
    return;
  }
  const blocks = Array.from(imagesAlbumsEl.querySelectorAll(".album-block"));
  blocks.forEach((block) => {
    const albumName = block.dataset.album || "";
    const tags = (block.dataset.tags || "").split(",").filter(Boolean);
    const years = (block.dataset.years || "").split(",").filter(Boolean);
    const months = (block.dataset.months || "").split(",").filter(Boolean);
    const matchAlbum = activeAlbumFilters.album === "全部" || activeAlbumFilters.album === albumName;
    const matchTag = activeAlbumFilters.tag === "全部" || tags.includes(activeAlbumFilters.tag);
    const matchYear = activeAlbumFilters.year === "全部" || years.includes(activeAlbumFilters.year);
    const matchMonth = activeAlbumFilters.month === "全部" || months.includes(activeAlbumFilters.month);
    const visible = matchAlbum && matchTag && matchYear && matchMonth;
    block.style.display = visible ? "" : "none";
  });
}

function bindAlbumLoadMore() {
  if (!imagesAlbumsEl) {
    return;
  }
  imagesAlbumsEl.querySelectorAll(".load-more").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-album-key");
      const state = albumState[key];
      if (!state) {
        return;
      }
      const next = Math.min(state.visibleCount + state.pageSize, state.photos.length);
      const chunk = state.photos.slice(state.visibleCount, next);
      const grid = imagesAlbumsEl.querySelector(`.album-block[data-album-key="${key}"] .photo-grid`);
      if (grid && chunk.length) {
        grid.insertAdjacentHTML("beforeend", chunk.map(buildPhotoCard).join(""));
        bindLightbox(grid);
      }
      state.visibleCount = next;
      if (state.visibleCount >= state.photos.length) {
        button.remove();
      }
    });
  });
}

async function renderImagesPage(path) {
  if (!imagesAlbumsEl) {
    return;
  }
  try {
    const data = await loadJson(path);
    if (imagesTitleEl) {
      imagesTitleEl.textContent = data.title || "相册";
    }
    if (imagesSubtitleEl) {
      imagesSubtitleEl.textContent = data.subtitle || "";
    }
    Object.keys(albumState).forEach((key) => {
      delete albumState[key];
    });
    const defaults = {
      layout: data.layout || "grid",
      archiveBy: data.archiveBy || "",
      pageSize: data.pageSize || 0
    };
    const albums = Array.isArray(data.albums) ? data.albums : [];
    const loosePhotos = Array.isArray(data.photos) ? data.photos : [];
    const states = [];
    albums.forEach((album, index) => {
      const state = buildAlbumState(album, index, defaults);
      albumState[state.key] = state;
      states.push(state);
    });
    if (loosePhotos.length) {
      const state = buildAlbumState({ title: "照片", note: "", photos: loosePhotos }, states.length, defaults);
      albumState[state.key] = state;
      states.push(state);
    }
    if (!states.length) {
      renderEmptyState("还没有添加照片。");
      return;
    }
    imagesAlbumsEl.innerHTML = states.map(renderAlbumSection).join("");
    renderAlbumFilters(states, data.filters);
    applyAlbumFilters();
    bindAlbumLoadMore();
    bindLightbox(imagesAlbumsEl);
  } catch (error) {
    renderEmptyState("相册数据加载失败，请检查 images/manifest.json。");
  }
}

async function loadMarkdown(path) {
  const response = await fetch(encodeURI(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

async function loadJson(path) {
  const response = await fetch(encodeURI(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
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
  updateBackToTop();
  if (route.type !== "md") {
    resetDocUI();
  }

  if (route.type === "home") {
    showPage("home");
    document.title = "TTAWDTT | 首页";
    return;
  }

  if (route.type === "md") {
    showPage("md");
    setHeader(route);
    resetDocUI();
    renderDocSkeleton();
    try {
      const { raw, path } = await loadMarkdownWithFallback(route.mdPath);
      const normalized = normalizeMarkdown(raw, path);
      const { title: mdTitle, body } = splitTitle(normalized);
      if (mdTitle) {
        setHeader({ ...route, title: mdTitle });
      }
      const aboutViews = route.mdPath === "content/aboutme.md" ? extractAboutViews(normalized) : null;
      let headings = [];
      if (aboutViews) {
        headings = renderAboutViews(aboutViews, path);
      } else {
        contentEl.innerHTML = renderMarkdown(body);
        renderCallouts(contentEl);
        rewriteLinks(contentEl);
        rewriteAssets(contentEl, path);
        setupCopyButtons();
        bindLightbox(contentEl);
        headings = buildTocFromContent();
      }
      setupTocObserver(headings);

      const isDocsPage = route.mdPath.startsWith("docs/");
      if (isDocsPage) {
        await ensureDocState();
        const meta = docState.meta[route.mdPath];
        if (meta) {
          applyDocMeta(meta);
        }
        setupDocSearch(route.mdPath === "docs/index.md");
        setupReadingProgress(true);
        updateScrollUI();
      } else {
        setupDocSearch(false);
        setupReadingProgress(false);
      }
    } catch (error) {
      window.location.hash = "#/home";
    }
    return;
  }

  if (route.type === "images") {
    showPage("images");
    renderImagesSkeleton();
    await renderImagesPage(route.dataPath);
    document.title = "TTAWDTT | 相册";
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
  if (atmosphereToggle) {
    atmosphereToggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.atmosphere || "snow";
      const index = atmosphereModes.indexOf(current);
      const next = atmosphereModes[(index + 1) % atmosphereModes.length];
      applyAtmosphere(next);
    });
  }
  initBgm();
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  initSnow();
  applyAtmosphere(getPreferredAtmosphere());
  initLightbox();
  if (!scrollBound) {
    window.addEventListener("scroll", updateScrollUI, { passive: true });
    scrollBound = true;
  }
  bindGlobalKeys();
  hydrateHomeList();
  renderRoute();
}

window.addEventListener("hashchange", renderRoute);
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}
