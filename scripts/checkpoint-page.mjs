// Builds the phone-friendly Checkpoint A page that is published for the commish.
// It reads the report data and docs/DECISIONS.md, so nothing is typed twice.
//
//   npm run checkpoint:a -- --json /tmp/checkpoint-a.json
//   node scripts/checkpoint-page.mjs /tmp/checkpoint-a.json docs/DECISIONS.md /tmp/checkpoint-a.html
//
// Then publish the HTML file as a Claude artifact, to the same link as before.
import { readFileSync, writeFileSync } from 'node:fs';

const [dataPath, decisionsPath, outPath] = process.argv.slice(2);
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const decisions = readFileSync(decisionsPath, 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Inline markdown: bold and code. Also turns "-5" into a real minus sign.
const inline = (s) =>
  esc(s)
    .replace(/(^|[\s(])-(\d)/g, '$1−$2')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
const plain = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n));
const signed = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const names = (list) => (list.length === 0 ? 'nobody' : list.join(' and '));

// --- DECISIONS.md sections -------------------------------------------------
const sections = {};
let current = null;
for (const line of decisions.split('\n')) {
  const heading = /^## (.+)$/.exec(line);
  if (heading) {
    current = heading[1];
    sections[current] = [];
  } else if (current) sections[current].push(line);
}
const find = (prefix) => {
  const key = Object.keys(sections).find((k) => k.startsWith(prefix));
  if (!key) throw new Error(`DECISIONS.md has no section starting "${prefix}"`);
  return sections[key];
};

const rulings = find('Rulings from the commish')
  .filter((l) => /^\| R\d/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
  .map(([id, , ruling, why]) => ({ id, ruling, why }));

const callGroups = [];
for (const line of find('Calls I made')) {
  const group = /^\*\*(.+)\*\*$/.exec(line.trim());
  const item = /^(\d+)\. (.+)$/.exec(line.trim());
  if (group) callGroups.push({ title: group[1], items: [] });
  else if (item && callGroups.length) callGroups[callGroups.length - 1].items.push({ n: Number(item[1]), text: item[2] });
}
const callCount = callGroups.reduce((n, g) => n + g.items.length, 0);

const open = find('Still open').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
const headsUp = find('Things the commish should know')
  .map((l) => /^(\d+)\. (.+)$/.exec(l.trim()))
  .filter(Boolean)
  .map((m) => m[2]);

// --- Worked weeks ----------------------------------------------------------
const LANE = { mind: 'M', body: 'B', wildcard: 'W' };
const STATE = { hit: 'hit', boosted: 'hit, by Full Boost', missed: 'missed', voided: 'voided', rest: 'off' };
const DEMO = {
  landed: 'Demolition landed',
  missed: 'Demolition missed',
  blocked: 'Demolition blocked',
  fizzled: 'Demolition fizzled',
  ruleOne: 'Demolition cancelled',
};

function dayRow(day) {
  const chips = Object.entries(day.goals)
    .map(([lane, state]) => `<span class="goal ${state}" title="${esc(lane)}: ${STATE[state]}">${LANE[lane]}</span>`)
    .join('');
  const facts = [];
  if (day.kind === 'noShow' || day.kind === 'restNoLog') facts.push('<span class="fact muted">Nothing logged</span>');
  else {
    facts.push(
      day.screenState === 'voided'
        ? `<span class="fact struck">${esc(day.screen)} screen</span>`
        : day.screen === null
          ? '<span class="fact muted">No screen time</span>'
          : `<span class="fact">${esc(day.screen)} screen</span>`,
    );
    facts.push(`<span class="fact${day.beers ? '' : ' muted'}">${plural(day.beers, 'beer')}</span>`);
  }
  const tags = [];
  if (day.restDay) tags.push('<span class="tag rest">Rest day</span>');
  if (day.perfect) tags.push('<span class="tag gold">Perfect</span>');
  if (day.aerial === 'doubled') tags.push('<span class="tag sky">Aerial ×2</span>');
  if (day.kind === 'ruleOne') tags.push('<span class="tag sky">Rule One</span>');
  if (Object.values(day.goals).includes('boosted')) tags.push('<span class="tag sky">Full Boost</span>');
  for (const d of day.demolitions) tags.push(`<span class="tag ${d.outcome === 'landed' ? 'red' : 'plain'}">${DEMO[d.outcome]}</span>`);
  if (day.adjustment < 0) tags.push(`<span class="tag red">Penalty ${plain(day.adjustment)}</span>`);
  const tone = day.total < 0 ? ' neg' : day.total > 0 ? ' pos' : '';
  return `<li class="day">
  <div class="dname">${esc(day.day)}</div>
  <div class="dbody">
    <div class="chips"><span class="goals" aria-hidden="true">${chips}</span>${facts.join('')}</div>
    <span class="sr">Logged: ${esc(day.logged)}.</span>
    ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}
    <p class="working">${esc(day.working)}</p>
    ${day.note ? `<p class="note">${esc(day.note)}</p>` : ''}
  </div>
  <div class="pts${tone}">${plain(day.total)}</div>
</li>`;
}

function sideHtml(side, team) {
  const result = side.outcome ? `<span class="res ${side.outcome}">${side.outcome === 'win' ? 'Win' : side.outcome === 'draw' ? 'Draw' : 'Loss'}</span>` : '';
  return `<div class="side ${team}">
    <div class="sname">${esc(side.name)}${result}</div>
    <div class="spts">${plain(side.points)}</div>
    <div class="sbeers">${plural(side.beers, 'beer')}</div>
  </div>`;
}

function weekHtml(week, index) {
  const boards = week.matchups
    .map((m) => {
      const lines = [m.left, m.right]
        .filter((s) => s.seasonPoints !== null)
        .map((s) => `<li><strong>${esc(s.name)}</strong> ${plain(s.points)} points ${signed(s.bonus)} bonus = <strong>${plain(s.seasonPoints)} Season Points</strong></li>`)
        .join('');
      return `<div class="match">
  <div class="board">${sideHtml(m.left, 'blue')}<div class="vs">vs</div>${sideHtml(m.right, 'orange')}</div>
  <p class="verdict">${esc(m.verdict)}</p>
  <ul class="sp">${lines}</ul>
</div>`;
    })
    .join('');
  const bust = week.awards.bust.length
    ? `${esc(names(week.awards.bust))}${week.awards.bustDrop !== null ? ` (${week.awards.bustDrop} below average)` : ''}`
    : 'nobody';
  const players = week.players
    .map(
      (p) => `<section class="player">
  <h4>${esc(p.name)}${p.earlier.length ? `<span class="earlier">Earlier weeks: ${p.earlier.join(', ')}</span>` : ''}</h4>
  <ol class="days">${p.days.map(dayRow).join('')}</ol>
</section>`,
    )
    .join('');
  return `<article class="week" id="week-${index + 1}">
  <h3>${esc(week.title)}</h3>
  <p class="shows"><span class="meta">Week ${week.week} · par ${week.par}</span> ${esc(week.shows)}</p>
  ${boards}
  <dl class="awards">
    <div><dt>MVP</dt><dd>${esc(names(week.awards.mvp))}</dd></div>
    <div><dt>Bust</dt><dd>${bust}</dd></div>
    <div><dt>Wheel</dt><dd>${esc(names(week.awards.wheel))}</dd></div>
  </dl>
  ${players}
</article>`;
}

// --- Page ------------------------------------------------------------------
const ruleCount = data.groups.reduce((n, g) => n + g.rules.length, 0);
const allPass = data.tests.failed === 0;
const hex = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="97" viewBox="0 0 56 97"><path d="M28 0l28 16v32L28 64 0 48V16zM28 97V64M0 48v33l28 16 28-16V48" fill="none" stroke="#6DBDFF" stroke-opacity=".16" stroke-width="1"/></svg>',
);

const html = `<title>Tier C Checkpoint A</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@1,700;1,800&display=swap">
<style>
/* Layout: one reading column. A night-arena band opens the page, then each
   worked week is a scoreboard followed by day rows: day, what was logged,
   the working, points. Reference lists fold away at the bottom. */
:root {
  --bg: #F2F5FA; --surface: #FFFFFF; --surface-2: #E7EDF7; --ink: #0F1D38; --ink-2: #4B5B79; --line: #D2DBEA;
  --sky: #156FC7; --sky-soft: #DCEBFB; --orange: #B5500B; --orange-soft: #FCE7D8;
  --red: #C22F3A; --red-soft: #FBE2E4; --gold: #8A6508; --gold-soft: #FAEFCB;
  --band: #0C1730; --band-ink: #F1F5FC; --band-ink-2: #A9B9D8;
  --display: "Exo 2", "Avenir Next Condensed", "Arial Narrow", system-ui, sans-serif;
  --body: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0A1325; --surface: #111E38; --surface-2: #182848; --ink: #E9EFFA; --ink-2: #A3B2CF; --line: #263759;
  --sky: #6DBDFF; --sky-soft: #173A63; --orange: #FF9B57; --orange-soft: #4A2A14;
  --red: #FF7B84; --red-soft: #4A1D24; --gold: #F3C956; --gold-soft: #43360F;
  --band: #060D1C; --band-ink: #F1F5FC; --band-ink-2: #A9B9D8; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0A1325; --surface: #111E38; --surface-2: #182848; --ink: #E9EFFA; --ink-2: #A3B2CF; --line: #263759;
  --sky: #6DBDFF; --sky-soft: #173A63; --orange: #FF9B57; --orange-soft: #4A2A14;
  --red: #FF7B84; --red-soft: #4A1D24; --gold: #F3C956; --gold-soft: #43360F;
  --band: #060D1C; --band-ink: #F1F5FC; --band-ink-2: #A9B9D8; color-scheme: dark }

body { background: var(--bg); color: var(--ink); font: 16px/1.5 var(--body); font-variant-numeric: tabular-nums; }
.wrap { max-width: 46rem; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1, h2, h3, h4, p, ul, ol, dl, dd { margin: 0; }
ul, ol { padding: 0; list-style: none; }
h1, h2, h3 { font-family: var(--display); font-style: italic; font-weight: 800; text-wrap: balance; line-height: 1.1; }
a { color: var(--sky); }
a:focus-visible, summary:focus-visible { outline: 2px solid var(--sky); outline-offset: 2px; border-radius: 4px; }
code { font: 0.9em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--surface-2); padding: 0.05em 0.3em; border-radius: 4px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.band { background: var(--band) url("data:image/svg+xml,${hex}"); color: var(--band-ink);
  margin-top: calc(-1 * env(safe-area-inset-top, 0px)); padding-top: calc(env(safe-area-inset-top, 0px) + 2.25rem); padding-bottom: 2rem; }
.eyebrow { font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--band-ink-2); font-weight: 600; }
.band h1 { font-size: clamp(2.4rem, 9vw, 3.4rem); margin-top: 0.35rem; }
.band .sub { color: var(--band-ink-2); margin-top: 0.5rem; max-width: 34rem; }
.status { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
.stat { border: 1px solid rgba(169, 185, 216, 0.35); border-radius: 999px; padding: 0.3rem 0.8rem; font-size: 0.875rem; color: var(--band-ink); }
.stat b { font-family: var(--display); font-style: italic; font-size: 1.05em; }
.stat.ok { background: #1B7F4B; border-color: #1B7F4B; }
.stat.bad { background: #B4232F; border-color: #B4232F; }

main { display: flex; flex-direction: column; gap: 2.5rem; padding-block: 2rem 3.5rem; }
section > h2, .weeks > h2 { font-size: 1.6rem; margin-bottom: 0.9rem; }
.lead { color: var(--ink-2); margin-bottom: 1rem; max-width: 40rem; }
.jump { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; font-size: 0.9375rem; }

.asks { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 1rem 1.1rem; }
.asks ol { counter-reset: ask; display: flex; flex-direction: column; gap: 0.7rem; }
.asks li { counter-increment: ask; display: grid; grid-template-columns: 1.75rem 1fr; gap: 0.5rem; }
.asks li::before { content: counter(ask); font-family: var(--display); font-style: italic; font-weight: 800; font-size: 1.2rem; color: var(--sky); line-height: 1.25; }

.rulings { display: flex; flex-direction: column; gap: 0.9rem; }
.rulings li { display: grid; grid-template-columns: 2.25rem 1fr; gap: 0.6rem; }
.rid { font-family: var(--display); font-style: italic; font-weight: 800; color: var(--sky); }
.why { color: var(--ink-2); font-size: 0.875rem; margin-top: 0.15rem; }
.open { background: var(--gold-soft); border-radius: 10px; padding: 1rem 1.1rem; }
.open h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }

.weeks { display: flex; flex-direction: column; gap: 2.25rem; }
.week { display: flex; flex-direction: column; gap: 1rem; padding-top: 1.5rem; border-top: 3px solid var(--ink); }
.week h3 { font-size: 1.3rem; }
.shows { color: var(--ink-2); }
.meta { display: inline-block; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--ink); margin-right: 0.35rem; }
.match { display: flex; flex-direction: column; gap: 0.5rem; }
.board { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; background: var(--band); color: var(--band-ink); border-radius: 8px; overflow: hidden; transform: skewX(-4deg); }
.board > * { transform: skewX(4deg); }
.side { padding: 0.7rem 0.9rem; min-width: 0; }
.side.blue { border-left: 5px solid #3D9BFF; }
.side.orange { border-right: 5px solid #FF8A3D; text-align: right; }
.sname { font-size: 0.875rem; font-weight: 600; display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.side.orange .sname { justify-content: flex-end; }
.spts { font-family: var(--display); font-style: italic; font-weight: 800; font-size: 2.1rem; line-height: 1.05; }
.sbeers { font-size: 0.8125rem; color: var(--band-ink-2); }
.vs { align-self: center; font-family: var(--display); font-style: italic; font-weight: 700; color: var(--band-ink-2); padding: 0 0.25rem; }
.res { font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; border-radius: 4px; padding: 0.05rem 0.35rem; }
.res.win { background: #F3C956; color: #1F1700; }
.res.draw { background: #A9B9D8; color: #0C1730; }
.res.loss { border: 1px solid rgba(169, 185, 216, 0.5); color: var(--band-ink-2); }
.verdict { font-weight: 600; }
.sp { font-size: 0.9375rem; color: var(--ink-2); display: flex; flex-direction: column; gap: 0.15rem; }
.sp strong { color: var(--ink); }
.awards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
.awards > div { background: var(--surface-2); border-radius: 8px; padding: 0.5rem 0.7rem; min-width: 0; }
.awards dt { font-size: 0.6875rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--ink-2); }
.awards dd { font-weight: 600; font-size: 0.9375rem; overflow-wrap: anywhere; }

.player { display: flex; flex-direction: column; gap: 0.25rem; }
.player h4 { font-size: 1.0625rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 0.75rem; }
.earlier { font-weight: 400; font-size: 0.8125rem; color: var(--ink-2); }
.days { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
.day { display: grid; grid-template-columns: 2.4rem minmax(0, 1fr) 2.6rem; gap: 0.6rem; padding: 0.7rem 0.75rem; align-items: start; }
.day + .day { border-top: 1px solid var(--line); }
.dname { font-weight: 700; font-size: 0.875rem; padding-top: 0.15rem; }
.dbody { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
.chips, .tags { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
.goals { display: inline-flex; gap: 0.2rem; margin-right: 0.15rem; }
.goal { width: 1.5rem; height: 1.5rem; border-radius: 5px; display: inline-grid; place-items: center; font-size: 0.75rem; font-weight: 700; border: 1.5px solid transparent; }
.goal.hit { background: var(--sky); color: var(--surface); }
.goal.boosted { background: var(--sky-soft); color: var(--sky); border-color: var(--sky); }
.goal.missed { border-color: var(--line); color: var(--ink-2); border-style: dashed; }
.goal.voided { border-color: var(--red); color: var(--red); text-decoration: line-through; }
.goal.rest { background: var(--surface-2); color: var(--ink-2); opacity: 0.55; }
.fact { font-size: 0.875rem; }
.fact.muted { color: var(--ink-2); }
.fact.struck { text-decoration: line-through; color: var(--red); }
.fact + .fact::before { content: "·"; margin-right: 0.35rem; color: var(--ink-2); }
.tag { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 700; border-radius: 4px; padding: 0.1rem 0.4rem; }
.tag.rest, .tag.plain { background: var(--surface-2); color: var(--ink-2); }
.tag.gold { background: var(--gold-soft); color: var(--gold); }
.tag.sky { background: var(--sky-soft); color: var(--sky); }
.tag.red { background: var(--red-soft); color: var(--red); }
.working { font-size: 0.875rem; color: var(--ink); }
.note { font-size: 0.875rem; color: var(--ink-2); font-style: italic; }
.pts { font-family: var(--display); font-style: italic; font-weight: 800; font-size: 1.35rem; text-align: right; line-height: 1.2; }
.pts.neg { color: var(--red); }

.calls h3 { font-family: var(--body); font-style: normal; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2); font-weight: 700; margin: 1.25rem 0 0.5rem; }
.calls ol, .heads { display: flex; flex-direction: column; gap: 0.6rem; }
.calls li, .heads li { display: grid; grid-template-columns: 1.9rem 1fr; gap: 0.5rem; }
.num { font-family: var(--display); font-style: italic; font-weight: 800; color: var(--sky); text-align: right; }
.heads .num { color: var(--orange); }

details { border-top: 1px solid var(--line); }
details:last-of-type { border-bottom: 1px solid var(--line); }
summary { cursor: pointer; padding: 0.7rem 0; font-weight: 600; display: flex; justify-content: space-between; gap: 1rem; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary .count { color: var(--ink-2); font-weight: 400; white-space: nowrap; }
summary::before { content: "+"; font-family: var(--display); font-weight: 800; color: var(--sky); width: 1rem; flex: none; }
details[open] summary::before { content: "−"; }
summary span.t { flex: 1; }
details ul { padding: 0 0 0.9rem 1.5rem; list-style: disc; display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9375rem; }
.fail { color: var(--red); font-weight: 700; }
footer { color: var(--ink-2); font-size: 0.875rem; padding-bottom: 2rem; }
</style>

<header class="band"><div class="wrap">
  <p class="eyebrow">Tier C League · Step 1 · ${esc(data.generated)}</p>
  <h1>Checkpoint A</h1>
  <p class="sub">The scoring engine: every rule the tests prove, and three weeks scored day by day.</p>
  <div class="status">
    <span class="stat ${allPass ? 'ok' : 'bad'}"><b>${data.tests.passed}</b> of ${data.tests.total} rule tests passing</span>
    <span class="stat"><b>${ruleCount}</b> rules</span>
    <span class="stat"><b>${data.weeks.length}</b> worked weeks</span>
  </div>
</div></header>

<div class="wrap"><main>

<section class="asks">
  <h2>What I need from you</h2>
  <ol>
    <li><span>Check the three worked weeks against how you would score them by hand.</span></li>
    <li><span>Answer the one follow-up on receipts, below.</span></li>
    <li><span>Veto any of the ${callCount} calls by its number. Anything you do not veto stands.</span></li>
  </ol>
</section>

<nav class="jump" aria-label="On this page">
  <a href="#weeks">Worked weeks</a><a href="#calls">Calls to veto</a><a href="#heads-up">Things to know</a><a href="#rules">Every rule</a>
</nav>

<section>
  <h2>Your rulings, built in</h2>
  <ul class="rulings">
    ${rulings.map((r) => `<li><span class="rid">${esc(r.id)}</span><div><p>${inline(r.ruling)}</p><p class="why">${inline(r.why)}</p></div></li>`).join('\n    ')}
  </ul>
</section>

<section class="open">
  <h2>One follow-up</h2>
  ${open.map((o) => `<p>${inline(o)}</p>`).join('\n  ')}
</section>

<div class="weeks" id="weeks">
  <h2>Worked weeks</h2>
  <p class="lead">Made-up logs, scored by the engine. I worked each total out by hand first, and a test checks that the two agree.</p>
  ${data.weeks.map(weekHtml).join('\n')}
</div>

<section class="calls" id="calls">
  <h2>Calls I made to close gaps</h2>
  <p class="lead">Where SCOPE.md was silent, I picked the reading that fits the rest of the rules. Each one is built and tested. Say the number to change it.</p>
  ${callGroups
    .map(
      (g) => `<h3>${esc(g.title)}</h3>
  <ol>${g.items.map((i) => `<li><span class="num">${i.n}</span><span>${inline(i.text)}</span></li>`).join('')}</ol>`,
    )
    .join('\n  ')}
</section>

<section id="heads-up">
  <h2>Things you should know</h2>
  <p class="lead">These are the rules as written, working as written. Nothing is broken, but each one could surprise the league.</p>
  <ol class="heads">${headsUp.map((h, i) => `<li><span class="num">${i + 1}</span><span>${inline(h)}</span></li>`).join('')}</ol>
</section>

<section id="rules">
  <h2>Every rule the tests prove</h2>
  <p class="lead">${ruleCount} rules in ${data.groups.length} groups, numbered to match the 12 rule areas in PHASE1.md. Tap a group to read its rules.</p>
  ${data.groups
    .map(
      (g) => `<details><summary><span class="t">${esc(g.title)}</span><span class="count">${plural(g.rules.length, 'rule')}</span></summary>
  <ul>${g.rules.map((r) => `<li>${r.passed ? '' : '<span class="fail">Failing: </span>'}${inline(r.text)}</li>`).join('')}</ul></details>`,
    )
    .join('\n  ')}
</section>

<footer>
  <p>Built from the test results and <code>docs/DECISIONS.md</code>. The same report lives in the repo as <code>docs/CHECKPOINT-A.md</code>.</p>
</footer>

</main></div>
`;

writeFileSync(outPath, html);
console.log(`Wrote ${outPath}: ${(html.length / 1024).toFixed(1)} KB, ${rulings.length} rulings, ${callCount} calls, ${headsUp.length} heads-up, ${open.length} open.`);
