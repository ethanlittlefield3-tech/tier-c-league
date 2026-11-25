// Small pictures of the buttons the install steps talk about, drawn here so
// they look the same on every phone.

const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;

/** Share: a box with an arrow leaving through the top. */
export function ShareGlyph() {
  return (
    <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <path d="M8.5 9.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7.5a2 2 0 0 0-2-2h-1.5" />
      <path d="M12 14.5V3M8.2 6.5 12 2.7l3.8 3.8" />
    </svg>
  );
}

/** Add to Home Screen: a box with a plus. */
export function AddGlyph() {
  return (
    <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

/** More: three dots in a row. */
export function MoreGlyph() {
  return (
    <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <circle cx="5.5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="18.5" cy="12" r="1.9" />
    </svg>
  );
}

/** A browser menu on Android: three dots in a column. */
export function MenuGlyph() {
  return (
    <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <circle cx="12" cy="5.5" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="12" cy="18.5" r="1.9" />
    </svg>
  );
}
