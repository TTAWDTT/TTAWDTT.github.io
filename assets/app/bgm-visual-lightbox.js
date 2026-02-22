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

