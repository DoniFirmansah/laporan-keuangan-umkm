/**
 * Minimalist Living Atmospheric Pixel Overlay Engine (Tier 1-2 Canvas 2D)
 * - Runs as a quiet, continuous-physics transparent overlay over the restrained Hi-Bit Pixel Art backdrops
 * - Full-lifecycle motion (ZERO mid-air cutoffs or abrupt edge popping):
 *   * Shooting Stars (Dark): Complete edge-to-edge diagonal trajectory with tapered multi-segment tail,
 *     smooth sine fade-in/burnout envelope, subtle sparkle head, and varied arcs per cycle
 *   * Fireflies / Kunang-Kunang (Dark): Smooth Lissajous organic drifting anchored in forest/village
 *     zones with continuous breathing glow (never teleports across edges)
 *   * Flapping Birds (Light): Cohesive V-flock flying smoothly from off-screen left to off-screen right
 *   * Chimney Smoke (Light & Dark): Gently curling puffs with smooth alpha fade-in and dissolution
 *   * Water Reflections & Twinkling Stars: Continuous smooth sinusoidal luminance transitions
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
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
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
  const accent = bridge.resolveRgb('--accent-primary');
  const sec = bridge.resolveRgb('--accent-secondary');
  const text = bridge.resolveRgb('--text-primary');
  const muted = bridge.resolveRgb('--text-muted');
  const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

  return {
    isLight,
    bg,
    accent,
    bridge,
    starRgb: bridge.mix(text, sec, 0.18),
    starCoolRgb: bridge.mix(text, muted, 0.35),
    birdRgb: bridge.mix(text, muted, 0.45),
    smokeRgb: surface,
    petalRgb: bridge.mix(surface, sec, 0.24),
    waterRgb: isLight ? surface : bridge.mix(sec, text, 0.32),
    fireflyCoreRgb: bridge.mix(sec, text, 0.42),
    fireflyHaloRgb: sec,
    mistRgb: isLight ? surface : bridge.mix(muted, accent, 0.30),
  };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBird(ctx, x, y, wingPhase, alpha, pal) {
  if (alpha <= 0.02) return;
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillStyle = pal.bridge.rgba(pal.birdRgb, alpha);
  ctx.fillRect(rx, ry, 2, 1);
  const wingUp = Math.sin(wingPhase) >= 0;
  if (wingUp) {
    ctx.fillRect(rx - 2, ry - 1, 2, 1);
    ctx.fillRect(rx + 2, ry - 1, 2, 1);
  } else {
    ctx.fillRect(rx - 2, ry + 1, 2, 1);
    ctx.fillRect(rx + 2, ry + 1, 2, 1);
  }
}

/**
 * Cohesive V-flock of pixel birds entering smoothly off-left and exiting off-right
 * (zero abrupt mid-sky popping)
 */
function drawBirdFlock(ctx, vw, baseY, pal, phase, speed, cycleLen, count) {
  const localT = (phase % cycleLen) / cycleLen;
  const leadX = -16 + localT * (vw + 44);
  const edgeFade = Math.min(1, Math.min(leadX + 14, vw + 26 - leadX) / 16);
  if (edgeFade <= 0.02) return;

  for (let b = 0; b < count; b++) {
    const offsetX = -b * 8 - (b % 2) * 3;
    const offsetY = (b === 0 ? 0 : b % 2 === 1 ? -3 : 4) + Math.sin(phase * 1.4 + b * 1.1) * 1.4;
    const bx = leadX + offsetX;
    const by = baseY + offsetY;
    if (bx < -6 || bx > vw + 6) continue;
    drawBird(ctx, bx, by, phase * (speed + 0.5) + b * 1.3, 0.42 * edgeFade, pal);
  }
}

/**
 * Complete-arc shooting star with smooth fade-in, continuous flight across the full sky,
 * multi-segment tapered glowing tail, and natural burnout fade-out (never vanishes abruptly mid-air)
 */
function drawShootingStar(ctx, vw, minY, maxY, pal, phase, cycleLen, duration, seedOffset) {
  const cycleIdx = Math.floor((phase + seedOffset) / cycleLen);
  const cycleTime = (phase + seedOffset) % cycleLen;
  if (cycleTime > duration) return;

  const p = cycleTime / duration; // 0.0 -> 1.0 full completed journey
  // Smooth slight acceleration + gentle deceleration at burnout
  const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const t = p * 0.65 + ease * 0.35;

  // Smooth fade-in on entry (0..0.18) and gradual atmospheric burnout (0.72..1.0)
  let envelope = 1;
  if (p < 0.18) envelope = p / 0.18;
  else if (p > 0.72) envelope = (1 - p) / 0.28;
  envelope = Math.max(0, Math.min(1, envelope));
  if (envelope <= 0.02) return;

  // Alternate subtle starting lane & direction across cycles so it feels natural
  const rightToLeft = cycleIdx % 3 === 2;
  const startX = rightToLeft ? vw * 0.94 : vw * 0.05;
  const endX = rightToLeft ? vw * 0.06 : vw * 0.95;
  const spanY = Math.max(8, maxY - minY);
  const startY = minY + ((cycleIdx * 17) % Math.max(4, Math.floor(spanY * 0.35)));
  const endY = Math.min(maxY, startY + Math.max(10, spanY * 0.72));

  const headX = startX + (endX - startX) * t;
  const headY = startY + (endY - startY) * t;
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  // Multi-segment tapered luminous tail trailing strictly behind the head
  const tailLen = Math.min(20, Math.max(10, Math.round(vw * 0.14))) * (0.45 + 0.55 * envelope);
  const steps = Math.max(8, Math.round(tailLen));
  for (let s = steps; s >= 1; s--) {
    const frac = 1 - s / (steps + 1); // 0 at far tail tip -> ~1 near head
    const tx = headX - ux * s;
    const ty = headY - uy * s;
    const segAlpha = envelope * frac * frac * 0.62;
    if (segAlpha > 0.03) {
      px(ctx, tx, ty, 1, 1, pal.bridge.rgba(s < 4 ? pal.starRgb : pal.starCoolRgb, segAlpha));
    }
  }

  // Crisp glowing star head + gentle 4-point cross sparkle at peak brightness
  px(ctx, headX, headY, 2, 1, pal.bridge.rgba(pal.starRgb, 0.88 * envelope));
  if (envelope > 0.55) {
    const glintA = (envelope - 0.55) * 0.85;
    px(ctx, headX, headY - 1, 1, 1, pal.bridge.rgba(pal.starRgb, glintA));
    px(ctx, headX, headY + 1, 1, 1, pal.bridge.rgba(pal.starRgb, glintA));
  }
}

/**
 * Smooth continuous-breathing twinkling stars (zero harsh binary flicker)
 */
function drawTwinklingStars(ctx, vw, minY, maxY, pal, phase, count) {
  const spanY = Math.max(10, maxY - minY);
  for (let i = 0; i < count; i++) {
    const sx = ((i * 43 + 11) % Math.max(10, vw - 8)) + 4;
    const sy = minY + ((i * 29 + 7) % spanY);
    const wave = 0.5 + 0.5 * Math.sin(phase * (1.1 + (i % 4) * 0.35) + i * 2.3);
    const alpha = 0.12 + wave * 0.56;
    px(ctx, sx, sy, 1, 1, pal.bridge.rgba(i % 3 === 0 ? pal.starRgb : pal.starCoolRgb, alpha));
    if (i % 5 === 0 && wave > 0.82) {
      const sparkA = (wave - 0.82) * 1.4;
      px(ctx, sx - 1, sy, 1, 1, pal.bridge.rgba(pal.starCoolRgb, sparkA));
      px(ctx, sx + 1, sy, 1, 1, pal.bridge.rgba(pal.starCoolRgb, sparkA));
      px(ctx, sx, sy - 1, 1, 1, pal.bridge.rgba(pal.starCoolRgb, sparkA));
      px(ctx, sx, sy + 1, 1, 1, pal.bridge.rgba(pal.starCoolRgb, sparkA));
    }
  }
}

/**
 * Organic bounded Lissajous fireflies (kunang-kunang) with smooth breathing glow
 * (never teleports across screen edges)
 */
function drawFireflies(ctx, vw, minY, maxY, pal, phase, count) {
  const spanX = Math.max(16, vw - 16);
  const spanY = Math.max(12, maxY - minY);
  for (let i = 0; i < count; i++) {
    const homeX = 8 + ((i * 0.6180339) % 1) * spanX;
    const homeY = minY + (((i * 0.381966 + 0.17) % 1) * spanY);
    const ampX = Math.min(11, spanX * 0.12);
    const ampY = Math.min(6, spanY * 0.16);
    const x = homeX + Math.sin(phase * (0.45 + (i % 3) * 0.14) + i * 2.1) * ampX;
    const y = homeY + Math.cos(phase * (0.58 + (i % 4) * 0.11) + i * 1.7) * ampY;

    const glow = 0.5 + 0.5 * Math.sin(phase * (1.4 + (i % 3) * 0.35) + i * 2.7);
    const coreA = 0.14 + glow * 0.68;
    const haloA = glow * 0.24;

    if (glow > 0.45) {
      px(ctx, x - 2, y - 2, 5, 5, pal.bridge.rgba(pal.fireflyHaloRgb, haloA * 0.45));
    }
    if (glow > 0.22) {
      px(ctx, x - 1, y - 1, 3, 3, pal.bridge.rgba(pal.fireflyHaloRgb, haloA));
    }
    px(ctx, x, y, 1, 1, pal.bridge.rgba(pal.fireflyCoreRgb, coreA));
  }
}

/**
 * Smooth curling chimney smoke wisps with true sine fade-in & dissolution
 */
function drawChimneySmoke(ctx, originX, originY, pal, phase) {
  for (let s = 0; s < 4; s++) {
    const life = (phase * 0.22 + s * 0.25) % 1;
    const alpha = Math.sin(life * Math.PI) * (pal.isLight ? 0.30 : 0.16);
    if (alpha <= 0.02) continue;
    const sx = originX + Math.sin(phase * 0.9 + s * 1.7 + life * 3.5) * 2.2 + life * 5.5;
    const sy = originY - life * 16;
    const size = life > 0.55 ? 2 : 1;
    px(ctx, sx, sy, size, 1, pal.bridge.rgba(pal.smokeRgb, alpha));
  }
}

/**
 * Smoothly fading sunlit pollen / breeze petals
 */
function drawSunlitMotes(ctx, vw, minY, maxY, pal, phase, count) {
  const spanY = Math.max(12, maxY - minY);
  for (let i = 0; i < count; i++) {
    const cycleLen = 10 + (i % 4) * 3;
    const p = ((phase + i * 2.7) % cycleLen) / cycleLen;
    const alpha = Math.sin(p * Math.PI) * 0.36;
    if (alpha <= 0.02) continue;
    const x = -4 + p * (vw + 8);
    const y = minY + (((i * 0.41 + 0.12) % 1) * spanY) + Math.sin(p * Math.PI * 3 + i) * 3;
    px(ctx, x, y, 1, 1, pal.bridge.rgba(pal.petalRgb, alpha));
  }
}

/**
 * Smooth sinusoidal water glints on the canal under the stone bridge
 */
function drawWaterGlints(ctx, vw, vh, pal, phase) {
  for (let g = 0; g < 5; g++) {
    const wave = 0.5 + 0.5 * Math.sin(phase * (1.7 + g * 0.25) + g * 2.1);
    const alpha = Math.pow(wave, 2.2) * (pal.isLight ? 0.44 : 0.46);
    if (alpha <= 0.03) continue;
    const gx = Math.round(vw * 0.59 + ((g * 11) % Math.max(10, Math.floor(vw * 0.22))));
    const gy = Math.round(vh * 0.875 + g * 2.4);
    px(ctx, gx, gy, 2 + (g % 2), 1, pal.bridge.rgba(pal.waterRgb, alpha));
  }
}

function drawSidebarOverlay(vCtx, vw, vh, pal, phase) {
  if (pal.isLight) {
    // 1. Cohesive V-flock of pixel birds gliding cleanly across the mountain sky
    drawBirdFlock(vCtx, vw, Math.round(vh * 0.46), pal, phase, 3.8, 16, 3);
    // 2. Smooth curling chimney smoke rising from the cozy café roofline
    drawChimneySmoke(vCtx, Math.round(vw * 0.16), Math.round(vh * 0.72), pal, phase);
    // 3. Soft shimmering water glints under the stone arch bridge
    drawWaterGlints(vCtx, vw, vh, pal, phase);
    // 4. Minimal whisper-quiet sunlit breeze motes
    drawSunlitMotes(vCtx, vw, Math.round(vh * 0.46), Math.round(vh * 0.88), pal, phase, 5);
  } else {
    // 1. Smoothly breathing twinkling stars across the open twilight sky below the menu
    drawTwinklingStars(vCtx, vw, Math.round(vh * 0.40), Math.round(vh * 0.56), pal, phase, 14);
    // 2. Complete-arc shooting star gliding edge-to-edge with natural fade-in & burnout
    drawShootingStar(vCtx, vw, Math.round(vh * 0.40), Math.round(vh * 0.55), pal, phase, 8.5, 1.55, 7.0);
    // 3. Subtle curling night chimney smoke
    drawChimneySmoke(vCtx, Math.round(vw * 0.16), Math.round(vh * 0.72), pal, phase);
    // 4. Warm lantern reflection shimmers on the dark canal water
    drawWaterGlints(vCtx, vw, vh, pal, phase);
    // 5. Organic bounded golden fireflies (kunang-kunang) over trees & cobblestone street
    drawFireflies(vCtx, vw, Math.round(vh * 0.58), Math.round(vh * 0.90), pal, phase, 8);
  }
}

function drawTopbarOverlay(vCtx, vw, vh, pal, phase) {
  if (pal.isLight) {
    // Cohesive flock gliding smoothly left-to-right across the entire panoramic header
    drawBirdFlock(vCtx, vw, Math.max(5, Math.round(vh * 0.28)), pal, phase + 4, 3.6, 22, 3);
    drawSunlitMotes(vCtx, vw, 4, Math.max(12, vh - 4), pal, phase, Math.max(3, Math.floor(vw / 120)));
  } else {
    // Quiet twinkling stars + complete panoramic shooting star + gentle fireflies
    drawTwinklingStars(vCtx, vw, 2, Math.max(10, Math.floor(vh * 0.54)), pal, phase, Math.max(10, Math.floor(vw / 48)));
    drawShootingStar(vCtx, vw, 3, Math.max(10, Math.floor(vh * 0.62)), pal, phase, 9.5, 1.75, 5.8);
    drawFireflies(vCtx, vw, Math.floor(vh * 0.46), Math.max(14, vh - 3), pal, phase, Math.max(4, Math.floor(vw / 95)));
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

  if (grainHost) grainHost.style.opacity = '0.018';

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
    grad.addColorStop(0, bridge.rgba(palette.accent, palette.isLight ? 0.04 : 0.06));
    grad.addColorStop(0.55, bridge.rgba(palette.accent, palette.isLight ? 0.015 : 0.025));
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

  // Smooth ~24fps pixel-art animation cadence (silky shooting stars & birds, battery-friendly)
  function tick(ts) {
    if (document.hidden || reducedMotion.matches) {
      stopLoop();
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    accTime += dt;
    if (accTime >= 0.04) {
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
