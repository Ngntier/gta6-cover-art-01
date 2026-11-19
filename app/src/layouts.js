// Panel layouts for the cover. Every layout is a function of the cover size
// (W, H) and returns the slots that hold photos plus the title band. Slots are
// fractions of the cover so one layout works at every export size.
//   slot: { x, y, w, h, rot } in fractions, rot in degrees (tilted snapshots)
//   title: { x, y, w, h } the title block band, in fractions
//   backdrop: true when the layout paints a full-bleed photo behind the panels
export const LAYOUTS = {
  grid: {
    label: 'Panel Grid',
    hint: 'Four panels, classic poster grid',
    slots: 4,
    backdrop: false,
    build(W, H) {
      const g = 0.018;
      const top = 0.03;
      const artH = 0.66;
      // On a wide cover a 2x2 grid makes short, wide panels that crop portrait
      // photos to a band; a single row of four tall panels frames them instead.
      if (W > H * 1.3) {
        const cw = (1 - g * 5) / 4;
        const slots = [];
        for (let c = 0; c < 4; c++) {
          slots.push({ x: g + c * (cw + g), y: top, w: cw, h: artH, rot: 0 });
        }
        return { slots, title: { x: 0.03, y: 0.71, w: 0.94, h: 0.26 } };
      }
      const cw = (1 - g * 3) / 2;
      const ch = (artH - g) / 2;
      const slots = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          slots.push({ x: g + c * (cw + g), y: top + r * (ch + g), w: cw, h: ch, rot: 0 });
        }
      }
      return { slots, title: { x: 0.03, y: 0.71, w: 0.94, h: 0.26 } };
    },
  },
  hero: {
    label: 'Hero + Three',
    hint: 'One big hero shot, three supporting panels',
    slots: 4,
    backdrop: false,
    build(W, H) {
      const g = 0.018;
      const top = 0.03;
      const artH = 0.66;
      const heroW = 0.6;
      const sideW = 1 - heroW - g * 3;
      const sh = (artH - g * 2) / 3;
      const slots = [
        { x: g, y: top, w: heroW, h: artH, rot: 0 },
        { x: heroW + g * 2, y: top, w: sideW, h: sh, rot: 0 },
        { x: heroW + g * 2, y: top + sh + g, w: sideW, h: sh, rot: 0 },
        { x: heroW + g * 2, y: top + (sh + g) * 2, w: sideW, h: sh, rot: 0 },
      ];
      return { slots, title: { x: 0.03, y: 0.71, w: 0.94, h: 0.26 } };
    },
  },
  tilted: {
    label: 'Tilted Snapshots',
    hint: 'Polaroid-style snaps over a full-bleed photo',
    slots: 3,
    backdrop: true,
    build(W, H) {
      const slots = [
        { x: 0.05, y: 0.05, w: 0.42, h: 0.34, rot: -4 },
        { x: 0.5, y: 0.1, w: 0.44, h: 0.36, rot: 3.5 },
        { x: 0.24, y: 0.36, w: 0.5, h: 0.32, rot: -2 },
      ];
      return { slots, title: { x: 0.03, y: 0.72, w: 0.94, h: 0.25 } };
    },
  },
  bleed: {
    label: 'Full Bleed',
    hint: 'One photo edge to edge, title block on top',
    slots: 1,
    backdrop: false,
    build(W, H) {
      return {
        slots: [{ x: 0, y: 0, w: 1, h: 0.74, rot: 0 }],
        title: { x: 0.03, y: 0.7, w: 0.94, h: 0.27 },
      };
    },
  },
  nine: {
    label: 'Nine-Panel Mosaic',
    hint: 'Nine tiles, a contact-sheet poster',
    slots: 9,
    backdrop: false,
    build(W, H) {
      const g = 0.012;
      const top = 0.03;
      const artH = 0.66;
      const cw = (1 - g * 4) / 3;
      const ch = (artH - g * 2) / 3;
      const slots = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          slots.push({ x: g + c * (cw + g), y: top + r * (ch + g), w: cw, h: ch, rot: 0 });
        }
      }
      return { slots, title: { x: 0.03, y: 0.71, w: 0.94, h: 0.26 } };
    },
  },
};

/** The three export sizes, in pixels. */
export const SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  story: { label: 'Story · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

/** Returns the geometry for a layout id at a cover size. */
export function layoutGeometry(layoutId, W, H) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.grid;
  return layout.build(W, H);
}
