/**
 * Tier 0/1 Calmly Unique Ledger Backdrop Engine
 * - Mode A fixed ambient backdrop (z-index: 0, pointer-events: none)
 * - 1x1 sRGB Color Bridge (zero hardcoded colors in JS)
 * - Pre-baked 256x256 archival cotton grain (rendered once)
 * - Static architectural ledger margin rules & compass arcs outside --atmo-safe-left
 * - Zero RAF loops, zero pointermove listeners, auto-resync on theme change
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

  return { resolveRgb, rgba };
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

  // Deterministic LCG so grain is crisp and reproducible without Math.random flicker
  let seed = 1337;
  for (let i = 0; i < buf.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const shade = (seed >>> 24) & 0xff;
    buf[i] = ink.r;
    buf[i + 1] = ink.g;
    buf[i + 2] = ink.b;
    buf[i + 3] = shade > 128 ? 22 : 6;
  }
  ctx.putImageData(img, 0, 0);
  grainHost.style.backgroundImage = `url(${offscreen.toDataURL('image/png')})`;
}

export function initAtmosphere() {
  const canvas = document.getElementById('atmo-canvas');
  const grainHost = document.getElementById('paper-grain');
  if (!canvas) {
    document.documentElement.dataset.atmosphereReady = 'true';
    return () => {};
  }

  const ctx = canvas.getContext('2d');
  const bridge = createColorBridge();
  prebakeCottonGrain(grainHost, bridge);

  function renderOnce() {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const rootStyles = getComputedStyle(document.documentElement);
    const safeLeft = parseFloat(rootStyles.getPropertyValue('--atmo-safe-left')) || 264;
    const safeTop = parseFloat(rootStyles.getPropertyValue('--atmo-safe-top')) || 64;

    const bg = bridge.resolveRgb('--bg-base');
    const ink = bridge.resolveRgb('--text-muted');
    const accent = bridge.resolveRgb('--accent-primary');
    const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

    // Gentle daylight or studio-lamp ambient wash (no neon, perceptible 6%-14% delta)
    const cx = width * 0.86;
    const cy = Math.max(safeTop + 80, height * 0.22);
    const rad = Math.max(width, height) * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, rad);
    grad.addColorStop(0, bridge.rgba(accent, isLight ? 0.08 : 0.11));
    grad.addColorStop(0.55, bridge.rgba(accent, isLight ? 0.03 : 0.04));
    grad.addColorStop(1, bridge.rgba(bg, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Architectural ledger margin & subtle surveyor arcs outside --atmo-safe-left
    const rightZoneX = Math.max(safeLeft + 32, width - 56);
    ctx.strokeStyle = bridge.rgba(ink, isLight ? 0.11 : 0.13);
    ctx.lineWidth = 1;

    // Double vertical accounting margin rule on far right edge
    ctx.beginPath();
    ctx.moveTo(rightZoneX, safeTop + 16);
    ctx.lineTo(rightZoneX, height - 24);
    ctx.moveTo(rightZoneX + 4, safeTop + 16);
    ctx.lineTo(rightZoneX + 4, height - 24);
    ctx.stroke();

    // Subtle tick scale marks along far-right ledger margin
    ctx.beginPath();
    for (let y = safeTop + 32; y < height - 32; y += 32) {
      const len = (y - safeTop) % 128 === 0 ? 14 : 6;
      ctx.moveTo(rightZoneX + 4, y);
      ctx.lineTo(rightZoneX + 4 + len, y);
    }
    ctx.stroke();

    // Subtle geometric drafting compass arc in upper-right focal zone
    ctx.strokeStyle = bridge.rgba(accent, isLight ? 0.09 : 0.12);
    ctx.beginPath();
    ctx.arc(width - 32, safeTop + 32, 160, Math.PI * 0.55, Math.PI * 0.98);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width - 32, safeTop + 32, 224, Math.PI * 0.60, Math.PI * 0.94);
    ctx.stroke();

    document.documentElement.dataset.atmosphereReady = 'true';
  }

  renderOnce();

  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderOnce, 120);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const observer = new MutationObserver(() => {
    prebakeCottonGrain(grainHost, bridge);
    renderOnce();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onMedia = () => renderOnce();
  media.addEventListener('change', onMedia);

  return () => {
    window.removeEventListener('resize', onResize);
    observer.disconnect();
    media.removeEventListener('change', onMedia);
  };
}
