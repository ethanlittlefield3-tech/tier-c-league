import { useDoc, useNow } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import { clockTime } from '../ui/when.ts';
import { practiceModeName, practiceOf, type PracticeMark } from './play.ts';
import './practice.css';

/**
 * A strip under the header on every tab while a practice week is coming up,
 * on, or showing its results (the commish's request, 2026-11-28), so nobody
 * mistakes it for the real thing.
 */
export function PracticeStrip(props: { me: Me }) {
  const now = useNow(15_000);
  const league = useDoc<{ practice?: Partial<PracticeMark> | null }>(`leagues/${props.me.league}`);
  const asked = useDoc<{ status?: string; startsAt?: number; dayMinutes?: number; mode?: string }>(`leagues/${props.me.league}/practice/request`);
  const mark = practiceOf(league.data);
  let words: string | null = null;
  if (mark?.status === 'done') words = `Results are up. Nothing counts, and it clears at ${clockTime(mark.clearAt ?? mark.finalAt)}.`;
  else if (mark && now < mark.startsAt) words = `${practiceModeName(mark.mode)}, starts at ${clockTime(mark.startsAt)}, with days of ${mark.dayMinutes} minutes. Nothing counts.`;
  else if (mark) words = `${practiceModeName(mark.mode)}. Nothing counts. Results at ${clockTime(mark.finalAt)}.`;
  else if (asked.data?.status === 'requested' && typeof asked.data.startsAt === 'number') words = `${practiceModeName(asked.data.mode)}, starts at ${clockTime(asked.data.startsAt)}, with days of ${asked.data.dayMinutes ?? 4} minutes. Nothing counts.`;
  if (!words) return null;
  return (
    <p class="practice-strip" role="note">
      <span class="practice-tag">Practice week</span>
      <span>{words}</span>
    </p>
  );
}
