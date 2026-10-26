// LoadingScreen.js — Pantalla de carga entre zonas (Crónica Celeste, etapa 9)
// Maqueta «Pantalla de carga» del sistema de diseño: cielo nocturno con constelaciones, logo pequeño,
// consejo de Paladill y barra con luna. Rellena #zone-transition-curtain (index.html) conservando los ids
// que usa ZoneTransitionManager (zone-loading-title / subtitle / badge / icon / hint) y la clase
// .zone-loading-container, para que ese gestor siga mostrando y ocultando la cortina exactamente igual.

import * as i18n from '../i18n/i18n.js';

const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a9 9 0 1 0 6 15.7A7.5 7.5 0 1 1 15 3z" fill="currentColor"/></svg>';

// Consejos sobre mecánicas reales del juego
const TIPS = [
  i18n.t('common.tip1'),
  i18n.t('common.tip2'),
  i18n.t('common.tip3'),
  i18n.t('common.tip4'),
  i18n.t('common.tip5'),
  i18n.t('common.tip6'),
  i18n.t('common.tip7')
];

function skySVG() {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const CONST = [
    [[90, 70], [150, 40], [215, 85], [270, 60], [320, 120]],
    [[640, 60], [700, 110], [760, 80], [800, 150], [745, 190], [700, 110]],
    [[430, 150], [470, 105], [520, 140], [560, 95]],
    [[860, 230], [905, 190], [950, 240], [915, 280]]];
  const spark = (x, y, r) => `M${x} ${y - r}C${x + r * .18} ${y - r * .18} ${x + r * .18} ${y - r * .18} ${x + r} ${y}C${x + r * .18} ${y + r * .18} ${x + r * .18} ${y + r * .18} ${x} ${y + r}C${x - r * .18} ${y + r * .18} ${x - r * .18} ${y + r * .18} ${x - r} ${y}C${x - r * .18} ${y - r * .18} ${x - r * .18} ${y - r * .18} ${x} ${y - r}Z`;
  let svg = '<svg class="lk-sky" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="lkLoadShoot" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#A9CCFF" stop-opacity="0"/></linearGradient></defs>';
  for (let i = 0; i < 90; i++) svg += `<circle class="lk-st" cx="${rnd(0, 1000).toFixed(0)}" cy="${(Math.pow(Math.random(), 1.4) * 330).toFixed(0)}" r="${rnd(0.6, 1.7).toFixed(2)}" style="--d:${rnd(2.2, 5.5).toFixed(2)}s;--dl:-${rnd(0, 5).toFixed(2)}s"/>`;
  CONST.forEach((pts, ci) => {
    svg += `<polyline class="lk-cl" points="${pts.map((p) => p.join(',')).join(' ')}" style="--dl:-${ci * 1.7}s"/>`;
    pts.forEach(([x, y], i) => {
      if (pts.findIndex((q) => q[0] === x && q[1] === y) !== i) return;
      svg += `<path class="lk-sp" d="${spark(x, y, i % 2 ? 6 : 8.5)}" style="--d:${rnd(3, 5.5).toFixed(2)}s;--dl:-${rnd(0, 4).toFixed(2)}s"/>`;
    });
  });
  svg += `<line class="lk-shoot" x1="820" y1="40" x2="900" y2="0" style="stroke:url(#lkLoadShoot);--dl:${rnd(1, 4).toFixed(1)}s"/></svg>`;
  return svg;
}

export function initLoadingScreen() {
  const c = document.getElementById('zone-transition-curtain');
  if (!c || c.dataset.lk) return;
  c.dataset.lk = '1';
  c.classList.add('lk-ui', 'lk-load');
  c.innerHTML = `
    <div class="zone-loading-container" hidden></div>
    <div class="lk-vista lk-vista--night" aria-hidden="true"><div class="lk-mt lk-mt1"></div><div class="lk-mt lk-mt2"></div><div class="lk-haze"></div><div class="lk-mt lk-mt3"></div></div>
    ${skySVG()}
    <div class="lk-load__shade" aria-hidden="true"></div>
    <img class="lk-load__logo" src="./assets/ui/brand/lunakai-logo.webp" alt="Lunakai">
    <div class="lk-load__bottom">
      <div class="lk-tip-card"><span class="lk-label">${i18n.t('common.paladillTip')}</span><p data-ref="tip"></p></div>
      <span class="lk-moon-spin" aria-hidden="true">${MOON}</span>
      <div class="lk-load-bar" role="progressbar" aria-label="${i18n.t('common.loadingZone')}">
        <div class="lk-row2"><span>${i18n.t('common.loading')} · <span id="zone-loading-subtitle">Lunacia</span></span><span id="zone-loading-badge" class="lk-load__brand">LUNAKAI</span></div>
        <div class="lk-trk"><span class="lk-fill"></span><span class="lk-moon">${MOON}</span></div>
      </div>
    </div>
    <h2 id="zone-loading-title" hidden></h2>
    <div id="zone-loading-icon" hidden></div>
    <div id="zone-loading-hint" hidden></div>`;

  const tipEl = c.querySelector('[data-ref="tip"]');
  let t = Math.floor(Math.random() * TIPS.length);
  const nextTip = () => { t = (t + 1) % TIPS.length; tipEl.textContent = TIPS[t]; };
  nextTip();
  // Cada vez que ZoneTransitionManager activa la cortina: consejo nuevo y la barra empieza de cero
  let wasActive = false;
  new MutationObserver(() => {
    const on = c.classList.contains('active');
    if (on && !wasActive) {
      nextTip();
      c.classList.remove('lk-load--run');
      void c.offsetWidth;
      c.classList.add('lk-load--run');
    }
    wasActive = on;
  }).observe(c, { attributes: true, attributeFilter: ['class'] });
}
