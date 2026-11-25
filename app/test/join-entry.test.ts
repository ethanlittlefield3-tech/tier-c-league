import { describe, expect, it } from 'vitest';
import { readCode, readKey } from '../src/join/entry.ts';

describe('Typing a league code', () => {
  it('A code is 8 letters and numbers, typed in any case, with or without the dash or spaces', () => {
    expect(readCode('K7QMX2R9')).toEqual({ code: 'K7QMX2R9' });
    expect(readCode('k7qm-x2r9')).toEqual({ code: 'K7QMX2R9' });
    expect(readCode('  k7qm x2r9 ')).toEqual({ code: 'K7QMX2R9' });
  });

  it('Nothing typed yet is its own answer, so the app can say "type it first"', () => {
    expect(readCode('')).toEqual({ problem: 'empty' });
    expect(readCode(' - ')).toEqual({ problem: 'empty' });
  });

  it('Too short or too long is caught before anything is sent', () => {
    expect(readCode('K7QM')).toEqual({ problem: 'shape' });
    expect(readCode('K7QMX2R9A')).toEqual({ problem: 'shape' });
  });

  it('Codes never use 0, O, 1 or I, so typing one gets a hint about look-alikes', () => {
    expect(readCode('K7QMX2R0')).toEqual({ problem: 'lookalike' });
    expect(readCode('O7QMX2R9')).toEqual({ problem: 'lookalike' });
    expect(readCode('K7QM-X1R9')).toEqual({ problem: 'lookalike' });
    expect(readCode('k7qm-xir9')).toEqual({ problem: 'lookalike' });
  });
});

describe('Typing a recovery key', () => {
  it('A key is TCL and 8 letters and numbers, typed in any case, with or without the dashes', () => {
    expect(readKey('TCL-7Q4M-X2K9')).toEqual({ key: 'TCL-7Q4M-X2K9' });
    expect(readKey('tcl 7q4m x2k9')).toEqual({ key: 'TCL-7Q4M-X2K9' });
    expect(readKey('tcl7q4mx2k9')).toEqual({ key: 'TCL-7Q4M-X2K9' });
  });

  it('Leaving off the TCL at the front still works', () => {
    expect(readKey('7Q4M-X2K9')).toEqual({ key: 'TCL-7Q4M-X2K9' });
  });

  it('Nothing typed, the wrong length, and look-alike characters each get their own answer', () => {
    expect(readKey('')).toEqual({ problem: 'empty' });
    expect(readKey('TCL-7Q4M')).toEqual({ problem: 'shape' });
    expect(readKey('TCL-7Q4M-X2K99')).toEqual({ problem: 'shape' });
    expect(readKey('TCL-7Q4M-X2K0')).toEqual({ problem: 'lookalike' });
    expect(readKey('TCL-IQ4M-X2K9')).toEqual({ problem: 'lookalike' });
  });
});
