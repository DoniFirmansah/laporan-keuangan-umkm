/**
 * Tier 0/1 Calmly Unique Ledger Backdrop Engine
 * - Mode A fixed ambient backdrop (z-index: 0, pointer-events: none)
 * - 1x1 sRGB Color Bridge (zero hardcoded colors in JS)
 * - Pre-baked 256x256 archival cotton grain (rendered once)
 * - Soft daylight vignette + wide-viewport margin rule strictly outside content zone
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

  let seed = 1337;
  for (let i = 0; i < buf.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const shade = (seed >>> 24) & 0xff;
    buf[i] = ink.r;
    buf[i + 1] = ink.g;
    buf[i + 2] = ink.b;
    buf[i + 3] = shade > 128 ? 20 : 5;
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

    // Warm studio/window daylight wash (subtractive/gentle alpha, zero visual clash)
    const cx = width * 0.85;
    const cy = Math.max(safeTop + 60, height * 0.18);
    const rad = Math.max(width, height) * 0.52;
    const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, rad);
    grad.addColorStop(0, bridge.rgba(accent, isLight ? 0.07 : 0.10));
    grad.addColorStop(0.55, bridge.rgba(accent, isLight ? 0.025 : 0.035));
    grad.addColorStop(1, bridge.rgba(bg, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Draw outer architectural ledger rule strictly in empty right margin on wide viewports
    // so lines NEVER cross behind content cards or mobile screens
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
