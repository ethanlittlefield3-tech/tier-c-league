/**
 * Saving the season's settings. Only the commish can, only while the season
 * is in setup, and every save carries an audit entry the whole league can see
 * (firebase/firestore.rules, "seasons").
 */
import { Timestamp, collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { nextSeasonNumber } from '@tcl/engine';
import type { SeasonSettings } from '../commish/season.ts';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

function fields(settings: SeasonSettings) {
  return {
    name: settings.name.trim(),
    regularWeeks: settings.regularWeeks,
    playoffs: settings.playoffs,
    playoffSize: settings.playoffSize,
    par: settings.par,
    groupWeeks: [...settings.groupWeeks].sort((a, b) => a - b),
    timeZone: settings.timeZone,
    kickoff: settings.kickoff,
    draftAt: settings.draftAt === null ? null : Timestamp.fromMillis(settings.draftAt),
    joinMidSeason: settings.joinMidSeason,
    holidayEvents: settings.holidayEvents,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Starts a new season and makes it the league's current one, or changes the
 * settings of the season still in setup. Resolves to the season's id.
 */
export async function saveSeason(me: Me, input: { seasonId: string | null; settings: SeasonSettings }): Promise<string> {
  try {
    const { db } = await connect();
    const league = doc(db, 'leagues', me.league);
    const entry = (action: string, target: string) => ({ by: me.player, at: serverTimestamp(), action, target, reason: 'Season setup' });
    const save = writeBatch(db);

    if (input.seasonId) {
      const audit = doc(collection(league, 'audit')).id;
      save.update(doc(league, 'seasons', input.seasonId), { ...fields(input.settings), audit });
      save.set(doc(league, 'audit', audit), entry('season.settings', `seasons/${input.seasonId}`));
      await save.commit();
      return input.seasonId;
    }

    // Seasons are numbered: s1, s2 and so on. A practice week never takes a number.
    const seasonId = `s${nextSeasonNumber((await getDocs(collection(league, 'seasons'))).docs.map((found) => found.id))}`;
    const seasonAudit = doc(collection(league, 'audit')).id;
    const leagueAudit = doc(collection(league, 'audit')).id;
    save.set(doc(league, 'seasons', seasonId), { ...fields(input.settings), status: 'setup', audit: seasonAudit });
    save.set(doc(league, 'audit', seasonAudit), entry('season.settings', `seasons/${seasonId}`));
    save.update(league, { season: seasonId, audit: leagueAudit });
    save.set(doc(league, 'audit', leagueAudit), entry('league.settings', 'league'));
    await save.commit();
    return seasonId;
  } catch (error) {
    throw trouble(error);
  }
}
