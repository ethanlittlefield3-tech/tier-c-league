/**
 * A Rumble week's items on this phone (SCOPE.md, "Rumble"): yours and your
 * opponent's for each day that has started, which the rules unseal at the
 * day's start, and their Boots once each day locks. Your own Boots come from
 * your sealed plays. Looked at again each time a day starts or locks.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Lane, RumbleDraws, RumbleItem } from '@tcl/engine';
import { loadData } from '../data/load.ts';

export interface RumbleView {
  /** Each item, by `{date}_{player}`. */
  items: Record<string, RumbleItem>;
  /** Your opponent's Boots on you, by date, once each day has locked. */
  theirBoots: Record<string, Lane>;
}

export function useRumble(input: { seasonPath: string | null; active: boolean; days: { date: string; start: number; lock: number }[]; me: string; opponent: string | null; now: number }): RumbleView {
  const [view, setView] = useState<RumbleView>({ items: {}, theirBoots: {} });
  const started = input.days.filter((day) => input.now >= day.start).map((day) => day.date);
  const locked = input.days.filter((day) => input.now >= day.lock).map((day) => day.date);
  useEffect(() => {
    if (!input.active || !input.seasonPath || !input.opponent) return undefined;
    const seasonPath = input.seasonPath;
    const opponent = input.opponent;
    let stopped = false;
    void loadData().then(async (api) => {
      const items: Record<string, RumbleItem> = {};
      const theirBoots: Record<string, Lane> = {};
      await Promise.all([
        ...started.flatMap((date) =>
          [input.me, opponent].map(async (player) => {
            const found = await api.peekDoc(`${seasonPath}/rumble/${date}_${player}`);
            if (found && typeof found.item === 'string') items[`${date}_${player}`] = found.item as RumbleItem;
          }),
        ),
        ...locked.map(async (date) => {
          const kicked = await api.peekDoc(`${seasonPath}/sealed/boot_${date}_${opponent}`);
          if (kicked && kicked.target === input.me && typeof kicked.lane === 'string') theirBoots[date] = kicked.lane as Lane;
        }),
      ]);
      if (!stopped) setView({ items, theirBoots });
    });
    return () => {
      stopped = true;
    };
  }, [input.active, input.seasonPath, input.opponent, input.me, started.length, locked.length]);
  return view;
}

/** The draws `rumbleWeek` plays, from this phone's view: you are side `a`. */
export function rumbleDraws(view: RumbleView, me: string, opponent: string, myBoots: { date: string; lane: Lane }[], dates: string[]): RumbleDraws {
  return {
    items: Object.fromEntries(dates.map((date) => [date, { a: view.items[`${date}_${me}`] ?? null, b: view.items[`${date}_${opponent}`] ?? null }])),
    boots: { a: Object.fromEntries(myBoots.map((boot) => [boot.date, boot.lane])), b: view.theirBoots },
  };
}
