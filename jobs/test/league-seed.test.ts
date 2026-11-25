import { describe, expect, it } from 'vitest';
import { isLeagueCode, isRecoveryKey } from '../../engine/src/ids.ts';
import { leagueSeed, newLeague } from '../lib/league-seed.ts';

/**
 * Random bytes that are not random, so a test can check exact output. Like the
 * real thing, each call hands out bytes that no earlier call got.
 */
function counting(start: number) {
  let next = start;
  return (bytes: number) => {
    const out = Uint8Array.from({ length: bytes }, (_, i) => (next + i) % 256);
    next += bytes;
    return out;
  };
}
const NOW = new Date('2027-01-01T17:00:00Z');

describe('Making a new league', () => {
  const league = newLeague({ name: 'Sunday Squad', random: counting(0) });
  const docs = leagueSeed(league, NOW);
  const at = (path: string) => docs.find((doc) => doc.path === path)?.data;

  it('The league gets a code and its commish gets a recovery key, both in the right shape', () => {
    expect(isLeagueCode(league.code)).toBe(true);
    expect(isRecoveryKey(league.commishKey)).toBe(true);
  });

  it('The code is on file, so anyone who knows it can find the league', () => {
    expect(at(`codes/${league.code}`)).toEqual({ league: league.id, name: 'Sunday Squad' });
  });

  it('The league starts open to new players, with exactly one member: the commish', () => {
    expect(at(`leagues/${league.id}`)).toEqual({
      name: 'Sunday Squad',
      code: league.code,
      commish: league.commish,
      coCommish: null,
      joining: 'open',
      members: { [league.commish]: true },
      season: null,
    });
  });

  it('The commish has a profile, a recovery key, and the key is on file under its own name', () => {
    expect(at(`leagues/${league.id}/players/${league.commish}`)).toEqual({ displayName: 'Commish', joinedAt: NOW });
    expect(at(`leagues/${league.id}/keys/${league.commish}`)).toEqual({ key: league.commishKey, rotatedAt: NOW });
    expect(at(`leagues/${league.id}/lookup/${league.commishKey}`)).toEqual({ player: league.commish });
  });

  it('Nothing else is written: five documents make a league', () => {
    expect(docs).toHaveLength(5);
  });

  it('No device is signed in yet: the commish gets in with the code and key, like anyone getting back in', () => {
    expect(docs.some((doc) => doc.path.includes('/claims/'))).toBe(false);
  });

  it('Different random bytes make a different league: the id, code, key and player all change', () => {
    const other = newLeague({ name: 'Sunday Squad', random: counting(100) });
    expect(other.id).not.toBe(league.id);
    expect(other.code).not.toBe(league.code);
    expect(other.commishKey).not.toBe(league.commishKey);
    expect(other.commish).not.toBe(league.commish);
  });

  it('The code, the key, the league id and the player id each use their own random bytes', () => {
    // If two of them shared bytes, knowing one would give away part of another.
    const body = (value: string) => value.replace(/^TCL-/, '').replaceAll('-', '').toUpperCase();
    expect(body(league.commishKey)).not.toBe(league.code);
    expect(body(league.id).includes(league.code)).toBe(false);
    expect(body(league.commish).includes(body(league.commishKey))).toBe(false);
  });

  it('The commish can be given a name, tidied the same way a typed name is', () => {
    const named = newLeague({ name: '  Sunday   Squad ', commishName: '  Alex ', random: counting(0) });
    expect(named.name).toBe('Sunday Squad');
    expect(named.commishName).toBe('Alex');
  });

  it('A league name must be 1 to 40 characters and a display name 1 to 24, the limits the rules enforce', () => {
    expect(() => newLeague({ name: '', random: counting(0) })).toThrow(/league name/i);
    expect(() => newLeague({ name: 'x'.repeat(41), random: counting(0) })).toThrow(/league name/i);
    expect(() => newLeague({ name: 'x'.repeat(40), random: counting(0) })).not.toThrow();
    expect(() => newLeague({ name: 'Sunday Squad', commishName: 'x'.repeat(25), random: counting(0) })).toThrow(/display name/i);
  });
});
