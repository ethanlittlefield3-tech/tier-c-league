// Draws the title-screen scene and writes app/src/art/title-scene.svg.
//
//   npm run art
//
// The scene is layered vector art: every repeated detail (crowd, lamps,
// sparks) is placed by this script from a fixed seed, so the file it writes
// is the same every time and one number changes the whole look.
// Original art only: no logos, cars or items from any existing game.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../app/src/art/title-scene.svg');

// A small seeded random number generator, so the art never changes by accident.
let seed = 20270104;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a, b) => a + (b - a) * rnd();
const pick = (list) => list[Math.floor(rnd() * list.length)];
const n = (v) => Number(v.toFixed(1));

const INK = '#050914';
const BLUE = '#1f8bff';
const ORANGE = '#ff8a1e';

// The underside of the roof: a shallow arc from one edge to the other.
const roofY = (x) => {
  const t = (x + 20) / 430;
  return 118 - 200 * t + 200 * t * t;
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function lampPanel(cx, cy, cols, rows, w, h, tilt) {
  const gap = 1.6;
  const pw = cols * w + (cols + 1) * gap;
  const ph = rows * h + (rows + 1) * gap;
  let lamps = '';
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const dim = rnd() < 0.12;
      lamps += `<rect x="${n(-pw / 2 + gap + c * (w + gap))}" y="${n(-ph / 2 + gap + r * (h + gap))}" width="${w}" height="${h}" rx="1" fill="${dim ? '#9fb6e6' : '#f6f9ff'}"/>`;
    }
  }
  return `<g transform="translate(${cx} ${cy}) rotate(${tilt})">
<rect x="${n(-pw / 2 - 2)}" y="${n(-ph / 2 - 2)}" width="${n(pw + 4)}" height="${n(ph + 4)}" rx="3" fill="#0a1230" stroke="#2a3d78" stroke-width="1.5"/>
${lamps}
</g>`;
}

function crowdFlashes(count) {
  let s = '';
  for (let i = 0; i < count; i += 1) {
    const x = between(6, 384);
    const y = between(roofY(x) + 26, 282);
    const r = between(1.6, 4.2);
    const o = between(0.55, 1);
    s += `<path d="M${n(x)} ${n(y - r)}L${n(x + r * 0.28)} ${n(y - r * 0.28)}L${n(x + r)} ${n(y)}L${n(x + r * 0.28)} ${n(y + r * 0.28)}L${n(x)} ${n(y + r)}L${n(x - r * 0.28)} ${n(y + r * 0.28)}L${n(x - r)} ${n(y)}L${n(x - r * 0.28)} ${n(y - r * 0.28)}Z" fill="#ffffff" opacity="${n(o)}"/>`;
  }
  return s;
}

function adBoards() {
  let s = '<rect x="0" y="286" width="390" height="14" fill="#070c1c"/>';
  const colors = [BLUE, '#e9eefc', ORANGE];
  for (let i = 0; i < 13; i += 1) {
    const x = i * 30 + 1;
    const color = colors[i % 3];
    s += `<rect x="${x}" y="288" width="28" height="10" rx="1.5" fill="#0b1330"/>`;
    s += `<rect x="${x + 3}" y="291" width="${n(between(8, 14))}" height="4" rx="1" fill="${color}" opacity="0.95"/>`;
    s += `<rect x="${x + 18}" y="291" width="${n(between(3, 7))}" height="4" rx="1" fill="${color}" opacity="0.55"/>`;
  }
  s += `<rect x="0" y="300" width="390" height="2" fill="#9fc2ff" opacity="0.25"/>`;
  return s;
}

function wheel(cx, cy, spin) {
  let spokes = '';
  for (let i = 0; i < 5; i += 1) {
    const a = ((spin + i * 72) * Math.PI) / 180;
    spokes += `<path d="M${n(cx + Math.cos(a) * 2.5)} ${n(cy + Math.sin(a) * 2.5)}L${n(cx + Math.cos(a) * 10)} ${n(cy + Math.sin(a) * 10)}" stroke="#2a3350" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="16.5" fill="#0c1122" stroke="${INK}" stroke-width="2.5"/>
<path d="M${cx - 13.5} ${cy - 4}A14 14 0 0 1 ${cx + 3} ${cy - 13.6}" fill="none" stroke="#3a4a72" stroke-width="2" stroke-linecap="round"/>
<circle cx="${cx}" cy="${cy}" r="10.8" fill="url(#ts-rim)" stroke="${INK}" stroke-width="1.2"/>
${spokes}
<circle cx="${cx}" cy="${cy}" r="6.4" fill="none" stroke="#e7ecf8" stroke-width="0.8" opacity="0.7"/>
<circle cx="${cx}" cy="${cy}" r="3.2" fill="#ffcf3f" stroke="${INK}" stroke-width="1"/>
<path d="M${cx - 8.5} ${cy - 5}A10 10 0 0 1 ${cx - 2} ${cy - 9.6}" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>`;
}

function car() {
  const body =
    'M6 50L10 36Q13 29 24 27L62 23L92 8Q97 5 104 5L132 6Q142 7 147 13L158 27L172 31Q181 33 183 41L184 50Q184 58 176 58L14 58Q6 58 6 50Z';
  return `<g transform="translate(112 476) rotate(-15) scale(0.86)">
<ellipse cx="96" cy="78" rx="84" ry="7" fill="#4aa0ff" opacity="0.28" filter="url(#ts-blur4)"/>
<path d="M2 34Q-34 38 -78 44Q-34 51 2 54Z" fill="url(#ts-flame)" filter="url(#ts-blur2)"/>
<path d="M2 39Q-20 41 -46 44Q-20 47 2 49Z" fill="#ffffff"/>
<path d="M14 28L10 14M26 27L24 13" stroke="#0a1126" stroke-width="3" stroke-linecap="round"/>
<path d="M-2 9L34 7L36 13L0 16Z" fill="url(#ts-wing)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
<path d="M2 10.4L32 8.8" stroke="#bfe0ff" stroke-width="1" opacity="0.9"/>
<path d="M-3 5L4 5L5 19L-2 19Z" fill="${ORANGE}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="${body}" fill="url(#ts-body)"/>
<path d="M7 46L184 46L184 50Q184 58 176 58L14 58Q6 58 6 50Z" fill="#0c4aa6"/>
<path d="M10 54H181Q180 58 176 58H14Q10 58 10 54Z" fill="#083a86"/>
<path d="M26 29L62 25L92 10Q97 7 104 7L131 8" fill="none" stroke="#cfe8ff" stroke-width="1.6" stroke-linecap="round" opacity="0.95"/>
<path d="M88 27L84 56M152 28L150 56" stroke="#0a3f90" stroke-width="1.1"/>
<path d="M26 36L166 32L167 37L26 42Z" fill="#ffffff"/>
<path d="M26 43.4L168 38.6L168 40.4L26 45.2Z" fill="${ORANGE}"/>
<path d="M30 47.5L54 46.5L52 53L30 54Z" fill="#062a63" stroke="${INK}" stroke-width="1"/>
<path d="M34 49.3L50 48.6M34 51.6L50 51" stroke="#3f8fe6" stroke-width="0.9"/>
<path d="M64 31.6L70.6 35.4V43L64 46.8L57.4 43V35.4Z" fill="url(#ts-gold)" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
<path d="M96 11L130 10Q139 10 143 16L151 27L88 27Z" fill="url(#ts-glass)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
<path d="M104 12.5L114 12.2L104 25.6L94 25.6Z" fill="#ffffff" opacity="0.5"/>
<path d="M121 12L126 12L116 25.6L111 25.6Z" fill="#ffffff" opacity="0.3"/>
<path d="M120 10.6L118 27" stroke="#0b2a5c" stroke-width="2.2"/>
<path d="M172 32.5Q180 34 182 40L174 39Z" fill="#fff6c9" stroke="${INK}" stroke-width="1"/>
<path d="M170 56L189 55L189 58.5L170 59.5Z" fill="#0a1126"/>
<path d="M0 37L8 36L8 52L0 51Z" fill="#2a3350" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
<ellipse cx="1.5" cy="44" rx="2.6" ry="5.6" fill="#ffffff"/>
<path d="M22 60A20 20 0 0 1 62 60" fill="none" stroke="#062a63" stroke-width="3.4"/>
<path d="M128 60A20 20 0 0 1 168 60" fill="none" stroke="#062a63" stroke-width="3.4"/>
<path d="${body}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M133 8Q141 9 145.5 14.5L156.5 28.6L171 32.6Q179.4 34.6 181.2 41.4L182 49" fill="none" stroke="#ffb066" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
${wheel(42, 60, 12)}
${wheel(148, 60, 40)}
<ellipse cx="196" cy="38" rx="26" ry="9" fill="url(#ts-headlight)"/>
</g>`;
}

function ball() {
  return `<g transform="translate(300 372)">
<ellipse cx="-12" cy="30" rx="86" ry="30" transform="rotate(-38)" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.22"/>
<ellipse cx="-12" cy="30" rx="112" ry="40" transform="rotate(-38)" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.1"/>
<circle cx="-34" cy="46" r="45" fill="#dfe7f8" opacity="0.05"/>
<circle cx="-18" cy="25" r="52" fill="#dfe7f8" opacity="0.1"/>
<circle r="58" fill="url(#ts-ball)"/>
<path d="M11.3 -14Q28 -24 44 -38A58 58 0 0 1 52 22Q30 12 11.3 6Z" fill="#8fa2cf" opacity="0.5"/>
<path d="M-6 16Q-4 36 2 57A58 58 0 0 0 52 22Q30 12 11.3 6Z" fill="#6f82b3" opacity="0.55"/>
<path d="M-23.3 6Q-40 16 -51 25A58 58 0 0 0 2 57Q-4 36 -6 16Z" fill="#8597c4" opacity="0.5"/>
<path d="M-6 -24L11.3 -14V6L-6 16L-23.3 6V-14Z" fill="#eef3fd" stroke="#7f8fb8" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M-6 -24Q-8 -42 -14 -56M11.3 -14Q28 -24 44 -38M11.3 6Q30 12 52 22M-6 16Q-4 36 2 57M-23.3 6Q-40 16 -51 25M-23.3 -14Q-40 -22 -49 -29" fill="none" stroke="#7f8fb8" stroke-width="1.8" stroke-linecap="round"/>
<ellipse cx="-23" cy="-27" rx="17" ry="9" transform="rotate(-32 -23 -27)" fill="#ffffff" opacity="0.8" filter="url(#ts-blur2)"/>
<circle cx="-33" cy="-35" r="3" fill="#ffffff"/>
<path d="M29 -50.2A58 58 0 0 1 29 50.2" fill="none" stroke="#ff9d3d" stroke-width="3.2" stroke-linecap="round" opacity="0.9"/>
<path d="M-53.6 22.2A58 58 0 0 0 -22.2 53.6" fill="none" stroke="#5aa9ff" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
<circle r="58" fill="none" stroke="${INK}" stroke-width="2.6"/>
</g>`;
}

function impact() {
  // Between the car's nose and the ball, so the nose stays in view.
  const cx = 290;
  const cy = 438;
  let star = '';
  for (let i = 0; i < 16; i += 1) {
    const a = (i * Math.PI) / 8 - 0.3;
    const r = i % 2 === 0 ? between(19, 26) : 8;
    star += `${i === 0 ? 'M' : 'L'}${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`;
  }
  let sparks = '';
  for (let i = 0; i < 14; i += 1) {
    const a = between(0, Math.PI * 2);
    const r1 = between(26, 34);
    const r2 = r1 + between(6, 20);
    sparks += `<path d="M${n(cx + Math.cos(a) * r1)} ${n(cy + Math.sin(a) * r1)}L${n(cx + Math.cos(a) * r2)} ${n(cy + Math.sin(a) * r2)}" stroke="${pick(['#ffd36b', ORANGE, '#ffffff'])}" stroke-width="${n(between(1.2, 2.4))}" stroke-linecap="round"/>`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="34" fill="#ffb24a" opacity="0.5" filter="url(#ts-blur8)"/>
<path d="${star}Z" fill="#fff6c9" stroke="#ffd36b" stroke-width="1.2" stroke-linejoin="round"/>
<circle cx="${cx}" cy="${cy}" r="7" fill="#ffffff"/>
${sparks}`;
}

function trail() {
  let embers = '';
  for (let i = 0; i < 18; i += 1) {
    const t = rnd();
    const x = 118 - t * 170 + between(-8, 8);
    const y = 512 + t * 150 + between(-22, 22);
    const r = between(1, 2.8);
    embers += `<path d="M${n(x)} ${n(y - r * 1.6)}L${n(x + r)} ${n(y)}L${n(x)} ${n(y + r * 1.6)}L${n(x - r)} ${n(y)}Z" fill="${pick(['#ffd36b', ORANGE, '#ffe9b0'])}" opacity="${n(between(0.5, 1))}"/>`;
  }
  return `<path d="M126 500C86 518 28 556 -60 604L-60 716C4 652 74 586 123 524Z" fill="url(#ts-trail)" opacity="0.55" filter="url(#ts-blur8)"/>
<path d="M126 503C88 520 30 560 -56 612L-56 700C10 644 76 584 122 522Z" fill="url(#ts-trail)"/>
<path d="M124 507C92 524 40 560 -56 632L-56 668C20 612 80 566 122 517Z" fill="url(#ts-trailcore)"/>
<path d="M120 509C92 524 50 552 -30 608" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.7"/>
${embers}`;
}

function speedLines() {
  const lines = [
    [252, 404, 212, 446],
    [246, 386, 196, 422],
    [264, 420, 238, 450],
    [240, 366, 204, 388],
    [330, 428, 312, 462],
    [352, 412, 340, 440],
  ];
  return lines
    .map(([x1, y1, x2, y2], i) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#ffffff" stroke-width="${i < 3 ? 2.2 : 1.6}" stroke-linecap="round" opacity="${i < 3 ? 0.55 : 0.35}"/>`)
    .join('');
}

function bokeh() {
  let s = '';
  for (let i = 0; i < 11; i += 1) {
    const left = i % 2 === 0;
    s += `<circle cx="${n(left ? between(-10, 150) : between(240, 400))}" cy="${n(between(560, 840))}" r="${n(between(7, 22))}" fill="${left ? '#3d9bff' : '#ff9a3d'}" opacity="${n(between(0.05, 0.14))}"/>`;
  }
  return `<g filter="url(#ts-blur4)">${s}</g>`;
}

function roof() {
  let ribs = '';
  for (let x = -20; x <= 410; x += 43) {
    ribs += `<path d="M${x} ${n(roofY(x))}L${n(195 + (x - 195) * 0.5)} 0" stroke="#0e1a3d" stroke-width="2"/>`;
  }
  let rimRigs = '';
  for (const x of [128, 195, 262]) {
    const y = roofY(x) + 5;
    rimRigs += `<circle cx="${x}" cy="${n(y)}" r="20" fill="url(#ts-bloom)" opacity="0.7"/>${lampPanel(x, n(y), 4, 1, 4, 3.4, 0)}`;
  }
  return `<path d="M-20 0H410V118Q195 18 -20 118Z" fill="#02040b"/>
${ribs}
<path d="M-20 118Q195 18 410 118" fill="none" stroke="#1b2c5e" stroke-width="3"/>
<path d="M-20 121Q195 21 410 121" fill="none" stroke="#5f86d8" stroke-width="1" opacity="0.5"/>
${rimRigs}`;
}

function jumbotron() {
  return `<g transform="translate(195 43)">
<path d="M-30 -18L-34 -44M30 -18L34 -44" stroke="#16234a" stroke-width="2"/>
<path d="M-48 -18H48L42 16H-42Z" fill="#070c1c" stroke="#2a3d78" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M-43 -13H-3L-3 11H-38.5Z" fill="url(#ts-screenblue)"/>
<path d="M3 -13H43L38.5 11H3Z" fill="url(#ts-screenorange)"/>
<path d="M-33 -6H-14M-33 0H-20M-33 5H-24" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>
<path d="M12 -6H31M12 0H25M12 5H21" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>
<rect x="-52" y="-22" width="104" height="5" rx="2" fill="#16234a"/>
<ellipse cx="0" cy="20" rx="46" ry="6" fill="#7fb0ff" opacity="0.18" filter="url(#ts-blur4)"/>
</g>`;
}

function stands() {
  const tier = (top, mid, bottom, midBottom, pattern) =>
    `<path d="M0 ${top}Q195 ${mid} 390 ${top}V${bottom}Q195 ${midBottom} 0 ${bottom}Z" fill="url(#ts-stand)"/>
<path d="M0 ${top}Q195 ${mid} 390 ${top}V${bottom}Q195 ${midBottom} 0 ${bottom}Z" fill="url(#${pattern})"/>
<path d="M0 ${bottom}Q195 ${midBottom} 390 ${bottom}" fill="none" stroke="#1d2e63" stroke-width="3.5"/>
<path d="M0 ${bottom + 2.5}Q195 ${midBottom + 2.5} 390 ${bottom + 2.5}" fill="none" stroke="#6f93e0" stroke-width="0.8" opacity="0.5"/>`;
  return `<rect x="0" y="60" width="390" height="244" fill="#070d22"/>
${tier(132, 100, 178, 152, 'ts-crowd-s')}
${tier(184, 158, 230, 208, 'ts-crowd-m')}
${tier(236, 214, 286, 270, 'ts-crowd-l')}
<rect x="92" y="250" width="20" height="26" rx="3" fill="#040813"/>
<rect x="278" y="250" width="20" height="26" rx="3" fill="#040813"/>
<rect x="0" y="96" width="390" height="208" fill="url(#ts-tintblue)"/>
<rect x="0" y="96" width="390" height="208" fill="url(#ts-tintorange)"/>
${crowdFlashes(34)}`;
}

function pitch() {
  return `<rect x="0" y="300" width="390" height="544" fill="url(#ts-pitch)"/>
<rect x="0" y="300" width="390" height="544" fill="url(#ts-hex)" mask="url(#ts-hexfade)"/>
<rect x="0" y="300" width="390" height="544" fill="url(#ts-hexbig)" mask="url(#ts-hexfadenear)"/>
<ellipse cx="110" cy="352" rx="120" ry="22" fill="#dbe8ff" opacity="0.1" filter="url(#ts-blur8)"/>
<ellipse cx="280" cy="352" rx="120" ry="22" fill="#dbe8ff" opacity="0.1" filter="url(#ts-blur8)"/>
<rect x="0" y="300" width="390" height="544" fill="url(#ts-poolblue)"/>
<rect x="0" y="300" width="390" height="544" fill="url(#ts-poolorange)"/>
<g fill="none" stroke="#dfeaff" stroke-width="2" opacity="0.26">
<path d="M195 302V600"/>
<ellipse cx="195" cy="430" rx="150" ry="46"/>
<ellipse cx="-6" cy="420" rx="72" ry="64"/>
<ellipse cx="396" cy="420" rx="72" ry="64"/>
</g>
<ellipse cx="195" cy="430" rx="5" ry="2" fill="#dfeaff" opacity="0.5"/>`;
}

function goals() {
  const goal = (side, color) => {
    const m = side === 'left' ? 1 : -1;
    const x = side === 'left' ? 0 : 390;
    const p = (dx, y) => `${x + m * dx} ${y}`;
    return `<path d="M${p(-4, 338)}L${p(30, 350)}V${436}L${p(-4, 456)}Z" fill="url(#ts-net)"/>
<path d="M${p(-4, 338)}L${p(30, 350)}V${436}L${p(-4, 456)}" fill="none" stroke="${color}" stroke-width="7" opacity="0.35" filter="url(#ts-blur4)"/>
<path d="M${p(-4, 338)}L${p(30, 350)}V${436}L${p(-4, 456)}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>
<path d="M${p(-4, 339)}L${p(29, 351)}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.6"/>`;
  };
  return goal('left', '#3d9bff') + goal('right', '#ff9a3d');
}

function beams() {
  return `<g filter="url(#ts-blur4)">
<path d="M34 70L92 64L300 640L-90 640Z" fill="url(#ts-beam)"/>
<path d="M298 64L356 70L480 640L90 640Z" fill="url(#ts-beam)"/>
<path d="M52 70L78 67L170 560L60 560Z" fill="url(#ts-beam)" opacity="0.7"/>
<path d="M312 67L338 70L330 560L220 560Z" fill="url(#ts-beam)" opacity="0.7"/>
</g>`;
}

function mainRigs() {
  const rig = (cx, tilt) => `<path d="M${cx - 6} 20L${cx - 3} 44M${cx + 6} 20L${cx + 3} 44" stroke="#16234a" stroke-width="3"/>
<circle cx="${cx}" cy="64" r="74" fill="url(#ts-bloom)" opacity="0.85"/>
<ellipse cx="${cx}" cy="64" rx="120" ry="3.2" fill="#ffffff" opacity="0.4" filter="url(#ts-blur2)"/>
${lampPanel(cx, 64, 5, 3, 9, 6, tilt)}
<circle cx="${cx}" cy="64" r="18" fill="#ffffff" opacity="0.5" filter="url(#ts-blur4)"/>`;
  return rig(60, -5) + rig(330, 5);
}

// ---------------------------------------------------------------------------
// The scene, back to front
// ---------------------------------------------------------------------------

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="ts-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03060f"/><stop offset="0.4" stop-color="#081230"/><stop offset="1" stop-color="#0a1a3c"/></linearGradient>
<radialGradient id="ts-bloom"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.22" stop-color="#d6e6ff" stop-opacity="0.5"/><stop offset="1" stop-color="#7fb0ff" stop-opacity="0"/></radialGradient>
<linearGradient id="ts-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6efff" stop-opacity="0.36"/><stop offset="0.55" stop-color="#a9c8ff" stop-opacity="0.1"/><stop offset="1" stop-color="#a9c8ff" stop-opacity="0"/></linearGradient>
<linearGradient id="ts-stand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1330"/><stop offset="1" stop-color="#111e49"/></linearGradient>
<pattern id="ts-crowd-s" width="7" height="6" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.8" r="1.5" fill="#2a3c74"/><circle cx="5.3" cy="4.8" r="1.5" fill="#1f2e5c"/></pattern>
<pattern id="ts-crowd-m" width="9.5" height="8" patternUnits="userSpaceOnUse"><circle cx="2.4" cy="2.4" r="2" fill="#31457f"/><circle cx="7.2" cy="6.4" r="2" fill="#243566"/><circle cx="7" cy="2" r="0.9" fill="#4b63a8"/></pattern>
<pattern id="ts-crowd-l" width="12.5" height="10.5" patternUnits="userSpaceOnUse"><circle cx="3.2" cy="3.4" r="2.7" fill="#384d8a"/><circle cx="9.4" cy="8.4" r="2.7" fill="#28396c"/><circle cx="9.6" cy="2.8" r="1.2" fill="#5670b8"/><path d="M1.2 8.4h4" stroke="#1b2850" stroke-width="2.4" stroke-linecap="round"/></pattern>
<radialGradient id="ts-tintblue" cx="0.05" cy="0.6" r="0.6"><stop offset="0" stop-color="${BLUE}" stop-opacity="0.32"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></radialGradient>
<radialGradient id="ts-tintorange" cx="0.95" cy="0.6" r="0.6"><stop offset="0" stop-color="${ORANGE}" stop-opacity="0.3"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient>
<linearGradient id="ts-pitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d2250"/><stop offset="0.3" stop-color="#0b1b40"/><stop offset="0.7" stop-color="#081228"/><stop offset="1" stop-color="#050a1a"/></linearGradient>
<pattern id="ts-hex" width="24.25" height="42" patternUnits="userSpaceOnUse" patternTransform="translate(0 300) scale(1 0.5)"><path d="M0 7L12.12 0L24.25 7V21L12.12 28L0 21ZM12.12 28V42" fill="none" stroke="#c4d8ff" stroke-opacity="0.2" stroke-width="1"/></pattern>
<pattern id="ts-hexbig" width="24.25" height="42" patternUnits="userSpaceOnUse" patternTransform="translate(6 300) scale(2.4 1.3)"><path d="M0 7L12.12 0L24.25 7V21L12.12 28L0 21ZM12.12 28V42" fill="none" stroke="#c4d8ff" stroke-opacity="0.13" stroke-width="0.7"/></pattern>
<linearGradient id="ts-fadedown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.5"/></linearGradient>
<linearGradient id="ts-fadenear" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="1"/></linearGradient>
<mask id="ts-hexfade"><rect x="0" y="300" width="390" height="544" fill="url(#ts-fadedown)"/></mask>
<mask id="ts-hexfadenear"><rect x="0" y="300" width="390" height="544" fill="url(#ts-fadenear)"/></mask>
<radialGradient id="ts-poolblue" cx="0.08" cy="0.3" r="0.62"><stop offset="0" stop-color="${BLUE}" stop-opacity="0.5"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></radialGradient>
<radialGradient id="ts-poolorange" cx="0.95" cy="0.2" r="0.6"><stop offset="0" stop-color="${ORANGE}" stop-opacity="0.42"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient>
<pattern id="ts-net" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#0a1430" fill-opacity="0.55"/><path d="M0 0L6 6M6 0L0 6" stroke="#ffffff" stroke-opacity="0.32" stroke-width="0.6"/></pattern>
<linearGradient id="ts-trail" gradientUnits="userSpaceOnUse" x1="-56" y1="660" x2="126" y2="508"><stop offset="0" stop-color="${ORANGE}" stop-opacity="0"/><stop offset="0.3" stop-color="${ORANGE}" stop-opacity="0.85"/><stop offset="0.62" stop-color="#ffb24a"/><stop offset="0.82" stop-color="#8ec5ff"/><stop offset="1" stop-color="#3d9bff"/></linearGradient>
<linearGradient id="ts-trailcore" gradientUnits="userSpaceOnUse" x1="-56" y1="650" x2="124" y2="512"><stop offset="0" stop-color="#fff1c9" stop-opacity="0"/><stop offset="0.45" stop-color="#fff1c9" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<linearGradient id="ts-flame" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#eaf5ff"/><stop offset="0.4" stop-color="#6fb7ff"/><stop offset="1" stop-color="#3d9bff" stop-opacity="0"/></linearGradient>
<linearGradient id="ts-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="0.35" stop-color="#2f97ff"/><stop offset="0.75" stop-color="#1877ea"/><stop offset="1" stop-color="#0f5fcb"/></linearGradient>
<linearGradient id="ts-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4aa6ff"/><stop offset="1" stop-color="#0c4aa6"/></linearGradient>
<linearGradient id="ts-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f9ff"/><stop offset="0.45" stop-color="#9fd2ff"/><stop offset="1" stop-color="#2f7fdc"/></linearGradient>
<linearGradient id="ts-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset="0.5" stop-color="#ffcf3f"/><stop offset="1" stop-color="#a8691c"/></linearGradient>
<radialGradient id="ts-rim" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#a9b4cf"/><stop offset="1" stop-color="#4d5878"/></radialGradient>
<radialGradient id="ts-headlight"><stop offset="0" stop-color="#fffbe0" stop-opacity="0.75"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient>
<radialGradient id="ts-ball" cx="0.34" cy="0.28" r="0.82"><stop offset="0" stop-color="#ffffff"/><stop offset="0.32" stop-color="#eaf0fb"/><stop offset="0.68" stop-color="#aebcdf"/><stop offset="1" stop-color="#55668f"/></radialGradient>
<linearGradient id="ts-screenblue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58aeff"/><stop offset="1" stop-color="#1161cc"/></linearGradient>
<linearGradient id="ts-screenorange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb061"/><stop offset="1" stop-color="#d65f00"/></linearGradient>
<radialGradient id="ts-vignette" cx="0.5" cy="0.46" r="0.75"><stop offset="0.55" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.62"/></radialGradient>
<linearGradient id="ts-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a1a" stop-opacity="0"/><stop offset="0.42" stop-color="#050a1a" stop-opacity="0.82"/><stop offset="1" stop-color="#03060f" stop-opacity="0.97"/></linearGradient>
<filter id="ts-blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="ts-blur4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="ts-blur8" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="ts-blur22" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="22"/></filter>
</defs>
<rect width="390" height="844" fill="url(#ts-sky)"/>
${stands()}
${roof()}
${adBoards()}
${pitch()}
${goals()}
${beams()}
${mainRigs()}
${jumbotron()}
<g transform="translate(0 -46)">
<ellipse cx="226" cy="604" rx="78" ry="8" fill="#000000" opacity="0.45" filter="url(#ts-blur4)"/>
${trail()}
${speedLines()}
${ball()}
${car()}
${impact()}
</g>
<rect x="0" y="540" width="390" height="304" fill="url(#ts-floor)"/>
<ellipse cx="112" cy="700" rx="150" ry="62" fill="${BLUE}" opacity="0.3" filter="url(#ts-blur22)"/>
<ellipse cx="282" cy="716" rx="150" ry="62" fill="${ORANGE}" opacity="0.26" filter="url(#ts-blur22)"/>
${bokeh()}
<rect width="390" height="844" fill="url(#ts-vignette)"/>
</svg>
`;

writeFileSync(out, svg);
const shapes = (svg.match(/<(path|rect|circle|ellipse|polygon)\b/g) ?? []).length;
const gradients = (svg.match(/<(linearGradient|radialGradient)\b/g) ?? []).length;
console.log(`title-scene.svg: ${shapes} shapes, ${gradients} gradients, ${(svg.length / 1024).toFixed(1)} KB`);
