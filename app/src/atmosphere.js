/**
 * Handcrafted Minimalist Hi-Bit Woodblock-Pixel Art Engine (100% Procedural Code, Zero AI Assets)
 * - Inspired by Japanese Shin-Hanga woodblock prints, Firewatch, & Alto's Odyssey rendered at crisp
 *   fine-grain Hi-Bit pixel resolution (1 CSS px art-pixel, integer-snapped to physical device pixels)
 * - Offscreen static scene caching (faceted alpine peaks, valley mist, organic asymmetric cypress/pine
 *   forests, slender clocktower, gabled UMKM hillside village, parabolic stone arch bridge & river)
 *   rebuilt only on resize or theme switch -> ultra-light CPU usage
 * - Full-lifecycle continuous dynamic actors composited at ~24fps:
 *   * Complete-arc shooting stars (edge-to-edge diagonal flight, tapered luminous tail, smooth fade-in/burnout)
 *   * Bounded organic Lissajous fireflies (kunang-kunang) with smooth breathing glow
 *   * Cohesive V-flock birds entering off-left & exiting off-right + ultra-slow woodblock cloud ribbons
 *   * Curling chimney smoke with sinusoidal dissolution + rippling river reflections + breathing stars
 * - 100% token-locked via 1x1 sRGB Color Bridge (zero hardcoded hex); pauses on document.hidden;
 *   static frame on prefers-reduced-motion
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

function buildWoodblockPalette(bridge) {
  const bg = bridge.resolveRgb('--bg-base');
  const surface = bridge.resolveRgb('--bg-surface');
  const inset = bridge.resolveRgb('--bg-inset');
  const accent = bridge.resolveRgb('--accent-primary');
  const sec = bridge.resolveRgb('--accent-secondary');
  const text = bridge.resolveRgb('--text-primary');
  const muted = bridge.resolveRgb('--text-muted');
  const err = bridge.resolveRgb('--status-err');
  const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

  // Restrained archival woodblock palette — stays strictly calm & editorial in background role
  return {
    isLight,
    bridge,
    bg,
    accent,

    // Sky stops: calm --bg-base at top (behind menu/title) easing into poetic horizon tone
    skyTop: bg,
    skyMid: isLight ? bridge.mix(bg, accent, 0.05) : bridge.mix(bg, accent, 0.05),
    skyHorizon: isLight ? bridge.mix(surface, sec, 0.10) : bridge.mix(bg, accent, 0.11),

    // Celestial
    celCore: isLight ? surface : bridge.mix(text, sec, 0.20),
    celHalo: isLight ? bridge.mix(surface, sec, 0.22) : bridge.mix(sec, bg, 0.52),
    moonCut: isLight ? bg : bridge.mix(bg, accent, 0.06),

    // Faceted mountain depth planes (minimalist muted sage/mineral tones)
    mtnFarLit: isLight ? bridge.mix(bg, accent, 0.16) : bridge.mix(bg, accent, 0.17),
    mtnFarShade: isLight ? bridge.mix(bg, accent, 0.24) : bridge.mix(bg, inset, 0.35),
    mtnSnow: isLight ? bridge.mix(surface, bg, 0.25) : bridge.mix(muted, bg, 0.42),

    mtnMidLit: isLight ? bridge.mix(bg, accent, 0.28) : bridge.mix(bg, accent, 0.23),
    mtnMidShade: isLight ? bridge.mix(bg, accent, 0.38) : bridge.mix(inset, accent, 0.14),

    // Valley mist
    mistRgb: isLight ? surface : bridge.mix(bg, accent, 0.16),

    // Organic pine forest planes
    forestBack: isLight ? bridge.mix(bg, accent, 0.42) : bridge.mix(inset, accent, 0.22),
    forestMid: isLight ? bridge.mix(bg, accent, 0.54) : bridge.mix(inset, accent, 0.15),
    forestFront: isLight ? bridge.mix(accent, text, 0.12) : bridge.mix(inset, bg, 0.55),
    forestRim: isLight ? bridge.mix(bg, accent, 0.30) : bridge.mix(accent, bg, 0.58),

    // Minimalist artisan village architecture (muted archival tones, zero loud saturation)
    wallLit: isLight ? bridge.mix(surface, bg, 0.30) : bridge.mix(bg, muted, 0.22),
    wallShade: isLight ? bridge.mix(inset, accent, 0.14) : bridge.mix(inset, bg, 0.40),
    roofMain: isLight ? bridge.mix(err, bg, 0.54) : bridge.mix(inset, err, 0.22),
    roofAlt: isLight ? bridge.mix(accent, bg, 0.46) : bridge.mix(inset, accent, 0.26),
    roofLine: isLight ? bridge.mix(text, bg, 0.58) : bridge.mix(inset, bg, 0.65),
    stoneLit: isLight ? bridge.mix(inset, bg, 0.30) : bridge.mix(bg, muted, 0.20),
    stoneShade: isLight ? bridge.mix(muted, bg, 0.46) : bridge.mix(inset, bg, 0.45),

    // Windows & lantern
    winDay: bridge.mix(accent, bg, 0.52),
    winGlow: bridge.mix(sec, isLight ? surface : text, isLight ? 0.25 : 0.36),
    winHalo: sec,

    // River water
    riverTop: isLight ? bridge.mix(bg, accent, 0.22) : bridge.mix(inset, accent, 0.12),
    riverBot: isLight ? bridge.mix(bg, accent, 0.34) : inset,

    // Dynamic FX RGBs
    starRgb: bridge.mix(text, sec, 0.16),
    starCoolRgb: bridge.mix(text, muted, 0.35),
    birdRgb: bridge.mix(text, muted, 0.42),
    smokeRgb: surface,
    cloudRgb: isLight ? surface : bridge.mix(muted, bg, 0.62),
    petalRgb: bridge.mix(surface, sec, 0.24),
    waterGlintRgb: isLight ? surface : bridge.mix(sec, text, 0.30),
    fireflyCoreRgb: bridge.mix(sec, text, 0.44),
    fireflyHaloRgb: sec,
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
  const rad = Math.max(0, Math.round(r));
  for (let dy = -rad; dy <= rad; dy++) {
    const span = Math.floor(Math.sqrt(rad * rad - dy * dy));
    ctx.fillRect(rx - span, ry + dy, span * 2 + 1, 1);
  }
}

/**
 * Deterministic hash for hand-crafted organic irregularity (no Math.random flicker!)
 */
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Smooth multi-stop vertical pixel sky gradient (zero harsh 90s stripes)
 */
function drawSkyGradient(ctx, vw, vh, horizonY, pal) {
  const { bridge } = pal;
  for (let y = 0; y < vh; y++) {
    let rgb;
    if (y <= horizonY * 0.52) {
      const t = y / Math.max(1, horizonY * 0.52);
      rgb = bridge.mix(pal.skyTop, pal.skyMid, t);
    } else if (y <= horizonY) {
      const t = (y - horizonY * 0.52) / Math.max(1, horizonY * 0.48);
      rgb = bridge.mix(pal.skyMid, pal.skyHorizon, t * t);
    } else {
      rgb = pal.skyHorizon;
    }
    ctx.fillStyle = bridge.rgba(rgb, 1);
    ctx.fillRect(0, y, vw, 1);
  }
}

/**
 * Handcrafted faceted alpine/volcanic peak (Shin-Hanga / Firewatch style):
 * crisp sunlit left slope, shaded right slope, subtle ridge facets & high snow-mist ribs
 */
function drawFacetedPeak(ctx, apexX, apexY, baseY, leftSpan, rightSpan, litRgb, shadeRgb, snowRgb, bridge, seed) {
  const topY = Math.round(apexY);
  const botY = Math.round(baseY);
  const h = Math.max(1, botY - topY);

  for (let y = topY; y <= botY; y++) {
    const t = (y - topY) / h;
    // Subtle jagged natural rock silhouette (seeded harmonic, NOT smooth sine wave)
    const jagL = (hash1(seed + Math.floor(y * 0.25)) - 0.5) * 3.5 * t;
    const jagR = (hash1(seed + 71 + Math.floor(y * 0.25)) - 0.5) * 3.5 * t;
    const lx = Math.round(apexX - Math.pow(t, 0.92) * leftSpan + jagL);
    const rx = Math.round(apexX + Math.pow(t, 0.94) * rightSpan + jagR);

    // Wavy central spine dividing sunlit vs shadow face
    const spineShift = Math.sin(t * 5.2 + seed) * (leftSpan * 0.08) * t + (t * 0.10 * rightSpan);
    const spineX = Math.round(apexX + spineShift);

    if (spineX > lx) {
      ctx.fillStyle = bridge.rgba(litRgb, 1);
      ctx.fillRect(lx, y, spineX - lx, 1);
    }
    if (rx >= spineX) {
      ctx.fillStyle = bridge.rgba(shadeRgb, 1);
      ctx.fillRect(spineX, y, rx - spineX + 1, 1);
    }

    // Crisp sunlit snow/mist highlight along upper 42% of the lit face
    if (snowRgb && t < 0.44) {
      const snowW = Math.max(1, Math.round((spineX - lx) * (1 - t / 0.46) * 0.68));
      const ribOff = Math.round(Math.sin(t * 9 + seed) * 2);
      ctx.fillStyle = bridge.rgba(snowRgb, 0.46 * (1 - t / 0.48));
      ctx.fillRect(Math.max(lx, spineX - snowW + ribOff), y, snowW, 1);
    }
  }
}

/**
 * Horizontal soft valley mist band separating mountain planes
 */
function drawMistBand(ctx, vw, centerY, thickness, maxAlpha, pal) {
  const half = Math.max(2, Math.round(thickness / 2));
  for (let dy = -half; dy <= half; dy++) {
    const t = 1 - Math.abs(dy) / (half + 1);
    const a = t * t * maxAlpha;
    if (a > 0.01) {
      ctx.fillStyle = pal.bridge.rgba(pal.mistRgb, a);
      ctx.fillRect(0, Math.round(centerY + dy), vw, 1);
    }
  }
}

/**
 * Organic asymmetric pine/cypress silhouette (clustered natural foliage, zero MS-Paint triangles)
 */
function drawOrganicPine(ctx, bx, baseY, height, baseRgb, rimRgb, bridge, seed) {
  const cx = Math.round(bx);
  const gy = Math.round(baseY);
  const h = Math.max(8, Math.round(height));

  // Slender trunk base
  ctx.fillStyle = bridge.rgba(baseRgb, 1);
  ctx.fillRect(cx, gy - Math.max(2, Math.round(h * 0.2)), 2, Math.max(2, Math.round(h * 0.22)));

  // Irregular organic bough scanlines from tip to base
  for (let dy = 0; dy < h; dy++) {
    const t = dy / h; // 0 = crown tip, 1 = bottom bough
    const tierWave = 0.68 + 0.32 * Math.abs(Math.sin(t * Math.PI * (3.2 + hash1(seed) * 1.4)));
    const halfW = Math.max(0, Math.round(t * (h * 0.28) * tierWave));
    const lean = Math.round((hash1(seed + Math.floor(dy * 0.35)) - 0.5) * 1.6);
    const y = gy - h + dy;
    ctx.fillStyle = bridge.rgba(baseRgb, 1);
    ctx.fillRect(cx - halfW + lean, y, halfW * 2 + 1, 1);
    if (rimRgb && halfW >= 2 && dy % 2 === 0) {
      ctx.fillStyle = bridge.rgba(rimRgb, 0.52);
      ctx.fillRect(cx - halfW + lean, y, Math.max(1, Math.floor(halfW * 0.55)), 1);
    }
  }
}

/**
 * Organic clustered hillside forest ridge
 */
function drawForestRidge(ctx, vw, baseY, minH, maxH, spacing, baseRgb, rimRgb, pal, seed) {
  // Ground hillside contour first
  for (let x = 0; x < vw; x++) {
    const contour = Math.round(
      Math.sin(x * 0.018 + seed) * 7 + Math.cos(x * 0.041 + seed * 1.7) * 4
    );
    ctx.fillStyle = pal.bridge.rgba(baseRgb, 1);
    ctx.fillRect(x, Math.round(baseY + contour), 1, Math.max(1, ctx.canvas.height - (baseY + contour)));
  }

  // Irregularly spaced varied organic pines riding the ridge
  let x = -4;
  let idx = 0;
  while (x < vw + 6) {
    const r1 = hash1(seed * 13 + idx * 7.3);
    const r2 = hash1(seed * 29 + idx * 11.1);
    const contour = Math.round(
      Math.sin(x * 0.018 + seed) * 7 + Math.cos(x * 0.041 + seed * 1.7) * 4
    );
    const th = minH + r1 * (maxH - minH);
    drawOrganicPine(ctx, x, baseY + contour + 3, th, baseRgb, rimRgb, pal.bridge, seed + idx * 5);
    x += Math.round(spacing * (0.58 + r2 * 0.85));
    idx++;
  }
}

/**
 * Minimalist slender clocktower (clean architectural woodblock silhouette)
 */
function drawClockTower(ctx, x, groundY, w, h, pal) {
  const { bridge } = pal;
  const rx = Math.round(x);
  const gy = Math.round(groundY);
  const bodyTop = gy - h;
  const spireH = Math.round(w * 1.15);

  // Shaded stone shaft
  px(ctx, rx, bodyTop, w, h, bridge.rgba(pal.wallLit, 1));
  px(ctx, rx + Math.round(w * 0.62), bodyTop, Math.ceil(w * 0.38), h, bridge.rgba(pal.wallShade, 1));
  // Horizontal cornice band
  px(ctx, rx - 1, bodyTop, w + 2, 2, bridge.rgba(pal.roofLine, 0.85));

  // Steep pitched woodblock spire
  for (let r = 0; r < spireH; r++) {
    const t = r / spireH;
    const halfW = Math.max(0, Math.round((w * 0.62) * (1 - t)));
    px(ctx, rx + Math.floor(w / 2) - halfW, bodyTop - r, halfW * 2 + 1, 1, bridge.rgba(pal.roofMain, 1));
  }
  // Tiny finial
  px(ctx, rx + Math.floor(w / 2), bodyTop - spireH - 3, 1, 4, bridge.rgba(pal.roofLine, 0.85));

  // Clock dial
  const dialX = rx + Math.floor(w * 0.34);
  const dialY = bodyTop + Math.min(10, Math.floor(h * 0.22));
  const dialColor = pal.isLight ? bridge.rgba(pal.celCore, 0.88) : bridge.rgba(pal.winGlow, 0.88);
  if (!pal.isLight) {
    drawSteppedCircle(ctx, dialX, dialY, 5, bridge.rgba(pal.winHalo, 0.22));
  }
  drawSteppedCircle(ctx, dialX, dialY, 3, dialColor);
  // Minute & hour hands (2px)
  px(ctx, dialX, dialY - 2, 1, 2, bridge.rgba(pal.roofLine, 0.85));
  px(ctx, dialX, dialY, 2, 1, bridge.rgba(pal.roofLine, 0.85));

  // Small lower slit windows
  const winCol = pal.isLight ? bridge.rgba(pal.winDay, 0.72) : bridge.rgba(pal.winGlow, 0.82);
  px(ctx, dialX - 1, bodyTop + Math.floor(h * 0.50), 2, 4, winCol);
  px(ctx, dialX - 1, bodyTop + Math.floor(h * 0.70), 2, 4, winCol);
}

/**
 * Refined minimalist hillside house / UMKM coffee-house silhouette
 */
function drawArtisanHouse(ctx, x, groundY, w, h, opts, pal) {
  const { bridge } = pal;
  const rx = Math.round(x);
  const gy = Math.round(groundY);
  const wallTop = gy - h;
  const roofH = opts.roofH || Math.max(6, Math.round(w * 0.28));

  // Chimney
  if (opts.chimney) {
    px(ctx, rx + w - 7, wallTop - roofH - 3, 3, 7, bridge.rgba(pal.stoneShade, 1));
  }

  // Main facade + right side shade
  px(ctx, rx, wallTop, w, h, bridge.rgba(pal.wallLit, 1));
  const shadeW = Math.max(4, Math.round(w * 0.32));
  px(ctx, rx + w - shadeW, wallTop, shadeW, h, bridge.rgba(pal.wallShade, 1));

  // Pitched gabled roof with clean eave overhang
  const roofRgb = opts.altRoof ? pal.roofAlt : pal.roofMain;
  for (let r = 0; r < roofH; r++) {
    const inset = Math.floor((r / roofH) * (w * 0.42));
    px(
      ctx,
      rx - 2 + inset,
      wallTop - r,
      Math.max(2, w + 4 - inset * 2),
      1,
      bridge.rgba(r === 0 ? pal.roofLine : roofRgb, 1)
    );
  }

  // Fine architectural mullioned windows (warm subtle glow at night)
  const winCol = pal.isLight ? bridge.rgba(pal.winDay, 0.72) : bridge.rgba(pal.winGlow, 0.86);
  const cols = w >= 30 ? 3 : 2;
  const rows = h >= 20 ? 2 : 1;
  const startX = rx + 4;
  const stepX = Math.max(6, Math.floor((w - shadeW - 5) / cols));

  for (let row = 0; row < rows; row++) {
    const wy = wallTop + 4 + row * 8;
    if (wy + 4 >= gy - 2) continue;
    for (let col = 0; col < cols; col++) {
      const wx = startX + col * stepX;
      if (wx + 3 >= rx + w - shadeW) continue;
      if (!pal.isLight && (row + col) % 2 === 0) {
        px(ctx, wx - 1, wy - 1, 5, 6, bridge.rgba(pal.winHalo, 0.22));
      }
      px(ctx, wx, wy, 3, 4, winCol);
    }
  }
}

/**
 * Graceful parabolic stone arch bridge + single warm bridge lantern + reflective river
 */
function drawBridgeAndRiver(ctx, vw, vh, riverTopY, pal) {
  const { bridge } = pal;
  const ry = Math.round(riverTopY);

  // Calm river gradient
  for (let y = ry; y < vh; y++) {
    const t = (y - ry) / Math.max(1, vh - ry);
    const rgb = bridge.mix(pal.riverTop, pal.riverBot, t);
    ctx.fillStyle = bridge.rgba(rgb, 1);
    ctx.fillRect(0, y, vw, 1);
  }

  // Stone embankment wall along the left riverbank
  const bankW = Math.round(vw * 0.44);
  px(ctx, 0, ry - 4, bankW, vh - (ry - 4), bridge.rgba(pal.stoneShade, 1));
  px(ctx, 0, ry - 5, bankW, 2, bridge.rgba(pal.stoneLit, 1));

  // Parabolic stone arch bridge spanning the right river channel
  const brStart = Math.max(bankW - 10, Math.round(vw * 0.36));
  const brEnd = vw + 2;
  const brW = brEnd - brStart;
  const deckY = ry + 6;
  const archSpan = Math.max(24, Math.round(brW * 0.64));
  const archCenterX = brStart + Math.round(brW * 0.54);
  const archRadiusX = archSpan / 2;
  const archHeight = 14;

  for (let x = brStart; x < brEnd; x++) {
    const dx = (x - archCenterX) / archRadiusX;
    // Gentle curved deck crest
    const deckOffset = Math.abs(dx) < 1.3 ? Math.round(Math.cos((dx / 1.3) * (Math.PI / 2)) * 3) : 0;
    const topDeck = deckY - deckOffset;
    // Parabolic arch underside cutout
    let bottomY = ry + 24;
    if (Math.abs(dx) < 1) {
      const archCurve = Math.sqrt(Math.max(0, 1 - dx * dx)) * archHeight;
      bottomY = Math.round(ry + 22 - archCurve);
    }
    const colH = Math.max(2, bottomY - topDeck);
    px(ctx, x, topDeck, 1, colH, bridge.rgba(pal.stoneShade, 1));
    px(ctx, x, topDeck, 1, 2, bridge.rgba(pal.stoneLit, 1));
    // Parapet handrail posts
    if ((x - brStart) % 9 === 0) {
      px(ctx, x, topDeck - 3, 1, 3, bridge.rgba(pal.stoneLit, 0.85));
    }
  }
  // Slender single bridge lantern post
  const lampX = brStart + Math.round(brW * 0.16);
  const lampY = deckY - 11;
  px(ctx, lampX, lampY, 1, 11, bridge.rgba(pal.roofLine, 0.90));
  px(ctx, lampX - 1, lampY - 1, 3, 2, bridge.rgba(pal.roofLine, 0.90));
  if (!pal.isLight) {
    drawSteppedCircle(ctx, lampX, lampY + 1, 6, bridge.rgba(pal.winHalo, 0.22));
    px(ctx, lampX, lampY + 1, 1, 2, bridge.rgba(pal.winGlow, 0.95));
  }
}

/**
 * Render static handcrafted Sidebar artwork ONCE into an offscreen pixel canvas
 */
function buildSidebarScene(vw, vh, pal) {
  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { bridge } = pal;
  const horizonY = Math.round(vh * 0.63);
  drawSkyGradient(ctx, vw, vh, horizonY, pal);

  // Minimalist Celestial Body tucked cleanly into open sky below menu buttons (~47% height)
  const celX = Math.round(vw * 0.72);
  const celY = Math.round(vh * 0.47);
  if (pal.isLight) {
    drawSteppedCircle(ctx, celX, celY, 20, bridge.rgba(pal.celHalo, 0.18));
    drawSteppedCircle(ctx, celX, celY, 13, bridge.rgba(pal.celHalo, 0.34));
    drawSteppedCircle(ctx, celX, celY, 8, bridge.rgba(pal.celCore, 0.92));
  } else {
    drawSteppedCircle(ctx, celX, celY, 19, bridge.rgba(pal.celHalo, 0.16));
    drawSteppedCircle(ctx, celX, celY, 12, bridge.rgba(pal.celHalo, 0.30));
    drawSteppedCircle(ctx, celX, celY, 8, bridge.rgba(pal.celCore, 0.88));
    // Crisp crescent cutout
    drawSteppedCircle(ctx, celX + 3, celY - 2, 7, bridge.rgba(pal.moonCut, 1));
  }

  // Far faceted alpine/volcanic mountain range (twin peaks)
  drawFacetedPeak(
    ctx,
    vw * 0.48,
    vh * 0.51,
    vh * 0.76,
    vw * 0.62,
    vw * 0.66,
    pal.mtnFarLit,
    pal.mtnFarShade,
    pal.mtnSnow,
    bridge,
    11
  );
  drawFacetedPeak(
    ctx,
    vw * 0.84,
    vh * 0.56,
    vh * 0.76,
    vw * 0.42,
    vw * 0.42,
    pal.mtnMidLit,
    pal.mtnMidShade,
    pal.mtnSnow,
    bridge,
    27
  );
  drawFacetedPeak(
    ctx,
    vw * 0.14,
    vh * 0.58,
    vh * 0.76,
    vw * 0.36,
    vw * 0.46,
    pal.mtnMidLit,
    pal.mtnMidShade,
    null,
    bridge,
    43
  );

  // Soft valley mist separating mountains from pine forests
  drawMistBand(ctx, vw, vh * 0.68, 22, pal.isLight ? 0.48 : 0.24, pal);

  // Two layered organic pine forest ridges
  drawForestRidge(ctx, vw, vh * 0.70, 14, 28, 9, pal.forestBack, pal.forestRim, pal, 5);
  drawMistBand(ctx, vw, vh * 0.74, 14, pal.isLight ? 0.30 : 0.16, pal);
  drawForestRidge(ctx, vw, vh * 0.75, 16, 32, 11, pal.forestMid, pal.forestRim, pal, 19);

  // Calm village terrace & reflective river basin (positioned cleanly above footer card)
  const villageY = Math.round(vh * 0.818);
  drawBridgeAndRiver(ctx, vw, vh, villageY + 3, pal);

  // Minimalist hillside village cluster + slender clocktower on left/center
  drawClockTower(ctx, Math.round(vw * 0.25), villageY - 2, 16, 46, pal);
  drawArtisanHouse(ctx, Math.round(vw * 0.03), villageY, 34, 24, { roofH: 10, chimney: true }, pal);
  drawArtisanHouse(ctx, Math.round(vw * 0.35), villageY - 3, 28, 19, { roofH: 8, altRoof: true }, pal);
  if (vw >= 210) {
    drawArtisanHouse(ctx, Math.round(vw * 0.54), villageY - 6, 24, 15, { roofH: 7 }, pal);
  }
  // Subtle framing foreground cypress trees at far left & far right edges
  drawOrganicPine(ctx, 6, villageY + 12, 34, pal.forestFront, pal.forestRim, bridge, 91);
  drawOrganicPine(ctx, vw - 7, villageY + 10, 28, pal.forestFront, pal.forestRim, bridge, 107);

  // Soft bottom editorial fade so sidebar-footer rests cleanly without harsh edges
  const fadeStart = Math.round(vh * 0.86);
  for (let y = fadeStart; y < vh; y++) {
    const t = (y - fadeStart) / Math.max(1, vh - fadeStart);
    ctx.fillStyle = bridge.rgba(pal.bg, t * t * (pal.isLight ? 0.56 : 0.52));
    ctx.fillRect(0, y, vw, 1);
  }

  return canvas;
}

/**
 * Render static handcrafted panoramic Topbar artwork ONCE into an offscreen pixel canvas
 */
function buildTopbarScene(vw, vh, pal) {
  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { bridge } = pal;
  drawSkyGradient(ctx, vw, vh, vh * 0.85, pal);

  // Minimalist distant mountain range spanning left-to-right quietly along the lower half
  const peakCount = Math.max(3, Math.round(vw / 240));
  for (let i = 0; i < peakCount; i++) {
    const pxCenter = ((i + 0.45) / peakCount) * vw + (hash1(i * 19) - 0.5) * 40;
    const peakTop = vh * (0.40 + hash1(i * 31) * 0.16);
    const span = Math.max(70, vw / (peakCount * 1.15));
    drawFacetedPeak(
      ctx,
      pxCenter,
      peakTop,
      vh + 2,
      span,
      span * 1.1,
      pal.mtnFarLit,
      pal.mtnFarShade,
      pal.mtnSnow,
      bridge,
      60 + i * 17
    );
  }

  // Whisper-soft horizon mist
  drawMistBand(ctx, vw, vh * 0.72, 14, pal.isLight ? 0.44 : 0.24, pal);

  // Organic pine treeline hugging the bottom 28% from left edge to right edge
  drawForestRidge(ctx, vw, vh * 0.82, 8, 18, 12, pal.forestBack, pal.forestRim, pal, 73);

  // Sparse minimalist village rooftops + a single slender distant clocktower spire near center-right
  const spireX = Math.round(vw * 0.58);
  if (vw >= 320) {
    drawClockTower(ctx, spireX, vh + 2, 10, Math.min(26, Math.round(vh * 0.44)), pal);
    drawArtisanHouse(ctx, spireX - 24, vh + 2, 20, 12, { roofH: 5 }, pal);
    drawArtisanHouse(ctx, spireX + 14, vh + 2, 18, 11, { roofH: 5, altRoof: true }, pal);
  }

  // Gentle top-down & left/right editorial paper veil so header text & controls remain 100% crisp
  for (let x = 0; x < vw; x++) {
    const nx = x / Math.max(1, vw - 1);
    // Keep left title zone & right action zone calmer, let center panoramic gap breathe
    const edgeVeil =
      nx < 0.38
        ? 0.55 * (1 - nx / 0.38) + 0.22
        : nx > 0.72
          ? 0.52 * ((nx - 0.72) / 0.28) + 0.22
          : 0.16;
    ctx.fillStyle = bridge.rgba(pal.bg, pal.isLight ? edgeVeil : edgeVeil * 0.85);
    ctx.fillRect(x, 0, 1, vh);
  }

  return canvas;
}

/* ==================== SMOOTH FULL-LIFECYCLE DYNAMIC ACTORS ==================== */

function drawBird(ctx, x, y, wingPhase, alpha, pal) {
  if (alpha <= 0.02) return;
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillStyle = pal.bridge.rgba(pal.birdRgb, alpha);
  ctx.fillRect(rx, ry, 2, 1);
  if (Math.sin(wingPhase) >= 0) {
    ctx.fillRect(rx - 2, ry - 1, 2, 1);
    ctx.fillRect(rx + 2, ry - 1, 2, 1);
  } else {
    ctx.fillRect(rx - 2, ry + 1, 2, 1);
    ctx.fillRect(rx + 2, ry + 1, 2, 1);
  }
}

function drawBirdFlock(ctx, vw, baseY, pal, phase, speed, cycleLen, count) {
  const localT = (phase % cycleLen) / cycleLen;
  const leadX = -22 + localT * (vw + 56);
  const edgeFade = Math.min(1, Math.min(leadX + 18, vw + 32 - leadX) / 20);
  if (edgeFade <= 0.02) return;

  for (let b = 0; b < count; b++) {
    const offsetX = -b * 10 - (b % 2) * 4;
    const offsetY = (b === 0 ? 0 : b % 2 === 1 ? -4 : 5) + Math.sin(phase * 1.4 + b * 1.1) * 1.8;
    const bx = leadX + offsetX;
    const by = baseY + offsetY;
    if (bx < -8 || bx > vw + 8) continue;
    drawBird(ctx, bx, by, phase * (speed + 0.4) + b * 1.3, 0.42 * edgeFade, pal);
  }
}

function drawWoodblockCloud(ctx, vw, y, width, pal, phase, speed, offset) {
  const span = vw + width + 40;
  const x = ((phase * speed + offset) % span) - width - 20;
  const cx = x + width / 2;
  const edgeFade = Math.min(1, Math.min(cx + 12, vw + 12 - cx) / 28);
  if (edgeFade <= 0.02) return;
  const a = (pal.isLight ? 0.34 : 0.10) * edgeFade;
  px(ctx, x, y, width, 2, pal.bridge.rgba(pal.cloudRgb, a));
  px(ctx, x + Math.round(width * 0.16), y - 2, Math.round(width * 0.66), 2, pal.bridge.rgba(pal.cloudRgb, a * 0.85));
  px(ctx, x + Math.round(width * 0.30), y - 4, Math.round(width * 0.36), 2, pal.bridge.rgba(pal.cloudRgb, a * 0.65));
}

/**
 * Complete-arc shooting star: full edge-to-edge flight (4% -> 96%), tapered luminous tail,
 * sparkling head, smooth entry fade-in and atmospheric burnout (never vanishes mid-air!)
 */
function drawShootingStar(ctx, vw, minY, maxY, pal, phase, cycleLen, duration, seedOffset) {
  const cycleIdx = Math.floor((phase + seedOffset) / cycleLen);
  const cycleTime = (phase + seedOffset) % cycleLen;
  if (cycleTime > duration) return;

  const p = cycleTime / duration;
  const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const t = p * 0.62 + ease * 0.38;

  let envelope = 1;
  if (p < 0.16) envelope = p / 0.16;
  else if (p > 0.72) envelope = (1 - p) / 0.28;
  envelope = Math.max(0, Math.min(1, envelope));
  if (envelope <= 0.02) return;

  const rightToLeft = cycleIdx % 3 === 2;
  const startX = rightToLeft ? vw * 0.96 : vw * 0.04;
  const endX = rightToLeft ? vw * 0.04 : vw * 0.96;
  const spanY = Math.max(10, maxY - minY);
  const startY = minY + ((cycleIdx * 19) % Math.max(4, Math.floor(spanY * 0.32)));
  const endY = Math.min(maxY, startY + Math.max(12, spanY * 0.74));

  const headX = startX + (endX - startX) * t;
  const headY = startY + (endY - startY) * t;
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  const tailLen = Math.min(34, Math.max(16, Math.round(vw * 0.15))) * (0.45 + 0.55 * envelope);
  const steps = Math.max(12, Math.round(tailLen));
  for (let s = steps; s >= 1; s--) {
    const frac = 1 - s / (steps + 1);
    const tx = headX - ux * s;
    const ty = headY - uy * s;
    const segAlpha = envelope * frac * frac * 0.68;
    if (segAlpha > 0.03) {
      px(ctx, tx, ty, 1, 1, pal.bridge.rgba(s < 5 ? pal.starRgb : pal.starCoolRgb, segAlpha));
    }
  }

  px(ctx, headX, headY, 2, 2, pal.bridge.rgba(pal.starRgb, 0.90 * envelope));
  if (envelope > 0.5) {
    const glintA = (envelope - 0.5) * 0.85;
    px(ctx, headX, headY - 2, 1, 5, pal.bridge.rgba(pal.starRgb, glintA * 0.7));
    px(ctx, headX - 2, headY, 5, 1, pal.bridge.rgba(pal.starRgb, glintA * 0.7));
  }
}

function drawTwinklingStars(ctx, vw, minY, maxY, pal, phase, count) {
  const spanY = Math.max(12, maxY - minY);
  for (let i = 0; i < count; i++) {
    const sx = Math.round(hash1(i * 19.3 + 5.1) * Math.max(12, vw - 12)) + 6;
    const sy = Math.round(minY + hash1(i * 43.7 + 17.9) * spanY);
    const wave = 0.5 + 0.5 * Math.sin(phase * (1.0 + (i % 4) * 0.32) + i * 2.3);
    const alpha = 0.12 + wave * 0.56;
    px(ctx, sx, sy, 1, 1, pal.bridge.rgba(i % 3 === 0 ? pal.starRgb : pal.starCoolRgb, alpha));
    if (i % 5 === 0 && wave > 0.80) {
      const sp = (wave - 0.80) * 1.4;
      px(ctx, sx - 1, sy, 3, 1, pal.bridge.rgba(pal.starCoolRgb, sp));
      px(ctx, sx, sy - 1, 1, 3, pal.bridge.rgba(pal.starCoolRgb, sp));
    }
  }
}

function drawFireflies(ctx, vw, minY, maxY, pal, phase, count) {
  const spanX = Math.max(20, vw - 20);
  const spanY = Math.max(14, maxY - minY);
  for (let i = 0; i < count; i++) {
    const homeX = 10 + hash1(i * 23.1 + 3.7) * spanX;
    const homeY = minY + hash1(i * 53.9 + 11.3) * spanY;
    const ampX = Math.min(18, spanX * 0.13);
    const ampY = Math.min(9, spanY * 0.16);
    const x = homeX + Math.sin(phase * (0.42 + (i % 3) * 0.14) + i * 2.1) * ampX;
    const y = homeY + Math.cos(phase * (0.55 + (i % 4) * 0.11) + i * 1.7) * ampY;

    const glow = 0.5 + 0.5 * Math.sin(phase * (1.3 + (i % 3) * 0.35) + i * 2.7);
    const coreA = 0.14 + glow * 0.70;
    const haloA = glow * 0.24;

    if (glow > 0.45) {
      px(ctx, x - 3, y - 3, 7, 7, pal.bridge.rgba(pal.fireflyHaloRgb, haloA * 0.38));
    }
    if (glow > 0.22) {
      px(ctx, x - 1, y - 1, 3, 3, pal.bridge.rgba(pal.fireflyHaloRgb, haloA));
    }
    px(ctx, x, y, 2, 2, pal.bridge.rgba(pal.fireflyCoreRgb, coreA));
  }
}

function drawChimneySmoke(ctx, originX, originY, pal, phase) {
  for (let s = 0; s < 5; s++) {
    const life = (phase * 0.20 + s * 0.20) % 1;
    const alpha = Math.sin(life * Math.PI) * (pal.isLight ? 0.34 : 0.18);
    if (alpha <= 0.02) continue;
    const sx = originX + Math.sin(phase * 0.9 + s * 1.5 + life * 3.5) * 3.2 + life * 8;
    const sy = originY - life * 24;
    const size = life > 0.5 ? 3 : 2;
    px(ctx, sx, sy, size, 2, pal.bridge.rgba(pal.smokeRgb, alpha));
  }
}

function drawRiverRipples(ctx, vw, vh, riverY, pal, phase) {
  for (let g = 0; g < 6; g++) {
    const wave = 0.5 + 0.5 * Math.sin(phase * (1.6 + g * 0.25) + g * 2.2);
    const alpha = Math.pow(wave, 2.0) * (pal.isLight ? 0.44 : 0.48);
    if (alpha <= 0.03) continue;
    const drift = Math.sin(phase * 0.9 + g) * 3;
    const gx = Math.round(vw * 0.54 + ((g * 17) % Math.max(16, Math.floor(vw * 0.34))) + drift);
    const gy = Math.round(riverY + 12 + g * 4.5);
    if (gy < vh - 4) {
      px(ctx, gx, gy, 5 + (g % 3) * 2, 1, pal.bridge.rgba(pal.waterGlintRgb, alpha));
    }
  }
}

function drawDynamicSidebarLayer(ctx, vw, vh, pal, phase) {
  const villageY = Math.round(vh * 0.818);
  if (pal.isLight) {
    drawWoodblockCloud(ctx, vw, Math.round(vh * 0.42), 44, pal, phase, 2.4, 20);
    drawWoodblockCloud(ctx, vw, Math.round(vh * 0.49), 34, pal, phase, 1.6, 140);
    drawBirdFlock(ctx, vw, Math.round(vh * 0.45), pal, phase, 3.8, 17, 3);
    drawChimneySmoke(ctx, Math.round(vw * 0.03) + 28, villageY - 34, pal, phase);
    drawRiverRipples(ctx, vw, vh, villageY + 3, pal, phase);
  } else {
    drawTwinklingStars(ctx, vw, Math.round(vh * 0.36), Math.round(vh * 0.54), pal, phase, 18);
    drawShootingStar(ctx, vw, Math.round(vh * 0.38), Math.round(vh * 0.54), pal, phase, 8.5, 1.55, 7.0);
    drawChimneySmoke(ctx, Math.round(vw * 0.03) + 28, villageY - 34, pal, phase);
    drawRiverRipples(ctx, vw, vh, villageY + 3, pal, phase);
    drawFireflies(ctx, vw, Math.round(vh * 0.60), Math.round(vh * 0.86), pal, phase, 9);
  }
}

function drawDynamicTopbarLayer(ctx, vw, vh, pal, phase) {
  if (pal.isLight) {
    drawWoodblockCloud(ctx, vw, Math.max(10, Math.round(vh * 0.28)), 52, pal, phase, 2.2, 80);
    drawBirdFlock(ctx, vw, Math.max(8, Math.round(vh * 0.28)), pal, phase + 4, 3.6, 22, 3);
  } else {
    drawTwinklingStars(ctx, vw, 4, Math.max(14, Math.floor(vh * 0.54)), pal, phase, Math.max(12, Math.floor(vw / 56)));
    drawShootingStar(ctx, vw, 5, Math.max(14, Math.floor(vh * 0.62)), pal, phase, 9.5, 1.75, 5.8);
    drawFireflies(ctx, vw, Math.floor(vh * 0.50), Math.max(18, vh - 4), pal, phase, Math.max(5, Math.floor(vw / 120)));
  }
}

function createStageRenderer(isCompactBar, staticBuilder, dynamicDrawer) {
  let cachedScene = null;
  let cachedKey = '';
  let vCanvas = null;
  let vCtx = null;

  return function renderStage(canvas, cssW, cssH, rawPhysW, rawPhysH, dpr, pal, themeKey, phase) {
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

    // Crisp Hi-Bit integer scaling: 1 CSS px art-pixel (2x2 physical on Retina mobile, 1x1 crisp on 1x desktop)
    const actualDpr = Math.max(1, physW / cssW);
    const intScale = Math.max(1, Math.round(actualDpr));
    const vw = Math.max(64, Math.ceil(physW / intScale));
    const vh = Math.max(36, Math.ceil(physH / intScale));
    const key = `${vw}x${vh}:${themeKey}:${isCompactBar ? 't' : 's'}`;

    if (cachedKey !== key || !cachedScene) {
      cachedScene = staticBuilder(vw, vh, pal);
      cachedKey = key;
    }

    if (!vCanvas || vCanvas.width !== vw || vCanvas.height !== vh) {
      vCanvas = document.createElement('canvas');
      vCanvas.width = vw;
      vCanvas.height = vh;
      vCtx = vCanvas.getContext('2d');
    }
    if (!vCtx) return;

    vCtx.clearRect(0, 0, vw, vh);
    vCtx.drawImage(cachedScene, 0, 0);
    dynamicDrawer(vCtx, vw, vh, pal, phase);

    ctx.clearRect(0, 0, physW, physH);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(vCanvas, 0, 0, vw, vh, 0, 0, vw * intScale, vh * intScale);
  };
}

export function initAtmosphere() {
  const mainCanvas = document.getElementById('atmo-canvas');
  const grainHost = document.getElementById('paper-grain');
  const sidebarEl = document.getElementById('sidebar');
  const sidebarCanvas = document.getElementById('sidebar-pixel-canvas');
  const topbarEl = document.querySelector('.topbar');
  const topbarCanvas = document.getElementById('topbar-pixel-canvas');

  const bridge = createColorBridge();
  let palette = buildWoodblockPalette(bridge);
  let themeKey = document.documentElement.dataset.theme || 'light';
  const stageSizes = new Map();
  let phase = 0;
  let rafId = null;
  let lastTs = 0;
  let accTime = 0;

  const renderSidebarStage = createStageRenderer(false, buildSidebarScene, drawDynamicSidebarLayer);
  const renderTopbarStage = createStageRenderer(true, buildTopbarScene, drawDynamicTopbarLayer);

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

  function renderNavWorlds() {
    const dpr = window.devicePixelRatio || 1;

    if (sidebarEl && sidebarCanvas) {
      const cssW = sidebarEl.clientWidth;
      const cssH = sidebarEl.clientHeight;
      const sz = stageSizes.get(sidebarEl) || {
        w: Math.round(cssW * dpr),
        h: Math.round(cssH * dpr),
      };
      renderSidebarStage(sidebarCanvas, cssW, cssH, sz.w, sz.h, dpr, palette, themeKey, phase);
    }

    if (topbarEl && topbarCanvas) {
      const cssW = topbarEl.clientWidth;
      const cssH = topbarEl.clientHeight;
      const sz = stageSizes.get(topbarEl) || {
        w: Math.round(cssW * dpr),
        h: Math.round(cssH * dpr),
      };
      renderTopbarStage(topbarCanvas, cssW, cssH, sz.w, sz.h, dpr, palette, themeKey, phase);
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
    if (accTime >= 0.04) {
      phase += accTime;
      accTime = 0;
      renderNavWorlds();
    }
    rafId = requestAnimationFrame(tick);
  }

  function startOrFreeze() {
    stopLoop();
    renderMainBackdrop();
    renderNavWorlds();
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
    renderNavWorlds();
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
      renderNavWorlds();
    }, 100);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const onVisibility = () => {
    if (document.hidden) stopLoop();
    else startOrFreeze();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const observer = new MutationObserver(() => {
    themeKey = document.documentElement.dataset.theme || 'light';
    palette = buildWoodblockPalette(bridge);
    renderMainBackdrop();
    renderNavWorlds();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
  const onThemeMedia = () => {
    themeKey = `${document.documentElement.dataset.theme || 'auto'}-${mediaDark.matches}`;
    palette = buildWoodblockPalette(bridge);
    renderMainBackdrop();
    renderNavWorlds();
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
