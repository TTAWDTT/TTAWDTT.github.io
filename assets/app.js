const routes = {
  home: {
    type: "home",
    title: "Home",
    eyebrow: "Home",
    subtitle: "A HeroUI-inspired template for GitHub Pages."
  },
  about: {
    type: "md",
    title: "About Me",
    eyebrow: "About",
    subtitle: "Personal profile and background.",
    mdPath: "content/aboutme.md"
  },
  docs: {
    type: "md",
    title: "Docs",
    eyebrow: "Docs",
    subtitle: "Guides and long-form writing.",
    mdPath: "docs/index.md"
  }
};

const pageEls = {
  home: document.querySelector('[data-page="home"]'),
  md: document.querySelector('[data-page="md"]'),
  notFound: document.querySelector('[data-page="not-found"]')
};

const headerEls = {
  eyebrow: document.getElementById("page-eyebrow"),
  title: document.getElementById("page-title"),
  subtitle: document.getElementById("page-subtitle")
};

const contentEl = document.getElementById("page-content");
const navLinks = Array.from(document.querySelectorAll("[data-route]"));

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
    const slug = raw.slice(5).replace(/\.md$/, "");
    return {
      type: "md",
      routeKey: "docs",
      title: slugToTitle(slug),
      eyebrow: "Docs",
      subtitle: "Reading mode",
      mdPath: `docs/${slug}.md`
    };
  }
  return { type: "not-found", routeKey: "not-found" };
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
    window.marked.setOptions({
      mangle: false,
      headerIds: true
    });
  }
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

async function loadMarkdown(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

async function renderRoute() {
  const route = parseRoute();
  setActiveNav(route.routeKey);

  if (route.type === "home") {
    showPage("home");
    document.title = "TTAWDTT | Home";
    return;
  }

  if (route.type === "md") {
    showPage("md");
    setHeader(route);
    try {
      const raw = await loadMarkdown(route.mdPath);
      const { title: mdTitle, body } = splitTitle(raw);
      if (mdTitle) {
        setHeader({ ...route, title: mdTitle });
      }
      contentEl.innerHTML = renderMarkdown(body);
      rewriteLinks(contentEl);
    } catch (error) {
      showPage("not-found");
      document.title = "TTAWDTT | Not found";
    }
    return;
  }

  showPage("not-found");
  document.title = "TTAWDTT | Not found";
}

initMarked();
window.addEventListener("hashchange", renderRoute);
window.addEventListener("DOMContentLoaded", renderRoute);
