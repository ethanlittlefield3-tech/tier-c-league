// The icons on a day's checklist, drawn for this app: your own day on Game
// Day, and your opponent's day opened from their car.

/** A mug of beer. */
export function BeerMug() {
  return (
    <svg class="beer-mug" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M9 13h19v20a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3Z" fill="#ffb53a" stroke="#050914" stroke-width="2" />
      <path d="M28 17h3a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-3" fill="none" stroke="#050914" stroke-width="5" />
      <path d="M28 17h3a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-3" fill="none" stroke="#ffb53a" stroke-width="2.5" />
      <path d="M13 18v13M18.5 18v13M24 18v13" stroke="#ffd98a" stroke-width="2" stroke-linecap="round" />
      <path d="M8 13a4 4 0 0 1 4-5 5 5 0 0 1 8-2 4.5 4.5 0 0 1 7 3 3.5 3.5 0 0 1 1 4Z" fill="#ffffff" stroke="#050914" stroke-width="2" stroke-linejoin="round" />
    </svg>
  );
}

/** A stopwatch, for screen time. */
export function ScreenClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M12 9v4l2.5 2M10 3h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}

/** The House, in a 1v1's place: a little house in gold, where a car would be. */
export function HouseArt(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 72 44" aria-hidden="true">
      <path d="M20 20v20h32V20" fill="rgba(255, 207, 63, 0.16)" stroke="#ffcf3f" stroke-width="3" stroke-linejoin="round" />
      <path d="M14 23 36 5l22 18" fill="none" stroke="#ffcf3f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M32 40v-9h8v9" fill="none" stroke="#ffcf3f" stroke-width="3" stroke-linejoin="round" />
      <path d="M8 40h56" stroke="rgba(255, 207, 63, 0.5)" stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}
