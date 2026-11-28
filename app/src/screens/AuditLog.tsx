import { useAll } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import { Back, Heading } from '../ui/parts.tsx';
import './commish.css';
import './profile.css';

interface Entry {
  by: string;
  at: number;
  action: string;
  target: string;
  reason: string;
}

const ACTIONS: Record<string, string> = {
  'season.settings': 'changed the season settings',
  'league.settings': 'changed the league settings',
  'key.reissue': 'reissued a recovery key',
  'score.adjust': 'changed a score',
  'idea.delete': 'took down an idea from the suggestion box',
  'practice.schedule': 'scheduled a practice week',
  'practice.ending': 'ended the practice week early',
  'practice.clearing': 'cleared the practice week',
};

function when(at: number): string {
  return new Date(at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * The league log: every commish action, with its time and reason, for the
 * whole league to read (SCOPE.md, "Commish tools"). Nothing in it can be
 * changed or deleted.
 */
export function AuditLog(props: { me: Me; onBack: () => void }) {
  const entries = useAll<Entry>(`leagues/${props.me.league}/audit`);
  const players = useAll<{ displayName?: string }>(`leagues/${props.me.league}/players`);
  const name = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'A former player';
  const sorted = [...entries.docs].sort((a, b) => b.data.at - a.data.at);

  return (
    <main class="screen profile">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <Heading>League log</Heading>
        <p class="lead">Everything the commish has done, with the reason. Nothing here can be changed or deleted.</p>
        {entries.loading ? (
          <div class="waiting commish-waiting" aria-busy="true">
            <div class="waiting-ring" />
          </div>
        ) : sorted.length === 0 ? (
          <p class="fine-print">Nothing yet.</p>
        ) : (
          <ol class="log">
            {sorted.map(({ id, data }) => {
              const about = data.target.startsWith('keys/') ? ` for ${name(data.target.slice(5))}` : '';
              return (
                <li class="log-entry" key={id}>
                  <p class="log-what">
                    <strong>{name(data.by)}</strong> {ACTIONS[data.action] ?? data.action}
                    {about}
                  </p>
                  {data.reason && <p class="log-why">{data.reason}</p>}
                  <p class="log-when">{when(data.at)}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
