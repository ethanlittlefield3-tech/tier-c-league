/**
 * A settled group-play week in words, for League, the feed and the
 * highlight reel: the sides' averages, the Bounty, the Alley's places or
 * the Drop Shot floors. A regular 1v1 week is worded where it is shown.
 */
import { HOUSE, alleyBonus, bountyText, tilesBroken, type BountyTarget } from '@tcl/engine';

export interface SideDoc {
  name: string;
  players: string[];
  points: number;
}

/** The `group` summary the weekly job keeps on a settled week. */
export interface GroupDoc {
  mode: string;
  matches?: { a: SideDoc; b: SideDoc; winner: 'a' | 'b' | null }[];
  target?: BountyTarget;
  total?: number;
  needed?: number;
  hit?: boolean;
  broke?: string[];
  race?: { player: string; race: number; walls: number; place: number }[];
  floors?: { a: string; b: string; aDaily: number[]; bDaily: number[]; winner: 'a' | 'b' | null }[];
}

export interface Line {
  text: string;
  /** Who the line is about, so a screen can mark the viewer's own. */
  players: string[];
}

/** A score, or an average to one decimal place. */
export const score = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1)).replace('-', '−');
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const ordinal = (place: number) => `${place}${place % 10 === 1 && place % 100 !== 11 ? 'st' : place % 10 === 2 && place % 100 !== 12 ? 'nd' : place % 10 === 3 && place % 100 !== 13 ? 'rd' : 'th'}`;

/** A side's name: Blue or Orange in Team Week, its players in 2v2, or the House duo. */
export function sideName(side: SideDoc, name: (player: string) => string): string {
  if (side.players.includes(HOUSE) || side.name === 'house') return 'The House duo';
  if (side.name === 'blue' || side.name === 'orange') return side.name === 'blue' ? 'Blue' : 'Orange';
  return side.players.map(name).join(' & ');
}

/** The lines for a settled group-play week, or `null` for a 1v1 week, which its screen words itself. */
export function groupLines(group: GroupDoc | null | undefined, name: (player: string) => string): Line[] | null {
  if (!group) return null;
  if ((group.mode === 'teamWeek' || group.mode === 'twoVTwo') && group.matches) {
    return group.matches.map((match) => {
      const [first, second] = match.winner === 'b' ? [match.b, match.a] : [match.a, match.b];
      const verb = match.winner === null ? 'drew with' : 'beat';
      return { text: `${sideName(first, name)} ${verb} ${sideName(second, name)} ${score(first.points)}–${score(second.points)} on average`, players: [...match.a.players, ...match.b.players] };
    });
  }
  if (group.mode === 'bounty' && group.target) {
    const progress = group.target.kind === 'hits' ? `${group.total ?? 0} of ${group.needed ?? group.target.count}` : '';
    const what = bountyText(group.target);
    if (group.hit) return [{ text: `The Bounty was hit${progress ? `, ${progress}` : ''}: ${what}. +3 for everyone.`, players: [] }];
    const broke = group.broke && group.broke.length > 0 ? ` Broken by ${group.broke.map(name).join(', ')}.` : '';
    return [{ text: `The Bounty was missed${progress ? `, ${progress}` : ''}: ${what}.${broke}`, players: group.broke ?? [] }];
  }
  if (group.mode === 'alley' && group.race) {
    const last = Math.max(...group.race.map((row) => row.place));
    return group.race.map((row) => {
      const bonus = alleyBonus(row.place);
      const extra = bonus ? `, +${bonus}` : row.place === last && group.race!.length > 1 ? ', last' : '';
      return { text: `${ordinal(row.place)} in the Alley: ${name(row.player)}, ${score(row.race)} race points${extra}`, players: [row.player] };
    });
  }
  if (group.mode === 'dropShot' && group.floors) {
    return group.floors.map((floor) => {
      const hitsA = sum(floor.aDaily);
      const hitsB = sum(floor.bDaily);
      const [first, second, tilesFirst, tilesSecond] = floor.winner === 'b' ? [floor.b, floor.a, tilesBroken(hitsB), tilesBroken(hitsA)] : [floor.a, floor.b, tilesBroken(hitsA), tilesBroken(hitsB)];
      const verb = floor.winner === null ? 'drew with' : 'beat';
      return { text: `${name(first)} ${verb} ${name(second)}, ${tilesFirst}–${tilesSecond} in tiles broken`, players: [floor.a, floor.b] };
    });
  }
  return null;
}

/** A place in words: "2nd". */
export { ordinal };
