import { describe, expect, it } from 'vitest';
import type { Alert } from '../lib/alerts.ts';
import { deliver, type Device } from '../lib/deliver.ts';

const NOW = Date.UTC(2027, 0, 13, 20);
const alert = (key: string, extra: Partial<Alert> = {}): Alert => ({ player: 'alex', category: 'social', key, title: `Title ${key}`, body: `Body ${key}`, screen: 'feed', expires: NOW + 3_600_000, ...extra });
const phone = (extra: Partial<Device> = {}): Device => ({ id: 'd1', token: 'tok1', player: 'alex', settings: {}, quiet: { start: 23, end: 8 }, ...extra });

describe("Each phone's alerts", () => {
  it('A phone gets its player’s alerts, one push each, at once', () => {
    const out = deliver({ alerts: [alert('a'), alert('b', { player: 'maya' })], devices: [phone()], held: {}, now: NOW, hour: 15 });
    expect(out.pushes).toEqual([{ device: 'd1', token: 'tok1', title: 'Title a', body: 'Body a', screen: 'feed', tag: 'a' }]);
    expect(out.held).toEqual({});
  });

  it('A kind switched off on that phone never arrives there', () => {
    const out = deliver({ alerts: [alert('a'), alert('b', { category: 'daily' })], devices: [phone({ settings: { social: false } })], held: {}, now: NOW, hour: 15 });
    expect(out.pushes.map((push) => push.tag)).toEqual(['b']);
  });

  it('In quiet hours alerts are held, and when they end they arrive as one push, leaving out any that expired', () => {
    const later = NOW + 12 * 3_600_000;
    const quiet = deliver({ alerts: [alert('a', { expires: later }), alert('b', { expires: NOW + 60_000 })], devices: [phone()], held: {}, now: NOW, hour: 23 });
    expect(quiet.pushes).toEqual([]);
    expect(quiet.held.d1?.map((held) => held.key)).toEqual(['a', 'b']);

    const morning = deliver({ alerts: [alert('c', { expires: later })], devices: [phone()], held: quiet.held, now: NOW + 9 * 3_600_000, hour: 8 });
    // b expired overnight; a is still of use; c is new.
    expect(morning.pushes.map((push) => push.title)).toEqual(['Title a', 'Title c']);
  });

  it('Several held alerts make one push that lists them', () => {
    const out = deliver({ alerts: [], devices: [phone()], held: { d1: [alert('a'), alert('b', { screen: 'today' })] }, now: NOW, hour: 9 });
    expect(out.pushes).toEqual([{ device: 'd1', token: 'tok1', title: '2 alerts while it was quiet', body: 'Title a · Title b', screen: 'today', tag: 'held' }]);
  });

  it('The same alert twice is sent once, the newer one', () => {
    const out = deliver({ alerts: [alert('a', { title: 'First' }), alert('a', { title: 'Second' })], devices: [phone()], held: {}, now: NOW, hour: 12 });
    expect(out.pushes.map((push) => push.title)).toEqual(['Second']);
  });

  it('Two phones of the same player each get it, each by its own settings', () => {
    const out = deliver({ alerts: [alert('a')], devices: [phone(), phone({ id: 'd2', token: 'tok2', quiet: { start: 12, end: 18 } })], held: {}, now: NOW, hour: 15 });
    expect(out.pushes.map((push) => push.device)).toEqual(['d1']);
    expect(Object.keys(out.held)).toEqual(['d2']);
  });
});
