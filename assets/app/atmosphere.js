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
  if (mode === "sakura") {
    return (
      getComputedStyle(document.documentElement).getPropertyValue("--sakura").trim() ||
      "rgba(242, 167, 198, 0.7)"
    );
  }
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

function createPetal() {
  const size = 4 + Math.random() * 10;
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: size,
    speed: 0.55 + Math.random() * 1.35,
    drift: -0.9 + Math.random() * 1.8,
    opacity: 0.25 + Math.random() * 0.55,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (-0.03 + Math.random() * 0.06) * (0.7 + Math.random() * 0.9),
    wobble: Math.random() * Math.PI * 2
  };
}

function resetAtmosphereParticles() {
  if (!snowState) {
    return;
  }
  const density = snowState.mode === "rain" ? 18 : snowState.mode === "sakura" ? 16 : 12;
  const maxCount = snowState.mode === "rain" ? 140 : snowState.mode === "sakura" ? 160 : 180;
  const count = Math.min(Math.floor(window.innerWidth / density), maxCount);
  snowState.flakes = Array.from({ length: count }, () =>
    snowState.mode === "rain" ? createRainDrop() : snowState.mode === "sakura" ? createPetal() : createFlake()
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
  const label = mode === "rain" ? "雨幕" : mode === "sakura" ? "樱花" : mode === "none" ? "无氛围" : "雪景";
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
    const wind =
      snowState.mode === "sakura"
        ? Math.sin((timestamp || 0) * 0.00035 + (flake.wobble || 0)) * 0.9
        : 0;
    flake.y += flake.speed * speedFactor;
    flake.x += (flake.drift + wind) * speedFactor;
    if (snowState.mode === "sakura") {
      flake.rotation = (flake.rotation || 0) + (flake.rotationSpeed || 0.01) * speedFactor;
      flake.wobble = (flake.wobble || 0) + 0.006 * speedFactor;
    } else {
      flake.rotation = flake.rotation ? flake.rotation + 0.004 * speedFactor : 0;
    }
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
    } else if (snowState.mode === "sakura") {
      ctx.save();
      ctx.translate(flake.x, flake.y);
      ctx.rotate(flake.rotation || 0);
      const size = flake.r || 8;
      const squeeze = 0.55 + Math.abs(Math.sin(flake.wobble || 0)) * 0.35;
      ctx.scale(1, squeeze);
      ctx.fillStyle = snowState.color;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.65);
      ctx.bezierCurveTo(size * 0.65, -size * 0.65, size * 0.9, 0, 0, size * 0.9);
      ctx.bezierCurveTo(-size * 0.9, 0, -size * 0.65, -size * 0.65, 0, -size * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = flake.opacity * 0.55;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(-size * 0.18, -size * 0.12, size * 0.18, size * 0.3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

