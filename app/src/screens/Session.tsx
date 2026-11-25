import { useEffect, useState } from 'preact/hooks';
import { backend } from '../data/backend.ts';
import { loadData } from '../data/load.ts';
import type { Me } from '../data/identity.ts';
import { Frame } from './Frame.tsx';
import { Join, type JoinApi } from './Join.tsx';

type State =
  | { at: 'checking' }
  | { at: 'home'; me: Me }
  | { at: 'join'; api: JoinApi; signedOutCode: string | null }
  | { at: 'offline' };

const SIGNED_OUT = {
  title: 'This phone was signed out.',
  body: 'Your profile was opened on another phone, or your commish reset your key. Enter your current recovery key to get back in.',
};

/**
 * Everything after the title screen. It works out who this phone is, then
 * shows the way in (join or recover) or the app itself.
 */
export function Session() {
  const [state, setState] = useState<State>({ at: 'checking' });

  const check = async () => {
    setState({ at: 'checking' });
    try {
      const data = await loadData();
      const who = await data.whoAmI();
      if (who && 'player' in who) setState({ at: 'home', me: who });
      else setState({ at: 'join', api: data, signedOutCode: who ? who.code : null });
    } catch {
      setState({ at: 'offline' });
    }
  };

  useEffect(() => {
    void check();
  }, []);

  if (state.at === 'checking') {
    return (
      <main class="waiting" aria-busy="true">
        <div class="waiting-ring" />
        <p role="status">Finding your league</p>
      </main>
    );
  }

  if (state.at === 'offline') {
    return (
      <main class="screen">
        <div class="screen-body">
          <h1>No signal</h1>
          <p class="lead">The app could not reach your league. Check your signal and try again.</p>
          <button class="btn" type="button" onClick={() => void check()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (state.at === 'join') {
    return (
      <Join
        api={state.api}
        closed={backend() === null}
        start={state.signedOutCode ? 'recover' : 'welcome'}
        code={state.signedOutCode ?? undefined}
        notice={state.signedOutCode ? SIGNED_OUT : null}
        onDone={(me) => setState({ at: 'home', me })}
      />
    );
  }

  return <Frame me={state.me} onRenamed={(me) => setState({ at: 'home', me })} onSignedOut={() => void check()} />;
}
