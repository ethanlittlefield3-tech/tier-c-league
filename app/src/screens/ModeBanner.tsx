import { HOUSE, MODE_BLURBS, MODE_NAMES, bountyText, defaultBounty, type BountyTarget, type GroupMode } from '@tcl/engine';
import './group.css';

/**
 * Today in a group-play week: the mode in a line, and what it means for you
 * this week (SCOPE.md, "Group play"). Match shows how it stands.
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
      {MODE_BLURBS[mode]} {detail} Match shows how it stands.
    </p>
  );
}
