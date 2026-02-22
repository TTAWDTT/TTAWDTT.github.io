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

