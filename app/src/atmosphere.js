/**
 * High-DPI Smooth Botanical Conservatory & Komorebi Atmosphere Engine (Tier 1 Canvas 2D)
 * - Full native DPR (<= 2) smooth anti-aliased rendering — zero chunky pixels, zero harsh lines
 * - Multi-layer silky gradients, cubic-bezier botanical hills, curved ferns/vines, volumetric sunbeams & soft bokeh
 * - Fills 100% of .sidebar and panoramic .topbar left-to-right while keeping UI text crisp & readable
 * - 100% token-locked via 1x1 sRGB Color Bridge; pauses on hidden; static on prefers-reduced-motion
 */

function createColorBridge() {
  const probeCanvas = document.createElement('canvas');
  probeCanvas.width = 1;
  probeCanvas.height = 1;
  const probeCtx = probeCanvas.getContext('2d', {
    colorSpace: 'srgb',
    willReadFrequently: true,
  });

  function resolveRgb(cssVarName) {
    const styles = getComputedStyle(document.documentElement);
    const raw = styles.getPropertyValue(cssVarName).trim();
    if (!probeCtx || !raw) return { r: 24, g: 27, b: 25 };
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillStyle = raw;
    probeCtx.fillRect(0, 0, 1, 1);
    const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  }

  function rgba({ r, g, b }, alpha) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function mix(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  return { resolveRgb, rgba, mix };
}

export function relativeLuminance(r, g, b) {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function buildBotanicalPalette(bridge) {
  const bg = bridge.resolveRgb('--bg-base');
  const surface = bridge.resolveRgb('--bg-surface');
  const accent = bridge.resolveRgb('--accent-primary');
  const sec = bridge.resolveRgb('--accent-secondary');
  const text = bridge.resolveRgb('--text-primary');
  const muted = bridge.resolveRgb('--text-muted');
  const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

  return {
    isLight,
    bg,
    accent,
    sec,
    skyTop: bridge.rgba(bridge.mix(bg, accent, isLight ? 0.20 : 0.22), 1),
    skyMid: bridge.rgba(bridge.mix(bg, accent, isLight ? 0.10 : 0.11), 1),
    skyGlow: bridge.rgba(isLight ? bridge.mix(bg, sec, 0.24) : bridge.mix(accent, sec, 0.35), isLight ? 0.55 : 0.28),
    mist: bridge.rgba(isLight ? surface : bridge.mix(bg, accent, 0.18), isLight ? 0.42 : 0.35),
    ridgeFar: bridge.rgba(bridge.mix(accent, bg, isLight ? 0.62 : 0.70), 1),
    ridgeMid: bridge.rgba(bridge.mix(accent, bg, isLight ? 0.45 : 0.54), 1),
    ridgeNear: bridge.rgba(bridge.mix(accent, text, isLight ? 0.08 : 0.05), isLight ? 0.46 : 0.42),
    leafSoft: bridge.rgba(accent, isLight ? 0.22 : 0.28),
    leafRich: bridge.rgba(bridge.mix(accent, text, 0.12), isLight ? 0.36 : 0.38),
    leafHighlight: bridge.rgba(bridge.mix(accent, sec, 0.35), isLight ? 0.30 : 0.34),
    beamStart: bridge.rgba(isLight ? bridge.mix(surface, sec, 0.22) : sec, isLight ? 0.28 : 0.11),
    beamEnd: bridge.rgba(bg, 0),
    bokeh: bridge.rgba(isLight ? bridge.mix(surface, sec, 0.30) : sec, isLight ? 0.68 : 0.48),
    orb: bridge.rgba(isLight ? bridge.mix(surface, sec, 0.15) : bridge.mix(sec, surface, 0.4), isLight ? 0.85 : 0.75),
    inkMuted: bridge.rgba(muted, isLight ? 0.09 : 0.11),
  };
}

function drawSmoothHill(ctx, w, h, baseY, amp, freq, phaseShift, fill) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, baseY);
  const steps = Math.max(12, Math.ceil(w / 22));
  let prevX = 0;
  let prevY = baseY + Math.sin(phaseShift) * amp;
  ctx.lineTo(prevX, prevY);
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * w;
    const y =
      baseY +
      Math.sin((i / steps) * Math.PI * freq + phaseShift) * amp +
      Math.cos((i / steps) * Math.PI * (freq * 1.7) + phaseShift * 0.7) * (amp * 0.42);
    const cx = (prevX + x) * 0.5;
    const cy = (prevY + y) * 0.5;
    ctx.quadraticCurveTo(prevX, prevY, cx, cy);
    prevX = x;
    prevY = y;
  }
  ctx.lineTo(w, prevY);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawLeaf(ctx, x, y, len, wid, angle, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.35, -wid, len * 0.78, -wid * 0.65, len, 0);
  ctx.bezierCurveTo(len * 0.78, wid * 0.65, len * 0.35, wid, 0, 0);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawBotanicalBranch(ctx, startX, startY, endX, endY, ctrlX, ctrlY, leafCount, leafScale, sway, pal) {
  const tipX = endX + sway * 5;
  const tipY = endY + Math.abs(sway) * 1.5;

  // Soft curved stem (no harsh stroke lines — tapered silhouette)
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
  ctx.strokeStyle = pal.leafRich;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();

  for (let i = 1; i <= leafCount; i++) {
    const t = i / (leafCount + 0.5);
    const mt = 1 - t;
    const lx = mt * mt * startX + 2 * mt * t * ctrlX + t * t * tipX;
    const ly = mt * mt * startY + 2 * mt * t * ctrlY + t * t * tipY;
    const tx = 2 * mt * (ctrlX - startX) + 2 * t * (tipX - ctrlX);
    const ty = 2 * mt * (ctrlY - startY) + 2 * t * (tipY - ctrlY);
    const tangentAngle = Math.atan2(ty, tx);
    const side = i % 2 === 0 ? 1 : -1;
    const size = leafScale * (0.7 + 0.45 * Math.sin(t * Math.PI));
    const fill = i % 3 === 0 ? pal.leafHighlight : i % 2 === 0 ? pal.leafRich : pal.leafSoft;
    drawLeaf(ctx, lx, ly, size * 1.75, size * 0.58, tangentAngle + side * 0.68, fill);
  }
}

function drawVolumetricSunbeams(ctx, w, h, phase, pal) {
  ctx.save();
  const beamConfigs = [
    { x: w * 0.22, width: Math.max(46, w * 0.14), drift: 0.4 },
    { x: w * 0.58, width: Math.max(60, w * 0.18), drift: -0.3 },
    { x: w * 0.86, width: Math.max(52, w * 0.16), drift: 0.25 },
  ];
  for (let i = 0; i < beamConfigs.length; i++) {
    const b = beamConfigs[i];
    const xTop = b.x + Math.sin(phase * 0.35 + i) * 14 * b.drift;
    const xBot = xTop - h * 0.42;
    const grad = ctx.createLinearGradient(xTop, 0, xBot, h);
    grad.addColorStop(0, pal.beamStart);
    grad.addColorStop(1, pal.beamEnd);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(xTop - b.width * 0.4, 0);
    ctx.lineTo(xTop + b.width * 0.5, 0);
    ctx.lineTo(xBot + b.width * 0.9, h);
    ctx.lineTo(xBot - b.width * 0.6, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawTopbarScene(ctx, w, h, pal, phase) {
  // 1. Rich multi-stop sky gradient left-to-right
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(0.52, pal.skyMid);
  sky.addColorStop(1, pal.skyTop);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft sunlit / moonlit horizon bloom
  const orbX = w * 0.78;
  const orbY = h * 0.26;
  const halo = ctx.createRadialGradient(orbX, orbY, 4, orbX, orbY, Math.max(120, w * 0.28));
  halo.addColorStop(0, pal.skyGlow);
  halo.addColorStop(1, pal.beamEnd);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Soft celestial orb in upper-right distance
  ctx.beginPath();
  ctx.arc(orbX, orbY, pal.isLight ? 14 : 11, 0, Math.PI * 2);
  ctx.fillStyle = pal.orb;
  ctx.fill();

  // 2. Smooth layered rolling botanical hills spanning 100% width
  drawSmoothHill(ctx, w, h, h * 0.66, 8, 2.6, 0.4, pal.ridgeFar);
  drawSmoothHill(ctx, w, h, h * 0.78, 7, 3.4, 1.9, pal.ridgeMid);

  // Subtle horizon mist gradient
  const mist = ctx.createLinearGradient(0, h * 0.45, 0, h);
  mist.addColorStop(0, pal.beamEnd);
  mist.addColorStop(1, pal.mist);
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);

  drawSmoothHill(ctx, w, h, h * 0.88, 5, 4.2, 3.1, pal.ridgeNear);

  // 3. Diagonal Komorebi sunbeams
  drawVolumetricSunbeams(ctx, w, h, phase, pal);

  // 4. Organic hanging canopy branches across header
  const sway = Math.sin(phase * 0.8);
  const branches = [
    [w * 0.14, -4, w * 0.22, h * 0.58, w * 0.17, h * 0.34, 6, 8],
    [w * 0.48, -4, w * 0.54, h * 0.62, w * 0.49, h * 0.36, 7, 8.5],
    [w * 0.72, -4, w * 0.65, h * 0.56, w * 0.69, h * 0.32, 6, 8],
    [w * 0.94, -4, w * 0.86, h * 0.66, w * 0.91, h * 0.38, 7, 9],
  ];
  for (let i = 0; i < branches.length; i++) {
    const [sx, sy, ex, ey, cx, cy, cnt, sc] = branches[i];
    drawBotanicalBranch(ctx, sx, sy, ex, ey, cx, cy, cnt, sc, sway * (i % 2 === 0 ? 1 : -0.8), pal);
  }

  // 5. Soft glowing bokeh motes
  const moteCount = Math.max(8, Math.floor(w / 75));
  for (let i = 0; i < moteCount; i++) {
    const mx = ((i * 113 + phase * (7 + (i % 3) * 2)) % (w + 20)) - 10;
    const my = h * 0.22 + ((i * 29) % (h * 0.62)) + Math.sin(phase * 0.9 + i) * 3;
    const r = 1.6 + (i % 3) * 0.9;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, r * 2.4);
    g.addColorStop(0, pal.bokeh);
    g.addColorStop(1, pal.beamEnd);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSidebarScene(ctx, w, h, pal, phase) {
  // 1. Rich full-height atmospheric gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(0.42, pal.skyMid);
  sky.addColorStop(0.74, pal.skyTop);
  sky.addColorStop(1, pal.skyMid);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Warm upper conservatory bloom + celestial orb
  const orbX = w * 0.76;
  const orbY = h * 0.14;
  const halo = ctx.createRadialGradient(orbX, orbY, 6, orbX, orbY, w * 0.95);
  halo.addColorStop(0, pal.skyGlow);
  halo.addColorStop(1, pal.beamEnd);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();
  ctx.arc(orbX, orbY, pal.isLight ? 16 : 13, 0, Math.PI * 2);
  ctx.fillStyle = pal.orb;
  ctx.fill();

  // 2. Full-height layered botanical hills filling the mid & lower sidebar (no empty void!)
  drawSmoothHill(ctx, w, h, h * 0.52, 16, 1.8, 0.5, pal.ridgeFar);

  // Atmospheric mid mist veil
  const mistMid = ctx.createLinearGradient(0, h * 0.40, 0, h * 0.72);
  mistMid.addColorStop(0, pal.beamEnd);
  mistMid.addColorStop(0.5, pal.mist);
  mistMid.addColorStop(1, pal.beamEnd);
  ctx.fillStyle = mistMid;
  ctx.fillRect(0, h * 0.40, w, h * 0.32);

  drawSmoothHill(ctx, w, h, h * 0.64, 15, 2.2, 1.8, pal.ridgeMid);
  drawSmoothHill(ctx, w, h, h * 0.76, 12, 2.6, 3.0, pal.ridgeNear);

  // 3. Soft diagonal volumetric light beams
  drawVolumetricSunbeams(ctx, w, h, phase, pal);

  // 4. Lush organic botanical branches framing top, mid-right, and lower garden
  const sway = Math.sin(phase * 0.75);
  drawBotanicalBranch(ctx, w * 0.85, -6, w * 0.62, h * 0.22, w * 0.78, h * 0.12, 8, 9.5, sway, pal);
  drawBotanicalBranch(ctx, -6, h * 0.36, w * 0.38, h * 0.48, w * 0.16, h * 0.40, 7, 10, -sway * 0.8, pal);
  drawBotanicalBranch(ctx, w + 6, h * 0.54, w * 0.54, h * 0.66, w * 0.82, h * 0.58, 8, 10.5, sway * 0.9, pal);
  drawBotanicalBranch(ctx, -6, h * 0.78, w * 0.44, h * 0.72, w * 0.18, h * 0.76, 7, 11, sway * 0.6, pal);
  drawBotanicalBranch(ctx, w + 6, h * 0.84, w * 0.52, h * 0.79, w * 0.78, h * 0.82, 7, 11, -sway * 0.6, pal);

  // 5. Soft floating sunlit bokeh / fireflies throughout full height
  for (let i = 0; i < 16; i++) {
    const mx = ((i * 47 + Math.sin(phase * 0.55 + i) * 14 + w) % (w - 12)) + 6;
    const my = ((i * 59 + phase * (5 + (i % 3) * 2)) % (h - 24)) + 12;
    const r = 1.8 + (i % 3) * 1.1;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, r * 2.6);
    g.addColorStop(0, pal.bokeh);
    g.addColorStop(1, pal.beamEnd);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function initAtmosphere() {
  const mainCanvas = document.getElementById('atmo-canvas');
  const grainHost = document.getElementById('paper-grain');
  const sidebarEl = document.getElementById('sidebar');
  const sidebarCanvas = document.getElementById('sidebar-pixel-canvas');
  const topbarEl = document.querySelector('.topbar');
  const topbarCanvas = document.getElementById('topbar-pixel-canvas');

  const bridge = createColorBridge();
  let palette = buildBotanicalPalette(bridge);
  let phase = 0;
  let rafId = null;
  let lastTs = 0;

  // Keep grain ultra-subtle in background workspace only (zero grain on navbars)
  if (grainHost) grainHost.style.opacity = '0.02';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function renderMainBackdrop() {
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    mainCanvas.width = Math.floor(width * dpr);
    mainCanvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--atmo-safe-top')) || 64;
    const cx = width * 0.84;
    const cy = Math.max(safeTop + 70, height * 0.22);
    const rad = Math.max(width, height) * 0.56;
    const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, rad);
    grad.addColorStop(0, bridge.rgba(palette.accent, palette.isLight ? 0.06 : 0.09));
    grad.addColorStop(0.55, bridge.rgba(palette.accent, palette.isLight ? 0.02 : 0.03));
    grad.addColorStop(1, bridge.rgba(palette.bg, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function renderNavScenes() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (sidebarEl && sidebarCanvas) {
      const w = sidebarEl.clientWidth;
      const h = sidebarEl.clientHeight;
      if (w > 0 && h > 0) {
        const pw = Math.floor(w * dpr);
        const ph = Math.floor(h * dpr);
        if (sidebarCanvas.width !== pw || sidebarCanvas.height !== ph) {
          sidebarCanvas.width = pw;
          sidebarCanvas.height = ph;
        }
        const ctx = sidebarCanvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          drawSidebarScene(ctx, w, h, palette, phase);
        }
      }
    }

    if (topbarEl && topbarCanvas) {
      const w = topbarEl.clientWidth;
      const h = topbarEl.clientHeight;
      if (w > 0 && h > 0) {
        const pw = Math.floor(w * dpr);
        const ph = Math.floor(h * dpr);
        if (topbarCanvas.width !== pw || topbarCanvas.height !== ph) {
          topbarCanvas.width = pw;
          topbarCanvas.height = ph;
        }
        const ctx = topbarCanvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          drawTopbarScene(ctx, w, h, palette, phase);
        }
      }
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick(ts) {
    if (document.hidden || reducedMotion.matches) {
      stopLoop();
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    phase += dt;
    renderNavScenes();
    rafId = requestAnimationFrame(tick);
  }

  function startOrFreeze() {
    stopLoop();
    renderMainBackdrop();
    renderNavScenes();
    document.documentElement.dataset.atmosphereReady = 'true';
    if (!reducedMotion.matches && !document.hidden) {
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  const ro = new ResizeObserver(() => renderNavScenes());
  if (sidebarEl) ro.observe(sidebarEl);
  if (topbarEl) ro.observe(topbarEl);

  startOrFreeze();

  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderMainBackdrop();
      renderNavScenes();
    }, 100);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const onVisibility = () => {
    if (document.hidden) stopLoop();
    else startOrFreeze();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const observer = new MutationObserver(() => {
    palette = buildBotanicalPalette(bridge);
    renderMainBackdrop();
    renderNavScenes();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
  const onThemeMedia = () => {
    palette = buildBotanicalPalette(bridge);
    renderMainBackdrop();
    renderNavScenes();
  };
  mediaDark.addEventListener('change', onThemeMedia);
  reducedMotion.addEventListener('change', startOrFreeze);

  return () => {
    stopLoop();
    ro.disconnect();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    observer.disconnect();
    mediaDark.removeEventListener('change', onThemeMedia);
    reducedMotion.removeEventListener('change', startOrFreeze);
  };
}
