// Neon Coast Cover Studio: wires the editor — photos, panels, lettering,
// undo/redo and PNG export — onto the cover renderer in ./cover.js.
import { renderCover, hitTestSlot } from './cover.js';
import { LAYOUTS, SIZES, layoutGeometry } from './layouts.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const tray = document.getElementById('tray');

const MAX_PANELS = 9;

/** A fresh cover state; panels are per-slot photo, zoom and pan. */
export function defaultState() {
  return {
    size: 'square',
    layout: 'grid',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'golden hour getaway',
    titleStyle: 'sunset',
    heat: 5,
    badge: true,
    grain: true,
    frame: true,
    panels: Array.from({ length: MAX_PANELS }, (_, i) => ({ photo: i % 2, zoom: 1, ox: 0, oy: 0.1 })),
  };
}

export const state = defaultState();
let photos = []; // { img, name, kind } — samples first, then uploads
let selectedPanel = 0;
let selectedPhoto = 0;
let undoStack = [];
let redoStack = [];
let exportCanvas = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Serializes the undoable part of the state (photos live outside it). */
function snapshotState() {
  return JSON.stringify(state);
}

function restoreState(json) {
  const next = JSON.parse(json);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);
  syncControls();
  renderPreview();
}

/** Records the current state before a committed change, for undo. */
export function commitHistory() {
  undoStack.push(snapshotState());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshotState());
  restoreState(undoStack.pop());
  status.textContent = 'Undid that change.';
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshotState());
  restoreState(redoStack.pop());
  status.textContent = 'Redid that change.';
}

/** Preview pixel size for the current export size (max side 720). */
function previewSize() {
  const s = SIZES[state.size];
  const scale = 720 / Math.max(s.w, s.h);
  return { w: Math.round(s.w * scale), h: Math.round(s.h * scale) };
}

/** Repaints the preview canvas at preview resolution. */
export function renderPreview() {
  const size = previewSize();
  renderCover(canvas, state, photos.map((p) => p.img), size);
  highlightSelectedPanel();
}

/** Draws a dashed outline around the selected panel on the preview. */
function highlightSelectedPanel() {
  const ctx = canvas.getContext('2d');
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  const slot = geo.slots[selectedPanel];
  if (!slot) return;
  ctx.save();
  ctx.setLineDash([10, 6]);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(slot.x * canvas.width + 2, slot.y * canvas.height + 2, slot.w * canvas.width - 4, slot.h * canvas.height - 4);
  ctx.restore();
}

/** Rebuilds the photo tray thumbnails. */
function renderTray() {
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (i === selectedPhoto ? ' on' : '');
    b.title = p.name;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    const label = document.createElement('span');
    label.textContent = p.name;
    b.append(img, label);
    b.addEventListener('click', () => {
      selectedPhoto = i;
      commitHistory();
      state.panels[selectedPanel].photo = i;
      renderTray();
      renderPreview();
    });
    tray.append(b);
  });
}

/** Syncs every control to the current state (after undo/redo or a shot). */
function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').checked = state.badge;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('frame').checked = state.frame;
  document.getElementById('panelName').textContent = String(selectedPanel + 1);
  const p = state.panels[selectedPanel];
  document.getElementById('zoom').value = String(p.zoom);
  document.getElementById('zoomVal').textContent = `${p.zoom.toFixed(2).replace(/0$/, '')}×`;
  document.getElementById('panX').value = String(p.ox);
  document.getElementById('panY').value = String(p.oy);
  for (const [id, key, attr] of [
    ['sizeSeg', 'size', 'data-size'],
    ['layoutSeg', 'layout', 'data-layout'],
    ['gradeSeg', 'grade', 'data-grade'],
    ['titleStyleSeg', 'titleStyle', 'data-tstyle'],
    ['heatSeg', 'heat', 'data-heat'],
  ]) {
    document.getElementById(id).querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', String(state[key]) === b.getAttribute(attr));
    });
  }
  document.getElementById('layoutHint').textContent = (LAYOUTS[state.layout] ?? LAYOUTS.grid).hint;
}

/** Binds a segmented button group to a state key. */
function bindSeg(id, key, attr, after) {
  document.getElementById(id).querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      commitHistory();
      const v = b.getAttribute(attr);
      state[key] = key === 'heat' ? Number(v) : v;
      if (after) after();
      syncControls();
      renderPreview();
    });
  });
}

function selectPanel(i) {
  selectedPanel = i;
  selectedPhoto = state.panels[i].photo;
  syncControls();
  renderTray();
  renderPreview();
}

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width;
  const fy = (e.clientY - r.top) / r.height;
  const hit = hitTestSlot(fx * canvas.width, fy * canvas.height, canvas.width, canvas.height, state.layout);
  if (hit >= 0) selectPanel(hit);
});

/** Adds uploaded files as photos and assigns the first to the selected panel. */
async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ img, name: file.name.replace(/\.[^.]+$/, ''), kind: 'upload' });
      added++;
    } catch { /* skip unreadable files */ }
  }
  if (added) {
    selectedPhoto = photos.length - 1;
    state.panels[selectedPanel].photo = selectedPhoto;
    renderTray();
    renderPreview();
    status.textContent = `Added ${added} photo${added > 1 ? 's' : ''}.`;
  }
}

document.getElementById('photo').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  addFiles([...e.dataTransfer.files]);
});

document.getElementById('fillAll').addEventListener('click', () => {
  commitHistory();
  state.panels.forEach((p) => { p.photo = selectedPhoto; });
  renderPreview();
  status.textContent = 'Every panel now uses the selected photo.';
});

document.getElementById('shuffle').addEventListener('click', () => {
  if (!photos.length) return;
  commitHistory();
  state.panels.forEach((p) => { p.photo = Math.floor(Math.random() * photos.length); });
  renderPreview();
  status.textContent = 'Shuffled the panel photos.';
});

function bindText(id, key) {
  const el = document.getElementById(id);
  // Snapshot before the edit starts, so undo restores the previous text.
  el.addEventListener('focus', () => commitHistory());
  el.addEventListener('input', () => {
    state[key] = el.value;
    renderPreview();
  });
}
bindText('title', 'title');
bindText('subtitle', 'subtitle');

for (const [id, key] of [['badge', 'badge'], ['grain', 'grain'], ['frame', 'frame']]) {
  document.getElementById(id).addEventListener('change', (e) => {
    commitHistory();
    state[key] = e.target.checked;
    renderPreview();
  });
}

function bindSlider(id, key, live) {
  const el = document.getElementById(id);
  // Snapshot when the drag starts, so undo restores the previous value.
  el.addEventListener('pointerdown', () => commitHistory());
  el.addEventListener('keydown', () => commitHistory());
  el.addEventListener('input', () => {
    state.panels[selectedPanel][key] = Number(el.value);
    live();
    renderPreview();
  });
}
bindSlider('zoom', 'zoom', () => {
  document.getElementById('zoomVal').textContent = `${Number(document.getElementById('zoom').value).toFixed(2).replace(/0$/, '')}×`;
});
bindSlider('panX', 'ox', () => {});
bindSlider('panY', 'oy', () => {});

bindSeg('sizeSeg', 'size', 'data-size');
bindSeg('layoutSeg', 'layout', 'data-layout');
bindSeg('gradeSeg', 'grade', 'data-grade');
bindSeg('titleStyleSeg', 'titleStyle', 'data-tstyle');
bindSeg('heatSeg', 'heat', 'data-heat');

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);

/** Renders the full-size cover and downloads it as a PNG. */
export function exportPNG() {
  if (!exportCanvas) exportCanvas = document.createElement('canvas');
  const { W, H } = renderCover(exportCanvas, state, photos.map((p) => p.img));
  return new Promise((resolve) => {
    exportCanvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-cover-${W}x${H}.png`;
      a.click();
      status.textContent = `Saved neon-coast-cover-${W}x${H}.png (${Math.round(blob.size / 1024)} KiB).`;
      resolve({ W, H, bytes: blob.size });
    }, 'image/png');
  });
}
document.getElementById('export').addEventListener('click', exportPNG);

// Test hook: lets the screenshot script verify a full-size export.
window.__neonCoast = { exportPNG, state, photos: () => photos };

/** Boots the studio: fonts, sample photos, then the first preview. */
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* canvas falls back to sans-serif if a font fails */ }
  for (const name of ['boulevard', 'pier']) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      photos.push({ img, name, kind: 'sample' });
    } catch { /* a missing sample just leaves one fewer photo */ }
  }
  renderTray();
  syncControls();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      state, photos, selectPanel, renderPreview, renderTray, syncControls, loadImage,
    });
  } else {
    renderPreview();
  }
}
boot();
