/**
 * Builds the Checkpoint B report (PHASE1.md, Step 2): a plain-English summary
 * of what the security rules allow and block.
 *
 * Every line is the title of an emulator test that passed, so the report can
 * never claim something the tests do not prove.
 *
 *   npm run checkpoint:b
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface VitestJson {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: { name: string; assertionResults: { ancestorTitles: string[]; title: string; status: string }[] }[];
}

const results = JSON.parse(readFileSync(resolve(root, '.vitest/rules.json'), 'utf8')) as VitestJson;

// The order the areas are presented in, by test file.
const AREAS: [file: string, heading: string, blurb: string][] = [
  ['identity', 'Who is in the league', 'A device is in a league only while its claim holds the player\'s current recovery key.'],
  ['joins', "Joining with the commish's approval", 'With joining set to "with my approval", a new player asks first, and only the commish lets them in, with an audit entry.'],
  ['days', 'Daily logs', 'You write your own day, and only between its start and its lock, by the server\'s clock.'],
  ['kit', 'Aerial, Full Boost, rest days and Rule One', 'Each has one fixed slot, and each slot has its own deadline.'],
  ['sealed', 'Demolition', 'Hidden from everyone but the player who set it until the day locks. There is no exception for the commish.'],
  ['commish', 'Commish powers and the audit log', 'Every commish change has to arrive with an audit entry, or it is refused.'],
  ['roster', 'Goals', "Everyone in the league can read every player's goals."],
  ['draft', 'The draft', "The commish runs it, and every change goes in the audit log. Players set their own goals and vote on everyone else's until the votes close."],
  ['captains', "The captains' draft", 'Only the captain on turn picks, one player from the pool, in snake order.'],
  ['modes', 'The group-play vote', 'At its step of the live draft, each player ranks the six modes, once each, in their own name.'],
  ['playoffs', 'The playoffs', 'Everyone in the league reads the bracket. Only the weekly job writes it.'],
  ['rumble', 'Rumble', 'The job draws and seals every item; each one opens to the league when its day starts. A Boot is played by its holder, by noon, at today\'s opponent, and stays sealed until the day locks.'],
  ['standings', 'Standings', 'Everyone in the league can read them. Only the weekly job writes them.'],
  ['weeks', 'Weeks and dares', "If the weekly job runs late, the commish can post a finished week's results as provisional. The commish can also unlock a final week, set a group-play week's settings before it starts, or take a dare off the Wheel. Every such change goes in the audit log."],
  ['receipts', 'Receipts', 'You ask in your own name, before the day locks, 3 times a week. Only the player asked can answer, and only before the deadline.'],
  ['wheel', 'The Wheel of Shame', 'The job seals each draw. Nobody reads it until its spinner taps Spin, once.'],
  ['wall', 'The wall', 'Everyone in the league reads it. You post, comment and react in your own name. Nobody edits a post, and only its author or the commish takes it down.'],
  ['feed', 'The league feed', "The jobs' news, like a badge earned or a rank changed. Everyone in the league reads it; no phone writes it."],
  ['trophies', 'The trophy case', 'Everyone in the league reads it. Only the weekly job awards trophies.'],
  ['predictions', 'Predictions', "Each player picks a week's winners in their own name, until it starts. Nobody else sees them until then. Only the weekly job scores them."],
  ['suggestions', 'The suggestion box', 'Anyone posts an idea, everyone else upvotes it with their own vote, and only the commish tags it. Its author takes it down, or the commish does, with an audit entry.'],
  ['pokes', 'Pokes', "One a day, to this week's opponent, dated today and in your own name. Never changed."],
  ['rematches', 'Rematch challenges', 'After a final week, the loser challenges the winner to a side race the next week, by its Wednesday, once. Only the weekly job settles it.'],
  ['rivals', 'Rivalry records', "Everyone in the league reads each player's all-time record. Only the weekly job writes it."],
  ['garage', 'The Garage', 'You change only your own car, and only to parts from the catalog, each in its own slot. A part a badge unlocks goes on once that badge is earned.'],
];

const lines: string[] = [];
const today = new Date().toISOString().slice(0, 10);
lines.push('# Checkpoint B: what the security rules block');
lines.push('');
lines.push(`Generated ${today} by \`npm run checkpoint:b\`. Do not edit by hand: every line below is the title of an emulator test.`);
lines.push('');
lines.push(`- **Tests:** ${results.numPassedTests} of ${results.numTotalTests} passing${results.numFailedTests ? `, **${results.numFailedTests} failing**` : ''}.`);
lines.push('- **Rules:** `firebase/firestore.rules`. **Data model:** `docs/DATA-MODEL.md`.');
lines.push('- Each test signs in as a real device and tries the action against the Firestore emulator, with the same rules file that will be deployed.');

let count = 0;
for (const [file, heading, blurb] of AREAS) {
  const result = results.testResults.find((r) => r.name.endsWith(`/tests/rules/${file}.test.ts`));
  if (!result) throw new Error(`No results for tests/rules/${file}.test.ts. Run the rules tests first.`);
  lines.push('');
  lines.push(`## ${heading}`);
  lines.push('');
  lines.push(blurb);
  let group = '';
  for (const test of result.assertionResults) {
    const title = test.ancestorTitles[0] ?? '';
    if (title !== group) {
      group = title;
      lines.push('');
      lines.push(`**${group}**`);
      lines.push('');
    }
    lines.push(`- ${test.status === 'passed' ? '' : '**FAILING** '}${test.title}`);
    count += 1;
  }
}
lines.push('');

writeFileSync(resolve(root, 'docs/CHECKPOINT-B.md'), lines.join('\n'));
console.log(`Checkpoint B: ${count} rules in ${AREAS.length} areas, ${results.numPassedTests}/${results.numTotalTests} tests passing.`);
