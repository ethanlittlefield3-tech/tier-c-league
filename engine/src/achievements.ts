/**
 * The 51 achievements (SCOPE.md, "Garage and achievements"): each one
 * unlocks a part for your car. Shame badges unlock silly parts you can choose
 * to wear proudly. This file is the catalog; `badges.ts` decides who has
 * earned what.
 */

export type BadgeGroup = 'streaks' | 'lanes' | 'screen' | 'beers' | 'matchups' | 'powerups' | 'group' | 'social' | 'career';
/** `paint2` is the accent color, `finish` the paint's finish, `trail` the boost trail's style, `backdrop` what your car stands in front of. */
export type PartSlot = 'body' | 'paint' | 'paint2' | 'finish' | 'decal' | 'wheels' | 'boost' | 'trail' | 'explosion' | 'topper' | 'backdrop';

export interface Part {
  slot: PartSlot;
  id: string;
  name: string;
}

export interface Badge {
  id: string;
  name: string;
  group: BadgeGroup;
  /** How to earn it, as SCOPE.md words it. */
  how: string;
  unlocks: Part[];
  /** A shame badge: earned by doing badly, worn proudly. */
  shame?: true;
  /** Earned in a later phase's feature: group play, predictions or rematches. */
  later?: 'group play' | 'predictions' | 'rematches' | 'playoffs';
}

const part = (slot: PartSlot, id: string, name: string): Part => ({ slot, id, name });

export const BADGES: readonly Badge[] = [
  // Streaks
  { id: 'hatTrick', name: 'Hat Trick', group: 'streaks', how: '3 perfect days in a row, rest days skipped', unlocks: [part('decal', 'flame', 'Flame decal')] },
  { id: 'perfectWeek', name: 'Perfect Week', group: 'streaks', how: 'A perfect day on all 6 goal days of a week', unlocks: [part('paint', 'chrome', 'Chrome finish')] },
  { id: 'ironStreak', name: 'Iron Streak', group: 'streaks', how: '30-day check-in streak', unlocks: [part('boost', 'gold', 'Gold boost trail')] },
  { id: 'century', name: 'Century', group: 'streaks', how: '100-day check-in streak', unlocks: [part('explosion', 'inferno', 'Inferno goal explosion')] },
  { id: 'earlyBird', name: 'Early Bird', group: 'streaks', how: 'Logged before 9 am, 7 days straight', unlocks: [part('paint', 'sunrise', 'Sunrise paint')] },
  { id: 'cleanSheet', name: 'Clean Sheet', group: 'streaks', how: 'A week with no no-shows and screen time logged every day', unlocks: [part('decal', 'pinstripe', 'Pinstripe decal')] },
  // Lanes
  { id: 'scholar', name: 'Scholar', group: 'lanes', how: 'Mind hit on all 6 goal days of a week', unlocks: [part('decal', 'bookworm', 'Bookworm decal')] },
  { id: 'gymRat', name: 'Gym Rat', group: 'lanes', how: 'Body hit on all 6 goal days of a week', unlocks: [part('wheels', 'muscle', 'Muscle wheels')] },
  { id: 'wildOne', name: 'Wild One', group: 'lanes', how: 'Wildcard hit on all 6 goal days of a week', unlocks: [part('decal', 'joker', 'Joker decal')] },
  { id: 'tripleThreat', name: 'Triple Threat', group: 'lanes', how: 'Every lane hit at least 5 days, 3 weeks running', unlocks: [part('paint', 'tricolor', 'Tri-color paint')] },
  // Screen time
  { id: 'ghost', name: 'Ghost', group: 'screen', how: 'Under 1 hour for 7 straight days', unlocks: [part('boost', 'ghost', 'Ghost boost trail')] },
  { id: 'touchGrass', name: 'Touch Grass', group: 'screen', how: 'Under 30 minutes in a day', unlocks: [part('wheels', 'turf', 'Turf wheels')] },
  { id: 'monkMode', name: 'Monk Mode', group: 'screen', how: '0 minutes in a day', unlocks: [part('explosion', 'zen', 'Zen goal explosion')] },
  { id: 'recoveringAddict', name: 'Recovering Addict', group: 'screen', how: 'Weekly average down 3 weeks in a row', unlocks: [part('boost', 'phoenix', 'Phoenix boost trail')] },
  // Beers
  { id: 'dryWeek', name: 'Dry Week', group: 'beers', how: '0 beers in a week', unlocks: [part('paint', 'ice', 'Ice paint')] },
  { id: 'dryMonth', name: 'Dry Month', group: 'beers', how: '0 beers for 4 straight weeks', unlocks: [part('wheels', 'frost', 'Frost wheels')] },
  { id: 'designatedDriver', name: 'Designated Driver', group: 'beers', how: '0 beers on the Friday and Saturday of one weekend', unlocks: [part('decal', 'checkered', 'Checkered decal')] },
  { id: 'brewmaster', name: 'Brewmaster', group: 'beers', how: 'Most beers in a season', unlocks: [part('explosion', 'foam', 'Foam goal explosion')], shame: true },
  { id: 'happyHour', name: 'Happy Hour', group: 'beers', how: '10 or more beers in one week', unlocks: [part('topper', 'partyHat', 'Party hat topper')], shame: true },
  // Matchups
  { id: 'firstBlood', name: 'First Blood', group: 'matchups', how: 'First 1v1 win', unlocks: [part('decal', 'redStripe', 'Red stripe decal')] },
  { id: 'winStreak', name: 'Win Streak', group: 'matchups', how: '4 1v1 wins in a row', unlocks: [part('boost', 'hotStreak', 'Hot streak boost trail')] },
  { id: 'sweep', name: 'Sweep', group: 'matchups', how: 'Won every 1v1 week of a season', unlocks: [part('topper', 'broom', 'Broom topper')] },
  { id: 'comeback', name: 'Comeback', group: 'matchups', how: 'Won after trailing at the end of Thursday', unlocks: [part('wheels', 'lightning', 'Lightning wheels')] },
  { id: 'blowout', name: 'Blowout', group: 'matchups', how: 'Won by 20 or more', unlocks: [part('explosion', 'shockwave', 'Shockwave goal explosion')] },
  { id: 'photoFinish', name: 'Photo Finish', group: 'matchups', how: 'Won by exactly 1', unlocks: [part('decal', 'cameraFlash', 'Camera-flash decal')] },
  { id: 'giantKiller', name: 'Giant Killer', group: 'matchups', how: 'Beat the standings leader', unlocks: [part('decal', 'slingshot', 'Slingshot decal')] },
  { id: 'rivalryKing', name: 'Rivalry King', group: 'matchups', how: '5 all-time wins over the same player', unlocks: [part('decal', 'crown', 'Crown decal')] },
  // Power-ups
  { id: 'demolisher', name: 'Demolisher', group: 'powerups', how: '3 Demolitions landed', unlocks: [part('body', 'spiked', 'Spiked body')] },
  { id: 'untouchable', name: 'Untouchable', group: 'powerups', how: 'Blocked a Demolition with Full Boost', unlocks: [part('wheels', 'forceField', 'Force-field wheels')] },
  { id: 'airMail', name: 'Air Mail', group: 'powerups', how: 'An Aerial day worth +10 or more', unlocks: [part('boost', 'jet', 'Jet boost trail')] },
  { id: 'clutch', name: 'Clutch', group: 'powerups', how: 'Won a week in which you used Rule One', unlocks: [part('decal', 'fourLeaf', 'Four-leaf decal')] },
  // Group play (Phase 3)
  { id: 'rumbleRoyale', name: 'Rumble Royale', group: 'group', how: 'Most points in the league in a Rumble week', unlocks: [part('explosion', 'thunder', 'Thunder goal explosion')] },
  { id: 'teamPlayer', name: 'Team Player', group: 'group', how: 'Won a Team Week', unlocks: [part('decal', 'squad', 'Squad decal')] },
  { id: 'dynamicDuo', name: 'Dynamic Duo', group: 'group', how: 'Won a 2v2', unlocks: [part('boost', 'twinTurbo', 'Twin-turbo boost trail')] },
  { id: 'bountyHunter', name: 'Bounty Hunter', group: 'group', how: 'Top contributor in a Bounty Week', unlocks: [part('decal', 'wantedPoster', 'Wanted-poster decal')] },
  { id: 'floorBreaker', name: 'Floor Breaker', group: 'group', how: 'Most tiles broken in a Drop Shot week', unlocks: [part('explosion', 'shatter', 'Shatter goal explosion')] },
  { id: 'alleyCat', name: 'Alley Cat', group: 'group', how: 'Won the Alley', unlocks: [part('body', 'noodle', 'Noodle body')] },
  // Social
  { id: 'trashTalker', name: 'Trash Talker', group: 'social', how: '50 taunts sent', unlocks: [part('topper', 'megaphone', 'Megaphone topper')] },
  { id: 'showOff', name: 'Show-Off', group: 'social', how: '10 brags with 3 or more reactions each', unlocks: [part('boost', 'spotlight', 'Spotlight boost trail')] },
  { id: 'fanFavorite', name: 'Fan Favorite', group: 'social', how: '100 reactions received', unlocks: [part('explosion', 'confetti', 'Confetti goal explosion')] },
  { id: 'prophet', name: 'Prophet', group: 'social', how: 'Best predictions record in a season', unlocks: [part('topper', 'crystalBall', 'Crystal-ball topper')] },
  { id: 'payback', name: 'Payback', group: 'social', how: 'Won a rematch challenge', unlocks: [part('decal', 'payback', 'Payback decal')] },
  // Season and career
  { id: 'foundingMember', name: 'Founding Member', group: 'career', how: 'Played Season 1', unlocks: [part('decal', 'og', 'OG decal')] },
  { id: 'veteran', name: 'Veteran', group: 'career', how: 'Played 3 seasons', unlocks: [part('body', 'retro', 'Retro body')] },
  { id: 'finalist', name: 'Finalist', group: 'career', how: 'Reached a final', unlocks: [part('paint', 'silver', 'Silver finish')] },
  { id: 'champion', name: 'Champion', group: 'career', how: 'Won a season', unlocks: [part('topper', 'trophy', 'Trophy topper'), part('explosion', 'golden', 'Golden goal explosion'), part('finish', 'gold', 'Gold finish'), part('backdrop', 'podium', "Champion's podium")] },
  { id: 'mvpMagnet', name: 'MVP Magnet', group: 'career', how: '3 MVPs in a season', unlocks: [part('decal', 'mvp', 'MVP decal')] },
  { id: 'bustCollector', name: 'Bust Collector', group: 'career', how: '3 Busts in a season', unlocks: [part('decal', 'dumpsterFire', 'Dumpster-fire decal')], shame: true },
  { id: 'wheelSurvivor', name: 'Wheel Survivor', group: 'career', how: 'Completed 3 dares', unlocks: [part('paint', 'clown', 'Clown paint')] },
  { id: 'grandChamp', name: 'Grand Champ', group: 'career', how: 'Reached the Grand Champ rank', unlocks: [part('paint', 'galaxy', 'Galaxy paint')] },
  { id: 'commish', name: 'Commish', group: 'career', how: 'Ran a season as commish', unlocks: [part('topper', 'whistle', 'Whistle topper')] },
];

export const BADGE_GROUPS: Record<BadgeGroup, string> = {
  streaks: 'Streaks',
  lanes: 'Lanes',
  screen: 'Screen time',
  beers: 'Beers',
  matchups: 'Matchups',
  powerups: 'Power-ups',
  group: 'Group play',
  social: 'Social',
  career: 'Season and career',
};

const STARTER_PAINTS = [
  ['midnightBlack', 'Midnight Black'],
  ['arcticWhite', 'Arctic White'],
  ['gunmetal', 'Gunmetal'],
  ['racingRed', 'Racing Red'],
  ['blazeOrange', 'Blaze Orange'],
  ['sunburstYellow', 'Sunburst Yellow'],
  ['lime', 'Lime'],
  ['forestGreen', 'Forest Green'],
  ['teal', 'Teal'],
  ['skyBlue', 'Sky Blue'],
  ['cobalt', 'Cobalt'],
  ['royalPurple', 'Royal Purple'],
  ['hotPink', 'Hot Pink'],
  ['burgundy', 'Burgundy'],
  ['sand', 'Sand'],
] as const;

/**
 * The starter kit (SCOPE.md, "Car parts"): every player has these from the
 * start. The accent, finish, trail style and backdrop slots were added at the
 * commish's request (ruling R21).
 */
export const STARTER_PARTS: readonly Part[] = [
  part('body', 'brick', 'Brick'),
  part('body', 'dart', 'Dart'),
  part('body', 'bruiser', 'Bruiser'),
  ...STARTER_PAINTS.map(([id, name]) => part('paint', id, name)),
  part('paint2', 'none', 'No accent'),
  ...STARTER_PAINTS.map(([id, name]) => part('paint2', id, name)),
  part('finish', 'gloss', 'Gloss'),
  part('finish', 'matte', 'Matte'),
  part('finish', 'metallic', 'Metallic'),
  part('finish', 'pearl', 'Pearl'),
  part('decal', 'none', 'None'),
  part('wheels', 'stock', 'Stock'),
  part('boost', 'team', 'Your team color'),
  part('trail', 'stream', 'Stream'),
  part('trail', 'sparks', 'Sparks'),
  part('trail', 'rings', 'Smoke rings'),
  part('trail', 'flames', 'Flames'),
  part('explosion', 'stock', 'Stock burst'),
  part('topper', 'none', 'None'),
  part('backdrop', 'garage', 'Garage'),
  part('backdrop', 'stadium', 'Stadium at night'),
  part('backdrop', 'tunnel', 'Neon tunnel'),
];

/** Where the accent paint goes: any of these, alone or together (ruling R22). */
export const ACCENT_ZONES = [
  { id: 'lower', name: 'Lower body' },
  { id: 'roof', name: 'Roof' },
  { id: 'stripes', name: 'Side stripes' },
  { id: 'nose', name: 'Nose' },
  { id: 'tail', name: 'Tail' },
] as const;

/** Your current rank's emblem, for any player with a rank (ruling R21). */
export const RANK_DECAL: Part = part('decal', 'rank', 'Rank emblem');

/**
 * A decal for each season a player finished (ruling R21), from their
 * profile's `seasons`: each season's id and the year it ended. The id carries
 * both, so the car can draw them: `season-s1-2027`.
 */
export function seasonDecals(seasons: Readonly<Record<string, number>> | null | undefined): Part[] {
  return Object.entries(seasons ?? {})
    .filter(([season, year]) => /^s[0-9]+$/.test(season) && Number.isInteger(year))
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([season, year]) => part('decal', `season-${season}-${year}`, `Season ${season.slice(1)} (${year})`));
}

/** Every part a player can put on their car: the starter kit, and what their badges unlock. */
export function unlockedParts(badges: readonly string[]): Part[] {
  return [...STARTER_PARTS, ...BADGES.filter((badge) => badges.includes(badge.id)).flatMap((badge) => badge.unlocks)];
}

/** "a", "a and b", "a, b and c": a badge's unlocks, in words. */
export function andList(items: readonly string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}
