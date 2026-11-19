// Renders the cover: sunset sky, graded photo panels, halftone title block,
// Anton lettering with a neon script subtitle, heat meter, badge and grain.
// Everything is drawn on a 2D canvas, so the same code paints the live
// preview and the exported PNG at full size.
import { GRADES, applyGrade } from './grades.js';
import { SIZES, layoutGeometry } from './layouts.js';

/** Small deterministic PRNG so the grain looks the same every render. */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Paints the Vice City sunset sky: gradient, low sun, soft cloud bands. */
export function paintSunsetSky(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#160a2e');
  sky.addColorStop(0.38, '#5b1e6e');
  sky.addColorStop(0.62, '#c22e7a');
  sky.addColorStop(0.82, '#ff7a3d');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const sunX = W * 0.72;
  const sunY = H * 0.42;
  const sunR = Math.min(W, H) * 0.17;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, 'rgba(255, 214, 130, 0.85)');
  glow.addColorStop(0.4, 'rgba(255, 120, 90, 0.28)');
  glow.addColorStop(1, 'rgba(255, 120, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  for (let i = 0; i < 5; i++) {
    const y = H * (0.1 + i * 0.07);
    ctx.beginPath();
    ctx.ellipse(W * (0.2 + 0.13 * i), y, W * 0.22, H * 0.012, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Cover-fits an image into a rect, with zoom and pan offsets in fractions.
 * The fit is grown to cover the pan, so shifting never opens a gap. */
export function drawPhotoCover(ctx, img, x, y, w, h, zoom, ox, oy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const px = ox || 0;
  const py = oy || 0;
  const needW = w * (1 + 2 * Math.abs(px));
  const needH = h * (1 + 2 * Math.abs(py));
  const base = Math.max(needW / iw, needH / ih);
  const s = base * (zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  const dx = x + (w - dw) / 2 + px * w;
  const dy = y + (h - dh) / 2 + py * h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Draws one photo slot, graded, framed and inked like poster art. */
export function drawPhotoPanel(ctx, slot, W, H, img, panel, grade, polaroid) {
  const x = slot.x * W;
  const y = slot.y * H;
  const w = slot.w * W;
  const h = slot.h * H;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rot = ((slot.rot || 0) * Math.PI) / 180;
  const border = polaroid ? Math.max(6, w * 0.035) : Math.max(3, w * 0.008);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = w * 0.05;
  ctx.shadowOffsetY = h * 0.02;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  if (img) {
    const temp = document.createElement('canvas');
    temp.width = Math.max(2, Math.round(w));
    temp.height = Math.max(2, Math.round(h));
    const tctx = temp.getContext('2d');
    drawPhotoCover(tctx, img, 0, 0, temp.width, temp.height, panel.zoom, panel.ox, panel.oy);
    const data = tctx.getImageData(0, 0, temp.width, temp.height);
    applyGrade(data, grade);
    tctx.putImageData(data, 0, 0);
    ctx.drawImage(temp, -w / 2, -h / 2, w, h);
  } else {
    const ph = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    ph.addColorStop(0, '#3a1c5e');
    ph.addColorStop(1, '#c22e7a');
    ctx.fillStyle = ph;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `bold ${Math.round(h * 0.09)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', 0, 0);
  }
  // Ink bands: two diagonal neon stripes across the panel's top corner.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 45, 149, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.32);
  ctx.lineTo(-w * 0.28, -h / 2);
  ctx.lineTo(-w * 0.16, -h / 2);
  ctx.lineTo(-w / 2, -h * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.1);
  ctx.lineTo(-w * 0.06, -h / 2);
  ctx.lineTo(-w * 0.02, -h / 2);
  ctx.lineTo(-w / 2, -h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** Halftone dots fading upward across the title band. */
export function paintHalftone(ctx, x, y, w, h) {
  const gap = Math.max(7, w * 0.014);
  for (let row = 0; row * gap < h; row++) {
    const fade = 1 - row * gap / h;
    const r = Math.max(0.6, gap * 0.32 * fade + gap * 0.05);
    for (let col = 0; col * gap < w; col++) {
      const px = x + col * gap + (row % 2 ? gap / 2 : 0);
      const py = y + row * gap;
      ctx.fillStyle = row % 3 === 0 ? 'rgba(255, 122, 61, 0.5)' : 'rgba(255, 45, 149, 0.42)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Fits Anton text to a width, then paints it with gradient fill and outline. */
export function paintTitleText(ctx, text, x, y, maxW, maxH, style) {
  let size = maxH;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let fill;
  if (style === 'white') {
    fill = '#ffffff';
  } else if (style === 'neon') {
    fill = ctx.createLinearGradient(x, y - size, x, y);
    fill.addColorStop(0, '#7df9ff');
    fill.addColorStop(0.5, '#ff2d95');
    fill.addColorStop(1, '#ffd166');
  } else {
    fill = ctx.createLinearGradient(x, y - size, x, y);
    fill.addColorStop(0, '#ffe9a8');
    fill.addColorStop(0.55, '#ff7a3d');
    fill.addColorStop(1, '#ff2d95');
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a2e';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  return size;
}

/** The title block: halftone band, big title, neon script subtitle, heat stars. */
export function paintTitleBlock(ctx, zone, W, H, state) {
  const x = zone.x * W;
  const y = zone.y * H;
  const w = zone.w * W;
  const h = zone.h * H;
  ctx.fillStyle = 'rgba(18, 6, 34, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ff2d95';
  ctx.fillRect(x, y, w, Math.max(3, h * 0.03));
  paintHalftone(ctx, x + w * 0.02, y + h * 0.06, w * 0.4, h * 0.5);
  const title = (state.title || 'NEON COAST').trim().toUpperCase() || 'NEON COAST';
  // The badge ribbon sits top-right, so a long title must stop short of it.
  const titleMaxW = state.badge ? w * 0.64 : w * 0.94;
  const titleSize = paintTitleText(ctx, title, x + w * 0.03, y + h * 0.52, titleMaxW, h * 0.46, state.titleStyle);
  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.font = `${Math.round(titleSize * 0.42)}px Pacifico, cursive`;
    ctx.textAlign = 'left';
    ctx.shadowColor = '#ff2d95';
    ctx.shadowBlur = titleSize * 0.25;
    ctx.fillStyle = '#ffd7ef';
    ctx.fillText(sub, x + w * 0.035, y + h * 0.82);
    ctx.shadowBlur = 0;
  }
  // Heat meter: five stars, filled per state.heat.
  const starR = h * 0.085;
  const sx = x + w * 0.72;
  const sy = y + h * 0.8;
  for (let i = 0; i < 5; i++) {
    const cx = sx + i * starR * 2.4;
    ctx.fillStyle = i < (state.heat || 5) ? '#ffd166' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 === 0 ? starR : starR * 0.45;
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Badge ribbon, top right of the band.
  if (state.badge) {
    const bw = w * 0.3;
    const bh = h * 0.2;
    const bx = x + w - bw - w * 0.02;
    const by = y + h * 0.08;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(-0.03);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = '#160a2e';
    ctx.textAlign = 'center';
    const badgeText = 'EST. 2026 ★ SUNSET DISTRICT';
    let bf = Math.round(bh * 0.42);
    ctx.font = `bold ${bf}px sans-serif`;
    while (ctx.measureText(badgeText).width > bw * 0.9 && bf > 8) {
      bf -= 1;
      ctx.font = `bold ${bf}px sans-serif`;
    }
    ctx.fillText(badgeText, 0, bf * 0.36);
    ctx.restore();
  }
}

/** Speckled film grain, seeded from the title so it is stable per cover. */
export function paintGrain(ctx, W, H, seedText) {
  const rand = mulberry32(hashString(seedText || 'grain'));
  ctx.save();
  for (let i = 0; i < 2600; i++) {
    const px = rand() * W;
    const py = rand() * H;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(px, py, Math.max(1, W / 900), Math.max(1, W / 900));
  }
  ctx.restore();
}

/** Soft dark corners so the poster reads as one image. */
export function paintVignette(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(10, 4, 24, 0)');
  v.addColorStop(1, 'rgba(10, 4, 24, 0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Renders the whole cover onto `canvas`. By default at the export size for
 * state.size; `override` ({w, h}) paints a smaller preview of the same cover.
 * `photos` is the array of loaded images; each panel names one by index.
 */
export function renderCover(canvas, state, photos, override) {
  const size = override ?? SIZES[state.size] ?? SIZES.square;
  const W = size.w;
  const H = size.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const geo = layoutGeometry(state.layout, W, H);
  paintSunsetSky(ctx, W, H);
  if (geo.backdrop) {
    const back = photos[state.panels[0]?.photo ?? 0];
    if (back) {
      const temp = document.createElement('canvas');
      temp.width = W;
      temp.height = H;
      const tctx = temp.getContext('2d');
      drawPhotoCover(tctx, back, 0, 0, W, H, 1, 0, 0);
      const data = tctx.getImageData(0, 0, W, H);
      applyGrade(data, grade);
      tctx.putImageData(data, 0, 0);
      ctx.drawImage(temp, 0, 0);
    }
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, 'rgba(22, 10, 46, 0.15)');
    wash.addColorStop(1, 'rgba(22, 10, 46, 0.55)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
  }
  geo.slots.forEach((slot, i) => {
    const panel = state.panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo] ?? null;
    drawPhotoPanel(ctx, slot, W, H, img, panel, grade, geo.backdrop);
  });
  paintTitleBlock(ctx, geo.title, W, H, state);
  if (state.grain !== false) paintGrain(ctx, W, H, state.title);
  paintVignette(ctx, W, H);
  if (state.frame !== false) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeRect(W * 0.006, H * 0.006, W * 0.988, H * 0.988);
  }
  return { W, H };
}

/** Which panel slot (if any) a point on the cover hits, for click-to-select. */
export function hitTestSlot(px, py, W, H, layoutId) {
  const geo = layoutGeometry(layoutId, W, H);
  for (let i = geo.slots.length - 1; i >= 0; i--) {
    const s = geo.slots[i];
    if (px >= s.x * W && px <= (s.x + s.w) * W && py >= s.y * H && py <= (s.y + s.h) * H) return i;
  }
  return -1;
}
