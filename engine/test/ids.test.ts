import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET,
  dayId,
  formatLeagueCode,
  isLeagueCode,
  isRecoveryKey,
  kitId,
  makeLeagueCode,
  makeRecoveryKey,
  normalizeLeagueCode,
  normalizeRecoveryKey,
  receiptId,
  restId,
  ruleOneId,
  sealedDemolitionId,
  weekPeriod,
} from '../src/index.ts';

/** Bytes 0, 1, 2 ... so a test can see exactly which characters come out. */
const counting = (length: number, from = 0) => Uint8Array.from({ length }, (_, i) => (from + i) % 256);

describe('Identity: recovery keys and league codes', () => {
  it('A recovery key looks like TCL-XXXX-XXXX', () => {
    const key = makeRecoveryKey(counting(8));
    expect(key).toBe('TCL-ABCD-EFGH');
    expect(isRecoveryKey(key)).toBe(true);
    expect(isRecoveryKey('TCL-7Q4M-X2K9')).toBe(true);
  });

  it('Keys and codes never use the look-alike characters 0, O, 1 or I', () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    for (const lookAlike of ['0', 'O', '1', 'I']) expect(CODE_ALPHABET).not.toContain(lookAlike);
    expect(isRecoveryKey('TCL-7Q4M-X2KO')).toBe(false);
    expect(isRecoveryKey('TCL-7Q4M-X2K0')).toBe(false);
    expect(isRecoveryKey('TCL-1Q4M-X2K9')).toBe(false);
    expect(isRecoveryKey('TCL-IQ4M-X2K9')).toBe(false);
  });

  it('Every character is equally likely, so no key is easier to guess than another', () => {
    const counts = new Map<string, number>();
    const all = counting(256);
    for (let start = 0; start < 256; start += 8) {
      const key = makeRecoveryKey(all.slice(start, start + 8)).replace(/^TCL-|-/g, '');
      for (const char of key) counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    expect(counts.size).toBe(32);
    expect(new Set(counts.values())).toEqual(new Set([8]));
  });

  it('Anything that is not exactly a key is refused', () => {
    for (const bad of ['', 'TCL-7Q4M', 'TCL-7Q4M-X2K', 'TCL-7Q4M-X2K99', 'ABC-7Q4M-X2K9', 'tcl-7q4m-x2k9', 'TCL 7Q4M X2K9']) {
      expect(isRecoveryKey(bad), bad).toBe(false);
    }
  });

  it('A typed key is tidied first: lower case, spaces and missing dashes are fine', () => {
    expect(normalizeRecoveryKey(' tcl-7q4m-x2k9 ')).toBe('TCL-7Q4M-X2K9');
    expect(normalizeRecoveryKey('TCL7Q4MX2K9')).toBe('TCL-7Q4M-X2K9');
    expect(normalizeRecoveryKey('7q4m x2k9')).toBe('TCL-7Q4M-X2K9');
    expect(normalizeRecoveryKey('not a key')).toBeNull();
    expect(normalizeRecoveryKey('TCL-7Q4M-X2K0')).toBeNull();
  });

  it('A key needs 8 random bytes, and fewer is refused', () => {
    expect(() => makeRecoveryKey(counting(7))).toThrow(/8 random bytes/);
  });

  it('A league code is 8 characters, shown as XXXX-XXXX', () => {
    const code = makeLeagueCode(counting(8, 8));
    expect(code).toBe('JKLMNPQR');
    expect(isLeagueCode(code)).toBe(true);
    expect(formatLeagueCode(code)).toBe('JKLM-NPQR');
    expect(isLeagueCode('JKLM-NPQR')).toBe(false); // the stored form has no dash
    expect(isLeagueCode('JKLMNPQ')).toBe(false);
    expect(isLeagueCode('JKLMNPQ0')).toBe(false);
  });

  it('A typed league code is tidied the same way', () => {
    expect(normalizeLeagueCode(' jklm-npqr ')).toBe('JKLMNPQR');
    expect(normalizeLeagueCode('jklm npqr')).toBe('JKLMNPQR');
    expect(normalizeLeagueCode('JKLM')).toBeNull();
  });
});

describe('Document IDs: one fixed ID per thing, so the rules can allow exactly one', () => {
  it("A player's day has one document", () => {
    expect(dayId('p1', '2027-01-04')).toBe('p1_2027-01-04');
  });

  it('A regular-season week is a period tagged w01, w02 and so on', () => {
    expect(weekPeriod(3)).toBe('w03');
    expect(weekPeriod(12)).toBe('w12');
    expect(() => weekPeriod(0)).toThrow(/Not a season week/);
  });

  it('Each kit item has one document per player per period, so a playoff round can have its own', () => {
    expect(kitId(weekPeriod(3), 'p1', 'aerial')).toBe('w03_p1_aerial');
    expect(kitId(weekPeriod(12), 'p1', 'fullBoost')).toBe('w12_p1_fullBoost');
    expect(sealedDemolitionId(weekPeriod(3), 'p1')).toBe('w03_p1_demolition');
  });

  it("A player's rest day has one document per week", () => {
    expect(restId(weekPeriod(3), 'p1')).toBe('w03_p1_rest');
  });

  it('Each Rule One has its own numbered document, so a season can never hold more than it issued', () => {
    expect(ruleOneId('p1', 2)).toBe('ruleOne_p1_2');
  });

  it('A square can be asked for receipts once', () => {
    expect(receiptId('p1', '2027-01-04', 'screen')).toBe('p1_2027-01-04_screen');
  });
});
