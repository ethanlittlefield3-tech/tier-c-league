/**
 * The made-up players of the fast test league (PHASE1.md, Step 4): they log
 * on a schedule, use their power-ups, ask the commish for receipts, spin the
 * Wheel, prove their dares and vote on everyone's proof, so a whole week plays
 * out with only the commish watching.
 *
 * Pure: the runner reads the league, passes it in with the time, and saves
 * what comes back. Each save has the shape the app's own save has, and its
 * times are dates, so they are stored as timestamps the rules can compare.
 */
import type { Lane } from '../../engine/src/scoring.ts';

/** A small proof photo, drawn for this app: a gold ring and an orange check on navy. */
export const BOT_PHOTO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCAB4AHgDASIAAhEBAxEB/8QAGwABAAMBAQEBAAAAAAAAAAAAAAUGBwgDBAL/xAA7EAABAwIDBAcECAcBAAAAAAABAAIDBAUGERIhQWGRBxMxUVJxwRQjMqEiQnKBorGy0SQzU2JjkvAV/8QAGgEBAAIDAQAAAAAAAAAAAAAAAAUGAgMEAf/EADARAAEDAQUECQUBAAAAAAAAAAEAAgMEBREhMVESEyJBMmGBobHB0eHwBhQjQnGR/9oADAMBAAIRAxEAPwDIERF3LSiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIrXgXBs2Jqh007nQ2+F2UkgG158LfU7lpnnZAwySG4BZsY57tlqibBh26YgnMdtpi9rTk+V30WM8z6dq06x9FlrpY2vvEslZNvYxxZGOGzafPMeSuMcdtw9acmiKjoaduZJ2AcT3k8yVneIulVxc6HD9OAOz2mobtP2W/vyVbdW11oOLaYbLdfU+QUgIYYBfJiVodJYbRRMDKW2UkYHdC3PnlmV9vUxaNHVM0eHSMlztcMT3y4vLqu6VTv7WyFjf9W5BRntE3WdZ10mvxajnzWQsCZ+MkuPafMLz75o6LV0dV2G0VrCyqtlJIDvMLc+eWYVQvnRZbKmNz7PNJRzbmPcXxnht2jzzPkszt+J75bnh1JdKpv9rnl7f9XZhXnDvSq7U2HEFOCOz2mnb2fab+3JYmz7QpOKB+0NPY4L0TwS4PFyol/wAO3TD84juVMWNccmSt2sf5H07VFLpSSO24htOl4irKGobmCNoPEdxHMFYtjrBs2Gahs0DnTW+V2UchG1h8LuPcd6kLOtYVB3Uouf4+/UtE9KYxtNxCqiIimlxoiIiIiIiKWwtZJcQXunt8RLWuOqV4HwMHafQcSFv0bLfh6zhrdFNQ0ke0nsAG/iSfvJKp3Q7aW01kmub2e+q5C1jj/Tbs/VnyCiumK/OdLDYoHENaBNUZbz9Vvr947lVa1z7QrhTNPC3PzPkFJwgQQ7w5lVXGmLKrEtc76T46CN3uIM/xO73H5diraIrLFEyFgYwXAKOc4vN5RERbViiIrrgfCordNyucWdMP5MTh/MPeeH5+Xbz1NQynjL3rfBA+d4YxR2C8WVWGq5v0nyUEjvfwZ/ib3O/NbhLHb8Q2ctdoqaGrj2EdhB38COYIVLxJYrdV2ep/hoYpIonPjkYwNLSBnu3bOxR3Q7fnCWaxTuJa4Ganz3H6zfX7iq1WBlZEauEbLm5+vYpLdOpXiJ5vByVFxRZZcP3qot8pLmsOqJ5HxsPYfQ8QVFLY+mK0tqbLDdGM99SSBr3f43bP1ZcyscU9Z1V91Th5zyP9UbURbuQjkiIi71oREREXSOGaVtFh6207G5BlNHmOOkE/PNYFimudcsRXGrefjncG8Gg5NHIBdGU+jqI+r+DQNPlkuYp9XXydZ8eo6vPNViwOOaWQ54d5Kkq7BrWr8ItC6O7LQz259fUwxzzGUsb1gDgwADcd+1SWKMH0typ3TW+KOnrGjMaAGtk4Ed/FST7WhZOYXDLC9GWZK+EStPYsrRfueGSnmfDOxzJGHS5rhkQVMYWw/Nfa3TtZSxkGaT0HEqRklZGwyOOAXDHE+R4Y0Yr7MF4ZdeKj2qraRQxO2/5XeEcO8/8ADVWNaxjWMaGtaMg0DIALzpaeGkp46emjEcUbdLWjcFVcc4n/APOidb6CT+MkHvHtP8pp9T8uSqU0s1pVAa3Ll1DUqzxRxUEBc7Pn1nRR+PcT59Zabe/Z2VMjf0D15d6q2Fa51txHbqth+CdodxaTk75EqKO05lelPq6+Pq/j1jT55qyw0ccMBiGRGPWq7PUvml3juzqXRmJ6Vtbh25U726g+mkyHENJB5gLm9dP1On2eXrPg0HV5ZLmBQ/0647Ejf55+i314xaUREVkUeiIiIuksOVLaywW6oY7MSU0ZJ46Rn881gWK6F1uxJcaV4+Cdxb9knNvyIWn9D13ZVWKW2Pf76kkLmtP9N239WrmFE9MVgc2WG+07SWuAhqMtx+q70+4d6qtnO+0tB8Dsjl4juUnON7AHjkqjhHEkliqSyUF9FKR1jB2tPiHH81rNNUQ1UDJ6eRskUgza5p2ELBlYcJYmmsc/VTapKGQ/TZvYfE39t6kLTs3fjexdLx91nZ9obn8cnR8PZXrFOFae+aJo3CCraQDJlmHN7iPyUvardT2qijpKRmmNg2k9rjvJ4r3pqiGqgZPTyNkikGbXNOwhRuJL5BYqAzSZOmfmIYs9rz+w3qvB9RMG095NxwHz4FOlkMRM+WpXyYvxGyyUnVwlrq6Ue7b26B4j6d6yWWR80r5ZXufI8lznOOZJO9etdWT19XJVVUhfNIc3OP8A3YvBW2hom0sd37HMqsVlW6pffyGQRSuFKF1xxJbaVgz11DS77IOp3yBUUtP6HbA4yzX2oaQ1oMNODvP1nen3lZV9QKenc86Yf0rTAwvkAWh4kqW0eH7jUPdpDKaQg8dJy+eS5tWydMN3ZTWOK2Mf76rkDnNH9Nu39WnkVjajbAhLKcvP7HuHwrfXPveG6IiIp5cSIiIilsLXuXD96guEQLmtOmVgPxsPaPUcQFv0clvxDZw5uipoauPaD2EHdwI5ghc1q14FxlNhmodDO101vldnJGDtYfE3j3jeoW1rONQBLF0x3++i7KWcRnZdkV4Y0wnVYarnfRdJQSO9xPl+F3c781W10pHJbcQ2rUwxVlDUNyIO0Hge4jmCs6xH0VSB7psPzhzTt9mndkR9l2/7+a00NssI3dTwuHP10KympCOKPEKi2jEVzs8bo6KoyicczG9oc0HvGfYvludyq7rUmorpjJJlkNmQaO4DcvouOHrxbJOrrbbUxnxaC5p8nDMHmo/qpNejq36vDpOamWNgLt6wC88xd4rmdJLs7txN2i/CKTt2Hrxc5NFFbamQ+LQWtHm45Ac1fMOdFTy9s2IKgBo2+zQOzJ+07d93Naqivp6cXvdjpzXscEknRCqmC8J1WJa5v0Xx0Ebvfz5fhb3uPy7VuEslvw9Zy52imoaSPYB2ADdxJ5klJZLbh606nmKjoaduQA2AcB3k8ysWx1jKbE1Q2GBrobfC7OOMna8+J3HuG5V789rzjC6MfP8AfBd3BSs1cVFYovcuIL1UXCUFrXHTEwn4GDsHqeJKiURWqNjY2hjRgFGuJcbyiIizWKIiIiIiIilbBiK6YfnMltqSxrjm+J21j/MevatOsnSna6mNrLvDJRzfWexpfGeOzaPLI+axxFwVVnU9Vi8Y6jNb4qiSPI4LpCkxHZKxodTXWjfn2Drmh3I7V9/tEHV9Z10ejxahlzXMCKKd9Osv4ZD/AJ7hdIrzzauj6vEdko2l1TdaNmX1euaXchtVTvfSna6aNzLRDJWTfVe9pZGOO3afLIeaxxFvhsCnYb3ku7h87Vg+ukOQuUrf8RXTEE4kuVSXtac2RN2MZ5D17VFIimmMbG0NYLguQuLjeUREWaxREREREREREREREREREREREREREREREREREREX/9k=';

/** Each made-up player's habits, by their place in the league. */
const HABITS = [
  { logAt: 0.15, screenMinutes: 60, goals: (day: number) => [true, true, day % 3 !== 2] },
  { logAt: 0.4, screenMinutes: 120, goals: (day: number) => [day % 2 === 0, true, false] },
  { logAt: 0.65, screenMinutes: 210, goals: (day: number) => [true, day % 3 === 0, false] },
] as const;

export interface BotDay {
  date: string;
  period: string;
  week: number;
  dayIndex: number;
  start: number;
  sixPm: number;
  end: number;
  lock: number;
  nextEnd: number;
}

export interface BotState {
  now: number;
  /** The season's calendar, times in milliseconds. */
  calendar: BotDay[];
  /** The made-up players, in order. */
  bots: string[];
  /** The commish, watching: the one player who isn't made up. */
  watcher: string;
  /** Days already logged, as `{player}_{date}`, with their goals. */
  days: Record<string, { goals: { mind: boolean; body: boolean; wildcard: boolean } }>;
  /** Kit documents already saved, by id. */
  kit: string[];
  /** Demolitions already set, by id. */
  sealed: string[];
  /** Who each player faces, by period. */
  targets: Record<string, Record<string, string[]>>;
  /** The Wheel's draws. */
  draws: { id: string; player: string; period: string; drawnAt: number; dueAt: number }[];
  /** Spins so far, by draw. */
  spins: Record<string, { at: number; proofAt: number | null }>;
  /** Proof votes already cast, by id. */
  votes: string[];
  /** Receipt slots already used, by id. */
  slots: string[];
  /** Wall posts already made, by id. */
  wall: string[];
}

export interface BotMove {
  /** Under the season, or under the league for the wall. */
  under: 'season' | 'league';
  path: string;
  data: Record<string, unknown>;
  /** Saved into the document, keeping its other fields. */
  merge?: boolean;
}

/** What the made-up players do now. */
export function botMoves(state: BotState): BotMove[] {
  const { now, calendar } = state;
  const moves: BotMove[] = [];
  const save = (path: string, data: Record<string, unknown>, extra: Partial<BotMove> = {}) => moves.push({ under: 'season', path, data, ...extra });
  const first = calendar[0];
  if (!first) return moves;
  const length = first.end - first.start;
  const at = new Date(now);
  const today = calendar.find((day) => day.start <= now && now < day.end) ?? null;
  const dayOf = (period: string, dayIndex: number) => calendar.find((day) => day.period === period && day.dayIndex === dayIndex);
  const opponent = (period: string, player: string) => state.targets[period]?.[player]?.[0] ?? null;

  state.bots.forEach((bot, index) => {
    const habits = HABITS[index % HABITS.length]!;
    // Each open day, logged once, at this player's time of day.
    for (const day of calendar) {
      if (now < day.start + habits.logAt * length || now >= day.lock || state.days[`${bot}_${day.date}`]) continue;
      const rest = day.dayIndex === 6;
      const [mind, body, wildcard] = rest ? [false, false, false] : habits.goals(day.dayIndex);
      save(`days/${bot}_${day.date}`, { player: bot, date: day.date, goals: { mind, body, wildcard }, screenMinutes: habits.screenMinutes, beers: index === 2 || (index === 1 && day.dayIndex === 4) ? 1 : 0, firstAt: at, updatedAt: at });
    }
    if (!today) return;
    const period = today.period;
    const them = opponent(period, bot);

    // The first sets a Demolition on their opponent's Wednesday, before it starts.
    const wednesday = dayOf(period, 2);
    const demolition = `${period}_${bot}_demolition`;
    if (index === 0 && wednesday && them && them !== 'HOUSE' && now >= dayOf(period, 0)!.start + 0.5 * length && now < wednesday.start && !state.sealed.includes(demolition)) {
      save(`sealed/${demolition}`, { kind: 'demolition', player: bot, period, target: them, date: wednesday.date, lane: 'body' satisfies Lane, revealAt: new Date(wednesday.lock), at });
    }
    // The second sets Aerial on Thursday, from Tuesday.
    const thursday = dayOf(period, 3);
    const aerial = `${period}_${bot}_aerial`;
    if (index === 1 && thursday && now >= dayOf(period, 1)!.start && now < thursday.start && !state.kit.includes(aerial)) {
      save(`kit/${aerial}`, { player: bot, item: 'aerial', period, date: thursday.date, at });
    }
    // The third uses Full Boost on Friday's missed Wildcard, late that day.
    const friday = dayOf(period, 4);
    const boost = `${period}_${bot}_fullBoost`;
    if (index === 2 && friday && now >= friday.start + 0.7 * length && now < friday.end && !state.kit.includes(boost)) {
      save(`kit/${boost}`, { player: bot, item: 'fullBoost', period, date: friday.date, lane: 'wildcard' satisfies Lane, at });
    }
  });

  if (today) {
    const rival = opponent(today.period, state.watcher);
    const rivalIsBot = rival !== null && state.bots.includes(rival);
    // The commish's opponent taunts them once, as the test starts.
    if (rivalIsBot && !state.wall.includes('fast-taunt')) {
      moves.push({ under: 'league', path: 'wall/fast-taunt', data: { by: rival, kind: 'quick', text: 'Warm up the Wheel of Shame, {name}.', to: state.watcher, at, deleted: false } });
    }
    // On Wednesday, they ask for receipts on a goal the commish claimed that day.
    const wednesday = calendar.find((day) => day.period === today.period && day.dayIndex === 2);
    const slot = `${today.period}_${rival}_1`;
    const claimed = wednesday ? state.days[`${state.watcher}_${wednesday.date}`]?.goals : undefined;
    const square = claimed ? (['body', 'mind', 'wildcard'] as const).find((lane) => claimed[lane]) : undefined;
    if (rivalIsBot && wednesday && square && now >= wednesday.start + 0.3 * length && now < wednesday.lock && !state.slots.includes(slot)) {
      const id = `${state.watcher}_${wednesday.date}_${square}`;
      save(`receipts/${id}`, { target: state.watcher, date: wednesday.date, square, by: rival, slot, requestedAt: at, deadline: new Date(now < wednesday.sixPm ? wednesday.end : wednesday.nextEnd), proofAt: null, backedDownAt: null });
      save(`receiptSlots/${slot}`, { receipt: id });
    }
  }

  // The Wheel: a made-up spinner spins, then proves the dare; everyone made up votes it counts.
  for (const draw of state.draws) {
    const spin = state.spins[draw.id];
    if (state.bots.includes(draw.player)) {
      if (!spin && now >= draw.drawnAt + 0.25 * length) save(`spins/${draw.id}`, { player: draw.player, period: draw.period, at, proofAt: null });
      if (spin && spin.proofAt === null && now >= spin.at + 0.3 * length && now < draw.dueAt) {
        save(`dareProofs/${draw.id}`, { photo: BOT_PHOTO, at });
        save(`spins/${draw.id}`, { proofAt: at }, { merge: true });
      }
    }
    if (spin?.proofAt != null && now >= spin.proofAt + 0.1 * length) {
      for (const bot of state.bots) {
        const id = `${bot}_proof_${draw.id}`;
        if (bot !== draw.player && !state.votes.includes(id)) save(`votes/${id}`, { voter: bot, kind: 'proof', player: draw.player, draw: draw.id, choice: 'counts', at });
      }
    }
  }
  return moves;
}
