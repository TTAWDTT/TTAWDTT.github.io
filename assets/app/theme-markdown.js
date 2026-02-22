function safeGetItem(key) {
  return storage.getRaw(key, null);
}

function safeSetItem(key, value) {
  storage.setRaw(key, value);
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
  if (pathUtils.isExternalPath(assetPath)) {
    return assetPath;
  }
  if (assetPath.startsWith(DOCS_PREFIX) || assetPath.startsWith(CONTENT_PREFIX)) {
    return assetPath;
  }
  const clean = assetPath.replace(/^\.\/+/, "");
  const baseDir = mdPath.split("/").slice(0, -1).join("/");
  if (mdPath.startsWith(NESTED_DOCS_PREFIX)) {
    return `${DOCS_PREFIX}${clean}`;
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

