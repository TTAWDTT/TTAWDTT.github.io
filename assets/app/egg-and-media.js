function initEggGame() {
  if (!eggModal || !eggCanvas || !eggClose || !eggRestart || !eggScoreEl || !eggBestEl) {
    return;
  }
  const brand = document.querySelector(".brand");
  let clicks = 0;
  let clickTimer = 0;

  const open = () => {
    eggModal.classList.add("active");
    eggModal.setAttribute("aria-hidden", "false");
    startEggGame();
  };
  const close = () => {
    eggModal.classList.remove("active");
    eggModal.setAttribute("aria-hidden", "true");
    stopEggGame();
  };

  if (brand) {
    brand.addEventListener("click", () => {
      if (eggModal.classList.contains("active")) {
        return;
      }
      clicks += 1;
      if (clickTimer) {
        window.clearTimeout(clickTimer);
      }
      clickTimer = window.setTimeout(() => {
        clicks = 0;
        clickTimer = 0;
      }, 900);
      if (clicks >= 7) {
        clicks = 0;
        if (clickTimer) {
          window.clearTimeout(clickTimer);
          clickTimer = 0;
        }
        open();
      }
    });
  }

  eggClose.addEventListener("click", close);
  eggRestart.addEventListener("click", () => startEggGame(true));
  eggModal.addEventListener("click", (event) => {
    if (event.target === eggModal) {
      close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!eggModal.classList.contains("active")) {
      return;
    }
    if (event.key === "Escape") {
      close();
      event.preventDefault();
    }
  });
}

function startEggGame(forceReset = false) {
  if (!eggCanvas) {
    return;
  }
  const ctx = eggCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const best = Number(getStored("ttawdtt.egg.best", 0)) || 0;
  const width = eggCanvas.width;
  const height = eggCanvas.height;
  const bgParticles = [];
  for (let i = 0; i < 26; i += 1) {
    bgParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.7 + Math.random() * 1.6,
      vy: 10 + Math.random() * 22,
      drift: (Math.random() * 2 - 1) * (6 + Math.random() * 12)
    });
  }
  eggState = {
    ctx,
    width,
    height,
    score: forceReset ? 0 : 0,
    best,
    combo: 0,
    shake: 0,
    hp: 3,
    maxHp: 3,
    invuln: 0,
    stamina: 1,
    overheated: false,
    startedAt: performance.now(),
    alive: true,
    lastTime: 0,
    raf: 0,
    spawnTimer: 0,
    player: { x: width * 0.5, y: height * 0.82, r: 12, vx: 0, vy: 0 },
    keys: { left: false, right: false, up: false, down: false, boost: false },
    items: [],
    bgParticles,
    sparks: [],
    floaters: [],
    music: { bass: 0, mid: 0, air: 0, energy: 0, bins: null, time: null },
    chorus: { charge: 0, active: 0, cooldown: 0, flash: 0 }
  };
  updateEggHud();
  bindEggControls();
  eggState.raf = window.requestAnimationFrame(stepEggGame);
}

function stopEggGame() {
  if (!eggState) {
    return;
  }
  if (eggState.raf) {
    window.cancelAnimationFrame(eggState.raf);
  }
  unbindEggControls();
  eggState = null;
}

let eggControlsBound = false;
let eggKeyHandler = null;

function bindEggControls() {
  if (eggControlsBound) {
    return;
  }
  eggKeyHandler = (event) => {
    if (!eggState || !eggModal || !eggModal.classList.contains("active")) {
      return;
    }
    const key = event.key;
    const lower = key.toLowerCase();
    const down = event.type === "keydown";
    if (key === "ArrowLeft" || lower === "a") eggState.keys.left = down;
    if (key === "ArrowRight" || lower === "d") eggState.keys.right = down;
    if (key === "ArrowUp" || lower === "w") eggState.keys.up = down;
    if (key === "ArrowDown" || lower === "s") eggState.keys.down = down;
    if (key === "Shift") eggState.keys.boost = down;
    if (down && (key === " " || lower === "r" || lower === "enter")) {
      if (eggState && !eggState.alive) {
        startEggGame(true);
        event.preventDefault();
      }
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
      event.preventDefault();
    }
  };
  document.addEventListener("keydown", eggKeyHandler);
  document.addEventListener("keyup", eggKeyHandler);
  eggControlsBound = true;
}

function unbindEggControls() {
  if (!eggControlsBound || !eggKeyHandler) {
    return;
  }
  document.removeEventListener("keydown", eggKeyHandler);
  document.removeEventListener("keyup", eggKeyHandler);
  eggKeyHandler = null;
  eggControlsBound = false;
}

function updateEggHud() {
  if (!eggState || !eggScoreEl || !eggBestEl) {
    return;
  }
  eggScoreEl.textContent = `Score ${eggState.score}`;
  eggBestEl.textContent = `Best ${eggState.best}`;
}

function spawnEggItem() {
  if (!eggState) {
    return;
  }
  const music = eggState.music || getEggMusicSnapshot();
  const chorus = eggState.chorus || { active: 0 };
  const goodBias = chorus.active > 0 ? -0.08 : 0;
  const good = Math.random() > (0.22 + music.energy * 0.06 + goodBias);
  const x = 16 + Math.random() * (eggState.width - 32);
  const speedBoost = chorus.active > 0 ? 1.25 : 1;
  const speed = (110 + Math.random() * 170 + music.energy * 220) * speedBoost;
  eggState.items.push({
    x,
    y: -14,
    r: good ? 8 + Math.random() * 5 : 10 + Math.random() * 6,
    vy: speed,
    good,
    wobble: Math.random() * Math.PI * 2
  });
}

function getEggMusicSnapshot() {
  if (!bgmState.enabled || !bgmState.analyser || !bgmState.analyserData || !bgmState.timeData) {
    return { bass: 0, mid: 0, air: 0, energy: 0, bins: null, time: null };
  }
  bgmState.analyser.getByteFrequencyData(bgmState.analyserData);
  bgmState.analyser.getByteTimeDomainData(bgmState.timeData);
  const bins = bgmState.analyserData;
  const bass = clamp01(avgRange(bins, 0, 10) / 255);
  const mid = clamp01(avgRange(bins, 12, 70) / 255);
  const air = clamp01(avgRange(bins, 80, 160) / 255);
  const energy = clamp01(0.5 * bass + 0.35 * mid + 0.15 * air);
  return { bass, mid, air, energy, bins, time: bgmState.timeData };
}

function drawEggCenterVisual(ctx, centerX, centerY, width, height, music) {
  if (!music || !music.bins || !music.time) {
    return;
  }
  const ink = readCssVar("--ink", "#141413");
  const accent = readCssVar("--accent", "#d97757");
  const accent2 = readCssVar("--accent-2", "#6a9bcc");
  const accent3 = readCssVar("--accent-3", "#788c5d");
  const isDark = (document.documentElement.dataset.theme || "light") === "dark";

  const bins = music.bins;
  const time = music.time;
  const energy = music.energy;
  const mid = music.mid;
  const bass = music.bass;

  // Ribbon (same language as BGM panel, but calmer).
  const padding = 26;
  const ribbonAmp = 16 * (0.85 + mid * 0.9);
  ctx.save();
  ctx.globalAlpha = (isDark ? 0.18 : 0.12) * (0.65 + energy);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = accent2;
  ctx.shadowBlur = 10 * (0.4 + energy);
  const grad = ctx.createLinearGradient(padding, 0, width - padding, 0);
  grad.addColorStop(0, accent3);
  grad.addColorStop(0.55, accent2);
  grad.addColorStop(1, accent);
  ctx.strokeStyle = grad;
  ctx.beginPath();
  const samples = 120;
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const idx = Math.floor(t * (time.length - 1));
    const v = (time[idx] - 128) / 128;
    const x = padding + t * (width - padding * 2);
    const y = centerY + v * ribbonAmp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // Halo spectrum (same language as BGM panel).
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.lineCap = "round";
  ctx.shadowColor = accent2;
  ctx.shadowBlur = 12 * (0.35 + energy);
  const radius = 44 + bass * 18;
  const bars = 42;
  const step = Math.max(1, Math.floor(bins.length / bars));
  const baseAlpha = (isDark ? 0.22 : 0.15) * (0.65 + energy * 0.85);
  for (let i = 0; i < bars; i += 1) {
    const b = bins[i * step] / 255;
    const angle = (i / bars) * Math.PI * 2;
    const len = 16 * (0.22 + Math.pow(b, 1.15));
    const x0 = Math.cos(angle) * radius;
    const y0 = Math.sin(angle) * radius;
    const x1 = Math.cos(angle) * (radius + len);
    const y1 = Math.sin(angle) * (radius + len);
    ctx.globalAlpha = baseAlpha * (0.55 + b * 0.75);
    ctx.strokeStyle = i % 3 === 0 ? accent : i % 3 === 1 ? accent2 : accent3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();

  // A tiny anchor dot to give it a "panel" vibe.
  ctx.save();
  ctx.globalAlpha = (isDark ? 0.14 : 0.1) * (0.65 + energy);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 2.2 + bass * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEggNote(ctx, x, y, r, color, glowStrength) {
  ctx.save();
  const baseAlpha = ctx.globalAlpha;
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = baseAlpha * 0.92;
  if (glowStrength > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * glowStrength;
  }
  const headR = Math.max(5, r * 0.75);
  ctx.beginPath();
  ctx.ellipse(0, 0, headR * 1.05, headR * 0.78, -0.45, 0, Math.PI * 2);
  ctx.fill();

  const stemH = headR * 2.9;
  const stemW = Math.max(2, headR * 0.22);
  ctx.shadowBlur = 0;
  ctx.fillRect(headR * 0.78, -stemH, stemW, stemH);

  ctx.globalAlpha = baseAlpha * 0.35;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.ellipse(-headR * 0.22, -headR * 0.12, headR * 0.28, headR * 0.42, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEggHudOverlay(ctx, width, height, state) {
  const ink = readCssVar("--ink", "#141413");
  const muted = readCssVar("--muted", "#6f6b63");
  const accent = readCssVar("--accent-2", "#6a9bcc");
  const danger = readCssVar("--accent", "#d97757");
  const isDark = (document.documentElement.dataset.theme || "light") === "dark";

  // HP hearts.
  const x0 = 14;
  const y0 = 36;
  ctx.save();
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < state.maxHp; i += 1) {
    const on = i < state.hp;
    ctx.save();
    ctx.translate(x0 + i * 18, y0);
    ctx.scale(0.9, 0.9);
    ctx.globalAlpha = on ? 0.9 : 0.22;
    ctx.fillStyle = on ? danger : muted;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(0, 0, 6, 0, 6, 4);
    ctx.bezierCurveTo(6, 0, 12, 0, 12, 4);
    ctx.bezierCurveTo(12, 8, 6, 12, 6, 12);
    ctx.bezierCurveTo(6, 12, 0, 8, 0, 4);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Stamina bar.
  const barW = 110;
  const barH = 7;
  const barX = 14;
  const barY = 52;
  const stamina = clamp01(state.stamina || 0);
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = isDark ? "rgba(250,249,245,0.08)" : "rgba(20,20,19,0.06)";
  roundRect(ctx, barX, barY, barW, barH, 999);
  ctx.globalAlpha = state.overheated ? 0.55 : 0.8;
  const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  g.addColorStop(0, accent);
  g.addColorStop(1, danger);
  ctx.fillStyle = g;
  roundRect(ctx, barX, barY, barW * stamina, barH, 999);
  ctx.restore();

  // Chorus tag.
  if (state.chorus && state.chorus.active > 0) {
    ctx.save();
    ctx.globalAlpha = 0.65 + Math.min(0.25, state.chorus.flash || 0);
    ctx.fillStyle = accent;
    ctx.font = "700 12px var(--font-display)";
    ctx.textAlign = "right";
    ctx.fillText("CHORUS", width - 14, 36);
    ctx.textAlign = "left";
    ctx.restore();
  }
}

function drawEggGameOver(ctx, width, height, state) {
  const ink = readCssVar("--ink", "#141413");
  const muted = readCssVar("--muted", "#6f6b63");
  const accent = readCssVar("--accent-2", "#6a9bcc");
  const isDark = (document.documentElement.dataset.theme || "light") === "dark";

  ctx.save();
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.62)" : "rgba(250,249,245,0.62)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const minutes = Math.floor(((performance.now() - (state.startedAt || performance.now())) / 1000) / 60);
  const seconds = Math.floor(((performance.now() - (state.startedAt || performance.now())) / 1000) % 60);
  const timeText = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const score = state.score || 0;
  const grade = score >= 65 ? "S" : score >= 45 ? "A" : score >= 25 ? "B" : score >= 12 ? "C" : "D";

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.95;
  ctx.font = "800 28px var(--font-display)";
  ctx.fillText("Game Over", width * 0.5, height * 0.42);
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = muted;
  ctx.font = "600 13px var(--font-display)";
  ctx.fillText(`Score ${score} · Best ${state.best || 0} · Time ${timeText}`, width * 0.5, height * 0.42 + 26);

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = accent;
  ctx.font = "900 46px var(--font-display)";
  ctx.fillText(grade, width * 0.5, height * 0.42 - 42);

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = muted;
  ctx.font = "600 12px var(--font-display)";
  ctx.fillText("按 空格 / Enter / R 重新开始 · Esc 关闭", width * 0.5, height * 0.72);
  ctx.restore();
}

function stepEggGame(timestamp) {
  if (!eggState) {
    return;
  }
  if (!eggState.lastTime) {
    eggState.lastTime = timestamp;
  }
  const delta = Math.min(40, timestamp - eggState.lastTime);
  eggState.lastTime = timestamp;
  const dt = delta / 1000;

  const ctx = eggState.ctx;
  const { width, height } = eggState;
  ctx.clearRect(0, 0, width, height);

  const ink = readCssVar("--ink", "#141413");
  const muted = readCssVar("--muted", "#6f6b63");
  const accent = readCssVar("--accent-2", "#6a9bcc");
  const danger = readCssVar("--accent", "#d97757");
  const music = getEggMusicSnapshot();
  eggState.music = music;

  // Chorus detector: sustained high energy triggers a short burst.
  const chorus = eggState.chorus || { charge: 0, active: 0, cooldown: 0, flash: 0 };
  const wantsChorus = music.energy > 0.58 && music.bass > 0.22;
  chorus.charge = Math.max(0, chorus.charge + (wantsChorus ? dt : -dt * 1.25));
  chorus.cooldown = Math.max(0, chorus.cooldown - dt);
  chorus.active = Math.max(0, chorus.active - dt);
  chorus.flash = Math.max(0, (chorus.flash || 0) - dt * 2.2);
  if (chorus.active <= 0 && chorus.cooldown <= 0 && chorus.charge > 1.25) {
    chorus.active = 7.2;
    chorus.cooldown = 8.5;
    chorus.charge = 0;
    chorus.flash = 0.55;
    eggState.shake = Math.min(0.22, (eggState.shake || 0) + 0.1);
    if (eggState.floaters) {
      eggState.floaters.push({
        x: width * 0.5,
        y: height * 0.5 - 48,
        vy: 18,
        life: 1.05,
        text: "CHORUS!",
        color: accent
      });
    }
  }
  eggState.chorus = chorus;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "rgba(0,0,0,0)");
  bg.addColorStop(1, `rgba(0,0,0,${0.08 + music.energy * 0.06})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Ambient drift particles (quiet, like BGM panel snow).
  if (eggState.bgParticles) {
    ctx.save();
    ctx.globalAlpha = 0.28 + music.bass * 0.18;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    eggState.bgParticles.forEach((p) => {
      p.y += p.vy * (0.8 + music.bass * 1.2) * dt;
      p.x += Math.sin((timestamp / 1000) * 0.8 + p.y * 0.02) * (p.drift * (0.12 + music.energy * 0.18)) * dt;
      if (p.y > height + 8) {
        p.y = -8;
        p.x = Math.random() * width;
      }
      if (p.x < -8) p.x = width + 8;
      if (p.x > width + 8) p.x = -8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.85 + music.bass * 0.8), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // Center visual matches the BGM panel language (ribbon + halo).
  drawEggCenterVisual(ctx, width * 0.5, height * 0.5, width, height, music);

  const player = eggState.player;
  if (!eggState.alive) {
    drawEggHudOverlay(ctx, width, height, eggState);
    drawEggGameOver(ctx, width, height, eggState);
    eggState.raf = window.requestAnimationFrame(stepEggGame);
    return;
  }

  // Stamina / overheat for boost.
  const boosting = !!eggState.keys.boost;
  const wantsBoost = boosting && !eggState.overheated;
  if (wantsBoost) {
    eggState.stamina = Math.max(0, (eggState.stamina || 0) - dt * (0.62 + music.energy * 0.22));
    if (eggState.stamina <= 0.001) {
      eggState.overheated = true;
      eggState.shake = Math.min(0.22, (eggState.shake || 0) + 0.06);
      if (eggState.floaters) {
        eggState.floaters.push({
          x: player.x,
          y: player.y - 18,
          vy: 22,
          life: 0.85,
          text: "OVERHEAT",
          color: danger
        });
      }
    }
  } else {
    eggState.stamina = Math.min(1, (eggState.stamina || 0) + dt * (0.38 + (chorus.active > 0 ? 0.1 : 0)));
  }
  if (eggState.overheated && eggState.stamina > 0.38) {
    eggState.overheated = false;
  }

  const inputX = (eggState.keys.left ? -1 : 0) + (eggState.keys.right ? 1 : 0);
  const inputY = (eggState.keys.up ? -1 : 0) + (eggState.keys.down ? 1 : 0);
  const hasInput = inputX !== 0 || inputY !== 0;
  const norm = hasInput ? 1 / Math.max(1, Math.hypot(inputX, inputY)) : 0;
  const speedScale = 0.92 + music.energy * 0.18;
  const baseSpeed = 620 * speedScale;
  const boostSpeed = 900 * speedScale;
  const chorusBoost = chorus.active > 0 ? 1.08 : 1;
  const canBoost = eggState.keys.boost && !eggState.overheated && (eggState.stamina || 0) > 0.02;
  const maxSpeed = (canBoost ? boostSpeed : baseSpeed) * chorusBoost * (hasInput ? 1 : 0);
  const targetVx = inputX * norm * maxSpeed;
  const targetVy = inputY * norm * maxSpeed;
  const accelRate = hasInput ? 24 : 0;
  const brakeRate = 32;
  const response = 1 - Math.exp(-dt * (hasInput ? accelRate : brakeRate));
  player.vx += (targetVx - player.vx) * response;
  player.vy += (targetVy - player.vy) * response;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(player.r, Math.min(width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(height - player.r, player.y));

  eggState.spawnTimer += delta;
  const baseSpawn = eggState.score > 30 ? 320 : 420;
  const chorusTighten = chorus.active > 0 ? 130 : 0;
  const spawnEvery = Math.max(140, baseSpawn - music.energy * 160 - chorusTighten);
  if (eggState.spawnTimer > spawnEvery) {
    eggState.spawnTimer = 0;
    spawnEggItem();
  }

  ctx.save();
  ctx.globalAlpha = 0.9;
  eggState.items.forEach((item) => {
    item.wobble += dt * 3.2;
    item.y += (item.vy + music.mid * 140) * dt;
    item.x += Math.sin(item.wobble) * dt * (38 + music.air * 44);

    const dx = item.x - player.x;
    const dy = item.y - player.y;
    const dist = Math.hypot(dx, dy);
    // A tiny "magnet" for good notes to make it feel more musical/satisfying.
    if (item.good && dist < 92 && music.energy > 0.08) {
      const pull = (0.75 + music.energy * 0.65) * dt;
      item.x += (-dx / Math.max(1, dist)) * 48 * pull;
      item.y += (-dy / Math.max(1, dist)) * 48 * pull;
    }
    if (dist < item.r + player.r) {
      if (item.good) {
        eggState.score += 1;
        eggState.combo = Math.min(999, (eggState.combo || 0) + 1);
        if ((eggState.combo || 0) % 18 === 0 && eggState.hp < eggState.maxHp) {
          eggState.hp += 1;
          if (eggState.floaters) {
            eggState.floaters.push({
              x: player.x,
              y: player.y - 22,
              vy: 18,
              life: 0.95,
              text: "+HP",
              color: accent
            });
          }
        }
        if (eggState.score > eggState.best) {
          eggState.best = eggState.score;
          setStored("ttawdtt.egg.best", eggState.best);
        }
        if (eggState.sparks) {
          const burst = 6 + Math.floor(music.energy * 6);
          for (let i = 0; i < burst; i += 1) {
            eggState.sparks.push({
              x: item.x,
              y: item.y,
              vx: (Math.random() * 2 - 1) * (70 + music.energy * 110),
              vy: (Math.random() * 2 - 1) * (70 + music.energy * 110),
              life: 0.55 + Math.random() * 0.25,
              r: 1.2 + Math.random() * 1.8,
              color: accent
            });
          }
        }
        if (eggState.floaters) {
          eggState.floaters.push({
            x: item.x,
            y: item.y - 8,
            vy: 26,
            life: 0.85,
            text: eggState.combo >= 8 ? `+1  x${Math.min(9, Math.floor(eggState.combo / 4) + 1)}` : "+1",
            color: accent
          });
        }
      } else {
        const tookHit = (eggState.invuln || 0) <= 0;
        if (tookHit) {
          eggState.score = Math.max(0, eggState.score - 4);
          eggState.combo = 0;
          eggState.hp = Math.max(0, (eggState.hp || 0) - 1);
          eggState.invuln = 0.7;
          eggState.shake = Math.min(0.24, (eggState.shake || 0) + 0.14 + music.energy * 0.08);
          if (eggState.hp <= 0) {
            eggState.alive = false;
          }
          if (eggState.sparks) {
            for (let i = 0; i < 10; i += 1) {
              eggState.sparks.push({
                x: item.x,
                y: item.y,
                vx: (Math.random() * 2 - 1) * 120,
                vy: (Math.random() * 2 - 1) * 120,
                life: 0.55 + Math.random() * 0.2,
                r: 1.2 + Math.random() * 2.2,
                color: danger
              });
            }
          }
          if (eggState.floaters) {
            eggState.floaters.push({
              x: item.x,
              y: item.y - 8,
              vy: 24,
              life: 0.95,
              text: "-4",
              color: danger
            });
          }
        }
      }
      item.y = height + 999;
      updateEggHud();
    }

    if (item.good) {
      drawEggNote(ctx, item.x, item.y, item.r, accent, 0.55 + music.energy);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = danger;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.r * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(item.x - item.r * 0.55, item.y - item.r * 0.55);
      ctx.lineTo(item.x + item.r * 0.55, item.y + item.r * 0.55);
      ctx.moveTo(item.x + item.r * 0.55, item.y - item.r * 0.55);
      ctx.lineTo(item.x - item.r * 0.55, item.y + item.r * 0.55);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();

  eggState.items = eggState.items.filter((item) => item.y < height + 40);

  // Sparks & floaters.
  if (eggState.shake) {
    eggState.shake = Math.max(0, eggState.shake - dt * 1.8);
  }
  if (eggState.invuln) {
    eggState.invuln = Math.max(0, eggState.invuln - dt);
  }
  if (eggState.sparks && eggState.sparks.length) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    eggState.sparks.forEach((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life)) * 0.7;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12 * (0.4 + music.energy);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    eggState.sparks = eggState.sparks.filter((p) => p.life > 0).slice(-120);
  }
  if (eggState.floaters && eggState.floaters.length) {
    ctx.save();
    ctx.font = "700 12px var(--font-display)";
    ctx.textAlign = "center";
    eggState.floaters.forEach((f) => {
      f.life -= dt;
      f.y -= f.vy * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life)) * 0.9;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 10 * (0.35 + music.energy);
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.restore();
    eggState.floaters = eggState.floaters.filter((f) => f.life > 0).slice(-40);
  }

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = ink;
  if (eggState.shake) {
    const jx = (Math.random() * 2 - 1) * eggState.shake * 10;
    const jy = (Math.random() * 2 - 1) * eggState.shake * 10;
    ctx.translate(jx, jy);
  }
  // Player glow/trail for presence.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (0.14 + music.energy * 0.13) * ((eggState.invuln || 0) > 0 ? 0.65 : 1);
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 22 * (0.5 + music.energy);
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r * (1.8 + music.bass * 0.6), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = muted;
  ctx.beginPath();
  ctx.arc(player.x - player.r * 0.3, player.y - player.r * 0.3, player.r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = muted;
  ctx.font = "600 12px var(--font-display)";
  ctx.fillText("TTAWDTT", 14, 22);
  if ((eggState.combo || 0) >= 4) {
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.5 + Math.min(0.35, (eggState.combo || 0) * 0.02);
    ctx.fillStyle = accent;
    ctx.fillText(`Combo x${eggState.combo}`, width - 14, 22);
    ctx.textAlign = "left";
  }
  ctx.restore();

  drawEggHudOverlay(ctx, width, height, eggState);

  eggState.raf = window.requestAnimationFrame(stepEggGame);
}

