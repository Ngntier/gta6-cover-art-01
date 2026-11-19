// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the studio with sample photos loaded. Query params pick
// the size, layout, grade, title, subtitle and sample photos.
// window.__shotReady is set once the scene is painted.
import { renderCover } from './cover.js';

function applyScene(query, api) {
  const { state } = api;
  if (query.get('size')) state.size = query.get('size');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('tstyle')) state.titleStyle = query.get('tstyle');
  if (query.get('heat')) state.heat = Number(query.get('heat'));
  const photoA = query.get('photo') ?? 'boulevard';
  const photoB = query.get('photo2') ?? 'pier';
  const a = api.photos.findIndex((p) => p.name === photoA);
  const b = api.photos.findIndex((p) => p.name === photoB);
  const oy = Number(query.get('oy') ?? 0.1);
  const oyA = Number(query.get('oyA') ?? oy);
  const oyB = Number(query.get('oyB') ?? oy);
  state.panels.forEach((p, i) => {
    p.photo = i % 2 === 0 ? Math.max(0, a) : Math.max(0, b);
    p.oy = i % 2 === 0 ? oyA : oyB;
  });
  api.syncControls();
  api.renderTray();
}

export async function runShot(shot, query, api) {
  const canvas = document.getElementById('cover');
  applyScene(query, api);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    renderCover(canvas, api.state, api.photos.map((p) => p.img));
  } else {
    api.selectPanel(Number(query.get('panel') ?? 0));
    api.renderPreview();
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
