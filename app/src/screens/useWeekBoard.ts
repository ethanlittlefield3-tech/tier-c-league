/**
 * Everyone's week, live, for the group-play boards on Game Day (SCOPE.md,
 * "Screens": team totals, the Bounty bar, the Alley lane and the Drop Shot
 * floor). Each player's days are scored by the engine, the same way the
 * weekly job will settle them. A Demolition counts once the job has revealed
 * it, within the hour after its day locks.
 */
import { playerWeek, receiptFixes, weekPlayers, type DayCell, type DuoMatch, type KitPlay, type Lane, type Square, type StoredReceipt, type WeekMode } from '@tcl/engine';
import type { CarParts } from '../art/car/draw.ts';
import { useAll, useBetween, useWhere } from '../data/hooks.ts';
import type { CalDay } from '../today/kit.ts';
import type { DayEntry } from '../today/model.ts';
import type { BountyTarget } from '@tcl/engine';

/** The week document, as far as the boards read it. */
export interface BoardWeekDoc {
  week: number;
  mode?: WeekMode;
  pairs?: { a: string; b: string }[];
  teams?: { blue: string[]; orange: string[] } | null;
  duos?: DuoMatch[] | null;
  roster?: string[] | null;
  bounty?: BountyTarget | null;
  pairing?: string;
  reveals?: { player: string; target: string; date: string; lane: Lane }[];
}

type Change = { player: string; date: string; amount: number; void: Square | null };

export interface BoardPlayer {
  id: string;
  name: string;
  car: Partial<CarParts> | null;
}

export function useWeekBoard(input: {
  seasonPath: string | null;
  leaguePath: string;
  week: BoardWeekDoc | null;
  days: CalDay[];
  par: number;
  now: number;
  timeZone: string;
  today?: string;
}) {
  const dates = input.days.map((day) => day.date).sort();
  const period = input.days[0]?.period ?? null;
  const days = useBetween<DayEntry & { player: string; date: string }>(input.seasonPath ? `${input.seasonPath}/days` : null, 'date', dates[0] ?? null, dates.at(-1) ?? null);
  const kit = useWhere<KitPlay & { player: string }>(input.seasonPath ? `${input.seasonPath}/kit` : null, 'period', period);
  const ruleOnes = useWhere<KitPlay & { player: string }>(input.seasonPath ? `${input.seasonPath}/kit` : null, 'item', 'ruleOne');
  const changes = useAll<Change>(input.seasonPath ? `${input.seasonPath}/adjustments` : null);
  const receipts = useAll<StoredReceipt & { target: string }>(input.seasonPath ? `${input.seasonPath}/receipts` : null);
  const profiles = useAll<{ displayName?: string; car?: Partial<CarParts> }>(`${input.leaguePath}/players`);

  const ids = input.week ? weekPlayers({ ...input.week, mode: input.week.mode ?? 'regular' }) : [];
  const weeks: Record<string, DayCell[]> = {};
  const totals: Record<string, { points: number; beers: number }> = {};
  if (input.days.length > 0) {
    for (const player of ids) {
      const mine = <T extends { player: string }>(docs: { data: T }[]) => docs.map((found) => found.data).filter((data) => data.player === player);
      const week = playerWeek({
        par: input.par,
        days: input.days,
        logs: Object.fromEntries(mine(days.docs).map((log) => [log.date, log])),
        kit: [...mine(kit.docs), ...mine(ruleOnes.docs)],
        demolitionsOn: (input.week?.reveals ?? []).filter((hit) => hit.target === player).map((hit) => ({ date: hit.date, lane: hit.lane })),
        adjustments: [
          ...changes.docs.map((found) => found.data).filter((change) => change.player === player),
          ...receiptFixes(
            receipts.docs.map((found) => found.data).filter((receipt) => receipt.target === player),
            input.now,
          ),
        ],
        now: input.now,
        timeZone: input.timeZone,
        today: input.today,
      });
      weeks[player] = week.cells;
      totals[player] = { points: week.totals.points, beers: week.totals.beers };
    }
  }
  const players: Record<string, BoardPlayer> = Object.fromEntries(
    profiles.docs.map((found) => [found.id, { id: found.id, name: found.data.displayName ?? 'Player', car: found.data.car ?? null }]),
  );
  return {
    loading: days.loading || kit.loading || ruleOnes.loading || changes.loading || receipts.loading || profiles.loading,
    ids,
    weeks,
    totals,
    players,
  };
}
