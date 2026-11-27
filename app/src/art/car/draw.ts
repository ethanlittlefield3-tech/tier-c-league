/**
 * The cars (SCOPE.md, "Garage and achievements"), drawn for this app in the
 * style of the title screen's car: a side view with ink outlines, painted
 * gradients and a highlight along the roof. Every part is original.
 *
 * Pure: `drawCar` returns SVG markup for a car, so the Garage, every badge in
 * the app and the art sheets all draw from one copy. The parts are names from
 * the engine's catalog; anything unknown falls back to the starter part, so
 * nothing outside the catalog is ever drawn.
 */

export interface CarParts {
  body: string;
  paint: string;
  /** The accent: a second paint, or `none`. */
  paint2: string;
  /** Where the accent goes (ruling R22): lower, roof, stripes, nose, tail, together or alone. */
  accents: readonly string[];
  /** The paint's finish: gloss, matte, metallic, pearl, or the champion's gold. */
  finish: string;
  decal: string;
  wheels: string;
  boost: string;
  /** The boost trail's style: stream, sparks, rings or flames. */
  trail: string;
  explosion: string;
  topper: string;
  /** What the car stands in front of in the Garage and the showroom. Not drawn on the car. */
  backdrop: string;
}

export const STARTER_CAR: CarParts = { body: 'dart', paint: 'cobalt', paint2: 'none', accents: ['lower'], finish: 'gloss', decal: 'none', wheels: 'stock', boost: 'team', trail: 'stream', explosion: 'stock', topper: 'none', backdrop: 'garage' };

const INK = '#050914';

interface Body {
  /** The body's outline. */
  shape: string;
  /** The windows. */
  glass: string[];
  /** Highlight along the roof line. */
  shine: string;
  wheels: [number, number, number][];
  /** Where a decal goes on the side. */
  band: { x1: number; x2: number; y1: number; y2: number };
  roof: [number, number];
  exhaust: [number, number];
  light: [number, number];
  /** Extra pieces drawn over the body, like spikes or bumpers. */
  extra?: string;
  /** Drawn under the body, like a rear wing. */
  under?: string;
  /** Drawn on the body, inside its outline, like a cart's mesh or a couch's seams. */
  inner?: string;
  /** A joke body: no door seams, handle or vents. */
  novelty?: true;
}

const BODIES: Record<string, Body> = {
  // Low and sleek: the title screen's car.
  dart: {
    shape: 'M6 50L10 36Q13 29 24 27L62 23L92 8Q97 5 104 5L132 6Q142 7 147 13L158 27L172 31Q181 33 183 41L184 50Q184 58 176 58L14 58Q6 58 6 50Z',
    glass: ['M96 11L130 10Q139 10 143 16L151 27L88 27Z'],
    shine: 'M26 29L62 25L92 10Q97 7 104 7L131 8',
    wheels: [
      [42, 60, 16.5],
      [148, 60, 16.5],
    ],
    band: { x1: 18, x2: 176, y1: 33, y2: 47 },
    roof: [116, 5],
    exhaust: [6, 44],
    light: [178, 38],
    under: `<path d="M-2 9L34 7L36 13L0 16Z" fill="#26304d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M14 28L10 14M26 27L24 13" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  },
  // Boxy.
  brick: {
    shape: 'M8 55L8 30Q8 24 14 23L44 21L60 6Q63 3 68 3L148 3Q156 3 158 10L162 22L177 24Q184 25 184 32L184 52Q184 58 178 58L14 58Q8 58 8 55Z',
    glass: ['M66 8L104 8L104 21L52 22Z', 'M110 8L150 8Q153 8 154 11L157 21L110 21Z'],
    shine: 'M46 22L61 8Q64 5 68 5L147 5',
    wheels: [
      [44, 60, 16],
      [150, 60, 16],
    ],
    band: { x1: 14, x2: 180, y1: 30, y2: 48 },
    roof: [108, 3],
    exhaust: [8, 48],
    light: [179, 30],
  },
  // A truck.
  bruiser: {
    shape: 'M6 60L6 32Q6 27 11 27L84 27L84 6Q84 2 89 2L132 2Q139 2 142 8L150 26L176 29Q184 30 184 38L184 56Q184 62 178 62L12 62Q6 62 6 60Z',
    glass: ['M92 8L130 8Q135 8 137 12L144 26L92 26Z'],
    shine: 'M86 7Q86 4 90 4L131 4',
    wheels: [
      [40, 63, 19],
      [150, 63, 19],
    ],
    band: { x1: 12, x2: 180, y1: 34, y2: 54 },
    roof: [110, 2],
    exhaust: [6, 52],
    light: [179, 36],
    extra: `<path d="M10 31L80 31" stroke="${INK}" stroke-width="1.6" opacity="0.5"/><path d="M86 27L86 60" stroke="${INK}" stroke-width="1.4" opacity="0.45"/>`,
  },
  // Brick, with spikes: earned by landing 3 Demolitions.
  spiked: {
    shape: 'M8 55L8 30Q8 24 14 23L44 21L60 6Q63 3 68 3L148 3Q156 3 158 10L162 22L177 24Q184 25 184 32L184 52Q184 58 178 58L14 58Q8 58 8 55Z',
    glass: ['M66 8L104 8L104 21L52 22Z', 'M110 8L150 8Q153 8 154 11L157 21L110 21Z'],
    shine: 'M46 22L61 8Q64 5 68 5L147 5',
    wheels: [
      [44, 60, 16],
      [150, 60, 16],
    ],
    band: { x1: 14, x2: 180, y1: 30, y2: 48 },
    roof: [108, 3],
    exhaust: [8, 48],
    light: [179, 30],
    extra: [72, 92, 112, 132]
      .map((x) => `<path d="M${x - 6} 3.5L${x} -9L${x + 6} 3.5Z" fill="#c9d3e3" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`)
      .concat([32, 42].map((y) => `<path d="M184 ${y - 5}L196 ${y}L184 ${y + 5}Z" fill="#c9d3e3" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`))
      .join(''),
  },
  // Extra long and skinny: earned by winning the Alley.
  noodle: {
    shape: 'M6 51L8 44Q10 38 20 37L100 34L120 26Q124 24 130 24L176 24Q184 24 188 28L200 36L228 38Q236 39 237 45L237 50Q237 56 230 56L14 56Q6 56 6 51Z',
    glass: ['M126 28L174 28Q180 28 183 32L190 36L118 36Z'],
    shine: 'M22 39L100 36L120 28Q124 26 130 26L175 26',
    wheels: [
      [40, 57, 13],
      [204, 57, 13],
    ],
    band: { x1: 14, x2: 232, y1: 39, y2: 51 },
    roof: [152, 24],
    exhaust: [6, 47],
    light: [232, 43],
  },
  // A rounded coupe with chrome bumpers: earned by playing 3 seasons.
  retro: {
    shape: 'M8 50Q6 40 16 36L52 32Q62 14 84 10L118 10Q140 12 152 30L174 34Q184 36 184 46L184 52Q184 58 176 58L16 58Q8 58 8 50Z',
    glass: ['M70 18Q80 14 96 14L116 14Q132 16 141 30L62 31Z'],
    shine: 'M54 31Q63 15 84 12L117 12Q136 14 148 29',
    wheels: [
      [44, 60, 15],
      [146, 60, 15],
    ],
    band: { x1: 16, x2: 178, y1: 36, y2: 50 },
    roof: [100, 10],
    exhaust: [8, 50],
    light: [179, 42],
    extra: `<path d="M2 47Q2 44 5 44L14 44L14 54L5 54Q2 54 2 51Z" fill="#e9eef5" stroke="${INK}" stroke-width="1.6"/><path d="M178 44L187 44Q190 44 190 47L190 51Q190 54 187 54L178 54Z" fill="#e9eef5" stroke="${INK}" stroke-width="1.6"/>`,
  },
// The joke bodies (ruling R23), each from a shame badge or a silly one.
  // A porta-potty, on wheels, with a crescent-moon vent and the door taken.
  portaPotty: {
    shape: 'M58 56L58 -6Q58 -14 66 -14L134 -14Q142 -14 142 -6L142 56Z',
    glass: ['M96 -6a7 7 0 1 0 9 9a6 6 0 1 1 -9 -9Z'],
    shine: 'M62 -6Q62 -12 68 -12',
    wheels: [
      [74, 60, 11],
      [126, 60, 11],
    ],
    band: { x1: 70, x2: 130, y1: 24, y2: 40 },
    roof: [100, -22],
    exhaust: [58, 46],
    light: [138, 32],
    extra: `<path d="M54 -10Q54 -20 100 -22Q146 -20 146 -10Z" fill="#e9eef5" stroke="${INK}" stroke-width="2"/><rect x="80" y="10" width="40" height="44" rx="2" fill="none" stroke="${INK}" stroke-width="1.4" opacity="0.6"/><rect x="86" y="14" width="18" height="6" rx="1" fill="#e0242f" stroke="${INK}" stroke-width="0.8"/><text x="95" y="18.8" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="4.6" fill="#ffffff">BUSY</text><circle cx="116" cy="34" r="1.8" fill="#e9eef5" stroke="${INK}" stroke-width="0.8"/>`,
    novelty: true,
  },
  // A shopping cart: a painted wire basket, a red handle, and caster wheels.
  cart: {
    shape: 'M26 8L174 8L160 44L40 44Z',
    glass: [],
    shine: 'M30 10H170',
    wheels: [
      [52, 58, 8],
      [148, 58, 8],
    ],
    band: { x1: 44, x2: 156, y1: 16, y2: 36 },
    roof: [100, 8],
    exhaust: [30, 26],
    light: [168, 16],
    inner: `<path d="M38 8V44M50 8V44M62 8V44M74 8V44M86 8V44M98 8V44M110 8V44M122 8V44M134 8V44M146 8V44M158 8V44M26 20H174M26 32H174" stroke="${INK}" stroke-width="1" opacity="0.5"/>`,
    extra: `<path d="M40 44L44 50H156L160 44M52 50V52M148 50V52" fill="none" stroke="${INK}" stroke-width="2"/><path d="M26 8L14 2H6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><rect x="0" y="-1" width="10" height="5" rx="2" fill="#e0242f" stroke="${INK}" stroke-width="1.2"/>`,
    novelty: true,
  },
  // A hot dog in a bun, with a bubble cockpit and mustard.
  glizzy: {
    shape: 'M16 30Q16 14 34 14L166 14Q184 14 184 30Q184 44 166 44L34 44Q16 44 16 30Z',
    glass: ['M84 15Q88 0 100 0Q112 0 116 15Z'],
    shine: 'M36 17H164',
    wheels: [
      [40, 60, 12],
      [160, 60, 12],
    ],
    band: { x1: 34, x2: 166, y1: 20, y2: 38 },
    roof: [100, 0],
    exhaust: [16, 30],
    light: [182, 26],
    under: `<path d="M8 40Q6 28 22 30L178 30Q194 28 192 40Q194 56 176 56L24 56Q6 56 8 40Z" fill="#e8b36a" stroke="${INK}" stroke-width="2.4"/><path d="M24 50H176" stroke="#c98a3a" stroke-width="1.4" opacity="0.8"/>`,
    extra: `<path d="M30 18q6 -6 12 0t12 0t12 0t12 0M124 18q6 -6 12 0t12 0t12 0t12 0" fill="none" stroke="#ffd21f" stroke-width="2.4" stroke-linecap="round"/>`,
    novelty: true,
  },
  // A coffin on wheels, brass handles and all.
  coffin: {
    shape: 'M8 40L26 14L156 10L188 24L188 42L156 54L26 52Z',
    glass: ['M120 18L150 17L156 24L120 25Z'],
    shine: 'M28 16L154 12',
    wheels: [
      [46, 58, 13],
      [150, 58, 13],
    ],
    band: { x1: 30, x2: 156, y1: 22, y2: 40 },
    roof: [92, 12],
    exhaust: [8, 40],
    light: [186, 32],
    extra: `<path d="M44 46H72M96 46H124" stroke="#d6b77c" stroke-width="2.6" stroke-linecap="round"/><path d="M70 18V30M64 22H76" stroke="#e9eef5" stroke-width="2.2" stroke-linecap="round"/>`,
    novelty: true,
  },
  // A couch, with a potato on it.
  couch: {
    shape: 'M10 54L10 30Q10 22 18 22L26 22L26 4Q26 -2 34 -2L166 -2Q174 -2 174 4L174 22L182 22Q190 22 190 30L190 54Z',
    glass: [],
    shine: 'M30 0H170',
    wheels: [
      [36, 60, 9],
      [164, 60, 9],
    ],
    band: { x1: 30, x2: 170, y1: 4, y2: 20 },
    roof: [140, -2],
    exhaust: [10, 44],
    light: [188, 40],
    inner: `<path d="M26 22H174M72 26V54M128 26V54M100 -2V22" stroke="${INK}" stroke-width="1.2" opacity="0.45"/><path d="M26 34H174" stroke="#ffffff" stroke-width="1" opacity="0.2"/>`,
    extra: `<ellipse cx="70" cy="22" rx="13" ry="9" fill="#c9965a" stroke="${INK}" stroke-width="1.6"/><circle cx="66" cy="20" r="1.4" fill="${INK}"/><circle cx="73" cy="20" r="1.4" fill="${INK}"/><path d="M65 25q4 2 8 0" fill="none" stroke="${INK}" stroke-width="1.1"/><circle cx="62" cy="25" r="0.9" fill="#8a5a2a"/><circle cx="78" cy="18" r="0.9" fill="#8a5a2a"/>`,
    novelty: true,
  },
  // A toaster, two slices up, one of them burnt.
  toast: {
    shape: 'M22 56L22 14Q22 2 36 2L164 2Q178 2 178 14L178 56Z',
    glass: ['M140 10L166 10Q170 10 170 14L170 22L140 22Z'],
    shine: 'M28 10Q28 4 36 4L164 4',
    wheels: [
      [52, 60, 13],
      [148, 60, 13],
    ],
    band: { x1: 30, x2: 136, y1: 24, y2: 46 },
    roof: [70, -16],
    exhaust: [22, 44],
    light: [174, 48],
    under: `<path d="M52 4L52 -10Q52 -16 58 -16L82 -16Q88 -16 88 -10L88 4Z" fill="#e8b36a" stroke="${INK}" stroke-width="2"/><path d="M56 -9Q56 -12 60 -12L80 -12Q84 -12 84 -9L84 4L56 4Z" fill="#f5d59a"/><path d="M96 4L96 -8Q96 -14 102 -14L126 -14Q132 -14 132 -8L132 4Z" fill="#6b3e17" stroke="${INK}" stroke-width="2"/><path d="M100 -7Q100 -10 104 -10L124 -10Q128 -10 128 -7L128 4L100 4Z" fill="#8a5a2a"/>`,
    extra: `<rect x="178" y="18" width="8" height="5" rx="2" fill="#e9eef5" stroke="${INK}" stroke-width="1.2"/><circle cx="156" cy="38" r="4" fill="#e9eef5" stroke="${INK}" stroke-width="1.2"/><path d="M156 35.5V38" stroke="${INK}" stroke-width="1.2"/>`,
    novelty: true,
  },
};

interface Paint {
  light: string;
  mid: string;
  dark: string;
}

const PAINTS: Record<string, Paint> = {
  midnightBlack: { light: '#4a5470', mid: '#222838', dark: '#0b0e17' },
  arcticWhite: { light: '#ffffff', mid: '#e8eef7', dark: '#a9b4c8' },
  gunmetal: { light: '#8a93a6', mid: '#4f5767', dark: '#2a303c' },
  racingRed: { light: '#ff7a7a', mid: '#e0242f', dark: '#8f0f18' },
  blazeOrange: { light: '#ffb36b', mid: '#ff7a12', dark: '#b34700' },
  sunburstYellow: { light: '#fff3a0', mid: '#ffd21f', dark: '#b88a00' },
  lime: { light: '#d9ff8a', mid: '#93e02a', dark: '#4f8a0b' },
  forestGreen: { light: '#6fcf8e', mid: '#1f7a42', dark: '#0c4122' },
  teal: { light: '#7fe9e0', mid: '#13a89e', dark: '#075e59' },
  skyBlue: { light: '#d4eeff', mid: '#6cc0ff', dark: '#2a7fc4' },
  cobalt: { light: '#7cc4ff', mid: '#1f6fe0', dark: '#0b3a8a' },
  royalPurple: { light: '#c9a6ff', mid: '#6a3fd8', dark: '#34197a' },
  hotPink: { light: '#ffb0dc', mid: '#ff3fa4', dark: '#a8135f' },
  burgundy: { light: '#c45c78', mid: '#7a1630', dark: '#3f0716' },
  sand: { light: '#f5e3bb', mid: '#d6b77c', dark: '#8f7240' },
  // Special finishes, from badges.
  chrome: { light: '#ffffff', mid: '#aeb8c8', dark: '#4a5466' },
  silver: { light: '#f4f6fa', mid: '#b9c1cf', dark: '#6d7687' },
  sunrise: { light: '#ffe27a', mid: '#ff8a4a', dark: '#c23a6a' },
  tricolor: { light: '#ffffff', mid: '#1f8bff', dark: '#ff8a1e' },
  ice: { light: '#f2fbff', mid: '#bfe6ff', dark: '#6fb3e0' },
  clown: { light: '#fff38a', mid: '#ffd21f', dark: '#e07a12' },
  galaxy: { light: '#7a4fd0', mid: '#2b0f5c', dark: '#0b0730' },
  // The joke paints (ruling R23).
  rust: { light: '#d98a4a', mid: '#9a4f1f', dark: '#4f230b' },
  camo: { light: '#8fa86a', mid: '#5c7a3a', dark: '#2f3f1c' },
  hazard: { light: '#ffe066', mid: '#ffcc00', dark: '#a68400' },
  pickle: { light: '#b9e07a', mid: '#6fa83a', dark: '#3a5f17' },
};

/** A paint's three tones, for its swatch in the Garage. */
export function paintColors(paint: string): Paint {
  return PAINTS[paint] ?? PAINTS.cobalt!;
}

/** Every part this file can draw, by slot, so a test can hold it to the engine's catalog. */
export const DRAWN = {
  body: Object.keys(BODIES),
  paint: Object.keys(PAINTS),
};

const TEAM = { blue: ['#eaf5ff', '#6fb7ff', '#3d9bff'], orange: ['#fff1e0', '#ffb36b', '#ff8a1e'] } as const;

const n = (value: number) => Math.round(value * 10) / 10;

/** The paint's gradient, with the finishes' own patterns. */
function paintDefs(id: string, paint: string): string {
  const p = PAINTS[paint] ?? PAINTS.cobalt!;
  if (paint === 'chrome') {
    return `<linearGradient id="${id}-paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#c8d0dc"/><stop offset="0.46" stop-color="#6f7a8c"/><stop offset="0.52" stop-color="#e9eef5"/><stop offset="0.8" stop-color="#8a95a8"/><stop offset="1" stop-color="#4a5466"/></linearGradient>`;
  }
  if (paint === 'tricolor') {
    return `<linearGradient id="${id}-paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f8bff"/><stop offset="0.42" stop-color="#1f8bff"/><stop offset="0.42" stop-color="#ffffff"/><stop offset="0.62" stop-color="#ffffff"/><stop offset="0.62" stop-color="#ff8a1e"/><stop offset="1" stop-color="#ff8a1e"/></linearGradient>`;
  }
  return `<linearGradient id="${id}-paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset="0.45" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>`;
}

/** Specks and dots a finish adds on top of its gradient. */
function finishOverlay(paint: string, body: Body): string {
  const { x1, x2 } = body.band;
  const spots: string[] = [];
  const count = 16;
  for (let i = 0; i < count; i += 1) {
    const x = n(x1 + ((x2 - x1) * ((i * 7) % count)) / count + 4);
    const y = n(10 + ((i * 13) % 44));
    if (paint === 'galaxy') spots.push(`<circle cx="${x}" cy="${y}" r="${i % 4 === 0 ? 1.4 : 0.8}" fill="#ffffff" opacity="${i % 3 === 0 ? 0.95 : 0.6}"/>`);
    if (paint === 'clown') spots.push(`<circle cx="${x}" cy="${y}" r="3.2" fill="${['#ff3f5a', '#1f8bff', '#2fd06a'][i % 3]}"/>`);
    if (paint === 'ice') spots.push(`<path d="M${x - 2} ${y}H${x + 2}M${x} ${y - 2}V${y + 2}" stroke="#ffffff" stroke-width="0.9" opacity="0.85"/>`);
  }
  if (paint === 'galaxy') spots.push(`<ellipse cx="${n((x1 + x2) / 2)}" cy="34" rx="46" ry="12" fill="#ff5fc8" opacity="0.22"/>`);
  for (let i = 0; i < 9; i += 1) {
    const x = n(x1 + ((x2 - x1) * ((i * 5) % 9)) / 9 + 6);
    const y = n(8 + ((i * 11) % 44));
    if (paint === 'rust') spots.push(`<path d="M${x} ${y}q5 -4 9 0t3 7q-5 4 -10 1t-2 -8z" fill="#5a2a0e" opacity="0.7"/><circle cx="${n(x + 3)}" cy="${n(y + 3)}" r="1.4" fill="#e8a060" opacity="0.6"/>`);
    if (paint === 'camo') spots.push(`<path d="M${x} ${y}q8 -6 16 -1t4 9q-8 6 -16 2t-4 -10z" fill="${['#3a4a24', '#8a7a4a', '#2a3518'][i % 3]}" opacity="0.85"/>`);
    if (paint === 'pickle') spots.push(`<circle cx="${x}" cy="${y}" r="2.2" fill="#d4f59a" stroke="#3a5f17" stroke-width="0.6" opacity="0.9"/>`);
  }
  if (paint === 'hazard') {
    for (let x = x1 - 20; x < x2 + 20; x += 14) spots.push(`<path d="M${x} 60L${x + 7} 60L${x + 37} 0L${x + 30} 0Z" fill="#141414" opacity="0.9"/>`);
  }
  if (paint === 'sunrise') spots.push(`<circle cx="${n(x2 - 30)}" cy="46" r="12" fill="#fff3b8" opacity="0.35"/>`);
  return spots.join('');
}

function wheel(kind: string, cx: number, cy: number, r: number, id: string): string {
  // The tire, with tread blocks round its edge and a red brake caliper behind the rim.
  const treads = Array.from({ length: 14 }, (_, i) => {
    const a = (i * (360 / 14) * Math.PI) / 180;
    return `M${n(cx + Math.cos(a) * r * 0.82)} ${n(cy + Math.sin(a) * r * 0.82)}L${n(cx + Math.cos(a) * r * 0.97)} ${n(cy + Math.sin(a) * r * 0.97)}`;
  }).join('');
  const caliper = `<path d="M${n(cx - r * 0.7)} ${n(cy - r * 0.14)}A${n(r * 0.71)} ${n(r * 0.71)} 0 0 1 ${n(cx - r * 0.32)} ${n(cy - r * 0.63)}" fill="none" stroke="#e0242f" stroke-width="${n(r * 0.14)}" stroke-linecap="round"/>`;
  const tire = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0c1122" stroke="${INK}" stroke-width="2.5"/><path class="car-tread" d="${treads}" stroke="#2a3350" stroke-width="1.4"/>${caliper}`;
  const rimR = n(r * 0.65);
  const hub = (fill: string) => `<circle cx="${cx}" cy="${cy}" r="${n(r * 0.2)}" fill="${fill}" stroke="${INK}" stroke-width="1"/>`;
  const spokes = (count: number, color: string, width: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = ((i * 360) / count + 12) * (Math.PI / 180);
      return `<path d="M${n(cx + Math.cos(a) * r * 0.16)} ${n(cy + Math.sin(a) * r * 0.16)}L${n(cx + Math.cos(a) * r * 0.6)} ${n(cy + Math.sin(a) * r * 0.6)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
    }).join('');
  switch (kind) {
    case 'muscle':
      return `${tire}<circle cx="${cx}" cy="${cy}" r="${n(r * 0.82)}" fill="none" stroke="#e0242f" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="${rimR}" fill="url(#${id}-rim)" stroke="${INK}" stroke-width="1.2"/>${spokes(6, '#2a3350', 2.2)}${hub('#e9eef5')}`;
    case 'turf':
      return `${tire}${Array.from({ length: 10 }, (_, i) => {
        const a = (i * 36 * Math.PI) / 180;
        return `<path d="M${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}l${n(Math.cos(a) * 3)} ${n(Math.sin(a) * 3 - 1.5)}" stroke="#3fcf5a" stroke-width="1.6" stroke-linecap="round"/>`;
      }).join('')}<circle cx="${cx}" cy="${cy}" r="${rimR}" fill="#2fa84a" stroke="${INK}" stroke-width="1.2"/>${spokes(5, '#145c27', 2.2)}${hub('#d9ff8a')}`;
    case 'frost':
      return `${tire}<circle cx="${cx}" cy="${cy}" r="${rimR}" fill="#d4f1ff" stroke="${INK}" stroke-width="1.2"/>${spokes(6, '#4aa6e0', 1.6)}${Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 + 12) * Math.PI) / 180;
        const x = n(cx + Math.cos(a) * r * 0.42);
        const y = n(cy + Math.sin(a) * r * 0.42);
        return `<circle cx="${x}" cy="${y}" r="0.9" fill="#ffffff"/>`;
      }).join('')}${hub('#ffffff')}`;
    case 'lightning':
      return `${tire}<circle cx="${cx}" cy="${cy}" r="${rimR}" fill="#2a3350" stroke="${INK}" stroke-width="1.2"/><path d="M${n(cx + 1.5)} ${n(cy - rimR + 1.5)}L${n(cx - 3.5)} ${n(cy + 1)}L${n(cx)} ${n(cy + 1)}L${n(cx - 1.5)} ${n(cy + rimR - 1.5)}L${n(cx + 4)} ${n(cy - 1.5)}L${n(cx + 0.5)} ${n(cy - 1.5)}Z" fill="#ffd21f" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/>`;
    // The joke wheels (ruling R23).
    case 'glazed':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#d9a066" stroke="${INK}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.82)}" fill="#ff8ac8"/>${Array.from({ length: 9 }, (_, i) => {
        const a = ((i * 40 + 10) * Math.PI) / 180;
        const x = n(cx + Math.cos(a) * r * 0.58);
        const y = n(cy + Math.sin(a) * r * 0.58);
        return `<rect x="${x - 1.4}" y="${y - 0.5}" width="2.8" height="1" rx="0.5" fill="${['#ffd21f', '#1f8bff', '#ffffff', '#2fd06a'][i % 4]}" transform="rotate(${i * 47} ${x} ${y})"/>`;
      }).join('')}<circle cx="${cx}" cy="${cy}" r="${n(r * 0.3)}" fill="${INK}" stroke="#b07d4a" stroke-width="1.2"/>`;
    case 'pepperoni':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#d9a066" stroke="${INK}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.8)}" fill="#ffd56b"/>${[0, 72, 144, 216, 288].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return `<circle cx="${n(cx + Math.cos(a) * r * 0.45)}" cy="${n(cy + Math.sin(a) * r * 0.45)}" r="${n(r * 0.16)}" fill="#c4232c"/>`;
      }).join('')}<circle cx="${cx}" cy="${cy}" r="${n(r * 0.14)}" fill="#c4232c"/><path d="M${cx} ${n(cy - r * 0.8)}V${n(cy + r * 0.8)}M${n(cx - r * 0.8)} ${cy}H${n(cx + r * 0.8)}" stroke="#e8b36a" stroke-width="0.8" opacity="0.8"/>`;
    case 'square':
      return `<rect x="${n(cx - r)}" y="${n(cy - r)}" width="${2 * r}" height="${2 * r}" rx="2" fill="#0c1122" stroke="${INK}" stroke-width="2.4"/><rect x="${n(cx - r * 0.55)}" y="${n(cy - r * 0.55)}" width="${n(r * 1.1)}" height="${n(r * 1.1)}" fill="url(#${id}-rim)" stroke="${INK}" stroke-width="1.2"/>${hub('#ffcf3f')}`;
    case 'tpRoll':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" stroke="${INK}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.72)}" fill="none" stroke="#d6dbe6" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.5)}" fill="none" stroke="#d6dbe6" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.32)}" fill="#c98a3a" stroke="${INK}" stroke-width="1.2"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.18)}" fill="${INK}"/><path d="M${n(cx + r * 0.9)} ${n(cy + r * 0.4)}q6 4 3 12" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'forceField':
      return `<circle cx="${cx}" cy="${cy}" r="${n(r + 3.5)}" fill="none" stroke="#5ff0ff" stroke-width="2" opacity="0.55"/>${tire}<circle cx="${cx}" cy="${cy}" r="${rimR}" fill="#0b2240" stroke="#5ff0ff" stroke-width="1.6"/><path d="M${cx} ${n(cy - r * 0.32)}L${n(cx + r * 0.28)} ${n(cy - r * 0.16)}L${n(cx + r * 0.28)} ${n(cy + r * 0.16)}L${cx} ${n(cy + r * 0.32)}L${n(cx - r * 0.28)} ${n(cy + r * 0.16)}L${n(cx - r * 0.28)} ${n(cy - r * 0.16)}Z" fill="#5ff0ff" opacity="0.8"/>`;
    default:
      return `${tire}<path d="M${n(cx - r * 0.82)} ${n(cy - r * 0.24)}A${n(r * 0.85)} ${n(r * 0.85)} 0 0 1 ${n(cx + r * 0.18)} ${n(cy - r * 0.82)}" fill="none" stroke="#3a4a72" stroke-width="2" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${rimR}" fill="url(#${id}-rim)" stroke="${INK}" stroke-width="1.2"/>${spokes(5, '#2a3350', 2.4)}${hub('#ffcf3f')}`;
  }
}

/** The boost trail, behind the exhaust and pointing back. */
function boost(kind: string, [x, y]: [number, number], team: 'blue' | 'orange', id: string): string {
  const [hot, warm, cool] = TEAM[team];
  const flame = (from: string, mid: string, to: string, dy = 0, length = 70, half = 9) =>
    `<linearGradient id="${id}-b${dy}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${from}"/><stop offset="0.4" stop-color="${mid}"/><stop offset="1" stop-color="${to}" stop-opacity="0"/></linearGradient><path d="M${x} ${y + dy - half}Q${x - length * 0.5} ${y + dy - half * 0.7} ${x - length} ${y + dy}Q${x - length * 0.5} ${y + dy + half * 0.7} ${x} ${y + dy + half}Z" fill="url(#${id}-b${dy})"/><path d="M${x} ${y + dy - half * 0.4}Q${x - length * 0.25} ${y + dy - half * 0.25} ${x - length * 0.45} ${y + dy}Q${x - length * 0.25} ${y + dy + half * 0.25} ${x} ${y + dy + half * 0.4}Z" fill="#ffffff" opacity="0.85"/>`;
  switch (kind) {
    case 'gold':
      return flame('#fffbe0', '#ffcf3f', '#b07d00') + [0, 1, 2, 3].map((i) => `<circle cx="${x - 20 - i * 14}" cy="${y + (i % 2 ? -10 : 9)}" r="1.6" fill="#ffe27a"/>`).join('');
    case 'ghost':
      return [0, 1, 2].map((i) => `<path d="M${x} ${y - 4 + i * 4}C${x - 20} ${y - 14 + i * 6} ${x - 40} ${y + 6 + i * 3} ${x - 64} ${y - 6 + i * 6}" fill="none" stroke="#ffffff" stroke-width="${4 - i}" stroke-linecap="round" opacity="${0.55 - i * 0.12}"/>`).join('');
    case 'phoenix':
      return flame('#fff3b8', '#ff8a1e', '#e0242f', 0, 78, 11) + [0, 1, 2].map((i) => `<path d="M${x - 24 - i * 16} ${y - 4}q-8 -10 -14 -6q6 2 4 8z" fill="#ff5a2a" opacity="0.85"/>`).join('');
    case 'hotStreak':
      return flame('#fff1e0', '#ff5a2a', '#e0242f') + [0, 1, 2].map((i) => `<path d="M${x - 10} ${y - 8 + i * 8}H${x - 58 - i * 6}" stroke="#ff9a5a" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>`).join('');
    case 'jet':
      return [0, 1].map((i) => `<path d="M${x} ${y - 3 + i * 6}H${x - 90}" stroke="#ffffff" stroke-width="${2.6 - i}" stroke-linecap="round" opacity="${0.9 - i * 0.3}"/>`).join('') + `<circle cx="${x - 2}" cy="${y}" r="4" fill="#bfe6ff" opacity="0.9"/>`;
    case 'twinTurbo':
      return flame(hot, warm, cool, -6, 64, 6) + flame(hot, warm, cool, 6, 64, 6);
    // The joke boost trails (ruling R23).
    case 'gasLeak':
      return [0, 1, 2, 3].map((i) => `<g opacity="${n(0.85 - i * 0.15)}"><circle cx="${x - 14 - i * 18}" cy="${y + (i % 2 ? -3 : 3)}" r="${6 + i * 2}" fill="#7ed957"/><circle cx="${x - 20 - i * 18}" cy="${y - 4 + (i % 2 ? -3 : 3)}" r="${4 + i * 1.5}" fill="#a8f07a"/></g>`).join('') + `<path d="M${x - 30} ${y - 16}q3 -4 6 0t6 0M${x - 58} ${y + 16}q3 -4 6 0t6 0" fill="none" stroke="#5aa83a" stroke-width="1.4" stroke-linecap="round"/>`;
    case 'suds':
      return [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${x - 12 - i * 13}" cy="${y + ((i * 7) % 5) * 3 - 6}" r="${3 + (i % 3) * 2}" fill="#d6fbff" fill-opacity="0.25" stroke="#ffffff" stroke-width="1.2" opacity="${n(0.95 - i * 0.1)}"/>`).join('');
    case 'cashCannon':
      return [0, 1, 2, 3].map((i) => `<g transform="rotate(${(i % 2 ? 1 : -1) * (12 + i * 6)} ${x - 18 - i * 18} ${y})"><rect x="${x - 26 - i * 18}" y="${y - 4}" width="16" height="8" rx="1" fill="#2fd06a" stroke="#0f6a32" stroke-width="1"/><text x="${x - 18 - i * 18}" y="${y + 2.4}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="6" fill="#0f6a32">$</text></g>`).join('');
    case 'skullSmoke':
      return `<path d="M${x} ${y - 6}Q${x - 40} ${y - 14} ${x - 80} ${y}Q${x - 40} ${y + 14} ${x} ${y + 6}Z" fill="#a9b4c8" opacity="0.35"/>` + [0, 1, 2].map((i) => {
        const sx = x - 22 - i * 22;
        const sy = y + (i % 2 ? -4 : 4);
        return `<g opacity="${n(0.95 - i * 0.2)}"><path d="M${sx - 5} ${sy}q0 -6 5 -6q5 0 5 6q0 3 -2 3v2h-6v-2q-2 0 -2 -3z" fill="#e9eef5" stroke="${INK}" stroke-width="0.8"/><circle cx="${sx - 2}" cy="${sy - 1}" r="1.2" fill="${INK}"/><circle cx="${sx + 2}" cy="${sy - 1}" r="1.2" fill="${INK}"/></g>`;
      }).join('');
    case 'spotlight':
      return `<linearGradient id="${id}-beam" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fffbe0" stop-opacity="0.9"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></linearGradient><path d="M${x} ${y - 4}L${x - 80} ${y - 22}L${x - 80} ${y + 22}L${x} ${y + 4}Z" fill="url(#${id}-beam)"/>`;
    default:
      return flame(hot, warm, cool);
  }
}

function topper(kind: string, [x, y]: [number, number]): string {
  switch (kind) {
    case 'partyHat':
      return `<path d="M${x - 9} ${y}L${x} ${y - 24}L${x + 9} ${y}Z" fill="#ff3fa4" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${x - 6} ${y - 8}L${x + 6} ${y - 8}M${x - 3.4} ${y - 15}L${x + 3.4} ${y - 15}" stroke="#ffe27a" stroke-width="2"/><circle cx="${x}" cy="${y - 25}" r="3" fill="#ffe27a" stroke="${INK}" stroke-width="1.2"/>`;
    case 'broom':
      return `<path d="M${x - 24} ${y - 2}L${x + 14} ${y - 14}" stroke="#a86a2a" stroke-width="3" stroke-linecap="round"/><path d="M${x + 12} ${y - 18}L${x + 26} ${y - 22}L${x + 30} ${y - 8}L${x + 16} ${y - 8}Z" fill="#e8c15a" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
    case 'megaphone':
      return `<path d="M${x - 10} ${y - 10}L${x + 8} ${y - 18}L${x + 8} ${y - 2}Z" fill="#e9eef5" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><rect x="${x - 14}" y="${y - 13}" width="5" height="7" rx="1.5" fill="#ff8a1e" stroke="${INK}" stroke-width="1.2"/><path d="M${x - 2} ${y}L${x - 2} ${y - 7}" stroke="${INK}" stroke-width="2"/>`;
    case 'crystalBall':
      return `<path d="M${x - 7} ${y}L${x - 5} ${y - 5}L${x + 5} ${y - 5}L${x + 7} ${y}Z" fill="#ffcf3f" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="${x}" cy="${y - 13}" r="9" fill="#9a6bff" stroke="${INK}" stroke-width="1.6"/><path d="M${x - 4} ${y - 17}Q${x - 2} ${y - 20} ${x + 1} ${y - 19}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
    case 'trophy':
      return `<path d="M${x - 8} ${y - 22}H${x + 8}V${y - 16}Q${x + 8} ${y - 9} ${x} ${y - 8}Q${x - 8} ${y - 9} ${x - 8} ${y - 16}Z" fill="#ffcf3f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${x - 8} ${y - 19}Q${x - 13} ${y - 19} ${x - 12} ${y - 14}M${x + 8} ${y - 19}Q${x + 13} ${y - 19} ${x + 12} ${y - 14}" fill="none" stroke="${INK}" stroke-width="1.4"/><path d="M${x - 1.5} ${y - 8}H${x + 1.5}V${y - 3}H${x + 5}V${y}H${x - 5}V${y - 3}H${x - 1.5}Z" fill="#ffcf3f" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    // The joke toppers (ruling R23).
    case 'clogBuster':
      return `<rect x="${x - 1.6}" y="${y - 30}" width="3.2" height="22" rx="1.2" fill="#c98a3a" stroke="${INK}" stroke-width="1"/><path d="M${x - 9} ${y}Q${x - 9} ${y - 10} ${x} ${y - 10}Q${x + 9} ${y - 10} ${x + 9} ${y}Z" fill="#e0242f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    case 'roadCone':
      return `<path d="M${x - 9} ${y}H${x + 9}L${x + 7} ${y - 3}H${x - 7}Z" fill="#ff7a12" stroke="${INK}" stroke-width="1.2"/><path d="M${x - 6} ${y - 3}L${x - 1.5} ${y - 24}H${x + 1.5}L${x + 6} ${y - 3}Z" fill="#ff7a12" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x - 4.4} ${y - 10}H${x + 4.4}M${x - 3} ${y - 17}H${x + 3}" stroke="#ffffff" stroke-width="2.2"/>`;
    case 'rubberChicken':
      return `<path d="M${x - 12} ${y}Q${x - 10} ${y - 10} ${x} ${y - 9}Q${x + 6} ${y - 9} ${x + 6} ${y - 18}Q${x + 6} ${y - 25} ${x + 11} ${y - 24}Q${x + 14} ${y - 22} ${x + 10} ${y - 19}Q${x + 9} ${y - 8} ${x + 4} ${y - 2}Z" fill="#ffd21f" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x + 13} ${y - 23}l4 1l-4 1.6z" fill="#ff7a12" stroke="${INK}" stroke-width="0.8"/><path d="M${x + 8} ${y - 26}q1 -3 3 -1q1 -3 3 0" fill="#e0242f" stroke="${INK}" stroke-width="0.8"/><circle cx="${x + 10}" cy="${y - 21.5}" r="0.9" fill="${INK}"/>`;
    case 'brainrotBeanie':
      return `<path d="M${x - 11} ${y}Q${x - 11} ${y - 14} ${x} ${y - 14}Q${x + 11} ${y - 14} ${x + 11} ${y}Z" fill="#e0242f" stroke="${INK}" stroke-width="1.4"/><path d="M${x - 11} ${y - 2}Q${x} ${y - 6} ${x + 11} ${y - 2}" fill="none" stroke="#ffd21f" stroke-width="1.6"/><path d="M${x - 5.5} ${y - 13}Q${x} ${y - 4} ${x + 5.5} ${y - 13}" fill="none" stroke="#1f8bff" stroke-width="1.6"/><rect x="${x - 0.8}" y="${y - 19}" width="1.6" height="5" fill="${INK}"/><path d="M${x} ${y - 19}l-11 -3l1 -2l10 3l10 -3l1 2z" fill="#2fd06a" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`;
    case 'auraRing':
      return `<ellipse cx="${x}" cy="${y - 16}" rx="13" ry="3.6" fill="none" stroke="#fff3a0" stroke-width="4" opacity="0.35"/><ellipse cx="${x}" cy="${y - 16}" rx="12" ry="3.2" fill="none" stroke="#ffcf3f" stroke-width="2.2"/><path d="M${x - 17} ${y - 22}l1 2l2 1l-2 1l-1 2l-1 -2l-2 -1l2 -1z M${x + 17} ${y - 24}l1 2l2 1l-2 1l-1 2l-1 -2l-2 -1l2 -1z" fill="#fff3a0"/>`;
    case 'dunceCap':
      return `<path d="M${x - 10} ${y}L${x} ${y - 30}L${x + 10} ${y}Z" fill="#f4f6fa" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><text x="${x}" y="${y - 6}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="8" fill="${INK}">D</text>`;
    case 'whistle':
      return `<path d="M${x - 10} ${y}Q${x - 14} ${y - 10} ${x - 4} ${y - 12}" fill="none" stroke="#ff3f5a" stroke-width="1.6"/><path d="M${x - 6} ${y - 12}H${x + 10}V${y - 6}H${x + 2}A5 5 0 1 1 ${x - 6} ${y - 12}Z" fill="#e9eef5" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    default:
      return '';
  }
}

/** A decal, drawn in the side band and clipped to the body. */
function decal(kind: string, { x1, x2, y1, y2 }: Body['band']): string {
  const mid = n((y1 + y2) / 2);
  const door = n(x1 + (x2 - x1) * 0.46);
  const h = y2 - y1;
  switch (kind) {
    case 'flame':
      return `<path d="M${x2} ${y1 + 2}C${x2 - 30} ${y1} ${x2 - 40} ${y1 + 6} ${x2 - 60} ${mid - 2}C${x2 - 66} ${y1 + 2} ${x2 - 84} ${y1 + 2} ${x2 - 98} ${mid}C${x2 - 104} ${mid + 4} ${x2 - 90} ${y2 - 2} ${x2 - 70} ${y2 - 3}C${x2 - 50} ${y2} ${x2 - 30} ${y2} ${x2} ${y2 - 2}Z" fill="#ff8a1e" stroke="#ffe27a" stroke-width="1.4"/>`;
    case 'pinstripe':
      return `<path d="M${x1} ${y1 + 3}H${x2 - 20}Q${x2 - 8} ${y1 + 3} ${x2 - 10} ${y1 + 9}" fill="none" stroke="#ffcf3f" stroke-width="1.2"/><path d="M${x1} ${y1 + 6}H${x2 - 26}" stroke="#ffcf3f" stroke-width="0.8"/>`;
    case 'bookworm':
      return `<path d="M${door - 10} ${mid - 6}L${door} ${mid - 3}L${door + 10} ${mid - 6}V${mid + 6}L${door} ${mid + 9}L${door - 10} ${mid + 6}Z" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/><path d="M${door} ${mid - 3}V${mid + 9}" stroke="${INK}" stroke-width="1"/><path d="M${door + 8} ${mid - 9}q4 -4 7 0q-2 4 -6 2" fill="#2fd06a" stroke="${INK}" stroke-width="0.9"/>`;
    case 'joker':
      return `<rect x="${door - 8}" y="${mid - 10}" width="16" height="20" rx="2" fill="#ffffff" stroke="${INK}" stroke-width="1.2" transform="rotate(-10 ${door} ${mid})"/><path d="M${door} ${mid - 5}L${door + 4} ${mid}L${door} ${mid + 5}L${door - 4} ${mid}Z" fill="#e0242f" transform="rotate(-10 ${door} ${mid})"/>`;
    case 'checkered':
      return Array.from({ length: Math.floor((x2 - x1) / 6) }, (_, i) => `<rect x="${x1 + i * 6}" y="${(i % 2) * 4 + y1 + 2}" width="6" height="4" fill="#ffffff"/><rect x="${x1 + i * 6}" y="${((i + 1) % 2) * 4 + y1 + 2}" width="6" height="4" fill="#0b0e17"/>`).join('');
    case 'redStripe':
      return `<rect x="${x1}" y="${mid - 3}" width="${x2 - x1}" height="6" fill="#e0242f"/><rect x="${x1}" y="${mid + 4}" width="${x2 - x1}" height="1.6" fill="#ffffff"/>`;
    case 'cameraFlash':
      return `<circle cx="${door}" cy="${mid}" r="${n(h / 2)}" fill="#ffffff" opacity="0.9"/><path d="M${door + 2} ${mid - 7}L${door - 4} ${mid + 1}L${door} ${mid + 1}L${door - 2} ${mid + 7}L${door + 5} ${mid - 2}L${door + 1} ${mid - 2}Z" fill="#ffd21f" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`;
    case 'slingshot':
      return `<path d="M${door} ${mid + 8}V${mid}M${door} ${mid}L${door - 6} ${mid - 8}M${door} ${mid}L${door + 6} ${mid - 8}" stroke="#7a4a1a" stroke-width="2.6" stroke-linecap="round"/><path d="M${door - 6} ${mid - 8}Q${door} ${mid - 2} ${door + 6} ${mid - 8}" fill="none" stroke="#e0242f" stroke-width="1.2"/>`;
    case 'crown':
      return `<path d="M${door - 10} ${mid + 6}L${door - 11} ${mid - 6}L${door - 5} ${mid - 1}L${door} ${mid - 8}L${door + 5} ${mid - 1}L${door + 11} ${mid - 6}L${door + 10} ${mid + 6}Z" fill="#ffcf3f" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    case 'fourLeaf':
      return [0, 90, 180, 270].map((angle) => `<circle cx="${door}" cy="${mid - 4}" r="4" fill="#2fd06a" stroke="${INK}" stroke-width="0.8" transform="rotate(${angle} ${door} ${mid})"/>`).join('') + `<path d="M${door} ${mid}q2 6 6 8" fill="none" stroke="#1f7a42" stroke-width="1.4"/>`;
    case 'squad':
      return [-8, 0, 8].map((dx, i) => `<circle cx="${door + dx}" cy="${mid}" r="4.5" fill="${['#1f8bff', '#ffffff', '#ff8a1e'][i]}" stroke="${INK}" stroke-width="1"/>`).join('');
    case 'wantedPoster':
      return `<rect x="${door - 10}" y="${mid - 9}" width="20" height="18" fill="#f5e3bb" stroke="#7a4a1a" stroke-width="1.2" transform="rotate(4 ${door} ${mid})"/><path d="M${door - 7} ${mid - 4}H${door + 7}M${door - 5} ${mid + 4}H${door + 5}" stroke="#7a4a1a" stroke-width="1.6"/>`;
    case 'payback':
      return `<path d="M${door + 7} ${mid}A7 7 0 1 1 ${door + 2} ${mid - 6.6}" fill="none" stroke="#ffffff" stroke-width="2.4"/><path d="M${door} ${mid - 10}L${door + 5} ${mid - 6}L${door} ${mid - 2.5}Z" fill="#ffffff"/>`;
    case 'og':
      return `<text x="${door}" y="${mid + 5}" text-anchor="middle" font-family="system-ui, sans-serif" font-style="italic" font-weight="900" font-size="14" fill="#ffffff" stroke="${INK}" stroke-width="1" paint-order="stroke">OG</text>`;
    case 'mvp':
      return `<path d="M${door - 12} ${mid - 7}H${door + 12}V${mid + 2}Q${door + 12} ${mid + 7} ${door} ${mid + 9}Q${door - 12} ${mid + 7} ${door - 12} ${mid + 2}Z" fill="#ffcf3f" stroke="${INK}" stroke-width="1.2"/><text x="${door}" y="${mid + 3}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="8" fill="${INK}">MVP</text>`;
    // The joke decals (ruling R23).
    case 'skidMarks':
      return `<path d="M${x1 + 8} ${y2 - 3}C${x1 + 40} ${y2 - 10} ${x1 + 70} ${y2 + 1} ${x1 + 104} ${y2 - 6}" stroke="#6b3e17" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.9"/><path d="M${x1 + 20} ${y2}C${x1 + 46} ${y2 - 5} ${x1 + 72} ${y2 + 3} ${x1 + 92} ${y2 - 1}" stroke="#8a5a2a" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.8"/>`;
    case 'skillIssue':
      return `<rect x="${door - 22}" y="${mid - 6}" width="44" height="12" rx="2" fill="#e0242f" stroke="${INK}" stroke-width="1" transform="rotate(-6 ${door} ${mid})"/><text x="${door}" y="${mid + 2.6}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="7" fill="#ffffff" transform="rotate(-6 ${door} ${mid})">SKILL ISSUE</text>`;
    case 'ballChaser':
      return `<circle cx="${door - 16}" cy="${mid}" r="6" fill="#ffffff" stroke="${INK}" stroke-width="1"/><path d="M${door - 16} ${mid - 2.5}l2.4 1.7l-0.9 2.8h-3l-0.9 -2.8z" fill="${INK}"/><text x="${door + 8}" y="${mid + 2.5}" text-anchor="middle" font-family="system-ui, sans-serif" font-style="italic" font-weight="900" font-size="6.5" fill="#ffffff" stroke="${INK}" stroke-width="0.6" paint-order="stroke">BALL CHASER</text>`;
    case 'ownGoal':
      return `<rect x="${door - 22}" y="${mid - 8}" width="16" height="14" fill="none" stroke="#ffffff" stroke-width="1"/><path d="M${door - 22} ${mid - 3}H${door - 6}M${door - 22} ${mid + 2}H${door - 6}M${door - 17} ${mid - 8}V${mid + 6}M${door - 12} ${mid - 8}V${mid + 6}" stroke="#ffffff" stroke-width="0.5" opacity="0.8"/><circle cx="${door - 12}" cy="${mid + 2}" r="3" fill="#ffffff" stroke="${INK}" stroke-width="0.8"/><text x="${door + 10}" y="${mid + 2.5}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="6.5" fill="#ff3f5a" stroke="${INK}" stroke-width="0.6" paint-order="stroke">OWN GOAL</text>`;
    case 'npc':
      return `<rect x="${door - 9}" y="${mid - 9}" width="18" height="18" rx="5" fill="#d6dbe6" stroke="${INK}" stroke-width="1.2"/><circle cx="${door - 3.5}" cy="${mid - 2}" r="1.3" fill="${INK}"/><circle cx="${door + 3.5}" cy="${mid - 2}" r="1.3" fill="${INK}"/><path d="M${door - 4} ${mid + 4}H${door + 4}" stroke="${INK}" stroke-width="1.2"/><text x="${door + 18}" y="${mid + 3}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="8" fill="#ffffff" stroke="${INK}" stroke-width="0.6" paint-order="stroke">NPC</text>`;
    case 'aura':
      return `<text x="${door}" y="${mid + 3}" text-anchor="middle" font-family="system-ui, sans-serif" font-style="italic" font-weight="900" font-size="9" fill="#c9a6ff" stroke="#34197a" stroke-width="1.2" paint-order="stroke">−1000 AURA</text>`;
    case 'bigBrain':
      return `<path d="M${door - 11} ${mid + 4}q-3 -9 5 -11q2 -5 8 -3q6 -3 9 3q6 1 4 8q2 6 -5 7h-16q-6 -1 -5 -4z" fill="#ff9acb" stroke="${INK}" stroke-width="1.1"/><path d="M${door - 6} ${mid - 3}q3 2 0 5M${door + 1} ${mid - 6}q-3 4 1 6M${door + 6} ${mid - 2}q-3 2 0 5" fill="none" stroke="#c4467e" stroke-width="0.9"/><path d="M${door + 15} ${mid - 8}l1 2.4l2.4 1l-2.4 1l-1 2.4l-1 -2.4l-2.4 -1l2.4 -1z" fill="#fff3a0"/>`;
    case 'copium':
      return `<rect x="${door - 7}" y="${mid - 10}" width="14" height="20" rx="5" fill="#2fd06a" stroke="${INK}" stroke-width="1.2"/><rect x="${door - 3}" y="${mid - 13}" width="6" height="4" rx="1" fill="#8a93a6" stroke="${INK}" stroke-width="0.9"/><text x="${door}" y="${mid + 2}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="3.6" fill="${INK}">COPIUM</text>`;
    case 'rip':
      return `<path d="M${door - 9} ${mid + 9}V${mid - 3}Q${door - 9} ${mid - 11} ${door} ${mid - 11}Q${door + 9} ${mid - 11} ${door + 9} ${mid - 3}V${mid + 9}Z" fill="#a9b4c8" stroke="${INK}" stroke-width="1.2"/><text x="${door}" y="${mid + 1}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="6" fill="${INK}">RIP</text><path d="M${door - 5} ${mid + 5}H${door + 5}" stroke="${INK}" stroke-width="0.6" opacity="0.6"/>`;
    case 'ratio':
      return `<path d="M${door - 20} ${mid - 8}H${door + 20}Q${door + 23} ${mid - 8} ${door + 23} ${mid - 5}V${mid + 3}Q${door + 23} ${mid + 6} ${door + 20} ${mid + 6}H${door - 8}L${door - 14} ${mid + 11}L${door - 13} ${mid + 6}H${door - 20}Q${door - 23} ${mid + 6} ${door - 23} ${mid + 3}V${mid - 5}Q${door - 23} ${mid - 8} ${door - 20} ${mid - 8}Z" fill="#ffffff" stroke="${INK}" stroke-width="1"/><text x="${door}" y="${mid + 1.5}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="7" fill="#e0242f">L + RATIO</text>`;
    case 'numberTwo':
      return `<path d="M${door - 10} ${mid + 8}q-2 -5 3 -6q-2 -5 4 -6q-1 -5 3 -6q4 1 3 6q6 1 4 6q5 1 3 6z" fill="#7a4a1a" stroke="${INK}" stroke-width="1.1"/><circle cx="${door - 2}" cy="${mid + 1}" r="1.5" fill="#ffffff"/><circle cx="${door + 3}" cy="${mid + 1}" r="1.5" fill="#ffffff"/><circle cx="${door - 2}" cy="${mid + 1.3}" r="0.7" fill="${INK}"/><circle cx="${door + 3}" cy="${mid + 1.3}" r="0.7" fill="${INK}"/><path d="M${door - 2} ${mid + 4.5}q2.5 2 5 0" fill="none" stroke="${INK}" stroke-width="0.8"/>`;
    case 'dumpsterFire':
      return `<path d="M${door - 9} ${mid - 1}H${door + 9}L${door + 7} ${mid + 9}H${door - 7}Z" fill="#2f8a4a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M${door - 6} ${mid - 1}Q${door - 7} ${mid - 8} ${door - 2} ${mid - 11}Q${door - 1} ${mid - 6} ${door + 2} ${mid - 9}Q${door + 7} ${mid - 5} ${door + 5} ${mid - 1}Z" fill="#ff8a1e" stroke="#ffe27a" stroke-width="0.8"/>`;
    default:
      return '';
  }
}

/** A sticker, slapped on high up behind the door at a slight tilt, clear of the rear wheel. */
function sticker(kind: string, at: number, { x1, x2, y1 }: Body['band']): string {
  const cx = n(x1 + (x2 - x1) * 0.22 + at * 19);
  const cy = n(y1 + 3);
  const tilt = `transform="rotate(-9 ${cx} ${cy})"`;
  if (kind === 'L') {
    return `<g ${tilt}><circle cx="${cx}" cy="${cy}" r="9" fill="#e0242f" stroke="${INK}" stroke-width="1.4"/><text x="${cx}" y="${n(cy + 4.6)}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#ffffff">L</text></g>`;
  }
  // Dare Dodger: a white feather on yellow.
  return `<g ${tilt}><circle cx="${cx}" cy="${cy}" r="9" fill="#ffd21f" stroke="${INK}" stroke-width="1.4"/><path d="M${n(cx - 4)} ${n(cy + 6)}Q${n(cx - 5)} ${n(cy - 3)} ${n(cx + 4)} ${n(cy - 6)}Q${n(cx + 2)} ${n(cy + 1)} ${n(cx - 4)} ${n(cy + 6)}Z" fill="#ffffff" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/><path d="M${n(cx - 5)} ${n(cy + 7)}L${n(cx + 2)} ${n(cy - 3)}" stroke="${INK}" stroke-width="0.8"/></g>`;
}

/** The rank emblems' metals, as RankBadge draws them, for the rank decal. */
const RANK_METAL: Record<string, [string, string, string]> = {
  bronze: ['#f2b27d', '#c47a3a', '#7a4316'],
  silver: ['#ffffff', '#c9d3e3', '#7f8ba1'],
  gold: ['#fff3b8', '#ffcf3f', '#b07d00'],
  platinum: ['#e8fffb', '#7ee0d4', '#2f9488'],
  diamond: ['#e3f3ff', '#5fb4ff', '#1f63b8'],
  champion: ['#f1e6ff', '#b58cff', '#6a3fc2'],
  grandChamp: ['#ffe1e4', '#ff6b7a', '#c0263a'],
};

/** The rank decal: your rank's emblem on the door. With no rank given, a plain steel one. */
function rankDecal(rank: string | undefined, { x1, x2, y1, y2 }: Body['band']): string {
  const [light, mid, dark] = RANK_METAL[rank ?? ''] ?? ['#d6dbe6', '#8a93a6', '#4f5767'];
  const cx = n(x1 + (x2 - x1) * 0.46);
  const cy = n((y1 + y2) / 2);
  const r = 9;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 90) * Math.PI) / 180;
    return `${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`;
  }).join('L');
  return `<path d="M${hex}Z" fill="${mid}" stroke="${dark}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${n(cx - 4.5)} ${n(cy - 2)}L${cx} ${n(cy + 1.5)}L${n(cx + 4.5)} ${n(cy - 2)}M${n(cx - 4.5)} ${n(cy + 2)}L${cx} ${n(cy + 5.5)}L${n(cx + 4.5)} ${n(cy + 2)}" fill="none" stroke="${light}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** A season decal (`season-s1-2027`): a banner with the season and the year it ended. */
function seasonDecal(kind: string, { x1, x2, y1, y2 }: Body['band']): string {
  const [, season = '', year = ''] = kind.split('-');
  const cx = n(x1 + (x2 - x1) * 0.46);
  const cy = n((y1 + y2) / 2);
  const text = (value: string, y: number, size: number, fill: string) =>
    `<text x="${cx}" y="${n(y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-style="italic" font-weight="900" font-size="${size}" fill="${fill}">${attribute(value)}</text>`;
  return `<path d="M${n(cx - 15)} ${n(cy - 9)}H${n(cx + 15)}L${n(cx + 12)} ${cy}L${n(cx + 15)} ${n(cy + 9)}H${n(cx - 15)}L${n(cx - 12)} ${cy}Z" fill="#0b1433" stroke="#ffcf3f" stroke-width="1.2" stroke-linejoin="round"/>${text(season.toUpperCase(), cy + 0.5, 8, '#ffcf3f')}${text(year, cy + 7, 5, '#ffffff')}`;
}

/**
 * The accent: a second paint wherever the player put it (ruling R22). The
 * lower body sits under a thin pinstripe; the roof is everything above the
 * side band; the side stripes run the length of the band; the nose and tail
 * are the front and back fifth.
 */
function accent(id: string, paint2: string, zones: readonly string[], body: Body, bottom: number, width: number): string {
  const p = PAINTS[paint2];
  if (!p || zones.length === 0) return '';
  const fill = `url(#${id}-accent)`;
  const { x1, x2, y1, y2 } = body.band;
  const mid = n((y1 + y2) / 2);
  const span = x2 - x1;
  const pieces: Record<string, string> = {
    lower: (() => {
      const top = n(y1 + (y2 - y1) * 0.55);
      return `<rect x="-10" y="${top}" width="${width + 20}" height="${n(bottom - top + 10)}" fill="${fill}"/><rect x="-10" y="${n(top - 1)}" width="${width + 20}" height="1.4" fill="#ffffff" opacity="0.8"/>`;
    })(),
    roof: `<rect x="-10" y="-40" width="${width + 20}" height="${n(y1 + 38)}" fill="${fill}"/>`,
    stripes: `<rect x="-10" y="${n(mid - 5)}" width="${width + 20}" height="3.2" fill="${fill}"/><rect x="-10" y="${n(mid + 1)}" width="${width + 20}" height="3.2" fill="${fill}"/>`,
    nose: `<rect x="${n(x2 - span * 0.2)}" y="-40" width="${n(width - x2 + span * 0.2 + 20)}" height="${bottom + 50}" fill="${fill}"/><rect x="${n(x2 - span * 0.2 - 0.7)}" y="-40" width="1.4" height="${bottom + 50}" fill="#ffffff" opacity="0.6"/>`,
    tail: `<rect x="-10" y="-40" width="${n(x1 + span * 0.2 + 10)}" height="${bottom + 50}" fill="${fill}"/><rect x="${n(x1 + span * 0.2 - 0.7)}" y="-40" width="1.4" height="${bottom + 50}" fill="#ffffff" opacity="0.6"/>`,
  };
  const order = ['roof', 'nose', 'tail', 'lower', 'stripes'].filter((zone) => zones.includes(zone));
  if (order.length === 0) return '';
  return `<linearGradient id="${id}-accent" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset="0.45" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>${order.map((zone) => pieces[zone]).join('')}`;
}

/**
 * The details every body gets: door seams and a handle, a vent behind the
 * front wheel, a tail light, a rocker line, and arches over the wheels.
 */
function bodyDetail(body: Body, bottom: number): string {
  const { x1, x2, y1, y2 } = body.band;
  const span = x2 - x1;
  const door = n(x1 + span * 0.46);
  const rear = n(x1 + span * 0.24);
  const seam = (x: number) => `<path d="M${x} ${n(y1 - 4)}L${n(x - 1.5)} ${n(bottom - 9)}" stroke="${INK}" stroke-width="1" opacity="0.45"/>`;
  const handle = `<rect x="${n(door - 9)}" y="${n(y1 + 2)}" width="6" height="1.8" rx="0.9" fill="#ffffff" opacity="0.7"/><rect x="${n(door - 9)}" y="${n(y1 + 3.6)}" width="6" height="0.8" fill="${INK}" opacity="0.4"/>`;
  const front = [...body.wheels].sort((a, b) => b[0] - a[0])[0]!;
  const vent = [0, 1, 2].map((i) => `<path d="M${n(front[0] - front[2] - 6 - i * 3)} ${n(y1 + 1)}l-2 ${n(y2 - y1 - 4)}" stroke="${INK}" stroke-width="1.2" opacity="0.4"/>`).join('');
  const tail = `<rect x="${n(x1 - 6)}" y="${n(y1 - 1)}" width="7" height="5" rx="1.5" fill="#ff3f4f" stroke="${INK}" stroke-width="0.9"/><rect x="${n(x1 - 5)}" y="${n(y1)}" width="3" height="1.4" fill="#ffd0d4" opacity="0.9"/>`;
  const rocker = `<path d="M${n(x1 + 6)} ${n(bottom - 13)}H${n(x2 - 6)}" stroke="#ffffff" stroke-width="0.8" opacity="0.25"/>`;
  const arches = body.wheels.map(([x, y, r]) => `<path d="M${n(x - r - 4)} ${n(y + 1)}A${r + 4} ${r + 4} 0 0 1 ${n(x + r + 4)} ${n(y + 1)}" fill="none" stroke="${INK}" stroke-width="1.6" opacity="0.55"/>`).join('');
  return `<g class="car-detail">${seam(door)}${seam(rear)}${handle}${vent}${tail}${rocker}${arches}</g>`;
}

/** The finish, laid over the paint: matte dulls it, metallic and gold fleck it, pearl gives it a sheen. */
function finishLayer(id: string, finish: string, body: Body, bottom: number, width: number): string {
  const flecks = (color: string, opacity: number) =>
    Array.from({ length: 28 }, (_, i) => {
      const x = n(body.band.x1 + ((body.band.x2 - body.band.x1) * ((i * 11) % 28)) / 28 + 2);
      const y = n(8 + ((i * 17) % Math.max(1, bottom - 10)));
      return `<circle cx="${x}" cy="${y}" r="${i % 5 === 0 ? 0.9 : 0.5}" fill="${color}" opacity="${opacity}"/>`;
    }).join('');
  switch (finish) {
    case 'matte':
      return `<rect x="-10" y="-40" width="${width + 20}" height="${bottom + 50}" fill="#1a2030" opacity="0.18"/>`;
    case 'metallic':
      return flecks('#ffffff', 0.55);
    case 'pearl':
      return `<linearGradient id="${id}-pearl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6f2"/><stop offset="0.5" stop-color="#d6fbff"/><stop offset="1" stop-color="#fff7d6"/></linearGradient><rect x="-10" y="-40" width="${width + 20}" height="${bottom + 50}" fill="url(#${id}-pearl)" opacity="0.3"/>`;
    case 'gold':
      return `<linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset="0.5" stop-color="#ffcf3f"/><stop offset="1" stop-color="#b07d00"/></linearGradient><rect x="-10" y="-40" width="${width + 20}" height="${bottom + 50}" fill="url(#${id}-gold)" opacity="0.55"/>${flecks('#fff3b8', 0.8)}`;
    default:
      return '';
  }
}

/** The color a boost trail mostly is, for its style's extra pieces. */
function trailColor(kind: string, team: 'blue' | 'orange'): string {
  const colors: Record<string, string> = { gold: '#ffcf3f', ghost: '#ffffff', phoenix: '#ff8a1e', hotStreak: '#ff5a2a', jet: '#bfe6ff', spotlight: '#fffbe0', gasLeak: '#7ed957', suds: '#d6fbff', cashCannon: '#2fd06a', skullSmoke: '#e9eef5' };
  return colors[kind] ?? TEAM[team][1];
}

/** The trail's style, drawn over the boost: sparks, smoke rings or flame tongues. A stream adds nothing. */
function trailStyle(style: string, color: string, [x, y]: [number, number]): string {
  switch (style) {
    case 'sparks':
      return Array.from({ length: 9 }, (_, i) => {
        const sx = x - 14 - i * 8;
        const sy = y + ((i * 7) % 5) * 4 - 8;
        return `<path d="M${sx - 2.4} ${sy}H${sx + 2.4}M${sx} ${sy - 2.4}V${sy + 2.4}" stroke="${color}" stroke-width="1.4" stroke-linecap="round" opacity="${n(1 - i * 0.08)}"/>`;
      }).join('');
    case 'rings':
      return [0, 1, 2].map((i) => `<ellipse cx="${x - 22 - i * 22}" cy="${y}" rx="${4 + i * 2}" ry="${8 + i * 3}" fill="none" stroke="${color}" stroke-width="${2.2 - i * 0.5}" opacity="${n(0.9 - i * 0.25)}"/>`).join('');
    case 'flames':
      return [-6, 0, 6].map((dy, i) => `<path d="M${x} ${y + dy - 2}L${x - 30 - i * 6} ${y + dy - 6}L${x - 22 - i * 6} ${y + dy}L${x - 44 - i * 8} ${y + dy + 1}L${x - 20} ${y + dy + 4}L${x} ${y + dy + 2}Z" fill="${color}" opacity="${n(0.75 - i * 0.15)}"/>`).join('');
    default:
      return '';
  }
}

let counter = 0;

/** Text for an attribute: a player's name can hold any character. */
const attribute = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A car as SVG markup. `team` colors the starter boost trail: your car is
 * always team blue, your opponent's orange. `bare` leaves out the boost and
 * the shadow, for small icons.
 */
export function drawCar(parts: Partial<CarParts>, options: { team?: 'blue' | 'orange'; bare?: boolean; title?: string; stickers?: readonly string[]; rank?: string } = {}): string {
  counter += 1;
  const id = `car${counter}`;
  const car = { ...STARTER_CAR, ...parts };
  const body = BODIES[car.body] ?? BODIES.dart!;
  const paint = PAINTS[car.paint] ? car.paint : STARTER_CAR.paint;
  const team = options.team ?? 'blue';
  const width = Math.max(...body.wheels.map(([x, , r]) => x + r), 200);
  const bottom = Math.max(...body.wheels.map(([, y, r]) => y + r));
  const left = options.bare ? -6 : -96;
  // A tall body (a porta-potty) or a high roof gets more room above.
  const top = Math.min(-32, body.roof[1] - 28);
  const viewBox = `${left} ${top} ${n(width - left + 12)} ${n(bottom - top + 8)}`;
  const decalArt = car.decal === 'rank' ? rankDecal(options.rank, body.band) : /^season-s[0-9]+-[0-9]{4}$/.test(car.decal) ? seasonDecal(car.decal, body.band) : decal(car.decal, body.band);
  return [
    `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg"${options.title ? ` role="img" aria-label="${attribute(options.title)}"` : ' aria-hidden="true"'}>`,
    '<defs>',
    paintDefs(id, paint),
    `<radialGradient id="${id}-rim" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#a9b4cf"/><stop offset="1" stop-color="#4d5878"/></radialGradient>`,
    `<linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f9ff"/><stop offset="0.45" stop-color="#9fd2ff"/><stop offset="1" stop-color="#2f7fdc"/></linearGradient>`,
    `<clipPath id="${id}-clip"><path d="${body.shape}"/></clipPath>`,
    `<filter id="${id}-shade" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.7" dy="0.9" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.45"/></filter>`,
    '</defs>',
    options.bare ? '' : `<ellipse cx="${n(width / 2)}" cy="${n(bottom + 2)}" rx="${n(width * 0.46)}" ry="6" fill="#000000" opacity="0.4"/>`,
    options.bare ? '' : boost(car.boost, body.exhaust, team, id),
    options.bare ? '' : trailStyle(car.trail, trailColor(car.boost, team), body.exhaust),
    body.under ?? '',
    `<path d="${body.shape}" fill="url(#${id}-paint)"/>`,
    `<g clip-path="url(#${id}-clip)">`,
    finishOverlay(paint, body),
    car.paint2 !== 'none' ? accent(id, car.paint2, Array.isArray(car.accents) ? car.accents : ['lower'], body, bottom, width) : '',
    finishLayer(id, car.finish, body, bottom, width),
    body.inner ?? '',
    body.novelty ? '' : bodyDetail(body, bottom),
    `<rect x="-10" y="${bottom - 22}" width="${width + 20}" height="30" fill="#000000" opacity="0.22"/>`,
    `<g filter="url(#${id}-shade)">${decalArt}</g>`,
    ...(options.stickers ?? []).map((kind, at) => sticker(kind, at, body.band)),
    '</g>',
    ...body.glass.map((glass) => `<path d="${glass}" fill="url(#${id}-glass)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`),
    `<path d="${body.shine}" fill="none" stroke="#ffffff" stroke-width="${car.finish === 'metallic' ? 2.2 : 1.6}" stroke-linecap="round" opacity="${car.finish === 'matte' ? 0.2 : 0.75}"/>`,
    `<path d="${body.shape}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`,
    body.extra ?? '',
    `<circle cx="${body.light[0]}" cy="${body.light[1]}" r="3" fill="#fff6c9" stroke="${INK}" stroke-width="1"/>`,
    ...body.wheels.map(([x, y, r]) => wheel(car.wheels, x, y, r, id)),
    car.topper !== 'none' ? `<ellipse cx="${body.roof[0]}" cy="${n(body.roof[1] + 0.5)}" rx="7" ry="1.8" fill="${INK}" opacity="0.55"/><g filter="url(#${id}-shade)">${topper(car.topper, body.roof)}</g>` : '',
    '</svg>',
  ].join('');
}
