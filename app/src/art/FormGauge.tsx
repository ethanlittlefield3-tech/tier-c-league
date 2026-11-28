// The form gauge (the commish's request, 2026-11-28): one number out of 100,
// drawn as a boost gauge. Forty segments light up blue to gold as it rises,
// with a notch where each rank starts and a marker for this week's pace.
import { RANK_FLOORS } from '@tcl/engine';

const SEGMENTS = 40;
const START = 150;
const SWEEP = 240;
const CX = 120;
const CY = 118;

const point = (angle: number, radius: number) => {
  const radians = (angle * Math.PI) / 180;
  return [CX + radius * Math.cos(radians), CY + radius * Math.sin(radians)] as const;
};
const angleOf = (value: number) => START + (SWEEP * Math.max(0, Math.min(100, value))) / 100;

/** Blue at the bottom of the gauge, through cyan, to gold at the top. */
function colorAt(share: number): string {
  const stops = [
    [0, [61, 155, 255]],
    [0.6, [94, 224, 255]],
    [1, [255, 207, 63]],
  ] as const;
  const upper = stops.findIndex(([at]) => at >= share);
  const [a, from] = stops[Math.max(0, upper - 1)]!;
  const [b, to] = stops[Math.max(0, upper)]!;
  const t = b === a ? 0 : (share - a) / (b - a);
  const mix = from.map((channel, index) => Math.round(channel + (to[index]! - channel) * t));
  return `rgb(${mix.join(', ')})`;
}

export function FormGauge(props: { value: number | null; pace?: number | null }) {
  const value = props.value ?? 0;
  return (
    <svg class="form-gauge" viewBox="0 0 240 200" aria-hidden="true">
      <defs>
        <radialGradient id="form-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1f8bff" stop-opacity="0.28" />
          <stop offset="70%" stop-color="#1f8bff" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#1f8bff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r="78" fill="url(#form-core)" />
      <circle cx={CX} cy={CY} r="70" fill="none" stroke="rgba(196, 216, 255, 0.1)" stroke-width="1" stroke-dasharray="2 4" />
      {Array.from({ length: SEGMENTS }, (_, index) => {
        const share = (index + 0.5) / SEGMENTS;
        const angle = START + SWEEP * share;
        const [x1, y1] = point(angle, 86);
        const [x2, y2] = point(angle, 101);
        const lit = props.value !== null && share * 100 <= value;
        return (
          <line
            class={lit ? 'form-seg form-seg-lit' : 'form-seg'}
            style={lit ? { '--i': index, stroke: colorAt(share) } : undefined}
            x1={x1.toFixed(2)}
            y1={y1.toFixed(2)}
            x2={x2.toFixed(2)}
            y2={y2.toFixed(2)}
          />
        );
      })}
      {/* Where each rank starts. */}
      {RANK_FLOORS.filter(([, floor]) => floor > 0).map(([rank, floor]) => {
        const [x1, y1] = point(angleOf(floor * 100), 105);
        const [x2, y2] = point(angleOf(floor * 100), 111);
        return <line class="form-notch" data-rank={rank} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} />;
      })}
      {/* This week's pace: a marker outside the ring. */}
      {props.pace !== null && props.pace !== undefined && (
        <g class="form-pace" transform={`rotate(${angleOf(props.pace).toFixed(2)} ${CX} ${CY})`}>
          <path d={`M ${CX + 106} ${CY} l 9 -5.5 v 11 Z`} />
        </g>
      )}
    </svg>
  );
}
