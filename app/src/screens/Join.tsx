import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatLeagueCode } from '@tcl/engine';
import { Lockup } from '../art/Lockup.tsx';
import { PlayerBadge } from '../art/PlayerBadge.tsx';
import scene from '../art/title-scene.svg';
import type { Failed, Me, Trouble } from '../data/identity.ts';
import { readCode, readKey, type EntryProblem } from '../join/entry.ts';
import { NAME_MAX, initialOf, nameProblem, tidyName } from '../join/name.ts';
import './join.css';

/** The database calls this screen makes. The app loads them in the background and hands them in. */
export interface JoinApi {
  findLeague(code: string): Promise<{ league: string; name: string } | null>;
  join(input: { league: string; leagueName: string; code: string; displayName: string }): Promise<{ me: Me; key: string }>;
  recover(input: { league: string; leagueName: string; code: string; key: string }): Promise<{ me: Me; key: string } | null>;
}

type Step =
  | { at: 'welcome' }
  | { at: 'code' }
  | { at: 'name'; league: string; leagueName: string; code: string }
  | { at: 'recover' }
  | { at: 'key'; me: Me; key: string; returning: boolean };

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

const whyOf = (error: unknown): Trouble => (error as Failed).why ?? 'offline';

/** A step's heading takes the focus when the step appears, so a screen reader says where you are. */
function Heading(props: { children: ComponentChildren }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <h1 ref={heading} tabIndex={-1}>
      {props.children}
    </h1>
  );
}

function Back(props: { onBack: () => void }) {
  return (
    <button class="join-back" type="button" onClick={props.onBack}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10 3 5 8l5 5" />
      </svg>
      Back
    </button>
  );
}

/** One text field with its label, a line of help, and room for what went wrong. */
function Field(props: {
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => void;
  help?: string;
  error?: string | null;
  code?: boolean;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (props.autoFocus) input.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div class="field">
      <label for={props.id}>{props.label}</label>
      <input
        ref={input}
        id={props.id}
        class={props.code ? 'field-code' : undefined}
        type="text"
        value={props.value}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        autocomplete="off"
        autocorrect="off"
        autocapitalize={props.code ? 'characters' : 'words'}
        spellcheck={false}
        enterkeyhint="go"
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={`${props.id}-notes`}
      />
      <div id={`${props.id}-notes`}>
        {props.error ? (
          <p class="field-error" role="alert">
            {props.error}
          </p>
        ) : (
          props.help && <p class="field-help">{props.help}</p>
        )}
      </div>
    </div>
  );
}

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
  onDone: (me: Me) => void;
}) {
  const [step, setStep] = useState<Step>(props.start === 'recover' ? { at: 'recover' } : { at: 'welcome' });
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
      const joined = await props.api.join({ league: step.league, leagueName: step.leagueName, code: step.code, displayName: tidyName(name) });
      go({ at: 'key', me: joined.me, key: joined.key, returning: false });
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
        <button class="btn" type="button" onClick={() => props.onDone(step.me)}>
          I've saved it
        </button>
      </div>
    </main>
  );
}
