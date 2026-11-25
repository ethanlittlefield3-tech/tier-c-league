/** How long until a moment, the way a person says it: "23 h 5 m", "45 m", "under a minute". */
export function timeLeft(ms: number): string {
  if (ms <= 0) return 'no time';
  if (ms < 60_000) return 'under a minute';
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} m`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} m`;
}
