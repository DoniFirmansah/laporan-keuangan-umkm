/**
 * Wallpaper-Engine Dynamic Hi-Bit Pixel Overlay Engine (Tier 1-2 Canvas 2D)
 * - Runs as a razor-sharp transparent animated overlay over the Hi-Bit Pixel Art scenic backdrops
 *   (sidebar-day/night.webp & topbar-day/night.webp)
 * - Light Mode (Siang): Pulsing sunlit halo, flapping pixel bird flocks, drifting sunlit petals/motes,
 *   lazy chimney smoke wisps, and sparkling golden water glints on the stone-bridge canal
 * - Dark Mode (Malam): Luminous Crescent Moon (topbar), pulsing moonlight aura (sidebar), twinkling
 *   4-point pixel stars, periodic shooting star, bobbing golden-amber fireflies (kunang-kunang),
 *   and warm lantern reflection shimmers on the night water
 * - 100% token-locked via 1x1 sRGB Color Bridge (zero hardcoded hex); ResizeObserver snapping;
 *   pauses on document.hidden; static frame on prefers-reduced-motion
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

function buildFxPalette(bridge) {
  const bg = bridge.resolveRgb('--bg-base');
  const surface = bridge.resolveRgb('--bg-surface');
  const inset = bridge.resolveRgb('--bg-inset');
  const accent = bridge.resolveRgb('--accent-primary');
  const sec = bridge.resolveRgb('--accent-secondary');
  const text = bridge.resolveRgb('--text-primary');
  const muted = bridge.resolveRgb('--text-muted');
  const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

  return {
    isLight,
    bg,
    accent,
    sunCore: bridge.rgba(isLight ? surface : bridge.mix(text, sec, 0.20), isLight ? 0.94 : 0.96),
    sunHalo1: bridge.rgba(isLight ? surface : bridge.mix(surface, sec, 0.35), isLight ? 0.42 : 0.28),
    sunHalo2: bridge.rgba(isLight ? surface : sec, isLight ? 0.18 : 0.14),
    moonCutout: bridge.rgba(bridge.mix(inset, accent, 0.10), 0.94),
    starBright: bridge.rgba(bridge.mix(text, sec, 0.20), 0.95),
    starMid: bridge.rgba(bridge.mix(text, muted, 0.30), 0.68),
    starDim: bridge.rgba(muted, 0.42),
    bird: bridge.rgba(bridge.mix(text, sec, 0.22), 0.68),
    smoke: bridge.rgba(surface, isLight ? 0.42 : 0.22),
    petalA: bridge.rgba(surface, 0.78),
    petalB: bridge.rgba(bridge.mix(surface, sec, 0.38), 0.72),
    waterGlint: bridge.rgba(isLight ? bridge.mix(surface, sec, 0.20) : bridge.mix(sec, text, 0.35), isLight ? 0.72 : 0.76),
    fireflyCore: bridge.rgba(bridge.mix(sec, text, 0.45), 0.98),
    fireflyMid: bridge.rgba(sec, 0.48),
    fireflyHalo: bridge.rgba(sec, 0.20),
    cloudWisp: bridge.rgba(surface, isLight ? 0.26 : 0.08),
  };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawSteppedCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const span = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(rx - span, ry + dy, span * 2 + 1, 1);
  }
}

function drawBird(ctx, x, y, wingUp, pal) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillStyle = pal.bird;
  ctx.fillRect(rx, ry, 2, 1);
  if (wingUp) {
    ctx.fillRect(rx - 2, ry - 1, 2, 1);
    ctx.fillRect(rx + 2, ry - 1, 2, 1);
  } else {
    ctx.fillRect(rx - 2, ry + 1, 2, 1);
    ctx.fillRect(rx + 2, ry + 1, 2, 1);
  }
}

function drawFireflies(ctx, vw, minY, maxY, pal, phase, count) {
  const spanY = Math.max(12, maxY - minY);
  for (let i = 0; i < count; i++) {
    const x = ((i * 43 + Math.sin(phase * 0.75 + i * 1.9) * 12 + vw) % Math.max(8, vw - 8)) + 4;
    const y = minY + ((i * 37 + Math.cos(phase * 0.95 + i * 1.4) * 7 + spanY) % spanY);
    const pulse = Math.sin(phase * 2.2 + i * 2.1);
    if (pulse > 0.2) {
      px(ctx, x - 2, y - 2, 5, 5, pal.fireflyHalo);
      px(ctx, x - 1, y - 1, 3, 3, pal.fireflyMid);
      px(ctx, x, y, 1, 1, pal.fireflyCore);
    } else if (pulse > -0.35) {
      px(ctx, x - 1, y - 1, 3, 3, pal.fireflyMid);
      px(ctx, x, y, 1, 1, pal.fireflyCore);
    } else {
      px(ctx, x, y, 1, 1, pal.fireflyMid);
    }
  }
}

function drawSunlitMotes(ctx, vw, minY, maxY, pal, phase, count) {
  const spanY = Math.max(12, maxY - minY);
  for (let i = 0; i < count; i++) {
    const x = ((i * 47 + phase * (3.2 + (i % 3))) % (vw + 8)) - 4;
    const y = minY + ((i * 31 + phase * (1.4 + (i % 2)) + Math.sin(phase + i) * 3 + spanY) % spanY);
    px(ctx, x, y, i % 3 === 0 ? 2 : 1, 1, i % 2 === 0 ? pal.petalA : pal.petalB);
  }
}

function drawTwinklingStars(ctx, vw, minY, maxY, pal, phase, count) {
  const spanY = Math.max(10, maxY - minY);
  for (let i = 0; i < count; i++) {
    const sx = (i * 41 + 9) % Math.max(12, vw - 6) + 3;
    const sy = minY + ((i * 29 + 5) % spanY);
    const step = (Math.floor(phase * 1.8) + i) % 7;
    if (step === 0 && i % 3 === 0) {
      px(ctx, sx, sy, 1, 1, pal.starBright);
      px(ctx, sx - 1, sy, 1, 1, pal.starDim);
      px(ctx, sx + 1, sy, 1, 1, pal.starDim);
      px(ctx, sx, sy - 1, 1, 1, pal.starDim);
      px(ctx, sx, sy + 1, 1, 1, pal.starDim);
    } else if (step <= 2) {
      px(ctx, sx, sy, 1, 1, step === 1 ? pal.starBright : pal.starMid);
    }
  }
}

function drawShootingStar(ctx, vw, startY, spanY, pal, phase, cycleLen) {
  const cycle = phase % cycleLen;
  if (cycle >= 0.78) return;
  const p = cycle / 0.78;
  const sx = Math.round(vw * 0.18 + p * (vw * 0.42));
  const sy = Math.round(startY + p * spanY);
  px(ctx, sx, sy, 2, 1, pal.starBright);
  px(ctx, sx - 2, sy - 1, 2, 1, pal.starMid);
  px(ctx, sx - 4, sy - 2, 2, 1, pal.starDim);
}

function drawSidebarOverlay(vCtx, vw, vh, pal, phase) {
  if (pal.isLight) {
    // 1. Subtle breathing luminous morning sun shimmer right on the illustrated sun
    const sunX = Math.round(vw * 0.72);
    const sunY = Math.round(vh * 0.60);
    const pulse = Math.round(Math.sin(phase * 1.1) * 1.2);
    drawSteppedCircle(vCtx, sunX, sunY, 9 + pulse, pal.sunHalo2);
    drawSteppedCircle(vCtx, sunX, sunY, 5 + Math.max(0, pulse), pal.sunHalo1);

    // 2. Gentle drifting sunlit cloud wisps across upper visible sky
    const cw1 = ((phase * 2.1) % (vw + 36)) - 22;
    px(vCtx, cw1, Math.round(vh * 0.44), 18, 2, pal.cloudWisp);
    px(vCtx, cw1 + 4, Math.round(vh * 0.44) - 1, 10, 1, pal.cloudWisp);

    // 3. Flapping V-flock of pixel birds gliding across the sky above the peaks
    for (let b = 0; b < 4; b++) {
      const bx = ((phase * (5.2 + b * 0.45) + b * 24) % (vw + 28)) - 14;
      const by = Math.round(vh * 0.43) + (b % 3) * 5 + Math.round(Math.sin(phase * 2.2 + b) * 1.3);
      const wingUp = Math.floor(phase * 4.2 + b) % 2 === 0;
      drawBird(vCtx, bx, by, wingUp, pal);
    }

    // 4. Lazy rising chimney smoke wisps from the cozy village roofs
    for (let s = 0; s < 3; s++) {
      const life = (phase * 0.38 + s * 0.33) % 1;
      const sx = Math.round(vw * 0.16 + Math.sin(phase + s * 2) * 2 + life * 4);
      const sy = Math.round(vh * 0.72 - life * 14);
      px(vCtx, sx, sy, life > 0.55 ? 2 : 1, 1, pal.smoke);
    }

    // 5. Sparkling animated water glints on the canal beneath the stone arch bridge
    for (let g = 0; g < 6; g++) {
      if (Math.sin(phase * 3.1 + g * 2.3) > 0.1) {
        const gx = Math.round(vw * 0.58 + ((g * 11) % Math.max(12, Math.floor(vw * 0.26))));
        const gy = Math.round(vh * 0.87 + g * 2.5);
        px(vCtx, gx, gy, 3 + (g % 2), 1, pal.waterGlint);
      }
    }

    // 6. Floating sunlit dust/petals across village & hills
    drawSunlitMotes(vCtx, vw, Math.round(vh * 0.42), Math.round(vh * 0.90), pal, phase, 11);
  } else {
    // 1. Twinkling 4-point pixel stars across the extended midnight sky
    drawTwinklingStars(vCtx, vw, Math.round(vh * 0.04), Math.round(vh * 0.52), pal, phase, 26);

    // 2. Periodic shooting star streaking across the open night sky
    drawShootingStar(vCtx, vw, Math.round(vh * 0.38), Math.round(vh * 0.10), pal, phase, 7.2);

    // 3. Shimmering golden lantern reflections on the dark canal water under the bridge
    for (let g = 0; g < 6; g++) {
      if (Math.sin(phase * 2.6 + g * 1.9) > 0.05) {
        const gx = Math.round(vw * 0.62 + ((g * 9) % Math.max(12, Math.floor(vw * 0.24))));
        const gy = Math.round(vh * 0.89 + g * 2.2);
        px(vCtx, gx, gy, 3 + (g % 2), 1, pal.waterGlint);
      }
    }

    // 4. Glowing golden-amber fireflies (kunang-kunang) bobbing over forest & village
    drawFireflies(vCtx, vw, Math.round(vh * 0.54), Math.round(vh * 0.92), pal, phase, 16);
  }
}

function drawTopbarOverlay(vCtx, vw, vh, pal, phase) {
  // Position celestial highlight inside the clear center scenic gap between title & actions
  const celX = Math.round(vw * 0.55);
  const celY = Math.max(7, Math.round(vh * 0.30));

  if (pal.isLight) {
    // 1. Single gentle glowing pixel sun in the open panoramic sky gap
    const pulse = Math.round(Math.sin(phase * 1.2) * 0.8);
    drawSteppedCircle(vCtx, celX, celY, 8 + pulse, pal.sunHalo2);
    drawSteppedCircle(vCtx, celX, celY, 5, pal.sunHalo1);
    drawSteppedCircle(vCtx, celX, celY, 3, pal.sunCore);

    // 2. Flapping pixel birds gliding left-to-right across the mountain horizon
    const birdCount = Math.max(3, Math.min(6, Math.floor(vw / 95)));
    for (let b = 0; b < birdCount; b++) {
      const bx = ((phase * (6.2 + b * 0.9) + b * 74) % (vw + 24)) - 12;
      const by = 4 + (b % 3) * 4 + Math.round(Math.sin(phase * 2.4 + b) * 1.3);
      const wingUp = Math.floor(phase * 4.4 + b) % 2 === 0;
      drawBird(vCtx, bx, by, wingUp, pal);
    }

    // 3. Drifting sunlit petals / golden motes
    drawSunlitMotes(vCtx, vw, 3, Math.max(12, vh - 4), pal, phase, Math.max(8, Math.floor(vw / 52)));
  } else {
    // 1. Single luminous crescent moon in the open center gap
    drawSteppedCircle(vCtx, celX, celY, 8, pal.sunHalo2);
    drawSteppedCircle(vCtx, celX, celY, 5, pal.sunHalo1);
    drawSteppedCircle(vCtx, celX, celY, 3, pal.sunCore);
    drawSteppedCircle(vCtx, celX + 2, celY - 1, 2, pal.moonCutout);

    // 2. Twinkling stars + periodic shooting star across the midnight header sky
    drawTwinklingStars(vCtx, vw, 2, Math.max(10, Math.floor(vh * 0.58)), pal, phase, Math.max(18, Math.floor(vw / 22)));
    drawShootingStar(vCtx, vw, 3, Math.max(8, Math.floor(vh * 0.34)), pal, phase + 2.5, 6.8);

    // 3. Bobbing golden fireflies (kunang-kunang) over the illuminated rooftops & pines
    drawFireflies(vCtx, vw, Math.floor(vh * 0.36), Math.max(14, vh - 3), pal, phase, Math.max(10, Math.floor(vw / 42)));
  }
}

function blitOverlayStage(canvas, cssW, cssH, rawPhysW, rawPhysH, dpr, isCompactBar, drawer) {
  if (!canvas || cssW <= 0 || cssH <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const minPhysW = Math.round(cssW * dpr);
  const minPhysH = Math.round(cssH * dpr);
  const physW = rawPhysW >= minPhysW * 0.9 ? rawPhysW : minPhysW;
  const physH = rawPhysH >= minPhysH * 0.9 ? rawPhysH : minPhysH;

  if (canvas.width !== physW || canvas.height !== physH) {
    canvas.width = physW;
    canvas.height = physH;
  }

  const actualDpr = Math.max(1, physW / cssW);
  const logicalPixelSize = isCompactBar && cssH < 68 ? 1.25 : 2.0;
  const intScale = Math.max(1, Math.round(logicalPixelSize * actualDpr));
  const vw = Math.max(32, Math.ceil(physW / intScale));
  const vh = Math.max(24, Math.ceil(physH / intScale));

  const vCanvas = document.createElement('canvas');
  vCanvas.width = vw;
  vCanvas.height = vh;
  const vCtx = vCanvas.getContext('2d');
  if (!vCtx) return;

  drawer(vCtx, vw, vh);

  ctx.clearRect(0, 0, physW, physH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(vCanvas, 0, 0, vw, vh, 0, 0, vw * intScale, vh * intScale);
}

export function initAtmosphere() {
  const mainCanvas = document.getElementById('atmo-canvas');
  const grainHost = document.getElementById('paper-grain');
  const sidebarEl = document.getElementById('sidebar');
  const sidebarCanvas = document.getElementById('sidebar-pixel-canvas');
  const topbarEl = document.querySelector('.topbar');
  const topbarCanvas = document.getElementById('topbar-pixel-canvas');

  const bridge = createColorBridge();
  let palette = buildFxPalette(bridge);
  const stageSizes = new Map();
  let phase = 0;
  let rafId = null;
  let lastTs = 0;
  let accTime = 0;

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
    grad.addColorStop(0, bridge.rgba(palette.accent, palette.isLight ? 0.05 : 0.08));
    grad.addColorStop(0.55, bridge.rgba(palette.accent, palette.isLight ? 0.02 : 0.03));
    grad.addColorStop(1, bridge.rgba(palette.bg, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function renderOverlays() {
    const dpr = window.devicePixelRatio || 1;

    if (sidebarEl && sidebarCanvas) {
      const cssW = sidebarEl.clientWidth;
      const cssH = sidebarEl.clientHeight;
      const sz = stageSizes.get(sidebarEl) || {
        w: Math.round(cssW * dpr),
        h: Math.round(cssH * dpr),
      };
      blitOverlayStage(sidebarCanvas, cssW, cssH, sz.w, sz.h, dpr, false, (vCtx, vw, vh) =>
        drawSidebarOverlay(vCtx, vw, vh, palette, phase)
      );
    }

    if (topbarEl && topbarCanvas) {
      const cssW = topbarEl.clientWidth;
      const cssH = topbarEl.clientHeight;
      const sz = stageSizes.get(topbarEl) || {
        w: Math.round(cssW * dpr),
        h: Math.round(cssH * dpr),
      };
      blitOverlayStage(topbarCanvas, cssW, cssH, sz.w, sz.h, dpr, true, (vCtx, vw, vh) =>
        drawTopbarOverlay(vCtx, vw, vh, palette, phase)
      );
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
    accTime += dt;
    if (accTime >= 0.05) {
      phase += accTime;
      accTime = 0;
      renderOverlays();
    }
    rafId = requestAnimationFrame(tick);
  }

  function startOrFreeze() {
    stopLoop();
    renderMainBackdrop();
    renderOverlays();
    document.documentElement.dataset.atmosphereReady = 'true';
    if (!reducedMotion.matches && !document.hidden) {
      lastTs = 0;
      accTime = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  const ro = new ResizeObserver((entries) => {
    const dpr = window.devicePixelRatio || 1;
    for (const entry of entries) {
      const box = entry.devicePixelContentBoxSize?.[0];
      const physW = box ? box.inlineSize : Math.round(entry.contentRect.width * dpr);
      const physH = box ? box.blockSize : Math.round(entry.contentRect.height * dpr);
      stageSizes.set(entry.target, { w: physW, h: physH });
    }
    renderOverlays();
  });

  for (const el of [sidebarEl, topbarEl]) {
    if (!el) continue;
    try {
      ro.observe(el, { box: 'device-pixel-content-box' });
    } catch {
      ro.observe(el);
    }
  }

  startOrFreeze();

  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderMainBackdrop();
      renderOverlays();
    }, 100);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const onVisibility = () => {
    if (document.hidden) stopLoop();
    else startOrFreeze();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const observer = new MutationObserver(() => {
    palette = buildFxPalette(bridge);
    renderMainBackdrop();
    renderOverlays();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
  const onThemeMedia = () => {
    palette = buildFxPalette(bridge);
    renderMainBackdrop();
    renderOverlays();
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
