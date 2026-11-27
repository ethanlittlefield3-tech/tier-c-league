// What a car stands in front of (rulings R21 and R27), drawn for this app as
// small scenes: in the Garage, on its backdrop tiles, and in the showroom on a
// player's card. Each fills its box from the bottom up, so the car always
// stands on the floor. Scattered details (stars, crowds, windows, confetti,
// snow) come from a fixed seed, so a scene looks the same every time.
import type { Backdrop } from './backdrops.ts';

/** A small fixed-seed random generator: the same numbers every time. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function scatter(seed: number, count: number, box: { x: number; y: number; w: number; h: number }) {
  const next = seeded(seed);
  return Array.from({ length: count }, () => ({ x: box.x + next() * box.w, y: box.y + next() * box.h, r: next(), c: next() }));
}

const STARS = scatter(7, 46, { x: 0, y: 0, w: 400, h: 110 });
const CROWD = scatter(11, 190, { x: 70, y: 92, w: 260, h: 54 });
const CONFETTI = scatter(23, 42, { x: 10, y: 10, w: 380, h: 150 });
const SNOW = scatter(31, 70, { x: 0, y: 0, w: 400, h: 240 });
const PIXELS = scatter(41, 40, { x: 0, y: 0, w: 400, h: 120 });
const WINDOWS = scatter(53, 120, { x: 0, y: 70, w: 400, h: 110 });

function Garage() {
  return (
    <>
      <defs>
        <linearGradient id="bd-garage-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d1736" />
          <stop offset="1" stop-color="#091128" />
        </linearGradient>
        <linearGradient id="bd-garage-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#14224a" />
          <stop offset="1" stop-color="#060b1c" />
        </linearGradient>
        <linearGradient id="bd-garage-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff6d6" stop-opacity="0.45" />
          <stop offset="1" stop-color="#fff6d6" stop-opacity="0" />
        </linearGradient>
        <radialGradient id="bd-garage-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#1f8bff" stop-opacity="0.45" />
          <stop offset="1" stop-color="#1f8bff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-garage-wall)" />
      {Array.from({ length: 34 }, (_, index) => (
        <rect x={index * 12} y="0" width="1.5" height="172" fill="#9fd0ff" opacity="0.06" />
      ))}
      {/* The roll-up door. */}
      <rect x="128" y="42" width="144" height="130" rx="3" fill="#0f1c44" stroke="#22356f" stroke-width="2" />
      {Array.from({ length: 12 }, (_, index) => (
        <rect x="130" y={50 + index * 10} width="140" height="1.5" fill="#2a417f" opacity="0.7" />
      ))}
      <rect x="190" y="160" width="20" height="5" rx="2" fill="#3a5aa8" />
      {/* The pegboard and its tools. */}
      <rect x="18" y="62" width="88" height="72" rx="4" fill="#111d47" stroke="#22356f" />
      {Array.from({ length: 40 }, (_, index) => (
        <circle cx={26 + (index % 10) * 8} cy={70 + Math.floor(index / 10) * 16} r="1.2" fill="#2a417f" />
      ))}
      <path d="M34 78l18 18m-22-14a5 5 0 1 0 7-7" fill="none" stroke="#7ea6e6" stroke-width="3" stroke-linecap="round" />
      <path d="M66 76h22m-11 0v28" fill="none" stroke="#ffb066" stroke-width="4" stroke-linecap="round" />
      <path d="M90 96l-10 22" fill="none" stroke="#9fd0ff" stroke-width="3" stroke-linecap="round" />
      {/* A stack of tires. */}
      {[0, 1, 2].map((index) => (
        <g transform={`translate(332 ${150 - index * 17})`}>
          <ellipse cx="0" cy="0" rx="30" ry="10" fill="#0a0f22" stroke="#26365e" stroke-width="3" />
          <ellipse cx="0" cy="-2" rx="12" ry="4" fill="#141f3f" />
        </g>
      ))}
      {/* Two hanging lamps with their light. */}
      {[110, 290].map((x) => (
        <g>
          <path d={`M${x} 0v26`} stroke="#22356f" stroke-width="2" />
          <path d={`M${x - 12} 34h24l-6-8h-12Z`} fill="#22356f" />
          <path d={`M${x - 11} 34h22l40 140h-102Z`} fill="url(#bd-garage-cone)" />
        </g>
      ))}
      <rect y="172" width="400" height="68" fill="url(#bd-garage-floor)" />
      <rect y="172" width="400" height="2" fill="#2a417f" opacity="0.8" />
      <ellipse cx="200" cy="214" rx="170" ry="26" fill="url(#bd-garage-glow)" />
      <path d="M40 240l30-58M360 240l-30-58" stroke="#ffcf3f" stroke-width="3" opacity="0.45" />
    </>
  );
}

function Stadium() {
  return (
    <>
      <defs>
        <linearGradient id="bd-stadium-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#040820" />
          <stop offset="1" stop-color="#13305f" />
        </linearGradient>
        <radialGradient id="bd-stadium-flood" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#fffbe6" stop-opacity="0.95" />
          <stop offset="0.25" stop-color="#fff2b0" stop-opacity="0.45" />
          <stop offset="1" stop-color="#fff2b0" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="bd-stadium-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="1" stop-color="#bfe0ff" stop-opacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-stadium-sky)" />
      {/* The stands, in tiers, full of fans. */}
      <path d="M0 150L50 84h300l50 66Z" fill="#0b1636" />
      <path d="M30 150l34-46h272l34 46Z" fill="#0f1d45" />
      <path d="M60 150l20-24h240l20 24Z" fill="#132554" />
      {CROWD.map((fan) => (
        <circle cx={fan.x} cy={fan.y} r={1.3 + fan.r * 0.9} fill={fan.c < 0.4 ? '#3d9bff' : fan.c < 0.75 ? '#ff8a1e' : '#e9eef5'} opacity={0.35 + fan.r * 0.4} />
      ))}
      {/* Floodlight towers. */}
      {[34, 366].map((x) => (
        <g>
          <path d={`M${x} 150V40`} stroke="#22356f" stroke-width="4" />
          <rect x={x - 16} y="26" width="32" height="16" rx="2" fill="#1a2a5c" />
          {[0, 1, 2, 3].map((index) => (
            <rect x={x - 13 + index * 7} y="29" width="5" height="10" fill="#fff8d6" />
          ))}
          <circle cx={x} cy="34" r="46" fill="url(#bd-stadium-flood)" />
        </g>
      ))}
      {/* The pitch: mowing stripes, the halfway line, the center circle and both goals. */}
      {Array.from({ length: 10 }, (_, index) => (
        <rect x={index * 40} y="150" width="40" height="90" fill={index % 2 ? '#1f7438' : '#1a6631'} />
      ))}
      <rect y="150" width="400" height="90" fill="url(#bd-stadium-haze)" />
      <path d="M200 150v90" stroke="#ffffff" stroke-width="2" opacity="0.7" />
      <ellipse cx="200" cy="200" rx="64" ry="16" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7" />
      <rect y="150" width="400" height="2" fill="#ffffff" opacity="0.6" />
      <path d="M0 176h18v40H0M400 176h-18v40h18" fill="rgba(255,255,255,0.08)" stroke="#ffffff" stroke-width="2" opacity="0.75" />
    </>
  );
}

function Tunnel() {
  const rings = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <>
      <defs>
        <radialGradient id="bd-tunnel-bg" cx="0.5" cy="0.55" r="0.7">
          <stop offset="0" stop-color="#1a0840" />
          <stop offset="1" stop-color="#04010d" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-tunnel-bg)" />
      {/* Lines rushing to the far end. */}
      {[-200, -120, -60, 0, 60, 120, 200, 400, 600].map((x) => (
        <path d={`M${x} 240L200 122`} stroke="#5ff0ff" stroke-width="1" opacity="0.25" />
      ))}
      {[0, 400].map((x) =>
        [-40, 40, 120].map((y) => <path d={`M${x} ${y}L200 122`} stroke="#ff3fc4" stroke-width="1" opacity="0.2" />),
      )}
      {/* Neon rings, nearest the biggest. */}
      {rings.map((index) => {
        const scale = Math.pow(0.72, index);
        const w = 420 * scale;
        const h = 280 * scale;
        const color = index % 2 ? '#5ff0ff' : '#ff3fc4';
        return (
          <g opacity={1 - index * 0.09}>
            <rect x={200 - w / 2} y={122 - h / 2} width={w} height={h} rx={40 * scale} fill="none" stroke={color} stroke-width={8 * scale + 1} opacity="0.25" />
            <rect x={200 - w / 2} y={122 - h / 2} width={w} height={h} rx={40 * scale} fill="none" stroke={color} stroke-width={2 * scale + 0.6} />
          </g>
        );
      })}
      <ellipse cx="200" cy="122" rx="22" ry="14" fill="#ffffff" opacity="0.5" />
      <rect y="200" width="400" height="40" fill="#04010d" opacity="0.55" />
    </>
  );
}

function Podium() {
  const colors = ['#ffcf3f', '#ff3f5a', '#3d9bff', '#2fd06a', '#ffffff', '#b58cff'];
  return (
    <>
      <defs>
        <linearGradient id="bd-podium-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#090720" />
          <stop offset="1" stop-color="#1a1238" />
        </linearGradient>
        <linearGradient id="bd-podium-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe9a0" stop-opacity="0.55" />
          <stop offset="1" stop-color="#ffe9a0" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="bd-podium-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe17a" />
          <stop offset="1" stop-color="#a57300" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-podium-bg)" />
      {/* Curtains either side. */}
      {Array.from({ length: 7 }, (_, index) => (
        <>
          <rect x={index * 9} y="0" width="9" height="240" fill={index % 2 ? '#5a0f2a' : '#71153a'} />
          <rect x={337 + index * 9} y="0" width="9" height="240" fill={index % 2 ? '#5a0f2a' : '#71153a'} />
        </>
      ))}
      {/* Spotlights on the winner. */}
      <path d="M120 0h22l78 200h-60Z" fill="url(#bd-podium-beam)" />
      <path d="M258 0h22l-60 200h-60Z" fill="url(#bd-podium-beam)" />
      <path d="M190 0h20l30 200h-80Z" fill="url(#bd-podium-beam)" opacity="0.8" />
      {CONFETTI.map((bit) => (
        <rect x={bit.x} y={bit.y} width="5" height="2.4" fill={colors[Math.floor(bit.c * colors.length)]} transform={`rotate(${Math.round(bit.r * 180)} ${bit.x} ${bit.y})`} opacity="0.85" />
      ))}
      {/* The steps: 2, 1, 3. */}
      <rect x="86" y="186" width="76" height="54" fill="#8c9bb8" />
      <rect x="86" y="186" width="76" height="5" fill="#d7e0f0" />
      <rect x="162" y="166" width="76" height="74" fill="url(#bd-podium-gold)" />
      <rect x="162" y="166" width="76" height="5" fill="#fff3b8" />
      <rect x="238" y="196" width="76" height="44" fill="#9a5a2a" />
      <rect x="238" y="196" width="76" height="5" fill="#d9925a" />
      <text x="124" y="226" font-size="22" font-weight="900" font-style="italic" fill="#ffffff" opacity="0.6" text-anchor="middle">
        2
      </text>
      <text x="200" y="232" font-size="26" font-weight="900" font-style="italic" fill="#fff3b8" opacity="0.75" text-anchor="middle">
        1
      </text>
      <text x="276" y="230" font-size="20" font-weight="900" font-style="italic" fill="#ffffff" opacity="0.6" text-anchor="middle">
        3
      </text>
    </>
  );
}

function Rooftop() {
  return (
    <>
      <defs>
        <linearGradient id="bd-roof-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#040a22" />
          <stop offset="1" stop-color="#22285a" />
        </linearGradient>
        <radialGradient id="bd-roof-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#fffbe0" stop-opacity="0.6" />
          <stop offset="1" stop-color="#fffbe0" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-roof-sky)" />
      {STARS.map((star) => (
        <circle cx={star.x} cy={star.y} r={0.5 + star.r} fill="#ffffff" opacity={0.3 + star.c * 0.6} />
      ))}
      <circle cx="318" cy="48" r="40" fill="url(#bd-roof-moon)" />
      <circle cx="318" cy="48" r="17" fill="#f6f1d4" />
      <circle cx="312" cy="44" r="3.5" fill="#ddd6b0" />
      <circle cx="323" cy="54" r="2.5" fill="#ddd6b0" />
      {/* The city: far, then near, with lit windows. */}
      <path d="M0 150V96h30V80h26v26h22V70h34v40h20V88h28v62h32V76h24V60h18v20h26v70h30V92h30v-14h30v72h20V100h30v50Z" fill="#0e1738" />
      <path d="M0 176V122h40v-18h36v38h30V112h44v64h26V130h40v-26h36v72h30V118h40v-12h36v70h22V136h20v40Z" fill="#0a1230" />
      {WINDOWS.filter((spot) => spot.c > 0.45).map((spot) => (
        <rect x={Math.round(spot.x / 6) * 6} y={Math.round(spot.y / 8) * 8} width="3" height="4" fill={spot.r > 0.7 ? '#9fe6ff' : '#ffd77a'} opacity={0.35 + spot.r * 0.5} />
      ))}
      {/* A water tower, and an aerial with its red light. */}
      <g fill="#070d24">
        <rect x="58" y="128" width="26" height="22" rx="3" />
        <path d="M56 128l15-8 15 8Z" />
        <path d="M60 150l4 22M82 150l-4 22" stroke="#070d24" stroke-width="2" />
      </g>
      <path d="M300 104V64" stroke="#070d24" stroke-width="2" />
      <circle cx="300" cy="62" r="2.5" fill="#ff3f5a" />
      <circle cx="300" cy="62" r="7" fill="#ff3f5a" opacity="0.25" />
      {/* The roof you're parked on. */}
      <rect y="176" width="400" height="64" fill="#121a3a" />
      <rect y="176" width="400" height="3" fill="#2c3a72" />
      <rect x="330" y="160" width="40" height="18" rx="2" fill="#1a2550" />
      <path d="M336 164h28M336 170h28" stroke="#2c3a72" stroke-width="2" />
      <path d="M0 226h400" stroke="#ffcf3f" stroke-width="2" stroke-dasharray="14 10" opacity="0.35" />
    </>
  );
}

function Canyon() {
  return (
    <>
      <defs>
        <linearGradient id="bd-canyon-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2b0f3c" />
          <stop offset="0.55" stop-color="#d9534a" />
          <stop offset="1" stop-color="#ffb36b" />
        </linearGradient>
        <radialGradient id="bd-canyon-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffe7a1" />
          <stop offset="0.5" stop-color="#ffd27a" stop-opacity="0.6" />
          <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="bd-canyon-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b0573a" />
          <stop offset="1" stop-color="#5a2418" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-canyon-sky)" />
      <circle cx="250" cy="138" r="70" fill="url(#bd-canyon-sun)" />
      <circle cx="250" cy="138" r="26" fill="#ffe3a0" />
      {/* Mesas, far to near. */}
      <path d="M0 150V112h40l10-10h50l8 10h32v38ZM210 150v-44h20l6-10h60l6 10h30v44ZM340 150v-30h40l8-8h12v38Z" fill="#8c3b4c" />
      <path d="M0 172V130h70l12-14h40l10 14h26v42ZM250 172v-50h40l10-12h44l8 12h58v50Z" fill="#6b2a3c" />
      <path d="M0 186V158h30l8-10h34l6 10h120v28ZM300 186v-34h30l10-8h30l10 8h20v34Z" fill="#4a1c2e" />
      {/* Saguaros. */}
      {[
        [60, 170, 1],
        [356, 172, 0.8],
      ].map(([x, y, s]) => (
        <path
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M-4 0v-40a4 4 0 0 1 8 0V0ZM4-22h6v-10a3 3 0 0 1 6 0v14a4 4 0 0 1-4 4H4ZM-4-16h-6v-12a3 3 0 0 0-6 0v16a4 4 0 0 0 4 4h8Z"
          fill="#2a0f1c"
        />
      ))}
      <rect y="184" width="400" height="56" fill="url(#bd-canyon-ground)" />
      <path d="M120 240L180 186h40l60 54Z" fill="#7a3624" opacity="0.6" />
      <path d="M200 192v8M200 208v12M200 228v12" stroke="#ffd27a" stroke-width="3" opacity="0.6" />
    </>
  );
}

function Snowfield() {
  return (
    <>
      <defs>
        <linearGradient id="bd-snow-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#06122e" />
          <stop offset="1" stop-color="#2a4a7a" />
        </linearGradient>
        <linearGradient id="bd-snow-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#2fd06a" stop-opacity="0" />
          <stop offset="0.4" stop-color="#4dffb0" stop-opacity="0.55" />
          <stop offset="0.7" stop-color="#5ff0ff" stop-opacity="0.45" />
          <stop offset="1" stop-color="#b58cff" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="bd-snow-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e4eeff" />
          <stop offset="1" stop-color="#93acd6" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-snow-sky)" />
      <path d="M0 70C60 40 120 90 200 60s140-10 200-40v26C340 76 280 60 200 86S60 70 0 96Z" fill="url(#bd-snow-aurora)" />
      <path d="M0 50C80 30 140 70 220 44s120-6 180-30v10C340 50 280 40 220 60S80 50 0 64Z" fill="url(#bd-snow-aurora)" opacity="0.6" />
      {/* Mountains, then pines with snow on their shoulders. */}
      <path d="M0 160L60 96l40 34 50-58 60 70 50-48 60 52 40-30 40 34v10Z" fill="#30466f" />
      <path d="M60 96l14 12-10 4-10-6ZM150 72l16 18-12 2-8-8ZM260 94l14 12-12 2Z" fill="#dfe9ff" opacity="0.8" />
      {[18, 52, 96, 300, 336, 372].map((x, index) => {
        const h = 46 + (index % 3) * 12;
        return (
          <g transform={`translate(${x} 186)`}>
            <path d={`M0 ${-h}l16 ${h * 0.45}h-8l14 ${h * 0.35}h-9l13 ${h * 0.2}h-52l13 ${-h * 0.2}h-9l14 ${-h * 0.35}h-8Z`} fill="#0b1a2e" />
            <path d={`M0 ${-h}l6 ${h * 0.17}-6-3-6 3Z`} fill="#eef4ff" />
            <rect x="-3" y="0" width="6" height="6" fill="#0b1a2e" />
          </g>
        );
      })}
      <path d="M0 186C80 176 160 192 240 182s120 4 160-4v62H0Z" fill="url(#bd-snow-ground)" />
      <path d="M0 210c60-8 120 6 200-2s140-6 200 2" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.6" />
      {SNOW.map((flake) => (
        <circle cx={flake.x} cy={flake.y} r={0.6 + flake.r * 1.4} fill="#ffffff" opacity={0.35 + flake.c * 0.55} />
      ))}
    </>
  );
}

function Arcade() {
  const cabinets = [
    { x: 14, glow: '#ff3fc4' },
    { x: 82, glow: '#5ff0ff' },
    { x: 262, glow: '#ffcf3f' },
    { x: 330, glow: '#2fd06a' },
  ];
  return (
    <>
      <defs>
        <linearGradient id="bd-arcade-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#160536" />
          <stop offset="1" stop-color="#05010f" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bd-arcade-bg)" />
      {PIXELS.map((pixel) => (
        <rect x={Math.round(pixel.x / 4) * 4} y={Math.round(pixel.y / 4) * 4} width="3" height="3" fill={pixel.c > 0.5 ? '#5ff0ff' : '#ff3fc4'} opacity={0.25 + pixel.r * 0.5} />
      ))}
      {/* A pixel bolt sign on the back wall. */}
      <g fill="#ffcf3f" opacity="0.9">
        {[
          [204, 30],
          [200, 34],
          [196, 38],
          [192, 42],
          [196, 42],
          [200, 42],
          [204, 42],
          [200, 46],
          [196, 50],
          [192, 54],
        ].map(([x, y]) => (
          <rect x={x} y={y} width="4" height="4" />
        ))}
      </g>
      <rect x="170" y="22" width="60" height="42" rx="4" fill="none" stroke="#ff3fc4" stroke-width="2" opacity="0.7" />
      {/* Cabinets with glowing screens. */}
      {cabinets.map((cab) => (
        <g transform={`translate(${cab.x} 70)`}>
          <path d="M0 0h54v12l-6 8v50l6 12v36H0v-36l6-12V20L0 12Z" fill="#0d0a2a" stroke="#2b2266" stroke-width="2" />
          <rect x="4" y="2" width="46" height="8" fill={cab.glow} opacity="0.85" />
          <rect x="9" y="24" width="36" height="34" rx="2" fill={cab.glow} opacity="0.35" />
          <rect x="13" y="28" width="28" height="26" fill={cab.glow} opacity="0.25" />
          <rect x="6" y="76" width="42" height="6" fill="#1d1650" />
          <circle cx="18" cy="72" r="3" fill="#ff3f5a" />
          <circle cx="34" cy="74" r="2.5" fill={cab.glow} />
          <circle cx="42" cy="74" r="2.5" fill={cab.glow} />
        </g>
      ))}
      {/* A neon grid floor running to the back. */}
      <rect y="168" width="400" height="72" fill="#0a0420" />
      {[-400, -240, -120, -40, 40, 120, 200, 280, 360, 440, 520, 640, 800].map((x) => (
        <path d={`M${x} 240L200 168`} stroke="#ff3fc4" stroke-width="1.2" opacity="0.5" />
      ))}
      {[170, 174, 180, 188, 198, 212, 230].map((y) => (
        <path d={`M0 ${y}h400`} stroke="#ff3fc4" stroke-width="1.2" opacity="0.45" />
      ))}
      <rect y="167" width="400" height="2" fill="#5ff0ff" opacity="0.7" />
    </>
  );
}

const SCENES: Record<Backdrop, () => preact.JSX.Element> = {
  garage: Garage,
  stadium: Stadium,
  tunnel: Tunnel,
  podium: Podium,
  rooftop: Rooftop,
  canyon: Canyon,
  snowfield: Snowfield,
  arcade: Arcade,
};

/** A backdrop's scene, filling its box behind whatever stands in front. */
export function BackdropArt(props: { kind: Backdrop }) {
  const Scene = SCENES[props.kind];
  return (
    <svg class="backdrop-art" viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <Scene />
    </svg>
  );
}
