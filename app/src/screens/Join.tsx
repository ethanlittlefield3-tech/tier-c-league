import { useEffect, useRef, useState } from 'preact/hooks';
import { formatLeagueCode } from '@tcl/engine';
import { Lockup } from '../art/Lockup.tsx';
import { PlayerBadge } from '../art/PlayerBadge.tsx';
import scene from '../art/title-scene.svg';
import { DEFAULT_ALERTS, type AlertSettings } from '@tcl/engine';
import type { AlertState } from '../data/alerts.ts';
import type { JoinAnswer, Me, Trouble } from '../data/identity.ts';
import { whyOf } from '../data/why.ts';
import { readCode, readKey, type EntryProblem } from '../join/entry.ts';
import { NAME_MAX, initialOf, nameProblem, tidyName } from '../join/name.ts';
import type { Waiting } from '../join/waiting.ts';
import { Back, Field, Heading } from '../ui/parts.tsx';
import './join.css';

/** The database calls this screen makes. The app loads them in the background and hands them in. */
export interface JoinApi {
  findLeague(code: string): Promise<{ league: string; name: string } | null>;
  join(input: { league: string; leagueName: string; code: string; displayName: string }): Promise<{ me: Me; key: string }>;
  recover(input: { league: string; leagueName: string; code: string; key: string }): Promise<{ me: Me; key: string } | null>;
  askToJoin(input: Waiting): Promise<void>;
  watchJoinRequest(league: string, onChange: (answer: JoinAnswer) => void): () => void;
  withdrawJoin(league: string): Promise<void>;
  alertState(me: Me): Promise<{ state: AlertState; settings: AlertSettings }>;
  turnOnAlerts(me: Me, settings: AlertSettings): Promise<AlertState>;
}

type Step =
  | { at: 'welcome' }
  | { at: 'code' }
  | { at: 'name'; league: string; leagueName: string; code: string }
  | { at: 'recover' }
  | { at: 'key'; me: Me; key: string; returning: boolean }
  | { at: 'waiting'; waiting: Waiting };

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet. Check back soon.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not let you in. It may be full (12 players) or closed to new players. Ask your commish.',
};

const CODE_PROBLEM: Record<EntryProblem, string> = {
  empty: 'Type your league code first.',
  shape: 'A league code is 8 letters and numbers, like K7QM-X2R9.',
  lookalike: 'League codes never use 0, O, 1 or I. Check for a look-alike.',
};

const KEY_PROBLEM: Record<EntryProblem, string> = {
  empty: 'Type your recovery key first.',
  shape: 'A recovery key looks like TCL-7Q4M-X2K9.',
  lookalike: 'Recovery keys never use 0, O, 1 or I. Check for a look-alike.',
};

/** The way in: join with a league code, or get back in with a recovery key. */
export function Join(props: {
  api: JoinApi;
  /** Where to start. A phone that was signed out starts on "get back in". */
  start?: 'welcome' | 'recover';
  /** A league code to fill in, when the phone already knows it. */
  code?: string;
  /** A message for the top of the first step. */
  notice?: { title: string; body: string } | null;
  /** True while the league's database is not set up yet. The first step says so. */
  closed?: boolean;
  /** A request to join this phone is waiting on, from before it was closed. */
  waiting?: Waiting | null;
  onDone: (me: Me) => void;
}) {
  const [step, setStep] = useState<Step>(props.waiting ? { at: 'waiting', waiting: props.waiting } : props.start === 'recover' ? { at: 'recover' } : { at: 'welcome' });
  const [code, setCode] = useState(props.code ? formatLeagueCode(props.code) : '');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState<{ on: 'code' | 'name' | 'key'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  /** Runs one trip to the database, with the button showing it is working. */
  const attempt = async (on: 'code' | 'name' | 'key', work: () => Promise<void>) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await work();
    } catch (failure) {
      setError({ on, text: TROUBLE[whyOf(failure)] });
    } finally {
      setBusy(false);
    }
  };

  const submitCode = (event: Event) => {
    event.preventDefault();
    const read = readCode(code);
    if ('problem' in read) return setError({ on: 'code', text: CODE_PROBLEM[read.problem] });
    void attempt('code', async () => {
      const found = await props.api.findLeague(read.code);
      if (!found) return setError({ on: 'code', text: 'No league has that code. Check it with your commish.' });
      go({ at: 'name', league: found.league, leagueName: found.name, code: read.code });
    });
  };

  const submitName = (event: Event) => {
    event.preventDefault();
    if (step.at !== 'name') return;
    const problem = nameProblem(name);
    if (problem === 'empty') return setError({ on: 'name', text: 'Type a name first.' });
    if (problem === 'too-long') return setError({ on: 'name', text: `That is too long. A name can be up to ${NAME_MAX} characters.` });
    void attempt('name', async () => {
      const input = { league: step.league, leagueName: step.leagueName, code: step.code, displayName: tidyName(name) };
      try {
        const joined = await props.api.join(input);
        go({ at: 'key', me: joined.me, key: joined.key, returning: false });
      } catch (failure) {
        if (whyOf(failure) !== 'refused') throw failure;
        // A league that lets players in with the commish's approval takes a request instead.
        try {
          await props.api.askToJoin(input);
        } catch {
          throw failure;
        }
        go({ at: 'waiting', waiting: input });
      }
    });
  };

  const submitRecover = (event: Event) => {
    event.preventDefault();
    const readC = readCode(code);
    if ('problem' in readC) return setError({ on: 'code', text: CODE_PROBLEM[readC.problem] });
    const readK = readKey(key);
    if ('problem' in readK) return setError({ on: 'key', text: KEY_PROBLEM[readK.problem] });
    void attempt('key', async () => {
      const found = await props.api.findLeague(readC.code);
      if (!found) return setError({ on: 'code', text: 'No league has that code. Check it with your commish.' });
      const back = await props.api.recover({ league: found.league, leagueName: found.name, code: readC.code, key: readK.key });
      if (!back) return setError({ on: 'key', text: 'That key does not match a player in this league. Check it, or ask your commish to look it up.' });
      go({ at: 'key', me: back.me, key: back.key, returning: true });
    });
  };

  const copyKey = async () => {
    if (step.at !== 'key') return;
    try {
      await navigator.clipboard.writeText(step.key);
      setCopied('yes');
    } catch {
      setCopied('failed');
    }
  };

  const errorOn = (field: 'code' | 'name' | 'key') => (error?.on === field ? error.text : null);
  const closedNote = props.closed && (
    <p class="notice" role="status">
      <strong>The league is not open yet.</strong>
      The app is still being built. You will be able to join here as soon as the league opens.
    </p>
  );

  if (step.at === 'welcome') {
    return (
      <main class="screen join" data-step="welcome">
        <div class="join-art" aria-hidden="true">
          <img src={scene} alt="" />
        </div>
        <div class="screen-body join-welcome">
          <h1 class="sr-only">Tier C League</h1>
          <Lockup class="join-logo" />
          <p class="lead">Friends, daily habits, weekly 1v1 matchups.</p>
          {closedNote}
          <button class="btn" type="button" onClick={() => go({ at: 'code' })}>
            Join a league
          </button>
          <button class="btn btn-second join-second" type="button" onClick={() => go({ at: 'recover' })}>
            I'm already in a league
          </button>
          <p class="fine-print">Joining takes a league code. Your commish has it.</p>
        </div>
      </main>
    );
  }

  if (step.at === 'code') {
    return (
      <main class="screen join" data-step="code">
        <form class="screen-body" onSubmit={submitCode} noValidate>
          <Back onBack={() => go({ at: 'welcome' })} />
          <Heading>Enter your league code</Heading>
          <p class="lead">Your commish has it.</p>
          <Field id="join-code" label="League code" value={code} onInput={setCode} code placeholder="XXXX-XXXX" maxLength={12} autoFocus error={errorOn('code')} help="8 letters and numbers." />
          <button class="btn" type="submit" disabled={busy}>
            {busy ? 'Looking' : 'Next'}
          </button>
        </form>
      </main>
    );
  }

  if (step.at === 'name') {
    return (
      <main class="screen join" data-step="name">
        <form class="screen-body" onSubmit={submitName} noValidate>
          <Back onBack={() => go({ at: 'code' })} />
          <Heading>Pick your name</Heading>
          <p class="lead">
            You are joining <strong>{step.leagueName}</strong>.
          </p>
          <PlayerBadge class="join-badge" initial={initialOf(name)} />
          <Field id="join-name" label="Display name" value={name} onInput={setName} maxLength={40} autoFocus error={errorOn('name')} help={`Up to ${NAME_MAX} characters. You can change it later.`} />
          <button class="btn" type="submit" disabled={busy}>
            {busy ? 'Joining' : 'Join the league'}
          </button>
        </form>
      </main>
    );
  }

  if (step.at === 'waiting') {
    return (
      <WaitingToJoin
        api={props.api}
        waiting={step.waiting}
        onJoined={(me, key) => go({ at: 'key', me, key, returning: false })}
        onStartOver={() => go({ at: 'welcome' })}
      />
    );
  }

  if (step.at === 'recover') {
    return (
      <main class="screen join" data-step="recover">
        <form class="screen-body" onSubmit={submitRecover} noValidate>
          <Back onBack={() => go({ at: 'welcome' })} />
          <Heading>Get back into your league</Heading>
          {props.notice ? (
            <p class="notice" role="status">
              <strong>{props.notice.title}</strong>
              {props.notice.body}
            </p>
          ) : (
            <p class="lead">Enter the league code and your recovery key.</p>
          )}
          <Field id="recover-code" label="League code" value={code} onInput={setCode} code placeholder="XXXX-XXXX" maxLength={12} autoFocus={!props.code} error={errorOn('code')} />
          <Field id="recover-key" label="Recovery key" value={key} onInput={setKey} code placeholder="TCL-XXXX-XXXX" maxLength={18} autoFocus={Boolean(props.code)} error={errorOn('key')} help="Lost it? Your commish can look it up." />
          <button class="btn" type="submit" disabled={busy}>
            {busy ? 'Looking' : 'Find my profile'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main class="screen join" data-step="key">
      <div class="screen-body">
        <PlayerBadge class="join-badge" initial={initialOf(step.me.displayName)} />
        <Heading>{step.returning ? `Welcome back, ${step.me.displayName}` : 'Save your recovery key'}</Heading>
        <p class="lead">
          {step.returning
            ? 'Your recovery key has changed, and every other device is signed out. Save the new one.'
            : `You are in, ${step.me.displayName}. This key is the only way back into your profile on a new phone.`}
        </p>
        <p class="join-key" aria-label={`Your recovery key is ${step.key.split('').join(' ')}`}>
          {step.key}
        </p>
        <button class="btn btn-second join-copy" type="button" onClick={copyKey}>
          {copied === 'yes' ? 'Copied' : 'Copy the key'}
        </button>
        <p class="fine-print" role="status">
          {copied === 'failed' ? 'That did not work here. Write the key down or take a screenshot. ' : 'Take a screenshot or write it down. '}
          It also stays in your Profile, and your commish can look it up.
        </p>
        <OfferAlerts api={props.api} me={step.me} />
        <button class="btn" type="button" onClick={() => props.onDone(step.me)}>
          I've saved it
        </button>
      </div>
    </main>
  );
}

/**
 * Waiting for the commish to let you in (joining "with my approval"). When
 * they do, the phone joins as usual and shows the recovery key.
 */
function WaitingToJoin(props: { api: JoinApi; waiting: Waiting; onJoined: (me: Me, key: string) => void; onStartOver: () => void }) {
  const [answer, setAnswer] = useState<JoinAnswer>('waiting');
  const [error, setError] = useState<string | null>(null);
  const joining = useRef(false);
  const { api, waiting, onJoined } = props;

  useEffect(
    () =>
      api.watchJoinRequest(waiting.league, (next) => {
        setAnswer(next);
        if (next !== 'approved' || joining.current) return;
        joining.current = true;
        void api
          .join(waiting)
          .then(async (joined) => {
            await api.withdrawJoin(waiting.league);
            onJoined(joined.me, joined.key);
          })
          .catch((failure: unknown) => {
            joining.current = false;
            setError(TROUBLE[whyOf(failure)]);
          });
      }),
    [waiting.league],
  );

  const startOver = () => {
    void api.withdrawJoin(waiting.league).then(props.onStartOver);
  };

  return (
    <main class="screen join" data-step="waiting">
      <div class="screen-body">
        <PlayerBadge class="join-badge" initial={initialOf(waiting.displayName)} />
        <Heading>{answer === 'declined' ? 'Not this time' : answer === 'approved' ? "You're in" : 'Asked to join'}</Heading>
        <p class="lead" role="status">
          {answer === 'declined'
            ? `Your commish turned this request down. Ask them about ${waiting.leagueName}.`
            : answer === 'approved'
              ? 'Setting up your profile…'
              : answer === 'gone'
                ? 'This request is gone. Start over to ask again.'
                : `Your commish lets new players in to ${waiting.leagueName}. You can close the app: it remembers you asked.`}
        </p>
        {error && (
          <p class="field-error" role="alert">
            {error}
          </p>
        )}
        {answer !== 'approved' && (
          <button class="btn btn-second" type="button" onClick={startOver}>
            {answer === 'waiting' ? 'Take my request back' : 'Start over'}
          </button>
        )}
      </div>
    </main>
  );
}

/**
 * Alerts, offered once you're in (SCOPE.md, "Join or recover"): only on a
 * phone that can have them, which on an iPhone means the Home Screen app.
 */
function OfferAlerts(props: { api: JoinApi; me: Me }) {
  const [state, setState] = useState<AlertState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const { api, me } = props;

  useEffect(() => {
    let live = true;
    api.alertState(me).then(
      (found) => live && setState(found.state),
      () => live && setState('unsupported'),
    );
    return () => {
      live = false;
    };
  }, [me.player]);

  if (state !== 'off' && state !== 'on' && state !== 'blocked') return null;
  const turnOn = () => {
    if (busy) return;
    setBusy(true);
    api
      .turnOnAlerts(me, DEFAULT_ALERTS)
      .then(setState, () => undefined)
      .finally(() => setBusy(false));
  };
  return (
    <div class="join-alerts">
      {state === 'on' ? (
        <p class="fine-print">Alerts are on. Pick which ones in your Profile.</p>
      ) : state === 'blocked' ? (
        <p class="fine-print">Alerts are blocked for Tier C. Turn them on in your phone’s settings any time.</p>
      ) : (
        <>
          <p class="fine-print">Want alerts for deadlines, your matchup and taunts? You pick which in your Profile.</p>
          <button class="btn btn-second" type="button" disabled={busy} onClick={turnOn}>
            {busy ? 'Turning on' : 'Turn on alerts'}
          </button>
        </>
      )}
    </div>
  );
}
