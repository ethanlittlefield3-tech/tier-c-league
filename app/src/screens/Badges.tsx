import { BADGES, BADGE_GROUPS, andList, type Badge, type BadgeGroup } from '@tcl/engine';
import './badges.css';

const LATER: Record<NonNullable<Badge['later']>, string> = {
  'group play': 'Comes with group play',
  predictions: 'Comes with predictions',
  rematches: 'Comes with rematch challenges',
  playoffs: 'Comes with the playoffs',
};

function BadgeRow(props: { badge: Badge; earned: boolean }) {
  const { badge } = props;
  return (
    <li class="badge-row" data-earned={props.earned} data-shame={badge.shame === true}>
      <span class="badge-medal" aria-hidden="true" />
      <span class="badge-words">
        <span class="badge-name">
          {badge.name}
          {badge.shame && <span class="badge-shame">Shame</span>}
        </span>
        <span class="badge-how">{badge.later && !props.earned ? `${badge.how}. ${LATER[badge.later]}.` : `${badge.how}.`}</span>
        <span class="badge-unlocks">Unlocks {andList(badge.unlocks.map((part) => part.name))}</span>
      </span>
    </li>
  );
}

/**
 * Your badges, on League's Badges tab (SCOPE.md, "Garage and achievements"): what you
 * have earned, and what each unlocks for your car. The rest are listed
 * underneath, so everyone knows how to earn them.
 */
export function BadgesPanel(props: { earned: Record<string, unknown> }) {
  const mine = BADGES.filter((badge) => props.earned[badge.id] !== undefined);
  const rest = BADGES.filter((badge) => props.earned[badge.id] === undefined);
  const groups = Object.keys(BADGE_GROUPS) as BadgeGroup[];
  return (
    <div class="badges">
      <p class="panel-text">
        {mine.length} of {BADGES.length} earned. Each one unlocks a part for your car.
      </p>
      {mine.length > 0 && (
        <ul class="badge-list" aria-label="Earned">
          {mine.map((badge) => (
            <BadgeRow key={badge.id} badge={badge} earned />
          ))}
        </ul>
      )}
      <details class="badge-rest">
        <summary>Still to earn ({rest.length})</summary>
        {groups.map((group) => {
          const these = rest.filter((badge) => badge.group === group);
          if (these.length === 0) return null;
          return (
            <div key={group}>
              <h3 class="badge-group">{BADGE_GROUPS[group]}</h3>
              <ul class="badge-list">
                {these.map((badge) => (
                  <BadgeRow key={badge.id} badge={badge} earned={false} />
                ))}
              </ul>
            </div>
          );
        })}
      </details>
    </div>
  );
}
