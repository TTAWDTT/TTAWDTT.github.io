function normalizeImageSrc(src) {
  if (!src) {
    return src;
  }
  if (pathUtils.isExternalPath(src)) {
    return src;
  }
  if (src.startsWith(IMAGES_PREFIX) || src.startsWith(DOCS_PREFIX) || src.startsWith(CONTENT_PREFIX)) {
    return src;
  }
  return `${IMAGES_PREFIX}${src.replace(/^\.\/+/, "")}`;
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
  docLinkUtils.forEachMarkdownDocLink(markdown, (match) => {
    links.push({ text: match[1].trim(), href: match[2].trim() });
  });
  return links;
}

function toDocRoute(href) {
  const clean = pathUtils.normalizeDocHref(href).replace(/\.md$/, "");
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

async function renderTechIndex() {
  if (!contentEl) {
    return;
  }
  await ensureDocState();
  const techDocs = docState.list.filter((item) => {
    const tags = (item.tags || []).map((tag) => String(tag).toLowerCase());
    return tags.includes("技术") || tags.includes("tech");
  });
  if (!techDocs.length) {
    return;
  }
  const listHtml = techDocs
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
  const sectionHtml = `
    <hr>
    <section class="doc-tech-index">
      <h2>技术文章</h2>
      <div class="doc-search-results">
        ${listHtml}
      </div>
    </section>
  `;
  contentEl.insertAdjacentHTML("beforeend", sectionHtml);
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
