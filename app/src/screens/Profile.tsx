import { useState } from 'preact/hooks';
import { PlayerBadge } from '../art/PlayerBadge.tsx';
import { SmallNunchucks } from '../art/SmallNunchucks.tsx';
import type { Me, Trouble } from '../data/identity.ts';
import { useDoc } from '../data/hooks.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { NAME_MAX, initialOf, nameProblem, tidyName } from '../join/name.ts';
import { Back, Field, Heading } from '../ui/parts.tsx';
import type { Rank } from '@tcl/engine';
import { Alerts } from './Alerts.tsx';
import { BadgesPanel } from './Badges.tsx';
import { RankPanel, type RankEntry } from './Rank.tsx';
import './profile.css';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no. This phone may have been signed out: close the app and open it again.',
};

/**
 * Your Profile (SCOPE.md, "Screens"): your name, your recovery key, your
 * rank and badges, alerts, signing this phone out and the league log. Stats
 * and "Suggest an idea" arrive with the features they belong to.
 */
export function Profile(props: { me: Me; onBack: () => void; onRenamed: (me: Me) => void; onSignedOut: () => void; onCommish: () => void; onLog: () => void }) {
  const league = useDoc<{ commish?: string; coCommish?: string | null }>(`leagues/${props.me.league}`);
  const isCommish = league.data !== null && (league.data.commish === props.me.player || league.data.coCommish === props.me.player);
  const mine = useDoc<{ rank?: Rank; rankHistory?: RankEntry[]; badges?: Record<string, unknown> }>(`leagues/${props.me.league}/players/${props.me.player}`);
  const [name, setName] = useState(props.me.displayName);
  const [nameNote, setNameNote] = useState<{ error: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [key, setKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [fetchingKey, setFetchingKey] = useState(false);
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');

  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const saveName = async (event: Event) => {
    event.preventDefault();
    if (saving) return;
    const problem = nameProblem(name);
    if (problem === 'empty') return setNameNote({ error: true, text: 'Type a name first.' });
    if (problem === 'too-long') return setNameNote({ error: true, text: `That is too long. A name can be up to ${NAME_MAX} characters.` });
    const tidy = tidyName(name);
    if (tidy === props.me.displayName) {
      setName(tidy);
      return setNameNote({ error: false, text: 'That is already your name.' });
    }
    setSaving(true);
    setNameNote(null);
    try {
      const data = await loadData();
      const renamed = await data.rename(props.me, tidy);
      setName(tidy);
      setNameNote({ error: false, text: 'Saved.' });
      props.onRenamed(renamed);
    } catch (failure) {
      setNameNote({ error: true, text: TROUBLE[whyOf(failure)] });
    } finally {
      setSaving(false);
    }
  };

  const toggleKey = async () => {
    if (key !== null) return setKey(null);
    if (fetchingKey) return;
    setFetchingKey(true);
    setKeyError(null);
    try {
      const data = await loadData();
      setKey(await data.myKey(props.me));
      setCopied('no');
    } catch (failure) {
      setKeyError(TROUBLE[whyOf(failure)]);
    } finally {
      setFetchingKey(false);
    }
  };

  const copyKey = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied('yes');
    } catch {
      setCopied('failed');
    }
  };

  const signOut = async () => {
    if (leaving) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      const data = await loadData();
      await data.signOut(props.me);
      props.onSignedOut();
    } catch (failure) {
      setLeaveError(TROUBLE[whyOf(failure)]);
      setLeaving(false);
    }
  };

  return (
    <main class="screen profile">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <div class="profile-who">
          <PlayerBadge class="profile-badge" initial={initialOf(props.me.displayName)} />
          <Heading>{props.me.displayName}</Heading>
          <p class="profile-league">{props.me.leagueName}</p>
        </div>

        {isCommish && (
          <button type="button" class="btn profile-commish" onClick={props.onCommish}>
            Commish tools
          </button>
        )}

        <form class="panel" onSubmit={saveName} noValidate>
          <h2>Display name</h2>
          <Field
            id="profile-name"
            label="Display name"
            value={name}
            onInput={(value) => {
              setName(value);
              setNameNote(null);
            }}
            maxLength={40}
            hideLabel
            error={nameNote?.error ? nameNote.text : null}
            help={`Up to ${NAME_MAX} characters.`}
          />
          {nameNote && !nameNote.error && (
            <p class="panel-ok" role="status">
              {nameNote.text}
            </p>
          )}
          <button class="btn" type="submit" disabled={saving}>
            {saving ? 'Saving' : 'Save name'}
          </button>
        </form>

        <section class="panel" aria-labelledby="profile-key-title">
          <h2 id="profile-key-title">Recovery key</h2>
          <p class="panel-text">The only way back into your profile on a new phone. Your commish can look it up too.</p>
          {key !== null && (
            <>
              <p class="profile-key" aria-label={`Your recovery key is ${key.split('').join(' ')}`}>
                {key}
              </p>
              <button class="btn btn-second" type="button" onClick={copyKey}>
                {copied === 'yes' ? 'Copied' : 'Copy the key'}
              </button>
              {copied === 'failed' && (
                <p class="panel-text" role="status">
                  That did not work here. Write the key down or take a screenshot.
                </p>
              )}
            </>
          )}
          {keyError && (
            <p class="field-error" role="alert">
              {keyError}
            </p>
          )}
          <button class={key === null ? 'btn' : 'btn-quiet'} type="button" onClick={toggleKey} disabled={fetchingKey} aria-expanded={key !== null}>
            {key !== null ? 'Hide my key' : fetchingKey ? 'Getting it' : 'Show my key'}
          </button>
        </section>

        <RankPanel rank={mine.data?.rank ?? null} history={mine.data?.rankHistory ?? []} />

        <BadgesPanel earned={mine.data?.badges ?? {}} />

        <Alerts me={props.me} />

        <section class="panel" aria-labelledby="profile-phone-title">
          <h2 id="profile-phone-title">This phone</h2>
          {confirming ? (
            <>
              <p class="panel-text">
                <strong>Sign out of this phone?</strong> Your profile stays as it is. You need your recovery key to get back in.
              </p>
              {leaveError && (
                <p class="field-error" role="alert">
                  {leaveError}
                </p>
              )}
              <button class="btn btn-danger" type="button" onClick={signOut} disabled={leaving}>
                {leaving ? 'Signing out' : 'Sign out'}
              </button>
              <button class="btn-quiet" type="button" onClick={() => setConfirming(false)} disabled={leaving}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <p class="panel-text">For a phone you are giving away or no longer use.</p>
              <button class="btn btn-second" type="button" onClick={() => setConfirming(true)}>
                Sign out of this phone
              </button>
            </>
          )}
        </section>

        <section class="panel" aria-labelledby="profile-log-title">
          <h2 id="profile-log-title">League log</h2>
          <p class="panel-text">Everything the commish has done, with the reason.</p>
          <button type="button" class="btn btn-second" onClick={props.onLog}>
            Open the league log
          </button>
        </section>

        <p class="profile-credit">
          <SmallNunchucks />A Nunchucks Production
        </p>
      </div>
    </main>
  );
}
