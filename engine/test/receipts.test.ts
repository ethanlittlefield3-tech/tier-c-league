import { describe, expect, it } from 'vitest';
import {
  MINUTE,
  canRequestReceipt,
  finalAt,
  proofDeadline,
  provisionalAt,
  receiptEffect,
  receiptFixes,
  receiptStatus,
  weekStart,
  type ReceiptRequest,
} from '../src/index.ts';
import { SEASON, at } from './helpers.ts';

const TZ = SEASON.timeZone;
const MON = '2027-01-04';
const TUE = '2027-01-05';
const WED = '2027-01-06';

function request(overrides: Partial<ReceiptRequest> = {}): ReceiptRequest {
  return {
    target: MON,
    square: 'body',
    timeZone: TZ,
    now: at(MON, '20:00'),
    ownDay: false,
    restDay: false,
    claimed: true,
    alreadyRequested: false,
    usedThisWeek: 0,
    ...overrides,
  };
}

const reason = (r: ReceiptRequest) => {
  const verdict = canRequestReceipt(r);
  return verdict.ok ? 'ok' : verdict.reason;
};

describe('6. Receipts: asking for them', () => {
  it('Anyone can ask for receipts on a square someone else logged', () => {
    expect(reason(request())).toBe('ok');
    expect(reason(request({ square: 'screen' }))).toBe('ok');
  });

  it('A request is allowed until that day locks at noon the next day', () => {
    expect(reason(request({ now: at(TUE, '11:59') }))).toBe('ok');
    expect(reason(request({ now: at(TUE, '12:00') }))).toMatch(/locked/);
  });

  it('Each player gets 3 requests a week', () => {
    expect(reason(request({ usedThisWeek: 2 }))).toBe('ok');
    expect(reason(request({ usedThisWeek: 3 }))).toMatch(/used your 3 requests/);
  });

  it('Only a claim can be challenged: a goal marked hit, or logged screen time', () => {
    expect(reason(request({ claimed: false }))).toMatch(/Nothing is logged/);
  });

  it('On a rest day, receipts cover screen time only', () => {
    expect(reason(request({ restDay: true, square: 'mind' }))).toMatch(/screen time only/);
    expect(reason(request({ restDay: true, square: 'screen' }))).toBe('ok');
  });

  it('One request per square per day is enough: a second one is refused', () => {
    expect(reason(request({ alreadyRequested: true }))).toMatch(/already requested/);
  });

  it("You can't ask yourself for receipts", () => {
    expect(reason(request({ ownDay: true }))).toMatch(/yourself/);
  });
});

describe('6. Receipts: the proof deadline', () => {
  it('Proof is due by 11:59 pm the day of the request', () => {
    // "By 11:59 pm Monday" means before Tuesday starts.
    expect(proofDeadline(at(MON, '15:00'), TZ)).toBe(at(TUE, '00:00'));
    expect(proofDeadline(at(TUE, '09:00'), TZ)).toBe(at(WED, '00:00'));
  });

  it('A request at 6 pm or later gets until 11:59 pm the next day', () => {
    expect(proofDeadline(at(MON, '17:59'), TZ)).toBe(at(TUE, '00:00'));
    expect(proofDeadline(at(MON, '18:00'), TZ)).toBe(at(WED, '00:00'));
    expect(proofDeadline(at(MON, '23:30'), TZ)).toBe(at(WED, '00:00'));
  });

  it('Every receipt window for a week has closed by the time results go final on Tuesday 12:00 am', () => {
    for (let week = 1; week <= SEASON.regularWeeks; week += 1) {
      const final = finalAt(SEASON.kickoff, week, TZ);
      const sundayLock = provisionalAt(SEASON.kickoff, week, TZ);
      // Walk the whole week, plus Monday morning while Sunday is still open.
      for (let now = weekStart(SEASON.kickoff, week, TZ); now < sundayLock; now += 37 * MINUTE) {
        expect(proofDeadline(now, TZ) <= final, `week ${week}`).toBe(true);
      }
      // The very last moment a request is allowed is due at exactly Tuesday 12:00 am.
      expect(proofDeadline(sundayLock - 1, TZ)).toBe(final);
    }
  });
});

describe('6. Receipts: how a request ends', () => {
  const deadline = at(TUE, '00:00');

  it('Proof uploaded before the deadline settles it', () => {
    const status = receiptStatus({ deadline, now: at(MON, '22:00'), proofAt: at(MON, '21:30'), backedDownAt: null });
    expect(status).toBe('proven');
    expect(receiptEffect(status)).toEqual({ voided: false, adjustment: 0 });
  });

  it('Until the deadline, a request with no answer is still pending and costs nothing', () => {
    const status = receiptStatus({ deadline, now: at(MON, '23:59'), proofAt: null, backedDownAt: null });
    expect(status).toBe('pending');
    expect(receiptEffect(status)).toEqual({ voided: false, adjustment: 0 });
  });

  it('No proof by the deadline: the square is voided and the player loses 1 more point', () => {
    const status = receiptStatus({ deadline, now: deadline, proofAt: null, backedDownAt: null });
    expect(status).toBe('failed');
    expect(receiptEffect(status)).toEqual({ voided: true, adjustment: -1 });
  });

  it('Backing down before the deadline is free: the square stops counting and no point is lost', () => {
    const status = receiptStatus({ deadline, now: deadline + MINUTE, proofAt: null, backedDownAt: at(MON, '23:00') });
    expect(status).toBe('backedDown');
    expect(receiptEffect(status)).toEqual({ voided: true, adjustment: 0 });
  });

  it('Proof or a back-down that arrives after the deadline is too late', () => {
    const late = deadline + MINUTE;
    expect(receiptStatus({ deadline, now: late, proofAt: late, backedDownAt: null })).toBe('failed');
    expect(receiptStatus({ deadline, now: late, proofAt: null, backedDownAt: late })).toBe('failed');
  });

  it("A player's receipts become fixes to their days, the same shape as the commish's: free when backed down, 1 point when failed, nothing while open or proven", () => {
    const base = { date: MON, deadline, proofAt: null, backedDownAt: null };
    const receipts = [
      { ...base, square: 'mind' as const, backedDownAt: at(MON, '20:00') },
      { ...base, square: 'body' as const },
      { ...base, square: 'wildcard' as const, proofAt: at(MON, '21:00') },
      { ...base, square: 'screen' as const },
    ];
    // Before the deadline only the back-down counts.
    expect(receiptFixes(receipts, deadline - MINUTE)).toEqual([{ date: MON, amount: 0, void: 'mind' }]);
    // After it, the unanswered ones have failed.
    expect(receiptFixes(receipts, deadline)).toEqual([
      { date: MON, amount: 0, void: 'mind' },
      { date: MON, amount: -1, void: 'body' },
      { date: MON, amount: -1, void: 'screen' },
    ]);
  });
});
