import { type Lane } from '@tcl/engine';
import { useDoc, useNow, useWhere } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import { leagueDates } from '../today/model.ts';
import type { KitPlay } from '../today/week.ts';
import { Back, Heading } from '../ui/parts.tsx';
import { ReceiptAsk } from './ReceiptAsk.tsx';
import type { ReceiptDay } from './useMatchup.ts';

type Log = { date: string; goals?: Partial<Record<Lane, boolean>>; screenMinutes?: number | null };

/**
 * Anyone's day, from League (SCOPE.md: "Anyone can tap Receipts? on any
 * square of anyone's day"): what they claimed today, and yesterday until it
 * locks at noon, with "Receipts?" on each square.
 */
export function PlayerDay(props: { me: Me; player: string; onBack: () => void }) {
  const now = useNow();
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ season?: string | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<{ timeZone: string }>(seasonPath);
  const dates = season.data ? leagueDates(now, season.data.timeZone) : null;
  const todayCal = useDoc<ReceiptDay>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);
  const yesterdayCal = useDoc<ReceiptDay>(seasonPath && dates ? `${seasonPath}/calendar/${dates.yesterday}` : null);
  const profile = useDoc<{ displayName?: string }>(`${leaguePath}/players/${props.player}`);
  const roster = useDoc<{ goals?: Partial<Record<Lane, { text?: string }>> }>(seasonPath ? `${seasonPath}/roster/${props.player}` : null);
  const days = useWhere<Log>(seasonPath ? `${seasonPath}/days` : null, 'player', props.player);
  const kit = useWhere<KitPlay>(seasonPath ? `${seasonPath}/kit` : null, 'player', props.player);
  const theirReceipts = useWhere<Parameters<typeof ReceiptAsk>[0]['theirReceipts'][number]['data']>(seasonPath ? `${seasonPath}/receipts` : null, 'target', props.player);
  const myRequests = useWhere<Parameters<typeof ReceiptAsk>[0]['myRequests'][number]['data']>(seasonPath ? `${seasonPath}/receipts` : null, 'by', props.me.player);

  const name = profile.data?.displayName ?? 'A former player';
  const open = [todayCal.data, yesterdayCal.data].filter((day): day is ReceiptDay => day !== null && now >= day.start && now < day.lock);

  return (
    <main class="screen player-day">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <Heading>{name}'s day</Heading>
        {!seasonId || !season.data || !dates ? (
          <p class="lead">No season yet.</p>
        ) : (
          <ReceiptAsk
            me={props.me}
            seasonId={seasonId}
            now={now}
            timeZone={season.data.timeZone}
            today={dates.today}
            them={{ id: props.player, name, goals: roster.data?.goals ?? {}, kit: kit.docs.map((found) => found.data) }}
            days={open}
            logs={Object.fromEntries(days.docs.map((found) => [found.data.date, found.data]))}
            theirReceipts={theirReceipts.docs}
            myRequests={myRequests.docs}
          />
        )}
      </div>
    </main>
  );
}
