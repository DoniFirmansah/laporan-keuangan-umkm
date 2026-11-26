/**
 * Tier 1 Calmly Unique Ledger Backdrop + Integer-Scaled Pixel Botanical Nav Engine
 * - Main ambient backdrop: Mode A fixed (z-index: 0, pointer-events: none), 256x256 grain
 * - Navbars (.sidebar & .topbar): Integer-scaled Pixel Art Penghijauan (Ordered Bayer 4x4 + sprites)
 * - 1x1 sRGB Color Bridge (zero hardcoded colors in JS)
 * - ResizeObserver with devicePixelContentBoxSize snapping + imageSmoothingEnabled = false
 * - Auto-resync on theme flip (MutationObserver + matchMedia), honors prefers-reduced-motion
 */

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function bayerThreshold(x, y) {
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

  function mixRgb(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  return { resolveRgb, rgba, mixRgb };
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

// Pixel sprite matrices (integer grid)
const SPRITE_TREE = [
  '...LLLL...',
  '..LLHHLL..',
  '.LLHHHHLL.',
  '.LHHHHHHL.',
  'LLHHLLHHLL',
  'LHHLLLLHHL',
  '.LLLLLLLL.',
  '..LLSSLL..',
  '....TT....',
  '....TT....',
  '....TT....',
  '...TTTT...',
];

const SPRITE_POTTED = [
  '..HH..H...',
  '.HLL.LLH..',
  '..LLLLL...',
  '...LLL....',
  '..TTTTT...',
  '.TTTTTTT..',
  '..SSSSS...',
  '..SSSSS...',
];

const SPRITE_FERN = [
  '.H....H.',
  'HL....LH',
  '.LL..LL.',
  '..LLLL..',
  '...LL...',
];

function drawPixelSprite(vCtx, sprite, ox, oy, paletteMap) {
  const rx = Math.round(ox);
  const ry = Math.round(oy);
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      const color = paletteMap[ch];
      if (!color) continue;
      vCtx.fillStyle = color;
      vCtx.fillRect(rx + col, ry + row, 1, 1);
    }
  }
}

function drawHangingVine(vCtx, vx, startY, length, leafColor, hiColor) {
  const x = Math.round(vx);
  const y0 = Math.round(startY);
  for (let i = 0; i < length; i++) {
    vCtx.fillStyle = leafColor;
    vCtx.fillRect(x, y0 + i, 1, 1);
    if (i % 3 === 1) {
      const side = i % 6 === 1 ? -1 : 1;
      vCtx.fillStyle = hiColor;
      vCtx.fillRect(x + side, y0 + i, 1, 1);
      vCtx.fillStyle = leafColor;
      vCtx.fillRect(x + side, y0 + i + 1, 1, 1);
    }
  }
}

function buildPixelPalette(bridge) {
  const bg = bridge.resolveRgb('--bg-base');
  const accent = bridge.resolveRgb('--accent-primary');
  const sec = bridge.resolveRgb('--accent-secondary');
  const muted = bridge.resolveRgb('--text-muted');
  const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

  // Token-locked botanical tones with gentle alpha so nav text remains >= 4.5:1
  const leafDark = bridge.rgba(bridge.mixRgb(accent, muted, 0.25), isLight ? 0.26 : 0.30);
  const leafBright = bridge.rgba(accent, isLight ? 0.34 : 0.38);
  const leafSoft = bridge.rgba(accent, isLight ? 0.14 : 0.17);
  const trunk = bridge.rgba(sec, isLight ? 0.28 : 0.30);
  const potShade = bridge.rgba(bridge.mixRgb(sec, muted, 0.35), isLight ? 0.24 : 0.26);

  return {
    isLight,
    bg,
    accent,
    leafDark,
    leafBright,
    leafSoft,
    trunk,
    potShade,
    spriteMap: {
      L: leafDark,
      H: leafBright,
      T: trunk,
      S: potShade,
    },
  };
}

function renderPixelStage(canvas, physW, physH, dpr, drawer) {
  if (!canvas || physW <= 0 || physH <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = physW;
  canvas.height = physH;

  // Crisp integer scale (2px logical cell -> super fine crisp botanical pixel art)
  const intScale = Math.max(2, Math.round(2 * dpr));
  const vw = Math.max(24, Math.ceil(physW / intScale));
  const vh = Math.max(16, Math.ceil(physH / intScale));

  const vCanvas = document.createElement('canvas');
  vCanvas.width = vw;
  vCanvas.height = vh;
  const vCtx = vCanvas.getContext('2d');
  if (!vCtx) return;

  vCtx.clearRect(0, 0, vw, vh);
  drawer(vCtx, vw, vh);

  ctx.clearRect(0, 0, physW, physH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(vCanvas, 0, 0, vw, vh, 0, 0, vw * intScale, vh * intScale);
}

function drawSidebarGarden(vCtx, vw, vh, pal) {
  // 1. Ordered Bayer 4x4 top canopy mist (first 16 virtual rows)
  const canopyH = Math.min(18, Math.floor(vh * 0.16));
  for (let y = 0; y < canopyH; y++) {
    const density = (1 - y / canopyH) * 0.52;
    for (let x = 0; x < vw; x++) {
      if (density > bayerThreshold(x, y)) {
        vCtx.fillStyle = pal.leafSoft;
        vCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Subtle hanging vines in upper-right margin of sidebar
  if (vw > 40) {
    drawHangingVine(vCtx, vw - 6, 0, 12, pal.leafDark, pal.leafBright);
    drawHangingVine(vCtx, vw - 11, 0, 7, pal.leafSoft, pal.leafDark);
  }

  // 2. Ordered Bayer 4x4 bottom ground mist + pixel penghijauan garden sitting just above footer
  const footerOffset = 46;
  const groundY = Math.max(40, vh - footerOffset);
  const mistTop = Math.max(0, groundY - 22);

  for (let y = mistTop; y < vh; y++) {
    const t = y < groundY ? (y - mistTop) / 26 : 1 - (y - groundY) / Math.max(1, vh - groundY);
    const density = Math.max(0, t * 0.45);
    for (let x = 0; x < vw; x++) {
      if (density > bayerThreshold(x, y)) {
        vCtx.fillStyle = pal.leafSoft;
        vCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Pixel grass edge & stepping stones along bottom garden terrace
  vCtx.fillStyle = pal.leafDark;
  vCtx.fillRect(2, groundY, Math.max(8, vw - 4), 1);
  for (let x = 3; x < vw - 3; x += 4) {
    vCtx.fillStyle = pal.leafBright;
    vCtx.fillRect(x, groundY - 1, 1, 1);
  }

  // Botanical sprites arranged naturally along the lower garden shelf
  drawPixelSprite(vCtx, SPRITE_TREE, 4, groundY - SPRITE_TREE.length, pal.spriteMap);
  if (vw >= 48) {
    drawPixelSprite(vCtx, SPRITE_FERN, Math.floor(vw * 0.36), groundY - SPRITE_FERN.length, pal.spriteMap);
  }
  if (vw >= 64) {
    drawPixelSprite(vCtx, SPRITE_POTTED, vw - 14, groundY - SPRITE_POTTED.length, pal.spriteMap);
  }

  // Tiny drifting pixel leaf motes (calm static placement)
  const motes = [
    [vw - 18, Math.floor(vh * 0.34)],
    [vw - 8, Math.floor(vh * 0.52)],
    [6, Math.floor(vh * 0.64)],
    [Math.floor(vw * 0.55), groundY - 16],
  ];
  vCtx.fillStyle = pal.leafBright;
  for (const [mx, my] of motes) {
    if (mx > 1 && mx < vw - 1 && my > 1 && my < vh - 1) {
      vCtx.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
  }
}

function drawTopbarCanopy(vCtx, vw, vh, pal) {
  // Ordered Bayer 4x4 botanical canopy gradient along top edge (subtle behind text)
  const canopyRows = Math.min(vh, 14);
  for (let y = 0; y < canopyRows; y++) {
    const vertFade = 1 - y / Math.max(1, canopyRows);
    for (let x = 0; x < vw; x++) {
      const horizBias = x < vw * 0.45 ? 0.22 : 0.48;
      const density = vertFade * horizBias * 0.42;
      if (density > bayerThreshold(x, y)) {
        vCtx.fillStyle = pal.leafSoft;
        vCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Delicate pixel vines strictly in open mid-right space (clear of left title)
  const vinePositions = vw < 200 ? [0.56, 0.95] : [0.46, 0.56, 0.66, 0.96];
  vinePositions.forEach((ratio, idx) => {
    const vx = Math.round(vw * ratio);
    if (vx > 24 && vx < vw - 2) {
      const len = idx % 2 === 0 ? Math.min(9, vh - 6) : Math.min(6, vh - 8);
      drawHangingVine(vCtx, vx, 0, Math.max(3, len), pal.leafDark, pal.leafBright);
    }
  });

  if (vw > 180 && vh >= 20) {
    drawPixelSprite(vCtx, SPRITE_FERN, Math.round(vw * 0.58), vh - SPRITE_FERN.length, pal.spriteMap);
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
  prebakeCottonGrain(grainHost, bridge);

  const stageSizes = new Map();

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
    grad.addColorStop(0, bridge.rgba(accent, isLight ? 0.07 : 0.10));
    grad.addColorStop(0.55, bridge.rgba(accent, isLight ? 0.025 : 0.035));
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

      ctx.beginPath();
      for (let y = safeTop + 40; y < height - 32; y += 36) {
        const tick = (y - safeTop) % 144 === 0 ? 12 : 5;
        ctx.moveTo(ruleX + 4, y);
        ctx.lineTo(ruleX + 4 + tick, y);
      }
      ctx.stroke();
    }
  }

  function renderNavPixelCanvases() {
    const pal = buildPixelPalette(bridge);
    const dpr = window.devicePixelRatio || 1;

    if (sidebarEl && sidebarCanvas) {
      const sz = stageSizes.get(sidebarEl) || {
        w: Math.round(sidebarEl.clientWidth * dpr),
        h: Math.round(sidebarEl.clientHeight * dpr),
      };
      renderPixelStage(sidebarCanvas, sz.w, sz.h, dpr, (vCtx, vw, vh) =>
        drawSidebarGarden(vCtx, vw, vh, pal)
      );
    }

    if (topbarEl && topbarCanvas) {
      const sz = stageSizes.get(topbarEl) || {
        w: Math.round(topbarEl.clientWidth * dpr),
        h: Math.round(topbarEl.clientHeight * dpr),
      };
      renderPixelStage(topbarCanvas, sz.w, sz.h, dpr, (vCtx, vw, vh) =>
        drawTopbarCanopy(vCtx, vw, vh, pal)
      );
    }
  }

  function renderAll() {
    renderMainBackdrop();
    renderNavPixelCanvases();
    document.documentElement.dataset.atmosphereReady = 'true';
  }

  // Physical-pixel snapping observer for integer-scaled pixel art canvases
  const ro = new ResizeObserver((entries) => {
    const dpr = window.devicePixelRatio || 1;
    for (const entry of entries) {
      const box = entry.devicePixelContentBoxSize?.[0];
      const physW = box ? box.inlineSize : Math.round(entry.contentRect.width * dpr);
      const physH = box ? box.blockSize : Math.round(entry.contentRect.height * dpr);
      stageSizes.set(entry.target, { w: physW, h: physH });
    }
    renderNavPixelCanvases();
  });

  for (const el of [sidebarEl, topbarEl]) {
    if (!el) continue;
    try {
      ro.observe(el, { box: 'device-pixel-content-box' });
    } catch {
      ro.observe(el);
    }
  }

  renderAll();

  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 120);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const observer = new MutationObserver(() => {
    prebakeCottonGrain(grainHost, bridge);
    renderAll();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onMedia = () => renderAll();
  media.addEventListener('change', onMedia);

  return () => {
    ro.disconnect();
    window.removeEventListener('resize', onResize);
    observer.disconnect();
    media.removeEventListener('change', onMedia);
  };
}
