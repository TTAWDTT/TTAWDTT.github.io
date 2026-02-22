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
  },
  sponsor: {
    type: "md",
    title: "赞助",
    eyebrow: "赞助",
    subtitle: "支持这个站点",
    mdPath: "docs/sponsor.md"
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
const bgmBgCanvas = document.getElementById("bgm-bg-canvas");
const eggModal = document.getElementById("egg-modal");
const eggCanvas = document.getElementById("egg-canvas");
const eggClose = document.getElementById("egg-close");
const eggRestart = document.getElementById("egg-restart");
const eggScoreEl = document.getElementById("egg-score");
const eggBestEl = document.getElementById("egg-best");

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
  analyser: null,
  analyserData: null,
  timeData: null,
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
  },
  bg: {
    ctx: null,
    raf: 0,
    lastTime: 0,
    blobs: [],
    notes: [],
    noteAccumulator: 0,
    reducedMotion: false,
    dpr: 1,
    dprCap: 1.5,
    noteSprites: new Map(),
    blobSprites: new Map(),
    grainPatterns: new Map(),
    frameInterval: 1000 / 30
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

const atmosphereModes = ["snow", "sakura", "rain", "none"];
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

const DOCS_PREFIX = "docs/";
const NESTED_DOCS_PREFIX = "docs/docs/";
const CONTENT_PREFIX = "content/";
const IMAGES_PREFIX = "images/";
const EXTERNAL_PATH_PATTERN = /^(https?:|data:|#|\/)/;

const storage = {
  getRaw(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null || raw === undefined ? fallback : raw;
    } catch (error) {
      return fallback;
    }
  },
  setRaw(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage failures for file:// or privacy-restricted contexts.
    }
  },
  getJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },
  setJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // ignore
    }
  }
};

const pathUtils = {
  isExternalPath(path) {
    return EXTERNAL_PATH_PATTERN.test(path);
  },
  stripRelativePrefix(path) {
    return String(path || "").replace(/^\.?\//, "");
  },
  normalizeDocHref(href) {
    return pathUtils.stripRelativePrefix(href).replace(/^docs\//, "");
  },
  getDocsMirrorPath(mdPath) {
    if (mdPath.startsWith(NESTED_DOCS_PREFIX)) {
      return mdPath.replace(/^docs\/docs\//, DOCS_PREFIX);
    }
    if (mdPath.startsWith(DOCS_PREFIX)) {
      return mdPath.replace(/^docs\//, NESTED_DOCS_PREFIX);
    }
    return null;
  }
};

const docLinkUtils = {
  forEachMarkdownDocLink(markdown, visitor) {
    const regex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
    let match = regex.exec(markdown);
    while (match) {
      visitor(match);
      match = regex.exec(markdown);
    }
  },
  forEachWikiLink(markdown, visitor) {
    const regex = /\[\[([^\]]+)\]\]/g;
    let match = regex.exec(markdown);
    while (match) {
      visitor(match);
      match = regex.exec(markdown);
    }
  }
};

let docSearchBound = false;
let scrollBound = false;
let keyBindingsBound = false;
let imageRevealObserver = null;
let aboutViewState = null;
let tocClickBound = false;
let bgmCloseTimer = 0;
let eggState = null;

function getStored(key, fallback) {
  return storage.getJson(key, fallback);
}

function setStored(key, value) {
  storage.setJson(key, value);
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
  if (raw === "sponsor") {
    return { ...routes.sponsor, routeKey: "sponsor" };
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
  docLinkUtils.forEachMarkdownDocLink(markdown, (mdMatch) => {
    links.add(mdMatch[2]);
  });
  docLinkUtils.forEachWikiLink(markdown, (wikiMatch) => {
    const target = wikiMatch[1].split("|")[0].trim();
    if (target) {
      links.add(target);
    }
  });
  return Array.from(links);
}

function normalizeDocLink(link) {
  if (!link) {
    return null;
  }
  const cleaned = pathUtils.normalizeDocHref(link);
  if (cleaned.endsWith(".md")) {
    return `${DOCS_PREFIX}${cleaned.replace(/\.md$/, "")}.md`;
  }
  return `${DOCS_PREFIX}${cleaned}.md`;
}

function initMarked() {
  if (window.marked && typeof window.marked.setOptions === "function") {
    const renderer = new window.marked.Renderer();
    renderer.br = () => "<br>";
    window.marked.setOptions({
      mangle: false,
      headerIds: true,
      breaks: true,
      renderer
    });
  }
}

