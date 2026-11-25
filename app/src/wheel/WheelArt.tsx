import { landingTurn, rimPoint, sliceLabel, sliceMiddle } from './turn.ts';

const FILLS = ['#1f6fff', '#ff7a2f', '#3a86ff', '#ff9a3d'];
const R = 150;

/**
 * The Wheel of Shame, drawn for this app: one slice per dare, team blue and
 * orange in turn, and a gold pointer at the top. Spinning turns the whole
 * disc (transform only), so it stays smooth on a phone.
 */
export function WheelArt(props: { pool: string[]; landed: number | null; animate: boolean; label: string }) {
  const count = Math.max(props.pool.length, 1);
  const turn = props.landed === null ? 0 : landingTurn(props.landed, count);
  const fontSize = count > 12 ? 9 : count > 8 ? 10 : 11;
  return (
    <div class="wheel-art" role="img" aria-label={props.label}>
      <svg viewBox="-162 -176 324 340" aria-hidden="true">
        <circle r={R + 8} fill="#050914" stroke="#ffcf3f" stroke-width="3" />
        <g class="wheel-disc" data-animate={props.animate} style={{ transform: `rotate(${turn}deg)` }}>
          {props.pool.map((dare, index) => {
            const from = rimPoint((index * 360) / count, R);
            const to = rimPoint(((index + 1) * 360) / count, R);
            const large = 360 / count > 180 ? 1 : 0;
            const middle = sliceMiddle(index, count);
            return (
              <g key={index}>
                <path d={`M0 0 L${from.x.toFixed(2)} ${from.y.toFixed(2)} A${R} ${R} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)} Z`} fill={FILLS[index % 2 === 0 ? (index % 4 === 0 ? 0 : 2) : index % 4 === 1 ? 1 : 3]} stroke="#050914" stroke-width="2" />
                <text class="wheel-label" transform={`rotate(${(middle - 90).toFixed(2)}) translate(${R * 0.52} 0)`} font-size={fontSize} text-anchor="middle" dominant-baseline="central">
                  {sliceLabel(dare)}
                </text>
              </g>
            );
          })}
          <circle r="24" fill="#0a1330" stroke="#ffcf3f" stroke-width="4" />
          <circle r="7" fill="#ffcf3f" />
        </g>
        <path d="M0 -136 L-15 -170 L15 -170 Z" fill="#ffcf3f" stroke="#050914" stroke-width="3" stroke-linejoin="round" />
      </svg>
    </div>
  );
}
