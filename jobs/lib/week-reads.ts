/**
 * What the weekly job needs to read for one week that isn't final, so it
 * reads no more than that each hour. The free plan allows 50,000 reads a
 * day, and a week no one can settle or reveal anything in needs none.
 *
 * - Before the week starts: nothing.
 * - Once its Sunday locks: every player in it, to settle it.
 * - Before that: only the targets of Demolitions whose day has locked, to
 *   work out how each one went for the feed.
 */
import { HOUSE } from '../../engine/src/schedule.ts';

export function weekReads(input: {
  days: { date: string; start: number; lock: number }[];
  pairs: { a: string; b: string }[];
  demolitions: { target: string; date: string }[];
  now: number;
}): { settle: boolean; players: string[] } | null {
  const days = [...input.days].sort((a, b) => a.start - b.start);
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last || input.now < first.start) return null;
  if (input.now >= last.lock) {
    return { settle: true, players: [...new Set(input.pairs.flatMap((pair) => [pair.a, pair.b]))].filter((player) => player !== HOUSE).sort() };
  }
  const locked = new Set(days.filter((day) => input.now >= day.lock).map((day) => day.date));
  const targets = [...new Set(input.demolitions.filter((hit) => locked.has(hit.date)).map((hit) => hit.target))].sort();
  return targets.length > 0 ? { settle: false, players: targets } : null;
}

/** The settings a season's calendar was written from, so an unchanged season isn't read again every hour. */
export function calendarStamp(settings: { kickoff: unknown; regularWeeks: unknown; timeZone: unknown }): string {
  // Bump the last part when the calendar's documents change shape.
  return `${String(settings.kickoff)}|${String(settings.regularWeeks)}|${String(settings.timeZone)}|v1`;
}
