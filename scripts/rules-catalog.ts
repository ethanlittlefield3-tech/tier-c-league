/**
 * Rebuilds the Garage's part lists in the security rules from the engine's
 * catalog (engine/src/achievements.ts), so the two never drift: each part
 * maps to '' (in the starter kit) or the badge that unlocks it. Run it after
 * adding a part: `npm run rules:catalog`. The rule tests check the result.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BADGES, STARTER_PARTS } from '../engine/src/achievements.ts';

const file = fileURLToPath(new URL('../firebase/firestore.rules', import.meta.url));
const catalog: Record<string, Record<string, string>> = {};
for (const part of STARTER_PARTS) (catalog[part.slot] ??= {})[part.id] = '';
for (const badge of BADGES) for (const part of badge.unlocks) (catalog[part.slot] ??= {})[part.id] = badge.id;
const list = (slot: string) => `{${Object.entries(catalog[slot] ?? {}).map(([id, badge]) => `'${id}': '${badge}'`).join(', ')}}`;

let rules = readFileSync(file, 'utf8');
const swap = (pattern: RegExp, slot: string, head: string) => {
  const found = rules.match(pattern);
  if (!found || found.length !== 1) throw new Error(`The rules should have one part list for ${slot}.`);
  rules = rules.replace(pattern, `owns(${head}, ${list(slot)}, badges)`);
};
for (const slot of ['body', 'paint', 'decal', 'wheels', 'boost', 'explosion', 'topper']) swap(new RegExp(`owns\\(car\\.${slot}, \\{[^}]*\\}, badges\\)`, 'g'), slot, `car.${slot}`);
for (const [slot, starter] of [['paint2', 'none'], ['finish', 'gloss'], ['trail', 'stream'], ['backdrop', 'garage']] as const) {
  swap(new RegExp(`owns\\(car\\.get\\('${slot}', '${starter}'\\), \\{[^}]*\\}, badges\\)`, 'g'), slot, `car.get('${slot}', '${starter}')`);
}
writeFileSync(file, rules);
console.log(`Part lists rebuilt for ${Object.keys(catalog).length} slots.`);
