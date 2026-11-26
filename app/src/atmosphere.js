/**
 * Modern HD Pixel-Art Living Town & Botanical Conservatory Engine (Tier 1-2 Canvas 2D)
 * - Fine-grain crisp integer-scaled pixel art (modern indie style, zero blocky 90s noise)
 * - Light Mode (Pagi Cerah): Multi-band sunlit sky, pulsing pixel Sun, drifting fluffy clouds,
 *   flapping birds, layered green hills, cozy UMKM houses & trees, rising chimney smoke, drifting leaves
 * - Dark Mode (Malam Tenang): Matte starry night sky, Crescent Moon, twinkling stars, shooting star,
 *   warm lit house windows & streetlamps, lush pine silhouettes, bobbing fireflies (kunang-kunang)
 * - 100% token-locked via 1x1 sRGB Color Bridge; ResizeObserver physical-pixel snapping;
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

function buildModernPixelPalette(bridge) {
  const bg = bridge.resolveRgb('--bg-base');
  const surface = bridge.resolveRgb('--bg-surface');
  const inset = bridge.resolveRgb('--bg-inset');
  const accent = bridge.resolveRgb('--accent-primary');
  const sec = bridge.resolveRgb('--accent-secondary');
  const text = bridge.resolveRgb('--text-primary');
  const muted = bridge.resolveRgb('--text-muted');
  const err = bridge.resolveRgb('--status-err');
  const isLight = relativeLuminance(bg.r, bg.g, bg.b) > 0.179;

  // Multi-band smooth stepped sky (10 subtle shades -> modern indie HD pixel gradient)
  const skyBands = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    if (isLight) {
      const topTone = bridge.mix(bg, accent, 0.22);
      const lowTone = bridge.mix(surface, sec, 0.24);
      skyBands.push(bridge.rgba(bridge.mix(topTone, lowTone, t), 1));
    } else {
      const topTone = bridge.mix(inset, accent, 0.05);
      const lowTone = bridge.mix(bg, accent, 0.22);
      skyBands.push(bridge.rgba(bridge.mix(topTone, lowTone, t), 1));
    }
  }

  return {
    isLight,
    bg,
    accent,
    skyBands,
    sunCore: bridge.rgba(isLight ? bridge.mix(surface, sec, 0.16) : bridge.mix(text, sec, 0.25), 1),
    sunRim: bridge.rgba(isLight ? bridge.mix(sec, surface, 0.14) : bridge.mix(sec, text, 0.42), 1),
    sunRing1: bridge.rgba(isLight ? bridge.mix(sec, surface, 0.36) : bridge.mix(sec, bg, 0.42), isLight ? 0.68 : 0.44),
    sunRing2: bridge.rgba(isLight ? bridge.mix(sec, bg, 0.30) : bridge.mix(sec, bg, 0.66), isLight ? 0.32 : 0.22),
    cloudLight: bridge.rgba(isLight ? surface : bridge.mix(bg, accent, 0.30), isLight ? 0.94 : 0.42),
    cloudShade: bridge.rgba(isLight ? bridge.mix(bg, accent, 0.22) : bridge.mix(bg, inset, 0.48), isLight ? 0.72 : 0.36),
    starBright: bridge.rgba(bridge.mix(text, sec, 0.22), 0.94),
    starMid: bridge.rgba(bridge.mix(text, muted, 0.35), 0.72),
    starDim: bridge.rgba(muted, 0.48),

    hillFar: bridge.rgba(bridge.mix(accent, bg, isLight ? 0.56 : 0.72), 1),
    hillMid: bridge.rgba(bridge.mix(accent, bg, isLight ? 0.36 : 0.58), 1),
    hillNear: bridge.rgba(isLight ? bridge.mix(accent, text, 0.14) : bridge.mix(accent, bg, 0.42), isLight ? 0.88 : 0.86),
    groundTop: bridge.rgba(isLight ? bridge.mix(accent, text, 0.24) : bridge.mix(accent, inset, 0.56), 1),
    groundDeep: bridge.rgba(isLight ? bridge.mix(text, accent, 0.42) : bridge.mix(inset, accent, 0.16), 1),
    pathStone: bridge.rgba(isLight ? bridge.mix(inset, sec, 0.22) : bridge.mix(bg, muted, 0.22), 0.85),

    // Cozy Nusantara town houses & UMKM shopfronts
    cityFar: bridge.rgba(bridge.mix(muted, bg, isLight ? 0.46 : 0.62), isLight ? 0.74 : 0.78),
    cityFarHi: bridge.rgba(bridge.mix(muted, bg, isLight ? 0.34 : 0.50), isLight ? 0.70 : 0.72),
    wallLight: bridge.rgba(isLight ? surface : bridge.mix(inset, muted, 0.26), 1),
    wallShade: bridge.rgba(isLight ? inset : bridge.mix(inset, bg, 0.50), 1),
    roofMain: bridge.rgba(isLight ? bridge.mix(err, sec, 0.48) : bridge.mix(err, inset, 0.46), 1),
    roofDark: bridge.rgba(isLight ? bridge.mix(err, text, 0.35) : bridge.mix(inset, err, 0.24), 1),
    roofAlt: bridge.rgba(isLight ? bridge.mix(accent, text, 0.28) : bridge.mix(accent, inset, 0.55), 1),
    wood: bridge.rgba(isLight ? bridge.mix(sec, text, 0.32) : bridge.mix(sec, inset, 0.58), 1),

    windowDay: bridge.rgba(bridge.mix(accent, bg, 0.45), 0.86),
    windowGlow: bridge.rgba(bridge.mix(sec, surface, isLight ? 0.22 : 0.46), 1),
    windowHalo: bridge.rgba(sec, isLight ? 0.18 : 0.32),

    leafLight: bridge.rgba(isLight ? bridge.mix(accent, sec, 0.28) : bridge.mix(accent, bg, 0.22), 1),
    leafMid: bridge.rgba(isLight ? accent : bridge.mix(accent, bg, 0.42), 1),
    leafDark: bridge.rgba(isLight ? bridge.mix(accent, text, 0.36) : bridge.mix(accent, inset, 0.64), 1),
    flowerA: bridge.rgba(bridge.mix(sec, surface, 0.32), 0.95),
    flowerB: bridge.rgba(bridge.mix(err, surface, 0.42), 0.90),
    smoke: bridge.rgba(isLight ? surface : muted, isLight ? 0.70 : 0.38),
    bird: bridge.rgba(bridge.mix(text, accent, 0.30), 0.76),
    fireflyCore: bridge.rgba(bridge.mix(sec, text, 0.38), 0.98),
    fireflyMid: bridge.rgba(sec, 0.46),
    fireflyHalo: bridge.rgba(sec, 0.20),
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

function drawFluffyCloud(ctx, cx, cy, scale, pal) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const s = Math.max(1, Math.round(scale));
  // Bottom soft shadow band
  px(ctx, x + 2 * s, y + 3 * s, 14 * s, 2 * s, pal.cloudShade);
  // Puffy pixel cloud domes
  px(ctx, x + 1 * s, y + 2 * s, 16 * s, 2 * s, pal.cloudLight);
  px(ctx, x + 3 * s, y + 1 * s, 11 * s, 2 * s, pal.cloudLight);
  px(ctx, x + 5 * s, y, 6 * s, 2 * s, pal.cloudLight);
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

function drawLayeredPine(ctx, bx, groundY, h, pal) {
  const x = Math.round(bx);
  const gy = Math.round(groundY);
  // Trunk
  px(ctx, x - 1, gy - 4, 2, 4, pal.wood);
  // Layered evergreen tiers (modern multi-tone pixel shading)
  const tiers = Math.max(3, Math.floor(h / 4));
  for (let i = 0; i < tiers; i++) {
    const ty = gy - 4 - i * 3;
    const halfW = Math.max(1, Math.round((tiers - i) * 1.6));
    px(ctx, x - halfW, ty - 2, halfW * 2 + 1, 3, pal.leafDark);
    px(ctx, x - halfW, ty - 2, Math.max(1, Math.floor(halfW * 1.3)), 2, pal.leafMid);
    if (halfW >= 2) {
      px(ctx, x - halfW + 1, ty - 2, Math.max(1, halfW - 1), 1, pal.leafLight);
    }
  }
  px(ctx, x, gy - 4 - tiers * 3, 1, 2, pal.leafLight);
}

function drawBroadTree(ctx, bx, groundY, r, pal) {
  const x = Math.round(bx);
  const gy = Math.round(groundY);
  px(ctx, x - 1, gy - r - 2, 3, r + 2, pal.wood);
  drawSteppedCircle(ctx, x, gy - r - 3, r, pal.leafDark);
  drawSteppedCircle(ctx, x - 1, gy - r - 4, Math.max(2, r - 1), pal.leafMid);
  drawSteppedCircle(ctx, x - 2, gy - r - 5, Math.max(1, r - 3), pal.leafLight);
}

function drawCozyHouse(ctx, x, groundY, w, h, opts, pal, phase) {
  const rx = Math.round(x);
  const gy = Math.round(groundY);
  const roofH = opts.roofH || 7;
  const wallTop = gy - h;

  // Chimney + animated gentle smoke puffs
  if (opts.chimney) {
    const chX = rx + w - 5;
    px(ctx, chX, wallTop - roofH - 3, 3, 5, pal.roofDark);
    for (let s = 0; s < 3; s++) {
      const life = ((phase * 0.55 + s * 0.33) % 1);
      const sx = chX + 1 + Math.round(Math.sin(phase * 1.4 + s * 2) * 1.5 + life * 3);
      const sy = wallTop - roofH - 4 - Math.round(life * 10);
      const sz = life > 0.6 ? 2 : 1;
      px(ctx, sx, sy, sz, sz, pal.smoke);
    }
  }

  // Main wall + side shading
  px(ctx, rx, wallTop, w, h, pal.wallLight);
  px(ctx, rx + w - Math.max(3, Math.floor(w * 0.28)), wallTop, Math.max(3, Math.floor(w * 0.28)), h, pal.wallShade);

  // Slanted pitched roof with stepped eaves
  const roofColor = opts.altRoof ? pal.roofAlt : pal.roofMain;
  for (let r = 0; r < roofH; r++) {
    const inset = Math.floor((r / roofH) * (w * 0.35));
    px(ctx, rx - 2 + inset, wallTop - r, w + 4 - inset * 2, 1, r === 0 ? pal.roofDark : roofColor);
  }
  // Roof highlight ridge
  px(ctx, rx + Math.floor(w * 0.25), wallTop - roofH + 1, Math.max(4, Math.floor(w * 0.5)), 1, pal.roofDark);

  // Café awning if UMKM shop
  if (opts.shop) {
    for (let ax = 0; ax < w - 2; ax += 2) {
      px(ctx, rx + 1 + ax, gy - 8, 1, 2, ax % 4 === 0 ? pal.roofMain : pal.wallLight);
    }
    px(ctx, rx + 1, gy - 6, w - 2, 1, pal.roofDark);
  }

  // Door
  px(ctx, rx + 3, gy - 6, 4, 6, pal.wood);
  px(ctx, rx + 6, gy - 3, 1, 1, pal.windowGlow);

  // Windows (warm lit glow at night!)
  const winColor = pal.isLight ? pal.windowDay : pal.windowGlow;
  const winCount = w >= 22 ? 2 : 1;
  for (let i = 0; i < winCount; i++) {
    const wx = rx + 9 + i * 7;
    const wy = gy - Math.min(h - 3, 7);
    if (wx + 4 < rx + w) {
      if (!pal.isLight) {
        px(ctx, wx - 1, wy - 1, 6, 5, pal.windowHalo);
      }
      px(ctx, wx, wy, 4, 3, winColor);
      px(ctx, wx + 2, wy, 1, 3, pal.wood);
    }
  }
}

function drawStreetLamp(ctx, x, groundY, pal) {
  const rx = Math.round(x);
  const gy = Math.round(groundY);
  px(ctx, rx, gy - 11, 1, 11, pal.roofDark);
  px(ctx, rx - 1, gy - 12, 3, 2, pal.roofDark);
  if (!pal.isLight) {
    drawSteppedCircle(ctx, rx, gy - 10, 5, pal.windowHalo);
    px(ctx, rx, gy - 11, 1, 2, pal.windowGlow);
  } else {
    px(ctx, rx, gy - 11, 1, 1, pal.wallLight);
  }
}

function drawDistantCitySkyline(ctx, vw, horizonY, pal, isTopbar) {
  let x = 2;
  let idx = 0;
  while (x < vw - 4) {
    const bw = 6 + ((idx * 5) % 9);
    const bh = isTopbar ? 5 + ((idx * 7) % 8) : 9 + ((idx * 11) % 14);
    const top = Math.round(horizonY - bh);
    px(ctx, x, top, bw, bh + 4, pal.cityFar);
    // Tiny lit distant city windows at night
    if (!pal.isLight && bw >= 7) {
      for (let wy = top + 2; wy < horizonY - 2; wy += 3) {
        for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
          if ((wx + wy + idx) % 3 !== 0) {
            px(ctx, wx, wy, 1, 1, pal.windowGlow);
          }
        }
      }
    }
    x += bw + 2 + (idx % 3);
    idx++;
  }
}

function drawSkyLayer(ctx, vw, vh, skyH, pal, phase, isTopbar) {
  // Smooth 10-band modern pixel sky
  const bandH = Math.ceil(skyH / pal.skyBands.length);
  for (let i = 0; i < pal.skyBands.length; i++) {
    px(ctx, 0, i * bandH, vw, bandH + 1, pal.skyBands[i]);
  }
  px(ctx, 0, skyH, vw, vh - skyH, pal.skyBands[pal.skyBands.length - 1]);

  // Celestial body placed inside the UNOBSTRUCTED scenic window!
  // - Topbar: right in the open center gap between title pill and action toolbar (~55%)
  // - Sidebar: right in the open valley sky below the nav menu buttons (~44% height, right-center)
  const celX = isTopbar ? Math.round(vw * 0.55) : Math.round(vw * 0.76);
  const celY = isTopbar ? Math.max(8, Math.round(vh * 0.30)) : Math.max(24, Math.round(vh * 0.45));

  if (pal.isLight) {
    const pulse = Math.round(Math.sin(phase * 1.3) * 0.85);
    const rOuter = (isTopbar ? 9 : 13) + pulse;
    const rMid = isTopbar ? 6 : 8;
    const rCore = isTopbar ? 4 : 6;
    drawSteppedCircle(ctx, celX, celY, rOuter, pal.sunRing2);
    drawSteppedCircle(ctx, celX, celY, rMid, pal.sunRing1);
    drawSteppedCircle(ctx, celX, celY, rCore, pal.sunRim);
    drawSteppedCircle(ctx, celX - 1, celY - 1, Math.max(2, rCore - 2), pal.sunCore);

    // Subtle rotating pixel sunbeam glints
    const rayOff = Math.floor(phase * 1.2) % 2;
    px(ctx, celX - rOuter - 2 + rayOff, celY, 2, 1, pal.sunRing1);
    px(ctx, celX + rOuter + 1 - rayOff, celY, 2, 1, pal.sunRing1);
    px(ctx, celX, celY - rOuter - 2 + rayOff, 1, 2, pal.sunRing1);
    px(ctx, celX, celY + rOuter + 1 - rayOff, 1, 2, pal.sunRing1);

    // Drifting fluffy pixel clouds placed in visible sky area
    const c1 = ((phase * 3.8 + vw * 0.15) % (vw + 34)) - 18;
    const c2 = ((phase * 2.2 + vw * 0.58) % (vw + 30)) - 16;
    const c3 = ((phase * 2.9 + vw * 0.82) % (vw + 26)) - 14;
    if (isTopbar) {
      drawFluffyCloud(ctx, c1, 3, 1, pal);
      drawFluffyCloud(ctx, c2, 7, 1, pal);
    } else {
      drawFluffyCloud(ctx, c1, Math.round(vh * 0.40), 1, pal);
      drawFluffyCloud(ctx, c2, Math.round(vh * 0.46), 1, pal);
      drawFluffyCloud(ctx, c3, Math.round(vh * 0.50), 1, pal);
    }

    // Flying pixel birds
    const birdCount = isTopbar ? 5 : 3;
    for (let b = 0; b < birdCount; b++) {
      const bx = ((phase * (7 + b * 1.4) + b * 62) % (vw + 20)) - 10;
      const baseY = isTopbar ? 5 + (b % 3) * 4 : Math.round(vh * 0.42) + b * 7;
      const by = baseY + Math.round(Math.sin(phase * 2.5 + b) * 1.5);
      const wingUp = Math.floor(phase * 4.5 + b) % 2 === 0;
      drawBird(ctx, bx, by, wingUp, pal);
    }
  } else {
    // Glowing Crescent Moon + stepped halo in visible sky
    drawSteppedCircle(ctx, celX, celY, isTopbar ? 8 : 12, pal.sunRing2);
    drawSteppedCircle(ctx, celX, celY, isTopbar ? 5 : 7, pal.sunRing1);
    drawSteppedCircle(ctx, celX, celY, isTopbar ? 4 : 5, pal.sunCore);
    // Crisp crescent cutout matching sky band at celY
    const bandIdx = Math.min(pal.skyBands.length - 1, Math.max(0, Math.floor(celY / Math.max(1, bandH))));
    drawSteppedCircle(ctx, celX + 2, celY - 1, isTopbar ? 3 : 4, pal.skyBands[bandIdx]);

    // Twinkling stars concentrated across visible sky
    const starMinY = isTopbar ? 2 : Math.round(vh * 0.36);
    const starSpanY = Math.max(8, Math.floor(skyH * 0.90) - starMinY);
    const starCount = isTopbar ? Math.max(24, Math.floor(vw / 14)) : 32;
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 43 + 7) % Math.max(12, vw - 4);
      const sy = starMinY + ((i * 23 + 3) % starSpanY);
      const phaseStep = (Math.floor(phase * 2.0) + i) % 6;
      if (phaseStep === 0 && i % 4 === 0) {
        // 4-point cross-sparkle star
        px(ctx, sx, sy, 1, 1, pal.starBright);
        px(ctx, sx - 1, sy, 1, 1, pal.starDim);
        px(ctx, sx + 1, sy, 1, 1, pal.starDim);
        px(ctx, sx, sy - 1, 1, 1, pal.starDim);
        px(ctx, sx, sy + 1, 1, 1, pal.starDim);
      } else {
        px(ctx, sx, sy, 1, 1, phaseStep <= 1 ? pal.starBright : phaseStep <= 3 ? pal.starMid : pal.starDim);
      }
    }

    // Periodic gentle shooting star gliding through visible sky
    const shootCycle = phase % 6.5;
    if (shootCycle < 0.85) {
      const p = shootCycle / 0.85;
      const sx = Math.round(vw * (isTopbar ? 0.36 : 0.14) + p * (vw * 0.34));
      const sy = Math.round((isTopbar ? 4 : vh * 0.40) + p * Math.min(18, skyH * 0.28));
      px(ctx, sx, sy, 2, 1, pal.starBright);
      px(ctx, sx - 2, sy - 1, 2, 1, pal.starMid);
      px(ctx, sx - 4, sy - 2, 2, 1, pal.starDim);
    }
  }
}

function drawDynamicParticles(ctx, vw, minY, maxY, pal, phase, count) {
  const spanY = Math.max(10, maxY - minY);
  for (let i = 0; i < count; i++) {
    if (pal.isLight) {
      // Gentle drifting sunlit leaves / pollen
      const x = ((i * 37 + phase * (4 + (i % 3))) % (vw + 6)) - 3;
      const y = minY + ((i * 29 + phase * (2 + (i % 2))) % spanY);
      px(ctx, x, y, i % 3 === 0 ? 2 : 1, 1, i % 2 === 0 ? pal.leafLight : pal.sunCore);
    } else {
      // Bobbing fireflies (kunang-kunang) with 2-tier pulsing warm pixel glow
      const x = ((i * 41 + Math.sin(phase * 0.9 + i * 1.7) * 10 + vw) % Math.max(8, vw - 6)) + 3;
      const y = minY + ((i * 31 + Math.cos(phase * 1.1 + i * 1.3) * 6 + spanY) % spanY);
      const glowVal = Math.sin(phase * 2.4 + i * 1.9);
      if (glowVal > 0.15) {
        px(ctx, x - 2, y - 2, 5, 5, pal.fireflyHalo);
        px(ctx, x - 1, y - 1, 3, 3, pal.fireflyMid);
        px(ctx, x, y, 1, 1, pal.fireflyCore);
      } else if (glowVal > -0.35) {
        px(ctx, x - 1, y - 1, 3, 3, pal.fireflyMid);
        px(ctx, x, y, 1, 1, pal.fireflyCore);
      } else {
        px(ctx, x, y, 1, 1, pal.fireflyMid);
      }
    }
  }
}

function drawSidebarWorld(vCtx, vw, vh, pal, phase) {
  const skyH = Math.floor(vh * 0.58);
  drawSkyLayer(vCtx, vw, vh, skyH, pal, phase, false);

  // Far green mountain ridge
  const hill1Y = Math.floor(vh * 0.57);
  for (let x = 0; x < vw; x++) {
    const h = Math.round(Math.sin(x * 0.065) * 7 + Math.cos(x * 0.13) * 4);
    px(vCtx, x, hill1Y - h, 1, vh - (hill1Y - h), pal.hillFar);
  }

  // Distant pixel town skyline with rooftop spires
  const cityY = Math.floor(vh * 0.66);
  drawDistantCitySkyline(vCtx, vw, cityY, pal, false);

  // Mid lush rolling hill
  const hill2Y = Math.floor(vh * 0.70);
  const hill2Curve = (x) => Math.round(Math.sin(x * 0.085 + 1.4) * 5 + Math.cos(x * 0.16) * 2);
  for (let x = 0; x < vw; x++) {
    const h = hill2Curve(x);
    px(vCtx, x, hill2Y - h, 1, vh - (hill2Y - h), pal.hillMid);
  }

  // Organic varied forest silhouette along the actual rolling hillside contour
  const treeSpots = [8, 19, 34, 46, 63, 76, 94, 108, 121];
  for (let i = 0; i < treeSpots.length; i++) {
    const tx = treeSpots[i];
    if (tx >= vw - 4) break;
    const ty = hill2Y - hill2Curve(tx) + 3 + (i % 3);
    if (i % 3 === 1) {
      drawBroadTree(vCtx, tx, ty, 4 + (i % 2), pal);
    } else {
      drawLayeredPine(vCtx, tx, ty, 11 + ((i * 5) % 8), pal);
    }
  }

  // Foreground village terrace right above the bottom footer card
  const groundY = Math.max(Math.floor(vh * 0.83), vh - 68);
  px(vCtx, 0, groundY, vw, 4, pal.groundTop);
  px(vCtx, 0, groundY + 4, vw, vh - groundY, pal.groundDeep);
  // Subtle cobblestone & wildflower pixel accents along the village lane
  for (let sx = 4; sx < vw - 4; sx += 7) {
    px(vCtx, sx, groundY + 2, 3, 1, pal.pathStone);
    if (sx % 14 === 4) px(vCtx, sx + 1, groundY - 1, 1, 1, pal.flowerA);
    else if (sx % 21 === 11) px(vCtx, sx, groundY - 1, 1, 1, pal.flowerB);
  }

  // Cozy UMKM café house + neighboring home + streetlamp + lush trees
  drawBroadTree(vCtx, 11, groundY, 7, pal);
  drawCozyHouse(vCtx, 21, groundY, 27, 15, { roofH: 7, shop: true, chimney: true }, pal, phase);
  drawStreetLamp(vCtx, 53, groundY, pal);
  if (vw >= 86) {
    drawCozyHouse(vCtx, 60, groundY, 23, 13, { roofH: 6, altRoof: true, chimney: false }, pal, phase);
    drawLayeredPine(vCtx, Math.min(vw - 10, 96), groundY, 18, pal);
    if (vw >= 112) {
      drawBroadTree(vCtx, vw - 10, groundY, 6, pal);
    }
  }

  // Dynamic ambient particles (sunlit leaves in day / glowing fireflies at night)
  drawDynamicParticles(vCtx, vw, Math.floor(vh * 0.40), groundY + 2, pal, phase, 18);
}

function drawTopbarWorld(vCtx, vw, vh, pal, phase) {
  const skyH = Math.floor(vh * 0.72);
  drawSkyLayer(vCtx, vw, vh, skyH, pal, phase, true);

  // Continuous distant hills left-to-right
  const hill1Y = Math.floor(vh * 0.75);
  for (let x = 0; x < vw; x++) {
    const h = Math.round(Math.sin(x * 0.045) * 4 + Math.cos(x * 0.11) * 2);
    px(vCtx, x, hill1Y - h, 1, vh - (hill1Y - h), pal.hillFar);
  }

  // Panoramic distant city silhouettes across full width
  drawDistantCitySkyline(vCtx, vw, vh - 4, pal, true);

  // Foreground green ground strip left-to-right
  const groundY = vh - 3;
  px(vCtx, 0, groundY, vw, 3, pal.groundTop);

  // Panoramic sequence of cozy pixel houses, UMKM shops, streetlamps & trees left-to-right
  const spacing = 56;
  let idx = 0;
  for (let x = 8; x < vw - 16; x += spacing) {
    if (idx % 2 === 0) {
      drawCozyHouse(vCtx, x, groundY, 22, 11, { roofH: 5, shop: idx % 4 === 0, chimney: idx % 4 === 0 }, pal, phase);
      drawLayeredPine(vCtx, x + 28, groundY, 13, pal);
      drawStreetLamp(vCtx, x + 38, groundY, pal);
      drawBroadTree(vCtx, x + 46, groundY, 5, pal);
    } else {
      drawBroadTree(vCtx, x + 4, groundY, 5, pal);
      drawCozyHouse(vCtx, x + 13, groundY, 20, 10, { roofH: 5, altRoof: true }, pal, phase);
      drawLayeredPine(vCtx, x + 40, groundY, 12, pal);
    }
    idx++;
  }

  // Dynamic particles (sunlit leaves in day / fireflies at night)
  drawDynamicParticles(vCtx, vw, 4, groundY, pal, phase, Math.max(14, Math.floor(vw / 30)));
}

function blitModernPixelStage(canvas, cssW, cssH, rawPhysW, rawPhysH, dpr, isCompactBar, drawer) {
  if (!canvas || cssW <= 0 || cssH <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Guard against headless/emulated DPR mismatches between ResizeObserver & devicePixelRatio
  const minPhysW = Math.round(cssW * dpr);
  const minPhysH = Math.round(cssH * dpr);
  const physW = rawPhysW >= minPhysW * 0.9 ? rawPhysW : minPhysW;
  const physH = rawPhysH >= minPhysH * 0.9 ? rawPhysH : minPhysH;

  if (canvas.width !== physW || canvas.height !== physH) {
    canvas.width = physW;
    canvas.height = physH;
  }

  // Adaptive fine modern HD pixel scale:
  // - Compact mobile topbars (<68 CSS px): 1.0 CSS px per art pixel (crisp 2x2 Retina pixels, zero cropping)
  // - Desktop & tall sidebar/drawer: 2.0 CSS px per art pixel (consistent fine modern indie HD aesthetic)
  const actualDpr = Math.max(1, physW / cssW);
  const logicalPixelSize = isCompactBar && cssH < 68 ? 1.0 : 2.0;
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
  let palette = buildModernPixelPalette(bridge);
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
    grad.addColorStop(0, bridge.rgba(palette.accent, palette.isLight ? 0.06 : 0.09));
    grad.addColorStop(0.55, bridge.rgba(palette.accent, palette.isLight ? 0.02 : 0.03));
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
      blitModernPixelStage(sidebarCanvas, cssW, cssH, sz.w, sz.h, dpr, false, (vCtx, vw, vh) =>
        drawSidebarWorld(vCtx, vw, vh, palette, phase)
      );
    }

    if (topbarEl && topbarCanvas) {
      const cssW = topbarEl.clientWidth;
      const cssH = topbarEl.clientHeight;
      const sz = stageSizes.get(topbarEl) || {
        w: Math.round(cssW * dpr),
        h: Math.round(cssH * dpr),
      };
      blitModernPixelStage(topbarCanvas, cssW, cssH, sz.w, sz.h, dpr, true, (vCtx, vw, vh) =>
        drawTopbarWorld(vCtx, vw, vh, palette, phase)
      );
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Smooth ~20fps pixel-art animation cadence (authentic & battery-friendly)
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
    palette = buildModernPixelPalette(bridge);
    renderMainBackdrop();
    renderNavWorlds();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
  const onThemeMedia = () => {
    palette = buildModernPixelPalette(bridge);
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
