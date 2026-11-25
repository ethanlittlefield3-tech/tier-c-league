// Draws the app icon options and, from the chosen one, every picture a phone
// asks for: the Home Screen icons and the launch screens.
//
//   npm run icons                       draw everything
//   npm run icons -- --sheet out.png    also save a sheet of the options, side by side
//
// It writes:
//   app/public/icons/    the chosen design at the sizes phones and browsers ask for
//   app/public/launch/   the still picture iOS shows while the app loads, one per screen size
//
// To change the app's icon, change CHOSEN below and run this again.
// Original art only: no logos or items from any existing game.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { launchPictures } from '../../app/launch-screens.ts';

const CHOSEN = 'a';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INK = '#050914';
const n = (v) => Number(v.toFixed(1));

// Each design is drawn in a 1024 by 1024 box. The ground behind it carries on
// far past the box, so a launch screen can show the same drawing with more
// room around it.
const FAR = -2400;
const SPAN = 1024 - 2 * FAR;
const EVERYWHERE = `x="${FAR}" y="${FAR}" width="${SPAN}" height="${SPAN}"`;

function seeded(seed) {
  let s = seed;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { rnd, between: (a, b) => a + (b - a) * rnd() };
}

const DEFS = `
<radialGradient id="ic-bg" gradientUnits="userSpaceOnUse" cx="512" cy="450" r="820"><stop offset="0" stop-color="#22397f"/><stop offset="0.5" stop-color="#0c1739"/><stop offset="1" stop-color="#03060f"/></radialGradient>
<pattern id="ic-hex" width="97" height="168" patternUnits="userSpaceOnUse"><path d="M0 28L48.5 0L97 28V84L48.5 112L0 84ZM48.5 112V168" fill="none" stroke="#c4d8ff" stroke-opacity="0.11" stroke-width="3"/></pattern>
<radialGradient id="ic-bg-dark" gradientUnits="userSpaceOnUse" cx="512" cy="512" r="820"><stop offset="0" stop-color="#101b42"/><stop offset="0.6" stop-color="#070d22"/><stop offset="1" stop-color="#03060f"/></radialGradient>
<radialGradient id="ic-hex-fade" gradientUnits="userSpaceOnUse" cx="512" cy="512" r="1400"><stop offset="0.55" stop-color="#ffffff"/><stop offset="1" stop-color="#000000"/></radialGradient>
<mask id="ic-hex-mask" maskUnits="userSpaceOnUse" ${EVERYWHERE}><rect ${EVERYWHERE} fill="url(#ic-hex-fade)"/></mask>
<radialGradient id="ic-vignette" gradientUnits="userSpaceOnUse" cx="512" cy="512" r="760"><stop offset="0.66" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.4"/></radialGradient>
<linearGradient id="ic-gold" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset="0.36" stop-color="#ffd24a"/><stop offset="0.74" stop-color="#d1922a"/><stop offset="1" stop-color="#8f5a18"/></linearGradient>
<radialGradient id="ic-halo"><stop offset="0.45" stop-color="#9cc4ff" stop-opacity="0.55"/><stop offset="1" stop-color="#9cc4ff" stop-opacity="0"/></radialGradient>
<linearGradient id="ic-streak" gradientUnits="userSpaceOnUse" x1="-300" y1="1110" x2="1324" y2="88"><stop offset="0" stop-color="#1f8bff" stop-opacity="0"/><stop offset="0.14" stop-color="#1f8bff"/><stop offset="0.4" stop-color="#7cc4ff"/><stop offset="0.5" stop-color="#f4f9ff"/><stop offset="0.6" stop-color="#ffc47c"/><stop offset="0.86" stop-color="#ff8a1e"/><stop offset="1" stop-color="#ff8a1e" stop-opacity="0"/></linearGradient>
<linearGradient id="ic-core" gradientUnits="userSpaceOnUse" x1="-300" y1="1110" x2="1324" y2="88"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.16" stop-color="#ffffff"/><stop offset="0.84" stop-color="#ffffff"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<radialGradient id="ic-glow-blue"><stop offset="0" stop-color="#1f8bff" stop-opacity="0.75"/><stop offset="0.5" stop-color="#1f8bff" stop-opacity="0.32"/><stop offset="1" stop-color="#1f8bff" stop-opacity="0"/></radialGradient>
<radialGradient id="ic-glow-orange"><stop offset="0" stop-color="#ff7a0a" stop-opacity="0.75"/><stop offset="0.5" stop-color="#ff7a0a" stop-opacity="0.32"/><stop offset="1" stop-color="#ff7a0a" stop-opacity="0"/></radialGradient>
<linearGradient id="ic-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffc27a"/><stop offset="0.4" stop-color="#e58a2e"/><stop offset="1" stop-color="#a85c18"/></linearGradient>
<linearGradient id="ic-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#d6dbe3"/><stop offset="1" stop-color="#8e97a8"/></linearGradient>
<linearGradient id="ic-blue" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="700" y2="700"><stop offset="0" stop-color="#63b8ff"/><stop offset="1" stop-color="#0d4fb0"/></linearGradient>
<linearGradient id="ic-orange" gradientUnits="userSpaceOnUse" x1="324" y1="324" x2="1024" y2="1024"><stop offset="0" stop-color="#ffb061"/><stop offset="1" stop-color="#bf5200"/></linearGradient>
<linearGradient id="ic-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0.1" stop-color="#ffffff"/><stop offset="0.6" stop-color="#eaf2ff"/><stop offset="1" stop-color="#b3ccf5"/></linearGradient>
<filter id="ic-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="28"/></filter>
`;

const FONT = `font-family="'Exo 2', 'Arial Narrow', sans-serif" font-style="italic" font-weight="900"`;

/** The six corners of a hexagon standing on a point, starting at the top and going clockwise. */
const corners = (cx, cy, r) =>
  [0, 1, 2, 3, 4, 5].map((k) => {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    return [n(cx + r * Math.cos(a)), n(cy + r * Math.sin(a))];
  });
const hexPoints = (cx, cy, r) => corners(cx, cy, r).map((p) => p.join(',')).join(' ');

/** A four-pointed glint. */
const glint = (x, y, s, opacity = 1) =>
  `<path d="M${n(x)} ${n(y - s * 2.4)}L${n(x + s * 0.6)} ${n(y - s * 0.6)}L${n(x + s * 2.4)} ${n(y)}L${n(x + s * 0.6)} ${n(y + s * 0.6)}L${n(x)} ${n(y + s * 2.4)}L${n(x - s * 0.6)} ${n(y + s * 0.6)}L${n(x - s * 2.4)} ${n(y)}L${n(x - s * 0.6)} ${n(y - s * 0.6)}Z" fill="#ffffff" opacity="${opacity}"/>`;

const ground = (fill = 'ic-bg') =>
  `<rect ${EVERYWHERE} fill="url(#${fill})"/><rect ${EVERYWHERE} fill="url(#ic-hex)" mask="url(#ic-hex-mask)"/>`;
const vignette = () => `<rect ${EVERYWHERE} fill="url(#ic-vignette)"/>`;

/** The gold C badge from the logo: a bevelled gold rim on a solid bronze edge, lit from the upper left. */
function badge(cx, cy, r, { halo = true } = {}) {
  const bronze = ['#8a5518', '#7d4c15', '#704412', '#633c10', '#56340d', '#492c0b', '#3c2408'];
  let edge = '';
  for (let i = 14; i >= 1; i -= 1) {
    const color = bronze[Math.min(bronze.length - 1, Math.floor((i - 1) / 2))];
    edge += `<polygon points="${hexPoints(cx + i * 2, cy + i * 2, r)}" fill="${color}" stroke="${color}" stroke-width="12" stroke-linejoin="round"/>`;
  }

  // The rim is six flat faces. Each takes its shade from the way it faces the light.
  const outer = corners(cx, cy, r);
  const inner = corners(cx, cy, r * 0.78);
  const shades = ['#ffe27a', '#e9ae38', '#aa6c18', '#bd7e1e', '#f3c046', '#fff4c4'];
  let rim = '';
  for (let k = 0; k < 6; k += 1) {
    const next = (k + 1) % 6;
    rim += `<polygon points="${outer[k]} ${outer[next]} ${inner[next]} ${inner[k]}" fill="${shades[k]}" stroke="${shades[k]}" stroke-width="1.5"/>`;
  }
  for (let k = 0; k < 6; k += 1) {
    rim += `<path d="M${outer[k]}L${inner[k]}" stroke="#7a4a12" stroke-width="4" opacity="0.55"/>`;
  }

  const size = n(r * 1.56);
  const x = n(cx - r * 0.02);
  const y = n(cy + r * 0.53);
  let letterEdge = '';
  for (let i = 6; i >= 1; i -= 1) {
    letterEdge += `<text x="${n(x + i * 1.7)}" y="${n(y + i * 1.7)}" text-anchor="middle" font-size="${size}" ${FONT} fill="#4a2c0a" stroke="#4a2c0a" stroke-width="9" stroke-linejoin="round">C</text>`;
  }

  return `${halo ? `<circle cx="${cx}" cy="${cy}" r="${n(r * 1.55)}" fill="url(#ic-halo)"/>` : ''}
${edge}
<polygon points="${hexPoints(cx, cy, r)}" fill="#c98a24" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
${rim}
<polygon points="${hexPoints(cx, cy, r)}" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
<defs>
<radialGradient id="ic-field" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${n(cy - r * 0.35)}" r="${n(r * 1.1)}"><stop offset="0" stop-color="#24408c"/><stop offset="0.6" stop-color="#0d1838"/><stop offset="1" stop-color="#060b1c"/></radialGradient>
<clipPath id="ic-letter"><text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" ${FONT}>C</text></clipPath>
</defs>
<polygon points="${hexPoints(cx, cy, r * 0.78)}" fill="url(#ic-field)" stroke="#5c3a0c" stroke-width="7" stroke-linejoin="round"/>
<polygon points="${hexPoints(cx, cy, r * 0.69)}" fill="none" stroke="#e0a83a" stroke-width="3.5" stroke-linejoin="round" opacity="0.5"/>
<path d="M${n(cx - r * 0.79)} ${n(cy - r * 0.44)}L${n(cx)} ${n(cy - r * 0.9)}" fill="none" stroke="#fffdf0" stroke-width="8" stroke-linecap="round" opacity="0.95"/>
<path d="M${n(cx - r * 0.8)} ${n(cy - r * 0.28)}V${n(cy + r * 0.3)}" fill="none" stroke="#fffdf0" stroke-width="6" stroke-linecap="round" opacity="0.55"/>
${letterEdge}
<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" ${FONT} fill="url(#ic-gold)" stroke="${INK}" stroke-width="9" stroke-linejoin="round" paint-order="stroke">C</text>
<g clip-path="url(#ic-letter)"><path d="M${n(cx - r)} ${n(cy - r)}H${n(cx + r * 0.5)}L${n(cx - r * 0.3)} ${n(cy + r * 0.05)}H${n(cx - r)}Z" fill="#ffffff" opacity="0.3"/></g>
${glint(cx + r * 0.6, cy - r * 0.66, r * 0.13)}
${glint(cx - r * 0.66, cy + r * 0.6, r * 0.045, 0.9)}`;
}

/** A blue-to-orange boost streak, from the lower left to the upper right. */
function streak() {
  const { between, rnd } = seeded(5);
  let sparks = '';
  for (let i = 0; i < 22; i += 1) {
    const t = rnd();
    const x = -200 + t * 1424 + between(-30, 30);
    const y = 1048 - t * 898 + between(-150, 150);
    const r = between(5, 13);
    const color = t < 0.5 ? '#9fd0ff' : '#ffd36b';
    sparks += `<path d="M${n(x)} ${n(y - r * 1.7)}L${n(x + r)} ${n(y)}L${n(x)} ${n(y + r * 1.7)}L${n(x - r)} ${n(y)}Z" fill="${color}" opacity="${n(between(0.5, 1))}"/>`;
  }
  return `<path d="M-300 1020C200 720 800 340 1324 -30L1324 210C800 540 200 910 -300 1200Z" fill="url(#ic-streak)" opacity="0.55" filter="url(#ic-blur)"/>
<path d="M-300 1059C200 762 800 382 1324 15L1324 161C800 500 200 870 -300 1163Z" fill="url(#ic-streak)"/>
<path d="M-300 1111C200 816 800 441 1324 88" fill="none" stroke="url(#ic-core)" stroke-width="13" stroke-linecap="round" opacity="0.9"/>
<path d="M-140 978C260 742 700 462 1180 138" fill="none" stroke="url(#ic-core)" stroke-width="4" stroke-linecap="round" opacity="0.55"/>
<path d="M-60 1052C340 812 780 532 1260 208" fill="none" stroke="url(#ic-core)" stroke-width="4" stroke-linecap="round" opacity="0.45"/>
${sparks}`;
}

/** Crossed nunchucks: the studio mark, drawn to sit behind the badge. */
function nunchucks(cx, cy) {
  const handle = (angle) => `<g transform="rotate(${angle} ${cx} ${cy})">
<rect x="${cx - 58}" y="${cy - 400}" width="116" height="800" rx="58" fill="url(#ic-wood)" stroke="${INK}" stroke-width="16"/>
<rect x="${cx + 16}" y="${cy - 360}" width="26" height="720" rx="13" fill="#8f4d12" opacity="0.5"/>
<rect x="${cx - 38}" y="${cy - 320}" width="14" height="330" rx="7" fill="#ffe2b8" opacity="0.9"/>
${[150, 208, 266].map((dy) => `<rect x="${cx - 50}" y="${cy + dy}" width="100" height="26" fill="${INK}"/><rect x="${cx - 50}" y="${cy + dy}" width="100" height="6" fill="#4a4a55"/>`).join('')}
${[-404, 338].map((dy) => `<rect x="${cx - 54}" y="${cy + dy}" width="108" height="66" rx="28" fill="url(#ic-steel)" stroke="${INK}" stroke-width="14"/><rect x="${cx - 38}" y="${cy + dy + 13}" width="30" height="10" rx="5" fill="#ffffff" opacity="0.85"/>`).join('')}
</g>`;
  // The chain hangs between the two top ends, as a curve of alternating links.
  const reach = 400 * Math.sin((34 * Math.PI) / 180);
  const top = cy - 400 * Math.cos((34 * Math.PI) / 180);
  const from = [cx - reach, top];
  const over = [cx, top - 236];
  const to = [cx + reach, top];
  let links = '';
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const x = (1 - t) ** 2 * from[0] + 2 * t * (1 - t) * over[0] + t ** 2 * to[0];
    const y = (1 - t) ** 2 * from[1] + 2 * t * (1 - t) * over[1] + t ** 2 * to[1];
    const dx = 2 * (1 - t) * (over[0] - from[0]) + 2 * t * (to[0] - over[0]);
    const dy = 2 * (1 - t) * (over[1] - from[1]) + 2 * t * (to[1] - over[1]);
    const turn = `transform="rotate(${n((Math.atan2(dy, dx) * 180) / Math.PI)} ${n(x)} ${n(y)})"`;
    links +=
      i % 2 === 0
        ? `<ellipse cx="${n(x)}" cy="${n(y)}" rx="27" ry="16" ${turn} fill="none" stroke="${INK}" stroke-width="20"/><ellipse cx="${n(x)}" cy="${n(y)}" rx="27" ry="16" ${turn} fill="none" stroke="url(#ic-steel)" stroke-width="11"/>`
        : `<ellipse cx="${n(x)}" cy="${n(y)}" rx="22" ry="9" ${turn} fill="url(#ic-steel)" stroke="${INK}" stroke-width="5"/>`;
  }
  return `${links}\n${handle(-34)}\n${handle(34)}`;
}

/** A big C with a solid edge, for the split-field design. */
function bigC() {
  let edge = '';
  for (let i = 22; i >= 1; i -= 1) {
    edge += `<text x="${500 + i * 2}" y="${792 + i * 2}" text-anchor="middle" font-size="800" ${FONT} fill="#081030" stroke="#081030" stroke-width="22" stroke-linejoin="round">C</text>`;
  }
  return `<defs><clipPath id="ic-big"><text x="500" y="792" text-anchor="middle" font-size="800" ${FONT}>C</text></clipPath></defs>
${edge}
<text x="500" y="792" text-anchor="middle" font-size="800" ${FONT} fill="none" stroke="url(#ic-gold)" stroke-width="44" stroke-linejoin="round">C</text>
<text x="500" y="792" text-anchor="middle" font-size="800" ${FONT} fill="url(#ic-face)" stroke="${INK}" stroke-width="16" stroke-linejoin="round" paint-order="stroke">C</text>
<g clip-path="url(#ic-big)"><path d="M0 0H760L420 520H0Z" fill="#ffffff" opacity="0.5"/></g>
${glint(300, 250, 26)}`;
}

/** Two halves of the pitch, blue above and orange below, with a white boost line between them. */
function split() {
  const a = FAR + SPAN;
  return `<polygon points="${FAR},${FAR} ${a},${FAR} ${FAR},${a}" fill="url(#ic-blue)"/>
<polygon points="${a},${FAR} ${a},${a} ${FAR},${a}" fill="url(#ic-orange)"/>
<rect ${EVERYWHERE} fill="url(#ic-hex)" mask="url(#ic-hex-mask)"/>
<path d="M${a} ${FAR}L${FAR} ${a}" stroke="#ffffff" stroke-width="170" opacity="0.16"/>
<path d="M${a} ${FAR}L${FAR} ${a}" stroke="#ffffff" stroke-width="120" opacity="0.28"/>
<path d="M${a} ${FAR}L${FAR} ${a}" stroke="#ffffff" stroke-width="78"/>`;
}

const OPTIONS = {
  a: {
    name: 'Badge and boost',
    draw: () => `${ground()}\n${streak()}\n${badge(512, 500, 300)}\n${vignette()}`,
  },
  b: {
    name: 'Badge and nunchucks',
    draw: () =>
      `${ground('ic-bg-dark')}\n<circle cx="250" cy="560" r="520" fill="url(#ic-glow-blue)"/><circle cx="774" cy="560" r="520" fill="url(#ic-glow-orange)"/>\n${nunchucks(512, 560)}\n${badge(512, 560, 250, { halo: false })}\n${vignette()}`,
  },
  c: {
    name: 'Blue against orange',
    draw: () => `${split()}\n${bigC()}\n${vignette()}`,
  },
};

/** One design as a picture: `view` is the part of the drawing to show, `size` is the picture in pixels. */
function drawing(key, size, view = { x: 0, y: 0, w: 1024, h: 1024 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(view.x)} ${n(view.y)} ${n(view.w)} ${n(view.h)}" width="${size.w}" height="${size.h}"><defs>${DEFS}</defs>${OPTIONS[key].draw()}</svg>`;
}

/** The drawing shown smaller in the middle of its own ground. `fill` is how much of the picture the 1024 box takes up. */
function centred(key, size, fill) {
  const unit = 1024 / (Math.min(size.w, size.h) * fill);
  const view = { w: size.w * unit, h: size.h * unit };
  return drawing(key, size, { x: 512 - view.w / 2, y: 512 - view.h / 2, ...view });
}

// ---------------------------------------------------------------------------
// Rendering: a real browser draws each picture, with the app's own font.
// ---------------------------------------------------------------------------

const fromApp = createRequire(resolve(root, 'app/package.json'));
const fontFolder = dirname(fromApp.resolve('@fontsource/exo-2/package.json'));
const font = readFileSync(resolve(fontFolder, 'files/exo-2-latin-900-italic.woff2')).toString('base64');
const page = (body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Exo 2';font-style:italic;font-weight:900;src:url(data:font/woff2;base64,${font}) format('woff2')}
html,body{margin:0;background:transparent;overflow:hidden}svg,img{display:block}${css}</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();

async function picture(html, size, { jpeg = false, clear = false, scale = 1 } = {}) {
  const tab = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: scale });
  await tab.setContent(html, { waitUntil: 'load' });
  await tab.evaluate(async () => {
    await document.fonts.load("italic 900 100px 'Exo 2'");
    await document.fonts.ready;
  });
  const bytes = await tab.screenshot(jpeg ? { type: 'jpeg', quality: 84 } : { type: 'png', omitBackground: clear });
  await tab.close();
  return bytes;
}

const square = (px) => ({ w: px, h: px });
const rounded = (key, px) => page(`<div style="width:${px}px;height:${px}px;border-radius:22.5%;overflow:hidden">${drawing(key, square(px))}</div>`);

const icons = resolve(root, 'app/public/icons');
const launch = resolve(root, 'app/public/launch');
for (const folder of [icons, launch]) {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
}

// The iPhone rounds the corners itself, so its icon is a full square.
writeFileSync(resolve(icons, 'apple-touch-icon.png'), await picture(page(drawing(CHOSEN, square(180))), square(180)));
// Android cuts its own shape out of the middle, so this one keeps the art well inside the edges.
writeFileSync(resolve(icons, 'icon-maskable-512.png'), await picture(page(centred(CHOSEN, square(512), 0.84)), square(512)));
// Everywhere else shows the picture as it is, so these come with their corners already rounded.
for (const px of [192, 512]) {
  writeFileSync(resolve(icons, `icon-${px}.png`), await picture(rounded(CHOSEN, px), square(px), { clear: true }));
}
writeFileSync(resolve(icons, 'favicon-48.png'), await picture(rounded(CHOSEN, 48), square(48), { clear: true }));

// Launch screens: the same drawing in the middle of a full screen.
const pictures = launchPictures();
for (const { file, pixels, points } of pictures) {
  const fill = Math.min(points.w, points.h) < 600 ? 0.62 : 0.46;
  writeFileSync(resolve(root, 'app/public', file), await picture(page(centred(CHOSEN, pixels, fill)), pixels, { jpeg: true }));
}

// A sheet that shows the options side by side, large and at Home Screen size.
const sheetAt = process.argv.indexOf('--sheet');
if (sheetAt > -1) {
  let cards = '';
  for (const [key, option] of Object.entries(OPTIONS)) {
    const art = `data:image/png;base64,${(await picture(page(drawing(key, square(640))), square(640))).toString('base64')}`;
    cards += `<div class="card">
<img class="big" src="${art}" alt="">
<div class="label"><b>${key.toUpperCase()}</b>${option.name}</div>
<div class="home"><img class="small" src="${art}" alt=""><span>Tier C</span></div>
</div>`;
  }
  const css = `
body{width:1080px;height:560px;background:#0a1330;color:#f5f9ff;font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;gap:44px}
.card{display:flex;flex-direction:column;align-items:center;gap:16px}
.big{width:300px;height:300px;border-radius:22.5%;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.label{font-size:20px;display:flex;gap:10px;align-items:baseline}
.label b{font:italic 900 30px 'Exo 2',sans-serif;color:#ffcf3f}
.home{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:12px;padding:12px 26px;border-radius:16px;background:linear-gradient(160deg,#274a7a,#5a3a6a)}
.small{width:64px;height:64px;border-radius:22.5%}`;
  writeFileSync(resolve(process.argv[sheetAt + 1]), await picture(page(cards, css), { w: 1080, h: 560 }, { scale: 2 }));
}

await browser.close();
console.log(`icons: ${Object.keys(OPTIONS).length} designs drawn. "${OPTIONS[CHOSEN].name}" is the app icon: 5 icon files and ${pictures.length} launch screens written.`);
