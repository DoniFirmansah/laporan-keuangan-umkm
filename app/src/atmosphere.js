/**
 * Tier 1-2 Wallpaper-Engine-Grade Pixel Botanical Greenhouse Engine
 * - Main workspace backdrop: Mode A static grain + soft daylight/lamp wash
 * - Sidebar & Full-Width Topbar: Multi-layer Integer-Scaled Pixel Greenhouse Footage
 *   - Layer 4: Bayer 4x4 dithered sky (Misty Morning / Moonlit Night) + moving pixel clouds / stars
 *   - Layer 3: Distant forest ridge silhouettes & diagonal Bayer-stepped sunbeams (god rays)
 *   - Layer 2: Victorian greenhouse mullions, arched rafters, wooden shelf, pines, monsteras, lantern
 *   - Layer 1: Gentle swaying hanging vines + floating pollen motes / fireflies (animated RAF)
 * - 100% token-locked via 1x1 sRGB Color Bridge; pauses on hidden/offscreen; static on reduced-motion
 */

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function bayer(x, y) {
  return (BAYER_4X4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

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

function prebakeCottonGrain(grainHost, bridge) {
  if (!grainHost) return;
  const size = 256;
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  const ink = bridge.resolveRgb('--text-primary');
  const img = ctx.createImageData(size, size);
  const buf = img.data;

  let seed = 1337;
  for (let i = 0; i < buf.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const shade = (seed >>> 24) & 0xff;
    buf[i] = ink.r;
    buf[i + 1] = ink.g;
    buf[i + 2] = ink.b;
    buf[i + 3] = shade > 128 ? 18 : 4;
  }
  ctx.putImageData(img, 0, 0);
  grainHost.style.backgroundImage = `url(${offscreen.toDataURL('image/png')})`;
}

// Multi-tone botanical pixel sprites (L=mid leaf, H=highlight leaf, D=deep shadow, T=wood/pot, G=warm glow)
const SPRITE_CYPRESS = [
  '....H....',
  '...HLL...',
  '...LLD...',
  '..HLLLD..',
  '..LLLDD..',
  '.HLLLLD..',
  '.LLLLDDD.',
  'HLLLLLDD.',
  'LLLLLDDDD',
  '.LLLDDDD.',
  '...TTD...',
  '...TTT...',
];

const SPRITE_MONSTERA = [
  '.HH...HH.',
  'HLLH.HLLH',
  'LLLD.DLLL',
  '.LLD.DLL.',
  '..HD.DH..',
  '...L.L...',
  '..TTTTT..',
  '..TTTTT..',
  '...TTT...',
];

const SPRITE_LANTERN = [
  '..DDD..',
  '.DGGGD.',
  '.DGGGD.',
  '..DDD..',
  '...T...',
];

const SPRITE_CLOUD = [
  '....GGGGGG....',
  '..GGGGGGGGGG..',
  '.GGGGGGGGGGGG.',
  'GGGGGGGGGGGGGG',
];

const SPRITE_CLOUD_SMALL = [
  '..GGGGG..',
  '.GGGGGGG.',
  'GGGGGGGGG',
];

function drawSprite(vCtx, sprite, ox, oy, map) {
  const rx = Math.round(ox);
  const ry = Math.round(oy);
  for (let r = 0; r < sprite.length; r++) {
    const line = sprite[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '.') continue;
      const color = map[ch];
      if (!color) continue;
      vCtx.fillStyle = color;
      vCtx.fillRect(rx + c, ry + r, 1, 1);
    }
  }
}

function drawHangingVine(vCtx, baseX, startY, len, swayOffset, pal) {
  const bx = Math.round(baseX);
  const sy = Math.round(startY);
  for (let i = 0; i < len; i++) {
    // Tip sways subtly in integer pixels
    const shift = i > len * 0.55 ? Math.round(swayOffset) : 0;
    const x = bx + shift;
    const y = sy + i;
    vCtx.fillStyle = pal.leafDeep;
    vCtx.fillRect(x, y, 1, 1);
    if (i % 3 === 1) {
      const dir = i % 6 === 1 ? -1 : 1;
      vCtx.fillStyle = pal.leafBright;
      vCtx.fillRect(x + dir, y, 1, 1);
      vCtx.fillStyle = pal.leafMid;
      vCtx.fillRect(x + dir, y + 1, 1, 1);
    }
  }
}

function buildPalette(bridge) {
  const bg = bridge.resolveRgb('--bg-base');
  const inset = bridge.resolveRgb('--bg-inset');
  const accent = bridge.resolveRgb('--accent-primary');
  const sec = bridge.resolveRgb('--accent-secondary');
  const text = bridge.resolveRgb('--text-primary');
  const muted = bridge.resolveRgb('--text-muted');
  const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

  // Derived strictly from CSS tokens — cohesive archival botanical palette
  const skyTop = isLight ? bridge.mix(bg, accent, 0.16) : bridge.mix(bg, accent, 0.12);
  const skyMid = isLight ? bridge.mix(bg, accent, 0.08) : bridge.mix(bg, inset, 0.45);
  const hillFar = bridge.rgba(bridge.mix(accent, muted, 0.35), isLight ? 0.22 : 0.28);
  const hillNear = bridge.rgba(bridge.mix(accent, text, 0.15), isLight ? 0.30 : 0.34);

  const leafBright = bridge.rgba(accent, isLight ? 0.62 : 0.58);
  const leafMid = bridge.rgba(bridge.mix(accent, text, 0.18), isLight ? 0.54 : 0.46);
  const leafDeep = bridge.rgba(bridge.mix(accent, text, 0.38), isLight ? 0.48 : 0.40);
  const wood = bridge.rgba(bridge.mix(sec, text, 0.2), isLight ? 0.55 : 0.48);
  const frameLine = bridge.rgba(bridge.mix(text, accent, 0.35), isLight ? 0.20 : 0.26);
  const sunbeam = bridge.rgba(isLight ? bridge.mix(sec, bg, 0.25) : sec, isLight ? 0.20 : 0.18);
  const glow = bridge.rgba(isLight ? bridge.mix(bg, sec, 0.18) : sec, isLight ? 0.65 : 0.72);
  const cloudColor = bridge.rgba(isLight ? bridge.mix(bg, text, 0.06) : bridge.mix(accent, muted, 0.5), isLight ? 0.72 : 0.28);

  return {
    isLight,
    skyTop: bridge.rgba(skyTop, 1),
    skyMid: bridge.rgba(skyMid, 1),
    hillFar,
    hillNear,
    leafBright,
    leafMid,
    leafDeep,
    wood,
    frameLine,
    sunbeam,
    glow,
    cloudColor,
    spriteMap: {
      L: leafMid,
      H: leafBright,
      D: leafDeep,
      T: wood,
      G: glow,
    },
    cloudMap: {
      G: cloudColor,
    },
  };
}

function drawSkyAndDistantForest(vCtx, vw, vh, pal, phase, isTopbar) {
  // Layer 4: Bayer 4x4 dithered sky gradient
  vCtx.fillStyle = pal.skyMid;
  vCtx.fillRect(0, 0, vw, vh);

  const skyBand = isTopbar ? vh : Math.floor(vh * 0.62);
  for (let y = 0; y < skyBand; y++) {
    const t = 1 - y / Math.max(1, skyBand);
    for (let x = 0; x < vw; x++) {
      if (t * 0.85 > bayer(x, y)) {
        vCtx.fillStyle = pal.skyTop;
        vCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Sun / Moon & Drifting Clouds or Stars
  if (pal.isLight) {
    const c1x = ((phase * 4.2) % (vw + 24)) - 14;
    const c2x = ((phase * 2.6 + vw * 0.52) % (vw + 24)) - 12;
    drawSprite(vCtx, SPRITE_CLOUD, c1x, isTopbar ? 3 : 8, pal.cloudMap);
    drawSprite(vCtx, SPRITE_CLOUD_SMALL, c2x, isTopbar ? 6 : 20, pal.cloudMap);
  } else {
    // Pixel crescent moon + calm twinkling stars
    const moonX = Math.max(8, vw - 18);
    const moonY = isTopbar ? 4 : 10;
    vCtx.fillStyle = pal.glow;
    vCtx.fillRect(moonX, moonY, 4, 4);
    vCtx.fillStyle = pal.skyTop;
    vCtx.fillRect(moonX + 2, moonY, 2, 2);

    const starCount = isTopbar ? 12 : 16;
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 37 + 11) % Math.max(12, vw - 4);
      const sy = (i * 19 + 3) % Math.max(8, Math.floor(skyBand * 0.65));
      const twinkle = ((Math.floor(phase * 1.4) + i) % 5) === 0;
      vCtx.fillStyle = twinkle ? pal.glow : pal.cloudColor;
      vCtx.fillRect(sx, sy, 1, 1);
    }
  }

  // Layer 3: Distant forest ridge silhouette with Bayer mist
  const horizonY = isTopbar ? vh - 5 : Math.floor(vh * 0.72);
  for (let x = 0; x < vw; x++) {
    const ridge1 = Math.round(Math.sin(x * 0.11) * 3 + Math.cos(x * 0.23) * 2);
    const top1 = Math.max(2, horizonY - 5 - Math.abs(ridge1));
    vCtx.fillStyle = pal.hillFar;
    vCtx.fillRect(x, top1, 1, vh - top1);

    const ridge2 = Math.round(Math.sin(x * 0.19 + 1.4) * 2 + (x % 5 === 0 ? 2 : 0));
    const top2 = Math.max(4, horizonY - Math.abs(ridge2));
    vCtx.fillStyle = pal.hillNear;
    vCtx.fillRect(x, top2, 1, vh - top2);
  }

  // Diagonal Bayer-dithered greenhouse god-rays (light mode) or warm lantern shafts
  const rayCount = isTopbar ? 3 : 2;
  for (let r = 0; r < rayCount; r++) {
    const baseRx = Math.round(vw * (0.28 + r * 0.28) + Math.sin(phase * 0.25 + r) * 2);
    for (let y = 0; y < vh; y++) {
      const rx = baseRx - Math.floor(y * 0.45);
      const halfW = isTopbar ? 5 : 7;
      for (let dx = -halfW; dx <= halfW; dx++) {
        const px = rx + dx;
        if (px < 0 || px >= vw) continue;
        const falloff = 1 - Math.abs(dx) / (halfW + 1);
        if (falloff * 0.55 > bayer(px, y)) {
          vCtx.fillStyle = pal.sunbeam;
          vCtx.fillRect(px, y, 1, 1);
        }
      }
    }
  }
}

function drawTopbarFootage(vCtx, vw, vh, pal, phase) {
  drawSkyAndDistantForest(vCtx, vw, vh, pal, phase, true);

  // Layer 2: Panoramic Victorian greenhouse window mullions (left to right)
  vCtx.fillStyle = pal.frameLine;
  vCtx.fillRect(0, 0, vw, 1);
  vCtx.fillRect(0, vh - 1, vw, 1);
  const paneStep = Math.max(24, Math.floor(vw / 7));
  for (let x = paneStep; x < vw - 8; x += paneStep) {
    vCtx.fillRect(x, 0, 1, vh);
  }

  // Layer 1: Swaying hanging botanical vines & corner foliage across full header width
  const sway = Math.sin(phase * 0.9);
  const vineSpots = [0.06, 0.18, 0.34, 0.49, 0.63, 0.78, 0.91];
  vineSpots.forEach((ratio, idx) => {
    const vx = Math.round(vw * ratio);
    const len = idx % 2 === 0 ? Math.min(11, vh - 4) : Math.min(7, vh - 6);
    const localSway = sway * (idx % 2 === 0 ? 1 : -1);
    drawHangingVine(vCtx, vx, 1, Math.max(4, len), localSway, pal);
  });

  // Grounded pixel cypresses & monstera silhouettes along bottom border of header
  const cypressSpots = [0.12, 0.41, 0.72, 0.87];
  for (const ratio of cypressSpots) {
    const cx = Math.round(vw * ratio);
    if (cx > 4 && cx < vw - 10) {
      drawSprite(vCtx, SPRITE_CYPRESS, cx, vh - SPRITE_CYPRESS.length, pal.spriteMap);
    }
  }

  // Ambient floating pollen / firefly particles across full width
  const particleCount = Math.max(8, Math.floor(vw / 24));
  for (let i = 0; i < particleCount; i++) {
    const px = Math.round(((i * 41 + phase * (3 + (i % 3))) % vw));
    const py = Math.round((i * 13 + Math.sin(phase * 1.1 + i) * 3 + vh) % Math.max(6, vh - 2));
    vCtx.fillStyle = i % 2 === 0 ? pal.glow : pal.leafBright;
    vCtx.fillRect(px, py, 1, 1);
  }
}

function drawSidebarFootage(vCtx, vw, vh, pal, phase) {
  drawSkyAndDistantForest(vCtx, vw, vh, pal, phase, false);

  // Layer 2: Greenhouse vertical mullions & arched top beam
  vCtx.fillStyle = pal.frameLine;
  vCtx.fillRect(0, 0, vw, 2);
  vCtx.fillRect(0, 0, 1, vh);
  vCtx.fillRect(vw - 1, 0, 1, vh);
  vCtx.fillRect(Math.floor(vw * 0.5), 0, 1, Math.floor(vh * 0.75));
  const shelfY = Math.max(48, vh - 36);
  vCtx.fillRect(0, Math.floor(vh * 0.38), vw, 1);

  // Conservatory wooden potting bench / garden terrace above bottom footer
  vCtx.fillStyle = pal.wood;
  vCtx.fillRect(2, shelfY, vw - 4, 2);
  vCtx.fillStyle = pal.leafDeep;
  vCtx.fillRect(2, shelfY - 1, vw - 4, 1);

  // Lush pixel botanical collection along the conservatory shelf & mid-canopy
  drawSprite(vCtx, SPRITE_CYPRESS, 5, shelfY - SPRITE_CYPRESS.length, pal.spriteMap);
  if (vw >= 54) {
    drawSprite(vCtx, SPRITE_MONSTERA, Math.floor(vw * 0.36), shelfY - SPRITE_MONSTERA.length, pal.spriteMap);
  }
  if (vw >= 74) {
    drawSprite(vCtx, SPRITE_CYPRESS, vw - 15, shelfY - SPRITE_CYPRESS.length, pal.spriteMap);
  }

  // Hanging lantern with Bayer-dithered warm glow halo in upper-right conservatory
  const lanX = vw - 14;
  const lanY = 14;
  for (let dy = -6; dy <= 8; dy++) {
    for (let dx = -6; dx <= 12; dx++) {
      const dist = Math.hypot(dx - 3, dy - 2);
      const strength = Math.max(0, 1 - dist / 8) * 0.55;
      if (strength > bayer(lanX + dx, lanY + dy)) {
        vCtx.fillStyle = pal.sunbeam;
        vCtx.fillRect(lanX + dx, lanY + dy, 1, 1);
      }
    }
  }
  drawSprite(vCtx, SPRITE_LANTERN, lanX, lanY, pal.spriteMap);

  // Layer 1: Swaying hanging vines from top beam
  const sway = Math.sin(phase * 0.85);
  drawHangingVine(vCtx, 7, 2, 16, sway, pal);
  drawHangingVine(vCtx, Math.floor(vw * 0.32), 2, 11, -sway, pal);
  drawHangingVine(vCtx, vw - 7, 2, 19, sway, pal);

  // Floating sunlit motes / fireflies
  for (let i = 0; i < 14; i++) {
    const px = Math.round(((i * 23 + Math.sin(phase * 0.7 + i) * 5 + vw) % Math.max(8, vw - 4)) + 2);
    const py = Math.round(((i * 31 + phase * 2.2) % Math.max(20, vh - 6)) + 3);
    vCtx.fillStyle = i % 2 === 0 ? pal.glow : pal.leafBright;
    vCtx.fillRect(px, py, 1, 1);
  }
}

function blitStage(canvas, physW, physH, dpr, drawer) {
  if (!canvas || physW <= 0 || physH <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (canvas.width !== physW || canvas.height !== physH) {
    canvas.width = physW;
    canvas.height = physH;
  }

  const intScale = Math.max(2, Math.round(2.5 * dpr));
  const vw = Math.max(24, Math.ceil(physW / intScale));
  const vh = Math.max(16, Math.ceil(physH / intScale));

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
  prebakeCottonGrain(grainHost, bridge);

  const stageSizes = new Map();
  let palette = buildPalette(bridge);
  let phase = 0;
  let rafId = null;
  let lastTs = 0;
  let accTime = 0;

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

    const rootStyles = getComputedStyle(document.documentElement);
    const safeLeft = parseFloat(rootStyles.getPropertyValue('--atmo-safe-left')) || 264;
    const safeTop = parseFloat(rootStyles.getPropertyValue('--atmo-safe-top')) || 64;

    const bg = bridge.resolveRgb('--bg-base');
    const ink = bridge.resolveRgb('--text-muted');
    const accent = bridge.resolveRgb('--accent-primary');
    const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

    const cx = width * 0.85;
    const cy = Math.max(safeTop + 60, height * 0.18);
    const rad = Math.max(width, height) * 0.52;
    const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, rad);
    grad.addColorStop(0, bridge.rgba(accent, isLight ? 0.06 : 0.09));
    grad.addColorStop(0.55, bridge.rgba(accent, isLight ? 0.02 : 0.03));
    grad.addColorStop(1, bridge.rgba(bg, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const contentEdge = safeLeft + 1220;
    if (width >= contentEdge + 56) {
      const ruleX = width - 44;
      ctx.strokeStyle = bridge.rgba(ink, isLight ? 0.10 : 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ruleX, safeTop + 20);
      ctx.lineTo(ruleX, height - 24);
      ctx.moveTo(ruleX + 4, safeTop + 20);
      ctx.lineTo(ruleX + 4, height - 24);
      ctx.stroke();
    }
  }

  function renderNavFootage() {
    const dpr = window.devicePixelRatio || 1;

    if (sidebarEl && sidebarCanvas) {
      const sz = stageSizes.get(sidebarEl) || {
        w: Math.round(sidebarEl.clientWidth * dpr),
        h: Math.round(sidebarEl.clientHeight * dpr),
      };
      blitStage(sidebarCanvas, sz.w, sz.h, dpr, (vCtx, vw, vh) =>
        drawSidebarFootage(vCtx, vw, vh, palette, phase)
      );
    }

    if (topbarEl && topbarCanvas) {
      const sz = stageSizes.get(topbarEl) || {
        w: Math.round(topbarEl.clientWidth * dpr),
        h: Math.round(topbarEl.clientHeight * dpr),
      };
      blitStage(topbarCanvas, sz.w, sz.h, dpr, (vCtx, vw, vh) =>
        drawTopbarFootage(vCtx, vw, vh, palette, phase)
      );
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Throttle pixel-art stepping cleanly (~15fps retro wallpaper cadence) for crisp low-CPU motion
  function tick(ts) {
    if (document.hidden || reducedMotion.matches) {
      stopLoop();
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    accTime += dt;
    if (accTime >= 0.066) {
      phase += accTime;
      accTime = 0;
      renderNavFootage();
    }
    rafId = requestAnimationFrame(tick);
  }

  function startOrFreeze() {
    stopLoop();
    renderMainBackdrop();
    renderNavFootage();
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
    renderNavFootage();
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
      renderNavFootage();
    }, 120);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const onVisibility = () => {
    if (document.hidden) stopLoop();
    else startOrFreeze();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const observer = new MutationObserver(() => {
    palette = buildPalette(bridge);
    prebakeCottonGrain(grainHost, bridge);
    renderMainBackdrop();
    renderNavFootage();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
  const onThemeMedia = () => {
    palette = buildPalette(bridge);
    renderMainBackdrop();
    renderNavFootage();
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
