async function loadMarkdown(path) {
  return loadResource(path, (response) => response.text());
}

async function loadJson(path) {
  return loadResource(path, (response) => response.json());
}

async function loadResource(path, parser) {
  const response = await fetch(encodeURI(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return parser(response);
}

async function loadMarkdownWithFallback(mdPath) {
  try {
    return { raw: await loadMarkdown(mdPath), path: mdPath };
  } catch (error) {
    const altPath = pathUtils.getDocsMirrorPath(mdPath);
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
  initBgmBackground();
  initEggGame();
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
