import { describe, expect, it } from 'vitest';
import {
  MINUTE,
  canCancelAerial,
  canDeclareRuleOne,
  canMoveRestDay,
  canSetAerial,
  canSetDemolition,
  canUseFullBoost,
  defaultRestDay,
  ruleOneAllowance,
  ruleOneIssueWeeks,
  ruleOnesIssued,
  weekDates,
  weekStart,
  type SeasonClock,
  type Verdict,
} from '../src/index.ts';
import { SEASON, at } from './helpers.ts';

// Week 1 of the test season: Mon Jan 4 to Sun Jan 10, 2027. Week 2 starts Mon Jan 11.
const MON = '2027-01-04';
const TUE = '2027-01-05';
const WED = '2027-01-06';
const THU = '2027-01-07';
const FRI = '2027-01-08';
const SUN = '2027-01-10';
const NEXT_MON = '2027-01-11';
const NEXT_TUE = '2027-01-12';
const NEXT_SUN = '2027-01-17';

const ok = (verdict: Verdict) => verdict.ok;
const why = (verdict: Verdict) => (verdict.ok ? '' : verdict.reason);
const realOpponent = { isHouse: false, restDay: SUN };

describe('4. Weekly kit: timing', () => {
  it('Aerial must be set before the target day starts', () => {
    expect(ok(canSetAerial(SEASON, WED, at(TUE, '23:59')))).toBe(true);
    expect(ok(canSetAerial(SEASON, WED, at(WED, '00:00')))).toBe(false);
    expect(why(canSetAerial(SEASON, WED, at(WED, '09:00')))).toMatch(/before that day starts/);
  });

  it('Aerial can be cancelled until the target day starts, and not after', () => {
    expect(ok(canCancelAerial(SEASON, WED, at(TUE, '23:59')))).toBe(true);
    expect(ok(canCancelAerial(SEASON, WED, at(WED, '00:00')))).toBe(false);
  });

  it('Demolition must be set before the target day starts', () => {
    expect(ok(canSetDemolition(SEASON, THU, at(WED, '23:59'), realOpponent))).toBe(true);
    expect(ok(canSetDemolition(SEASON, THU, at(THU, '00:00'), realOpponent))).toBe(false);
  });

  it("Demolition can't be aimed at the opponent's rest day", () => {
    const verdict = canSetDemolition(SEASON, SUN, at(TUE, '10:00'), realOpponent);
    expect(why(verdict)).toMatch(/rest day/);
    // If their rest day has moved to Thursday, Sunday is fair game and Thursday is not.
    const moved = { isHouse: false, restDay: THU };
    expect(ok(canSetDemolition(SEASON, SUN, at(TUE, '10:00'), moved))).toBe(true);
    expect(ok(canSetDemolition(SEASON, THU, at(TUE, '10:00'), moved))).toBe(false);
  });

  it('Demolition needs a real opponent: nothing to aim at in a bye week against The House', () => {
    const verdict = canSetDemolition(SEASON, THU, at(TUE, '10:00'), { isHouse: true, restDay: null });
    expect(why(verdict)).toMatch(/House/);
  });

  it('Kits refill Monday at 12:00 am, so Monday can never be an Aerial or Demolition day', () => {
    for (let week = 1; week <= SEASON.regularWeeks; week += 1) {
      const monday = weekDates(SEASON.kickoff, week)[0] as string;
      const refill = weekStart(SEASON.kickoff, week, SEASON.timeZone);
      // The last minute before the refill is too early, and the refill itself is already Monday.
      for (const now of [refill - 7 * 24 * 60 * MINUTE, refill - MINUTE, refill, refill + MINUTE]) {
        expect(ok(canSetAerial(SEASON, monday, now)), `Aerial, week ${week}`).toBe(false);
        expect(ok(canSetDemolition(SEASON, monday, now, realOpponent)), `Demolition, week ${week}`).toBe(false);
      }
    }
    expect(why(canSetAerial(SEASON, NEXT_MON, at(SUN, '20:00')))).toMatch(/refills Monday/);
  });

  it('Tuesday is the first day either one can hit, set on Monday', () => {
    expect(ok(canSetAerial(SEASON, NEXT_TUE, at(NEXT_MON, '00:00')))).toBe(true);
    expect(ok(canSetDemolition(SEASON, NEXT_TUE, at(NEXT_MON, '08:00'), { isHouse: false, restDay: NEXT_SUN }))).toBe(true);
    // Not a day earlier: on Sunday night next week's kit is not out yet.
    expect(ok(canSetAerial(SEASON, NEXT_TUE, at(SUN, '23:59')))).toBe(false);
  });

  it('Full Boost can be used from the start of the day until 12:00 pm the next day', () => {
    const state = { restDay: false };
    expect(ok(canUseFullBoost(SEASON, WED, at(TUE, '23:59'), state))).toBe(false);
    expect(ok(canUseFullBoost(SEASON, WED, at(WED, '00:00'), state))).toBe(true);
    expect(ok(canUseFullBoost(SEASON, WED, at(THU, '11:59'), state))).toBe(true);
    expect(ok(canUseFullBoost(SEASON, WED, at(THU, '12:00'), state))).toBe(false);
  });

  it("Sunday's Full Boost can still be used on Monday morning, until Sunday locks at noon", () => {
    const state = { restDay: false };
    expect(ok(canUseFullBoost(SEASON, SUN, at(NEXT_MON, '11:59'), state))).toBe(true);
    expect(ok(canUseFullBoost(SEASON, SUN, at(NEXT_MON, '12:00'), state))).toBe(false);
  });

  it('Full Boost has nothing to fix on a rest day', () => {
    expect(why(canUseFullBoost(SEASON, SUN, at(SUN, '15:00'), { restDay: true }))).toMatch(/rest day/);
  });

  it('The kit works on regular-season days only (playoff kits arrive with the playoffs build)', () => {
    const afterSeason = '2027-02-17'; // Wednesday of the week after a 6-week season
    expect(ok(canSetAerial(SEASON, afterSeason, at('2027-02-16', '10:00')))).toBe(false);
    expect(ok(canUseFullBoost(SEASON, afterSeason, at(afterSeason, '10:00'), { restDay: false }))).toBe(false);
  });
});

describe('5. Rule One', () => {
  it('A season gets one Rule One per 4 weeks, rounded up', () => {
    const table: [number, number][] = [
      [3, 1],
      [4, 1],
      [5, 2],
      [6, 2],
      [8, 2],
      [9, 3],
      [12, 3],
    ];
    for (const [weeks, expected] of table) {
      expect(ruleOneAllowance(weeks), `${weeks} weeks`).toBe(expected);
    }
  });

  it('They are issued at the start of Weeks 1, 5 and 9, as far as the season runs', () => {
    expect(ruleOneIssueWeeks(4)).toEqual([1]);
    expect(ruleOneIssueWeeks(6)).toEqual([1, 5]);
    expect(ruleOneIssueWeeks(12)).toEqual([1, 5, 9]);
    for (let weeks = 3; weeks <= 12; weeks += 1) {
      expect(ruleOneIssueWeeks(weeks).length, `${weeks} weeks`).toBe(ruleOneAllowance(weeks));
    }
  });

  it('You hold nothing before kickoff, 1 from Week 1 and 2 from Week 5 in a 6-week season', () => {
    expect(ruleOnesIssued(SEASON, at('2027-01-03', '23:59'))).toBe(0);
    expect(ruleOnesIssued(SEASON, at(MON, '00:00'))).toBe(1);
    expect(ruleOnesIssued(SEASON, at('2027-01-31', '23:59'))).toBe(1);
    expect(ruleOnesIssued(SEASON, at('2027-02-01', '00:00'))).toBe(2);
  });

  it('Unused Rule Ones carry to the end of the season', () => {
    const lastSunday = '2027-02-14';
    // Both were issued by then; neither has been used, so both are still there.
    expect(ok(canDeclareRuleOne(SEASON, lastSunday, at(lastSunday, '21:00'), { used: 0 }))).toBe(true);
    expect(ok(canDeclareRuleOne(SEASON, lastSunday, at(lastSunday, '21:00'), { used: 1 }))).toBe(true);
    expect(ok(canDeclareRuleOne(SEASON, lastSunday, at(lastSunday, '21:00'), { used: 2 }))).toBe(false);
  });

  it('Declare it by 12:00 pm the next day', () => {
    expect(ok(canDeclareRuleOne(SEASON, TUE, at(TUE, '20:00'), { used: 0 }))).toBe(true);
    expect(ok(canDeclareRuleOne(SEASON, TUE, at(WED, '11:59'), { used: 0 }))).toBe(true);
    expect(why(canDeclareRuleOne(SEASON, TUE, at(WED, '12:00'), { used: 0 }))).toMatch(/locked/);
  });

  it("It can't be declared before the day starts", () => {
    expect(ok(canDeclareRuleOne(SEASON, WED, at(TUE, '23:59'), { used: 0 }))).toBe(false);
  });

  it("You can't declare one you don't hold", () => {
    expect(why(canDeclareRuleOne(SEASON, TUE, at(TUE, '20:00'), { used: 1 }))).toMatch(/no Rule One left/);
  });

  it("The Rule One that arrives at the start of Week 5 can cover Week 4's Sunday until Monday noon", () => {
    const week4Sunday = '2027-01-31';
    const week5Monday = '2027-02-01';
    expect(ok(canDeclareRuleOne(SEASON, week4Sunday, at(week4Sunday, '23:00'), { used: 1 }))).toBe(false);
    expect(ok(canDeclareRuleOne(SEASON, week4Sunday, at(week5Monday, '09:00'), { used: 1 }))).toBe(true);
  });

  it('Rule One works in the regular season only', () => {
    const playoffDay = '2027-02-16';
    expect(why(canDeclareRuleOne(SEASON, playoffDay, at(playoffDay, '20:00'), { used: 0 }))).toMatch(/regular season/);
  });
});

describe('2. Rest day: moving it', () => {
  it('The rest day is Sunday unless you move it', () => {
    expect(defaultRestDay(SEASON.kickoff, 1)).toBe(SUN);
    expect(defaultRestDay(SEASON.kickoff, 2)).toBe(NEXT_SUN);
  });

  it('It can move to another day of the same week while both days are still ahead', () => {
    expect(ok(canMoveRestDay(SEASON, { from: SUN, to: WED }, at(MON, '09:00')))).toBe(true);
    expect(ok(canMoveRestDay(SEASON, { from: SUN, to: WED }, at(TUE, '23:59')))).toBe(true);
  });

  it("It can't move onto a day that has already started", () => {
    expect(why(canMoveRestDay(SEASON, { from: SUN, to: WED }, at(WED, '00:00')))).toMatch(/already started/);
    expect(ok(canMoveRestDay(SEASON, { from: SUN, to: MON }, at(MON, '00:00')))).toBe(false);
  });

  it("It can't move once the rest day itself has started, so it can't rescue a bad day", () => {
    expect(why(canMoveRestDay(SEASON, { from: WED, to: FRI }, at(WED, '08:00')))).toMatch(/already started/);
  });

  it('There is no limit on how many times it moves, while both days are still ahead', () => {
    // Sunday to Wednesday on Monday, then Wednesday to Friday on Tuesday, then back to Sunday.
    expect(ok(canMoveRestDay(SEASON, { from: SUN, to: WED }, at(MON, '09:00')))).toBe(true);
    expect(ok(canMoveRestDay(SEASON, { from: WED, to: FRI }, at(TUE, '09:00')))).toBe(true);
    expect(ok(canMoveRestDay(SEASON, { from: FRI, to: SUN }, at(TUE, '21:00')))).toBe(true);
  });

  it('It stays inside its own week', () => {
    expect(why(canMoveRestDay(SEASON, { from: SUN, to: NEXT_MON }, at(MON, '09:00')))).toMatch(/own week/);
  });

  it("Next week's rest day can be set early, including onto next Monday", () => {
    expect(ok(canMoveRestDay(SEASON, { from: NEXT_SUN, to: NEXT_MON }, at(FRI, '18:00')))).toBe(true);
    // Once that Monday has started it is too late to rest on it.
    expect(ok(canMoveRestDay(SEASON, { from: NEXT_SUN, to: NEXT_MON }, at(NEXT_MON, '00:00')))).toBe(false);
  });

  it('Only this week and next week can be set, nothing further ahead', () => {
    const week3Sunday = '2027-01-24';
    const week3Wednesday = '2027-01-20';
    expect(why(canMoveRestDay(SEASON, { from: week3Sunday, to: week3Wednesday }, at(FRI, '18:00')))).toMatch(/no further ahead/);
    expect(ok(canMoveRestDay(SEASON, { from: week3Sunday, to: week3Wednesday }, at(NEXT_MON, '00:00')))).toBe(true);
  });

  it("Week 1's rest day can be set any time before kickoff", () => {
    expect(ok(canMoveRestDay(SEASON, { from: SUN, to: MON }, at('2027-01-03', '20:00')))).toBe(true);
  });

  it('There are no rest days outside the regular season', () => {
    const season: SeasonClock = { ...SEASON, regularWeeks: 3 };
    expect(why(canMoveRestDay(season, { from: '2027-01-31', to: '2027-01-27' }, at('2027-01-25', '09:00')))).toMatch(/regular season/);
  });
});
