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

/** A countdown clock, minutes and seconds: "1:05", "0:09". It stops at "0:00". */
export function countdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** How long ago, briefly, for the feed: "now", "5 m", "2 h", "3 d". */
export function ago(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes} m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

/** A time of day on this phone's clock: "7:30 pm". */
export function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}
