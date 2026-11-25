/** The studio mark: crossed nunchucks over a gold starburst. Original art. */

const INK = '#0b0b0f';
const BURST =
  '200,20 237.5,64.9 292.5,44.8 302.5,102.5 360.2,112.5 340.1,167.5 385,205 340.1,242.5 360.2,297.5 302.5,307.5 292.5,365.2 237.5,345.1 200,390 162.5,345.1 107.5,365.2 97.5,307.5 39.8,297.5 59.9,242.5 15,205 59.9,167.5 39.8,112.5 97.5,102.5 107.5,44.8 162.5,64.9';

/** Chain links along the curve from one handle to the other. */
function chainLinks() {
  const links = [];
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    // A quadratic curve from (140,126) through (200,36) to (260,126).
    const x = (1 - t) ** 2 * 140 + 2 * t * (1 - t) * 200 + t ** 2 * 260;
    const y = (1 - t) ** 2 * 126 + 2 * t * (1 - t) * 36 + t ** 2 * 126;
    const dx = 2 * (1 - t) * 60 + 2 * t * 60;
    const dy = 2 * (1 - t) * -90 + 2 * t * 90;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const flat = i % 2 === 0;
    links.push(
      <ellipse
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        rx={flat ? 10 : 8}
        ry={flat ? 6 : 3.4}
        transform={`rotate(${angle.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
        fill={flat ? 'none' : 'url(#nm-steel)'}
        stroke={flat ? 'url(#nm-steel)' : INK}
        stroke-width={flat ? 4.5 : 1.5}
      />,
    );
  }
  return links;
}

function Handle(props: { className: string; rotate: number }) {
  return (
    <g class={props.className} transform={`rotate(${props.rotate} 200 250)`}>
      <rect x="181" y="118" width="38" height="250" rx="19" fill="url(#nm-wood)" stroke={INK} stroke-width="6" />
      <rect x="205" y="132" width="9" height="222" rx="4.5" fill="#8f4d12" opacity="0.55" />
      <rect x="188" y="146" width="5" height="112" rx="2.5" fill="#ffd9a3" opacity="0.9" />
      <path d="M196 150v104M200 156v92" stroke="#b9681d" stroke-width="1.2" opacity="0.6" />
      {[272, 294, 316].map((y) => (
        <g>
          <rect x="184" y={y} width="32" height="9" fill={INK} />
          <rect x="184" y={y} width="32" height="2" fill="#4a4a55" />
        </g>
      ))}
      {[116, 346].map((y) => (
        <g>
          <rect x="183" y={y} width="34" height="24" rx="10" fill="url(#nm-steel)" stroke={INK} stroke-width="5" />
          <rect x="188" y={y + 4} width="10" height="4" rx="2" fill="#ffffff" opacity="0.85" />
        </g>
      ))}
    </g>
  );
}

export function NunchucksMark() {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label="Nunchucks slam to a stop over a gold starburst">
      <defs>
        <radialGradient id="nm-gold" cx="0.42" cy="0.36" r="0.7">
          <stop offset="0" stop-color="#fff3c4" />
          <stop offset="0.55" stop-color="#ffcf3f" />
          <stop offset="1" stop-color="#d9951d" />
        </radialGradient>
        <radialGradient id="nm-cream" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stop-color="#fff6d6" />
          <stop offset="1" stop-color="#ffd873" />
        </radialGradient>
        <linearGradient id="nm-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#f6ad5c" />
          <stop offset="0.45" stop-color="#d9822b" />
          <stop offset="1" stop-color="#a85c18" />
        </linearGradient>
        <linearGradient id="nm-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.5" stop-color="#d6dbe3" />
          <stop offset="1" stop-color="#8e97a8" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="205" r="178" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.35" />
      <g stroke="#ffffff" stroke-width="4" stroke-linecap="round">
        <path d="M352.6 245.9L389.3 255.7M311.7 316.7L338.6 343.6M240.9 357.6L250.7 394.3M159.1 357.6L149.3 394.3M88.3 316.7L61.4 343.6M47.4 245.9L10.7 255.7M47.4 164.1L10.7 154.3M88.3 93.3L61.4 66.4M159.1 52.4L149.3 15.7M240.9 52.4L250.7 15.7M311.7 93.3L338.6 66.4M352.6 164.1L389.3 154.3" />
      </g>
      <polygon points={BURST} fill="url(#nm-gold)" stroke={INK} stroke-width="6" stroke-linejoin="round" />
      <circle cx="200" cy="205" r="122" fill="#ffffff" />
      <circle cx="200" cy="205" r="104" fill="url(#nm-cream)" />
      <path d="M118 150A98 98 0 0 1 250 118" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.7" />
      {chainLinks()}
      <Handle className="mark-handle-a" rotate={-27} />
      <Handle className="mark-handle-b" rotate={27} />
    </svg>
  );
}
