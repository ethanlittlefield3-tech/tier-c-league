import { HOUSE, MODE_BLURBS, MODE_NAMES, bountyText, defaultBounty, type BountyTarget, type GroupMode, type HolidayEvent } from '@tcl/engine';
import './group.css';

/**
 * Today in a group-play week: the mode in a line, and what it means for you
 * this week (SCOPE.md, "Group play"). The board on Game Day shows how it stands.
 */
export function ModeBanner(props: {
  me: string;
  week: {
    week?: number;
    mode?: string;
    teams?: { blue: string[]; orange: string[] };
    duos?: { a: string[]; b: string[] }[];
    bounty?: BountyTarget | null;
    roster?: string[];
  };
  name: (player: string) => string;
}) {
  const mode = props.week.mode as GroupMode | undefined;
  if (!mode || !(mode in MODE_NAMES)) return null;
  const others = (players: string[]) => players.filter((player) => player !== props.me).map(props.name);
  const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
  let detail = '';
  if (mode === 'teamWeek' && props.week.teams) {
    const team = props.week.teams.blue.includes(props.me) ? 'blue' : props.week.teams.orange.includes(props.me) ? 'orange' : null;
    if (team) {
      const mates = others(props.week.teams[team]);
      detail = `You're on ${team === 'blue' ? 'Blue' : 'Orange'}${mates.length > 0 ? ` with ${list(mates)}` : ''}.`;
    }
  }
  if (mode === 'twoVTwo') {
    const match = (props.week.duos ?? []).find((each) => each.a.includes(props.me) || each.b.includes(props.me));
    if (!match) detail = 'The duos are drawn at 12:00 am on Monday.';
    else {
      const [mine, theirs] = match.a.includes(props.me) ? [match.a, match.b] : [match.b, match.a];
      const partners = others(mine);
      detail = `${partners.length > 0 ? `You and ${list(partners)}` : 'You'}, against ${theirs.includes(HOUSE) ? 'the House duo' : list(theirs.map(props.name))}.`;
    }
  }
  if (mode === 'bounty') detail = `This week's Bounty: ${bountyText(props.week.bounty ?? defaultBounty((props.week.roster ?? []).length))}.`;
  if (mode === 'alley') detail = 'No power-ups this week; Rule One still works.';
  return (
    <p class="mode-banner" role="note">
      <strong>
        Week {props.week.week}: {MODE_NAMES[mode]}.
      </strong>{' '}
      {MODE_BLURBS[mode]} {detail} The board shows how it stands.
    </p>
  );
}

/**
 * Today in the playoffs (SCOPE.md, "Playoffs"): your round and what it asks
 * of you. A fresh kit each round, no Rule One, and no rest days.
 */
export function PlayoffBanner(props: {
  me: string;
  week: { round?: string; pairs?: { a: string; b: string }[]; racers?: string[] };
  bracket: { seeds: string[]; outside: string[]; semis: { a: string; b: string | null }[] } | null;
  name: (player: string) => string;
}) {
  const pair = (props.week.pairs ?? []).find((each) => each.a === props.me || each.b === props.me);
  const them = pair ? (pair.a === props.me ? pair.b : pair.a) : null;
  const inPlayoffs = props.bracket?.seeds.includes(props.me) ?? false;
  const bye = props.bracket?.semis.some((game) => game.a === props.me && game.b === null) ?? false;
  let title = 'The playoffs';
  let detail = '';
  if (props.week.round === 'semi') {
    title = inPlayoffs ? 'Semifinal' : 'Whiff Bowl';
    if (bye) detail = 'You have a bye into the final.';
    else if (them) detail = inPlayoffs ? `You face ${props.name(them)}: the winner plays in the final.` : `You face ${props.name(them)}: win and you're safe.`;
    else if (!inPlayoffs) detail = "You're safe in the Whiff Bowl this round.";
  } else if (props.week.round === 'final') {
    title = them ? 'The final' : 'Whiff Bowl';
    if (them) detail = `You face ${props.name(them)}. Level points go to sudden death the day after.`;
    else if (props.week.racers?.includes(props.me)) detail = "You race for not last: the fewest points over the final's days does the Season Dare.";
    else detail = 'Your days still count for your streaks and badges.';
  } else if (props.week.round === 'suddenDeath') {
    title = 'Sudden death';
    detail = them ? `If the final with ${props.name(them)} was level, the first to miss any goal today loses. No power-ups today.` : 'Only the finalists play it, if the final was level.';
  }
  return (
    <p class="mode-banner" role="note">
      <strong>{title}.</strong> {detail} A fresh kit each round, no Rule One and no rest days in the playoffs.
    </p>
  );
}

const EVENT_WORDS: Record<HolidayEvent, [string, string]> = {
  double: ['Double Points Day', "The day's points count double, and an Aerial doubles them again."],
  dry: ['Dry Day', 'Log 0 beers for +2.'],
  pass: ['Holiday Pass', 'Logging nothing scores 0, not −5.'],
};

/** The day's holiday event (SCOPE.md, "Holiday events"), which the commish scheduled. */
export function EventBanner(props: { event: HolidayEvent; today: boolean }) {
  const [title, detail] = EVENT_WORDS[props.event];
  return (
    <p class="mode-banner event-banner" role="note" data-event={props.event}>
      <strong>
        {props.today ? 'Today' : 'Yesterday'}: {title}.
      </strong>{' '}
      {detail}
    </p>
  );
}
