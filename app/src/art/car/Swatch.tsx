import { paintColors } from './draw.ts';

/** A paint as a glossy dot, for picking it in the Garage or while joining. */
export function Swatch(props: { paint: string }) {
  const tones = paintColors(props.paint);
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={`swatch-${props.paint}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={tones.light} />
          <stop offset="0.5" stop-color={tones.mid} />
          <stop offset="1" stop-color={tones.dark} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="16" fill={`url(#swatch-${props.paint})`} stroke="#050914" stroke-width="2.5" />
      <path d="M10 14Q14 8 21 7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7" />
    </svg>
  );
}
