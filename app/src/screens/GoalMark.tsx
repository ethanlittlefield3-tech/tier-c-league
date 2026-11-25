// The mark in the corner of a goal card: an empty ring, a check, a Full
// Boost bolt, or "Rest". Today and Match both use it.

/** The ring, check, bolt or "Rest" in the corner of a goal card. */
export function GoalMark(props: { state: string }) {
  if (props.state === 'rest') return <span class="goal-mark goal-mark-rest">Rest</span>;
  if (props.state === 'boosted') {
    return (
      <span class="goal-mark goal-mark-boost">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 3 6 13h5l-1 8 7-10h-5Z" fill="currentColor" />
        </svg>
        Boost
      </span>
    );
  }
  if (props.state === 'hit') {
    return (
      <span class="goal-mark goal-mark-hit">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    );
  }
  return <span class="goal-mark" />;
}
