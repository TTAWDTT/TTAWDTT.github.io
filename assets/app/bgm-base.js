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

  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.9;
  master.connect(analyser);
  analyser.connect(context.destination);

  bgmState.context = context;
  bgmState.master = master;
  bgmState.analyser = analyser;
  bgmState.analyserData = new Uint8Array(analyser.frequencyBinCount);
  bgmState.timeData = new Uint8Array(analyser.fftSize);
  bgmState.visCtx = bgmVisCanvas ? bgmVisCanvas.getContext("2d") : null;
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

function create2dCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

function getBgmBlobSprite(color) {
  const bg = bgmState.bg;
  if (!bg || !bg.blobSprites) {
    return null;
  }
  const key = String(color || "");
  const existing = bg.blobSprites.get(key);
  if (existing) {
    return existing;
  }
  const size = 256;
  const canvas = create2dCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const cx = size * 0.5;
  const cy = size * 0.5;
  const g = ctx.createRadialGradient(cx, cy, size * 0.06, cx, cy, size * 0.5);
  g.addColorStop(0, key || "rgba(255,255,255,0.8)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  bg.blobSprites.set(key, canvas);
  return canvas;
}

function getBgmNoteSprite(color) {
  const bg = bgmState.bg;
  if (!bg || !bg.noteSprites) {
    return null;
  }
  const key = String(color || "");
  const existing = bg.noteSprites.get(key);
  if (existing) {
    return existing;
  }
  const baseR = 12;
  const headR = Math.max(5, baseR * 0.75);
  const stemH = headR * 2.9;
  const yMin = -stemH;
  const yMax = headR * 0.78;
  const centerY = (yMin + yMax) * 0.5;
  const size = 160;
  const canvas = create2dCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  // Center the note's bounds, so later rotation looks natural.
  ctx.translate(size * 0.5, size * 0.5 - centerY);
  drawEggNote(ctx, 0, 0, baseR, key, 1);
  const sprite = { canvas, baseR, size };
  bg.noteSprites.set(key, sprite);
  return sprite;
}

function getBgmGrainPattern(isDark) {
  const bg = bgmState.bg;
  if (!bg || !bg.grainPatterns || !bg.ctx) {
    return null;
  }
  const key = isDark ? "dark" : "light";
  const existing = bg.grainPatterns.get(key);
  if (existing) {
    return existing;
  }
  const size = 96;
  const canvas = create2dCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const color = isDark ? 250 : 20;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() < 0.06) {
      data[i] = color;
      data[i + 1] = color;
      data[i + 2] = color;
      data[i + 3] = 80 + Math.floor(Math.random() * 120);
    } else {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  const pattern = bg.ctx.createPattern(canvas, "repeat");
  if (!pattern) {
    return null;
  }
  bg.grainPatterns.set(key, pattern);
  return pattern;
}

function initBgmBackground() {
  if (!bgmBgCanvas) {
    return;
  }
  const ctx = bgmBgCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  bgmState.bg.ctx = ctx;
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  bgmState.bg.reducedMotion = reducedMotion;
  bgmState.bg.frameInterval = reducedMotion ? 1000 / 18 : 1000 / 30;
  resizeBgmBackground();
  window.addEventListener("resize", resizeBgmBackground);
}

function resizeBgmBackground() {
  if (!bgmBgCanvas || !bgmState.bg.ctx) {
    return;
  }
  const dprRaw = window.devicePixelRatio || 1;
  const dprCap = bgmState.bg.reducedMotion ? 1.25 : bgmState.bg.dprCap || 1.5;
  const dpr = Math.min(dprRaw, dprCap);
  const width = window.innerWidth;
  const height = window.innerHeight;
  bgmBgCanvas.width = Math.floor(width * dpr);
  bgmBgCanvas.height = Math.floor(height * dpr);
  bgmBgCanvas.style.width = `${width}px`;
  bgmBgCanvas.style.height = `${height}px`;
  bgmState.bg.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgmState.bg.dpr = dpr;

  if (!bgmState.bg.blobs.length) {
    bgmState.bg.blobs = [
      { x: width * 0.28, y: height * 0.36, r: Math.min(width, height) * 0.22, vx: 0.09, vy: 0.06, phase: 0.1 },
      { x: width * 0.66, y: height * 0.52, r: Math.min(width, height) * 0.26, vx: -0.07, vy: 0.05, phase: 1.2 },
      { x: width * 0.52, y: height * 0.74, r: Math.min(width, height) * 0.2, vx: 0.05, vy: -0.08, phase: 2.4 }
    ];
  }
}

function startBgmBackground() {
  if (!bgmState.bg.ctx || !bgmState.analyser || !bgmState.analyserData || bgmState.bg.raf) {
    return;
  }
  document.documentElement.classList.add("bgm-bg-active");
  bgmState.bg.lastTime = 0;
  bgmState.bg.raf = window.requestAnimationFrame(stepBgmBackground);
}

function stopBgmBackground() {
  if (bgmState.bg.raf) {
    window.cancelAnimationFrame(bgmState.bg.raf);
    bgmState.bg.raf = 0;
  }
  bgmState.bg.notes = [];
  bgmState.bg.noteAccumulator = 0;
  document.documentElement.classList.remove("bgm-bg-active");
  if (bgmState.bg.ctx && bgmBgCanvas) {
    bgmState.bg.ctx.clearRect(0, 0, bgmBgCanvas.width, bgmBgCanvas.height);
  }
}

function spawnBgmNote(width, height, colors, energy) {
  const pick = Math.random();
  const color = pick < 0.55 ? colors[0] : pick < 0.92 ? colors[2] : colors[1];
  const r = 6 + Math.random() * 9;
  return {
    x: Math.random() * width,
    y: -30 - Math.random() * 120,
    r,
    vy: 22 + Math.random() * 64 + energy * 92,
    drift: 10 + Math.random() * 26,
    wobble: Math.random() * Math.PI * 2,
    spin: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.7),
    rot: (Math.random() * 2 - 1) * 0.18,
    alpha: 0.045 + Math.random() * 0.06,
    color
  };
}

function stepBgmBackground(timestamp) {
  const ctx = bgmState.bg.ctx;
  if (!ctx || !bgmBgCanvas || !bgmState.enabled || !bgmState.analyser || !bgmState.analyserData) {
    stopBgmBackground();
    return;
  }
  if (!bgmState.bg.lastTime) {
    bgmState.bg.lastTime = timestamp;
  }
  const delta = timestamp - bgmState.bg.lastTime;
  if (delta < bgmState.bg.frameInterval) {
    bgmState.bg.raf = window.requestAnimationFrame(stepBgmBackground);
    return;
  }
  bgmState.bg.lastTime = timestamp;
  const dt = delta / 1000;

  const width = window.innerWidth;
  const height = window.innerHeight;
  bgmState.analyser.getByteFrequencyData(bgmState.analyserData);
  const bins = bgmState.analyserData;
  const bass = clamp01(avgRange(bins, 0, 10) / 255);
  const mid = clamp01(avgRange(bins, 12, 70) / 255);
  const air = clamp01(avgRange(bins, 80, 160) / 255);
  const energy = clamp01(0.45 * bass + 0.35 * mid + 0.2 * air);

  const isDark = (document.documentElement.dataset.theme || "light") === "dark";
  const accent = readCssVar("--accent", "#d97757");
  const accent2 = readCssVar("--accent-2", "#6a9bcc");
  const accent3 = readCssVar("--accent-3", "#788c5d");

  ctx.clearRect(0, 0, width, height);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  if (isDark) {
    base.addColorStop(0, "rgba(250,249,245,0.02)");
    base.addColorStop(1, "rgba(250,249,245,0)");
  } else {
    base.addColorStop(0, "rgba(20,20,19,0.02)");
    base.addColorStop(1, "rgba(20,20,19,0)");
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const colors = [accent2, accent, accent3];
  bgmState.bg.blobs.forEach((blob, index) => {
    blob.phase += 0.002 + energy * 0.006;
    blob.x += blob.vx * (0.8 + energy * 1.2);
    blob.y += blob.vy * (0.8 + energy * 1.2);
    blob.x += Math.sin(blob.phase + index) * (0.18 + bass * 0.9);
    blob.y += Math.cos(blob.phase + index * 1.3) * (0.14 + mid * 0.7);
    if (blob.x < -blob.r) blob.x = width + blob.r;
    if (blob.x > width + blob.r) blob.x = -blob.r;
    if (blob.y < -blob.r) blob.y = height + blob.r;
    if (blob.y > height + blob.r) blob.y = -blob.r;

    const r = blob.r * (0.8 + energy * 0.65);
    const alpha = (isDark ? 0.12 : 0.07) * (0.55 + energy);
    const sprite = getBgmBlobSprite(colors[index]);
    if (!sprite) {
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, blob.x - r, blob.y - r, r * 2, r * 2);
    ctx.restore();
  });

  // Music-reactive note rain (subtle, behind content).
  const spawnRate = (bgmState.bg.reducedMotion ? 0.35 : 0.85) + energy * (bgmState.bg.reducedMotion ? 0.65 : 2.05);
  bgmState.bg.noteAccumulator += (delta * spawnRate) / 1000;
  const maxNotes = bgmState.bg.reducedMotion ? 60 : 140;
  while (bgmState.bg.noteAccumulator >= 1) {
    bgmState.bg.noteAccumulator -= 1;
    bgmState.bg.notes.push(spawnBgmNote(width, height, colors, energy));
    if (bgmState.bg.notes.length > maxNotes) {
      bgmState.bg.notes.shift();
    }
  }

  if (bgmState.bg.notes.length) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    bgmState.bg.notes.forEach((note) => {
      note.wobble += dt * (0.85 + energy * 2.2);
      note.rot += note.spin * dt;
      note.y += note.vy * dt;
      note.x += Math.sin(note.wobble) * note.drift * dt;
      if (note.x < -40) note.x = width + 40;
      if (note.x > width + 40) note.x = -40;

      const localAlpha = note.alpha * (isDark ? 1.05 : 0.9) * (0.55 + energy * 0.95);
      const sprite = getBgmNoteSprite(note.color);
      if (!sprite) {
        return;
      }
      const scale = note.r / sprite.baseR;
      const size = sprite.size * scale;
      ctx.save();
      ctx.globalAlpha = localAlpha;
      ctx.translate(note.x, note.y);
      ctx.rotate(note.rot);
      ctx.drawImage(sprite.canvas, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();
    });
    ctx.restore();
    bgmState.bg.notes = bgmState.bg.notes.filter((note) => note.y < height + 60);
  }

  // Subtle film grain.
  ctx.save();
  ctx.globalAlpha = isDark ? 0.04 : 0.03;
  const grain = getBgmGrainPattern(isDark);
  if (grain) {
    ctx.translate(Math.random() * 40, Math.random() * 40);
    ctx.fillStyle = grain;
    ctx.fillRect(-60, -60, width + 120, height + 120);
  }
  ctx.restore();

  bgmState.bg.raf = window.requestAnimationFrame(stepBgmBackground);
}

function ensureBgmAudioGraph() {
  const context = ensureAudioContext();
  if (!context || !bgmState.master) {
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
      bgmState.mediaSource.connect(bgmState.master);
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
    startBgmBackground();
  } else {
    stopSnowLoop();
    setBgmSubtitle("已暂停");
    stopBgmBackground();
  }
}

