// Gradient-map colour grades for the cover engine. Each grade maps a photo's
// luminance through a sunset / neon ramp, then mixes the mapped colour back
// with the original so faces keep their detail. All math is plain canvas 2D.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    mix: 0.55,
    stops: [
      [0.0, [16, 8, 38]],
      [0.25, [74, 22, 84]],
      [0.5, [176, 48, 110]],
      [0.75, [255, 122, 64]],
      [1.0, [255, 226, 150]],
    ],
  },
  neon: {
    label: 'Neon Vice',
    mix: 0.6,
    stops: [
      [0.0, [6, 18, 38]],
      [0.3, [16, 84, 120]],
      [0.55, [196, 38, 150]],
      [0.8, [255, 92, 140]],
      [1.0, [190, 250, 255]],
    ],
  },
  dusk: {
    label: 'Palm Dusk',
    mix: 0.5,
    stops: [
      [0.0, [10, 12, 40]],
      [0.3, [52, 40, 110]],
      [0.6, [150, 70, 150]],
      [0.85, [255, 170, 110]],
      [1.0, [255, 240, 205]],
    ],
  },
  noir: {
    label: 'Mono Noir',
    mix: 0.7,
    stops: [
      [0.0, [8, 6, 10]],
      [0.35, [58, 50, 52]],
      [0.7, [168, 158, 150]],
      [1.0, [255, 244, 228]],
    ],
  },
  heat: {
    label: 'Heatwave',
    mix: 0.55,
    stops: [
      [0.0, [26, 4, 8]],
      [0.3, [120, 16, 30]],
      [0.6, [235, 92, 28]],
      [0.85, [255, 190, 60]],
      [1.0, [255, 252, 210]],
    ],
  },
};

/** Builds a 256-entry RGB lookup table from a grade's stops. */
export function buildGradeLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  return lut;
}

/**
 * Applies a grade in place to an ImageData: luminance -> gradient colour,
 * mixed back with the original pixel so the photo stays readable.
 */
export function applyGrade(imageData, grade) {
  const lut = buildGradeLut(grade);
  const d = imageData.data;
  const mix = grade.mix;
  const keep = 1 - mix;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const o = lum * 3;
    d[i] = Math.round(d[i] * keep + lut[o] * mix);
    d[i + 1] = Math.round(d[i + 1] * keep + lut[o + 1] * mix);
    d[i + 2] = Math.round(d[i + 2] * keep + lut[o + 2] * mix);
  }
  return imageData;
}
