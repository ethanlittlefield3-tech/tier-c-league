/**
 * The documents a brand-new league starts with.
 *
 * A league is made by a job, never from a phone: the app's web settings are
 * public, so if the app could make leagues, anyone on the internet could fill
 * the database (DECISIONS.md, build choices).
 *
 * A new league has one player, the commish. No phone is signed in yet. The
 * commish gets in the same way anyone gets back in: "I'm already in a league",
 * with the league code and their recovery key.
 *
 * Nothing here makes its own randomness or reads a clock. The caller passes
 * both in, which lets a test check the exact output.
 */
import { CODE_ALPHABET, makeLeagueCode, makeRecoveryKey } from '../../engine/src/ids.ts';

export interface NewLeague {
  id: string;
  name: string;
  /** The league code, 8 characters, without its dash. */
  code: string;
  /** The commish's player id. */
  commish: string;
  commishName: string;
  commishKey: string;
}

export interface SeedDoc {
  path: string;
  data: Record<string, unknown>;
}

const tidy = (typed: string) => typed.normalize('NFC').replace(/\s+/g, ' ').trim();

/** An id of lower-case letters and numbers. It is a name for a document, not a secret. */
function makeId(randomBytes: Uint8Array): string {
  return Array.from(randomBytes, (byte) => CODE_ALPHABET[byte & 31])
    .join('')
    .toLowerCase();
}

/** Picks a new league's id, code, commish and key. `random(n)` must return n fresh random bytes each time. */
export function newLeague(input: { name: string; commishName?: string; random: (bytes: number) => Uint8Array }): NewLeague {
  const name = tidy(input.name);
  if (name.length < 1 || name.length > 40) throw new RangeError('A league name must be 1 to 40 characters.');
  const commishName = tidy(input.commishName ?? 'Commish');
  if (commishName.length < 1 || commishName.length > 24) throw new RangeError('A display name must be 1 to 24 characters.');
  return {
    id: makeId(input.random(16)),
    name,
    code: makeLeagueCode(input.random(8)),
    commish: makeId(input.random(16)),
    commishName,
    commishKey: makeRecoveryKey(input.random(8)),
  };
}

/** Every document the new league needs, ready to be written in one save. */
export function leagueSeed(league: NewLeague, now: Date): SeedDoc[] {
  const root = `leagues/${league.id}`;
  return [
    { path: `codes/${league.code}`, data: { league: league.id, name: league.name } },
    {
      path: root,
      data: {
        name: league.name,
        code: league.code,
        commish: league.commish,
        coCommish: null,
        joining: 'open',
        members: { [league.commish]: true },
        season: null,
      },
    },
    { path: `${root}/players/${league.commish}`, data: { displayName: league.commishName, joinedAt: now } },
    { path: `${root}/keys/${league.commish}`, data: { key: league.commishKey, rotatedAt: now } },
    { path: `${root}/lookup/${league.commishKey}`, data: { player: league.commish } },
  ];
}
