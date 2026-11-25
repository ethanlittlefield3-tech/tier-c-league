/**
 * Builds the Checkpoint A report (PHASE1.md, Step 1): a plain-English list of
 * every rule the tests prove, plus three worked example weeks.
 *
 * Nothing in the report is typed by hand. The rule list is read from the test
 * results, and the worked weeks are run through the engine right here.
 *
 *   npm run checkpoint:a
 *
 * Writes docs/CHECKPOINT-A.md. Pass --json <file> to also write the raw data.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOUSE,
  LANES,
  WEEKDAYS,
  scoreDay,
  settleWeek,
  totalWeek,
  weeklyAwards,
  type DayScore,
  type WeekTotals,
} from '../engine/src/index.ts';
import { WORKED_WEEKS, type WorkedDay } from '../engine/test/worked-weeks.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Rules proven, from the test results
// ---------------------------------------------------------------------------

interface VitestJson {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: { assertionResults: { ancestorTitles: string[]; title: string; status: string }[] }[];
}

const results = JSON.parse(readFileSync(resolve(root, '.vitest/results.json'), 'utf8')) as VitestJson;

const groupMap = new Map<string, { title: string; rules: { text: string; passed: boolean }[] }>();
for (const file of results.testResults) {
  for (const test of file.assertionResults) {
    const title = test.ancestorTitles[0] ?? 'Other';
    if (title.startsWith('Worked example weeks')) continue; // shown in full below
    let group = groupMap.get(title);
    if (!group) groupMap.set(title, (group = { title, rules: [] }));
    group.rules.push({ text: test.title, passed: test.status === 'passed' });
  }
}
const leadingNumber = (title: string) => {
  const match = /^(\d+)\./.exec(title);
  return match ? Number(match[1]) : 99;
};
const groups = [...groupMap.values()].sort(
  (a, b) => leadingNumber(a.title) - leadingNumber(b.title) || a.title.localeCompare(b.title),
);

// ---------------------------------------------------------------------------
// Worked weeks, run through the engine
// ---------------------------------------------------------------------------

const signed = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
const plain = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));
const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const names = (list: string[]) => (list.length === 0 ? 'nobody' : list.join(' and '));
const title = (lane: string) => lane.charAt(0).toUpperCase() + lane.slice(1);

/** The day's working, in the order the rules apply. */
function working(score: DayScore): string {
  const penalties = score.adjustmentPoints !== 0 ? `, penalty ${signed(score.adjustmentPoints)}` : '';
  if (score.kind === 'ruleOne') {
    return score.adjustmentPoints !== 0
      ? `Rule One: the play scores 0${penalties} still counts = ${plain(score.total)}`
      : 'Rule One: the day scores 0';
  }
  let text: string;
  if (score.kind === 'noShow') text = `No-show ${signed(score.base)}`;
  else if (score.kind === 'restNoLog') text = `Nothing logged on a rest day ${signed(score.base)}`;
  else {
    const parts: string[] = [];
    if (!score.restDay) parts.push(`${plural(score.goalPoints, 'goal')} ${signed(score.goalPoints)}`);
    if (score.screen.state === 'logged') {
      parts.push(`screen ${clock(score.screen.minutes ?? 0)} ${signed(score.screen.points)}`);
    } else if (score.screen.state === 'voided') {
      parts.push(`screen time voided ${signed(score.screen.points)}`);
    } else {
      parts.push(`screen time not logged ${signed(score.screen.points)}`);
    }
    if (score.beers > 0) parts.push(`${plural(score.beers, 'beer')} ${signed(score.beerPoints)}`);
    text = `${parts.join(', ')} = ${plain(score.base)}`;
  }
  if (score.aerial === 'doubled') text += `, Aerial ×2 = ${plain(score.base * 2)}`;
  if (score.demolitionPoints !== 0) text += `, Demolition ${signed(score.demolitionPoints)}`;
  text += penalties;
  if (score.demolitionPoints !== 0 || score.adjustmentPoints !== 0) text += ` = ${plain(score.total)}`;
  return text;
}

/** What was tapped, as the player would read it on the Today screen. */
function logged(day: WorkedDay, score: DayScore): string {
  if (day.log === null) return 'nothing';
  const marks = LANES.map((lane) => {
    const state = score.goals[lane];
    const name = title(lane);
    if (state === 'hit') return `${name} ✓`;
    if (state === 'boosted') return `${name} ✓ (Full Boost)`;
    if (state === 'voided') return `${name} voided`;
    if (state === 'rest') return null;
    return `${name} ✗`;
  }).filter((mark) => mark !== null);
  const bits = [...marks];
  if (score.restDay) bits.push('goals off');
  bits.push(day.log.screenMinutes === null ? 'no screen time' : `screen ${clock(day.log.screenMinutes)}`);
  bits.push(plural(day.log.beers, 'beer'));
  return bits.join(', ');
}

const weeks = WORKED_WEEKS.map((example) => {
  const totals: Record<string, WeekTotals> = {};
  const players = example.players.map((player) => {
    const scores = player.days.map((day) => scoreDay({ par: example.par, ...day }));
    totals[player.name] = totalWeek(scores);
    return {
      name: player.name,
      earlier: player.earlier ?? [],
      days: player.days.map((day, index) => {
        const score = scores[index] as DayScore;
        return {
          day: (WEEKDAYS[index] as string).slice(0, 3),
          restDay: score.restDay,
          logged: logged(day, score),
          working: working(score),
          total: score.total,
          perfect: score.perfect,
          note: day.note ?? '',
          kind: score.kind,
          goals: score.goals,
          screen: score.screen.minutes === null ? null : clock(score.screen.minutes),
          screenState: score.screen.state,
          beers: score.beers,
          aerial: score.aerial,
          demolitions: score.demolitions,
          adjustment: score.adjustmentPoints,
        };
      }),
    };
  });
  const settlement = settleWeek(example.pairs, totals);
  const awards = weeklyAwards(
    example.week,
    example.players.map((p) => ({
      player: p.name,
      points: (totals[p.name] as WeekTotals).points,
      beers: (totals[p.name] as WeekTotals).beers,
    })),
    Object.fromEntries(example.players.map((p) => [p.name, p.earlier ?? []])),
  );
  return {
    title: example.title,
    shows: example.shows,
    week: example.week,
    par: example.par,
    house: settlement.house,
    awards,
    matchups: example.pairs.map(([a, b]) => {
      const left = settlement.results[a];
      const right = b === HOUSE ? null : settlement.results[b];
      if (!left) throw new Error(`No result for ${a}`);
      const rightName = b === HOUSE ? 'The House' : b;
      let verdict: string;
      if (left.outcome === 'draw') verdict = 'Draw: level on points and on beers.';
      else {
        const leftWon = left.outcome === 'win';
        const winner = leftWon ? a : rightName;
        const [fewer, more] = leftWon ? [left.beers, left.opponentBeers] : [left.opponentBeers, left.beers];
        verdict =
          left.decidedBy === 'beers'
            ? `Level on points, so ${winner} wins on fewer beers (${plain(fewer)} against ${plain(more)}).`
            : `${winner} wins on points.`;
      }
      return {
        left: { name: a, points: left.points, beers: left.beers, outcome: left.outcome, bonus: left.bonus, seasonPoints: left.seasonPoints },
        right: right
          ? { name: b, points: right.points, beers: right.beers, outcome: right.outcome, bonus: right.bonus, seasonPoints: right.seasonPoints }
          : { name: rightName, points: left.opponentPoints, beers: left.opponentBeers, outcome: null, bonus: null, seasonPoints: null },
        verdict,
      };
    }),
    players,
  };
});

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);
const data = {
  generated: today,
  tests: { total: results.numTotalTests, passed: results.numPassedTests, failed: results.numFailedTests },
  groups,
  weeks,
};

const md: string[] = [];
md.push('# Checkpoint A: the scoring engine');
md.push('');
md.push(`Generated ${today} by \`npm run checkpoint:a\`. Do not edit by hand: the rule list comes from the test results and the worked weeks are run through the engine.`);
md.push('');
md.push(`- **Tests:** ${data.tests.passed} of ${data.tests.total} passing${data.tests.failed ? `, **${data.tests.failed} failing**` : ''}.`);
md.push('- **Rulings and calls behind these rules:** `docs/DECISIONS.md`.');
md.push('');
md.push('## Worked example weeks');
for (const week of weeks) {
  md.push('');
  md.push(`### ${week.title}`);
  md.push('');
  md.push(`Week ${week.week}, par ${week.par}. ${week.shows}`);
  for (const player of week.players) {
    md.push('');
    md.push(`**${player.name}**${player.earlier.length ? ` (earlier weeks: ${player.earlier.join(', ')})` : ''}`);
    md.push('');
    md.push('| Day | Logged | Working | Points |');
    md.push('| --- | --- | --- | --- |');
    for (const day of player.days) {
      const note = day.note ? ` *${day.note}*` : '';
      md.push(`| ${day.day}${day.restDay ? ' (rest)' : ''} | ${day.logged} | ${day.working}.${note} | ${plain(day.total)} |`);
    }
  }
  md.push('');
  md.push('**Result**');
  md.push('');
  for (const match of week.matchups) {
    const side = (s: (typeof match)['left'] | (typeof match)['right']) =>
      `${s.name} ${plain(s.points)} (${plural(s.beers, 'beer')})`;
    md.push(`- ${side(match.left)} against ${side(match.right)}. ${match.verdict}`);
    for (const s of [match.left, match.right]) {
      if (s.seasonPoints === null) continue;
      md.push(`  - ${s.name}: ${plain(s.points)} points ${signed(s.bonus ?? 0)} bonus = ${plain(s.seasonPoints)} Season Points.`);
    }
  }
  md.push(`- MVP: ${names(week.awards.mvp)}. Bust: ${names(week.awards.bust)}${week.awards.bustDrop !== null ? ` (${week.awards.bustDrop} below their average)` : ''}. Wheel: ${names(week.awards.wheel)}.`);
}
md.push('');
md.push('## Every rule the tests prove');
for (const group of groups) {
  md.push('');
  md.push(`### ${group.title}`);
  md.push('');
  for (const rule of group.rules) md.push(`- ${rule.passed ? '' : '**FAILING** '}${rule.text}`);
}
md.push('');

writeFileSync(resolve(root, 'docs/CHECKPOINT-A.md'), md.join('\n'));
const jsonFlag = process.argv.indexOf('--json');
const jsonPath = jsonFlag > -1 ? process.argv[jsonFlag + 1] : undefined;
if (jsonPath) {
  mkdirSync(dirname(resolve(jsonPath)), { recursive: true });
  writeFileSync(resolve(jsonPath), JSON.stringify(data));
}
const ruleCount = groups.reduce((count, group) => count + group.rules.length, 0);
console.log(`Checkpoint A: ${ruleCount} rules in ${groups.length} groups, ${weeks.length} worked weeks, ${data.tests.passed}/${data.tests.total} tests passing.`);
