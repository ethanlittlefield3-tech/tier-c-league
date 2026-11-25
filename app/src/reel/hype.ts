/**
 * The season hype card (SCOPE.md, "Draft day agenda", step 7): at the
 * draft's reveal, a picture of the season ahead to share with the group
 * chat: the kickoff, everyone's car, the group-play weeks and Week 1.
 */
import { MODE_NAMES, isGroupModeName } from './modes-words.ts';
import { BODY, DISPLAY, carImage, fit } from './card.ts';
import { REEL_HEIGHT, REEL_WIDTH } from './card.ts';
import type { CarParts } from '../art/car/draw.ts';

export interface HypeCard {
  league: string;
  season: string;
  /** "Mon Jan 4". */
  kickoff: string;
  regularWeeks: number;
  players: { name: string; car: Partial<CarParts> | null }[];
  groupWeeks: string[];
  week1: string[];
  text: string;
}

/** What the hype card shows. Real names: it's for the group chat. */
export function hypeCard(input: {
  league: string;
  season: string;
  kickoff: string;
  regularWeeks: number;
  players: { id: string; name: string; car: Partial<CarParts> | null }[];
  weeks: { week: number; mode?: string; pairs?: { a: string; b: string }[] }[];
  name: (player: string) => string;
}): HypeCard {
  const groupWeeks = input.weeks
    .filter((week) => week.mode && week.mode !== 'regular' && isGroupModeName(week.mode))
    .sort((a, b) => a.week - b.week)
    .map((week) => `Week ${week.week}: ${MODE_NAMES[week.mode as keyof typeof MODE_NAMES]}`);
  const first = input.weeks.find((week) => week.week === 1);
  const week1 = (first?.pairs ?? []).map((pair) => `${input.name(pair.a)} vs ${input.name(pair.b)}`);
  const text = [
    `${input.league}: ${input.season} kicks off ${input.kickoff}`,
    `${input.regularWeeks} weeks, ${input.players.length} players`,
    ...(groupWeeks.length ? [`Group play: ${groupWeeks.join(' · ')}`] : []),
    ...(week1.length ? [`Week 1: ${week1.join(' · ')}`] : []),
  ].join('\n');
  return { league: input.league, season: input.season, kickoff: input.kickoff, regularWeeks: input.regularWeeks, players: input.players.map(({ name, car }) => ({ name, car })), groupWeeks, week1, text };
}

/** Paints the hype card as a PNG. */
export async function drawHype(card: HypeCard): Promise<Blob> {
  await Promise.all([document.fonts.load(`italic 900 40px ${DISPLAY}`), document.fonts.load(`italic 800 40px ${DISPLAY}`)]).catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = REEL_WIDTH;
  canvas.height = REEL_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas to draw on.');

  const sky = context.createLinearGradient(0, 0, 0, REEL_HEIGHT);
  sky.addColorStop(0, '#111e49');
  sky.addColorStop(1, '#03060f');
  context.fillStyle = sky;
  context.fillRect(0, 0, REEL_WIDTH, REEL_HEIGHT);
  const streak = context.createLinearGradient(0, 0, REEL_WIDTH, 0);
  streak.addColorStop(0, 'rgba(31, 139, 255, 0)');
  streak.addColorStop(0.45, 'rgba(31, 139, 255, 0.6)');
  streak.addColorStop(0.75, 'rgba(255, 138, 30, 0.6)');
  streak.addColorStop(1, 'rgba(255, 138, 30, 0)');
  context.fillStyle = streak;
  context.save();
  context.translate(0, 250);
  context.transform(1, 0, -0.35, 1, 0, 0);
  context.fillRect(0, 0, REEL_WIDTH + 200, 14);
  context.restore();

  context.textAlign = 'center';
  context.fillStyle = '#a7b5d9';
  context.font = `italic 800 34px ${DISPLAY}`;
  context.fillText(fit(context, card.league.toUpperCase(), 960), 540, 100);
  context.fillStyle = '#f5f9ff';
  context.font = `italic 900 100px ${DISPLAY}`;
  context.fillText(fit(context, card.season.toUpperCase(), 1000), 540, 210);
  context.fillStyle = '#ffcf3f';
  context.font = `italic 900 40px ${DISPLAY}`;
  context.fillText(fit(context, `KICKS OFF ${card.kickoff.toUpperCase()}`, 960), 540, 318);
  context.fillStyle = '#a7b5d9';
  context.font = `600 30px ${BODY}`;
  context.fillText(`${card.regularWeeks} weeks · ${card.players.length} players`, 540, 366);

  // Everyone's car, three to a row.
  const shown = card.players.slice(0, 12);
  const cars = await Promise.all(shown.map((player) => carImage(player.car).catch(() => null)));
  const rows = Math.ceil(shown.length / 3);
  const cell = { width: 320, height: rows > 3 ? 120 : 150 };
  let y = 400;
  shown.forEach((player, at) => {
    const column = at % 3;
    const row = Math.floor(at / 3);
    const x = 60 + column * (cell.width + 0);
    const top = y + row * cell.height;
    const car = cars[at];
    if (car) context.drawImage(car, x + 40, top, 240, 126 * (cell.height / 150));
    context.fillStyle = '#f5f9ff';
    context.font = `italic 800 28px ${DISPLAY}`;
    context.fillText(fit(context, player.name, 290), x + 160, top + cell.height - 6);
  });
  y += rows * cell.height + 72;

  context.textAlign = 'left';
  if (card.groupWeeks.length) {
    context.fillStyle = '#ffcf3f';
    context.font = `italic 900 32px ${DISPLAY}`;
    context.fillText('GROUP PLAY', 90, y);
    context.fillStyle = '#f5f9ff';
    context.font = `600 32px ${BODY}`;
    for (const line of card.groupWeeks) {
      y += 44;
      if (y > REEL_HEIGHT - 200) break;
      context.fillText(fit(context, line, 900), 90, y);
    }
    y += 56;
  }
  if (card.week1.length && y < REEL_HEIGHT - 160) {
    context.fillStyle = '#ffcf3f';
    context.font = `italic 900 32px ${DISPLAY}`;
    context.fillText('WEEK 1', 90, y);
    context.fillStyle = '#a7b5d9';
    context.font = `600 30px ${BODY}`;
    for (const line of card.week1) {
      y += 42;
      if (y > REEL_HEIGHT - 110) break;
      context.fillText(fit(context, line, 900), 90, y);
    }
  }

  context.textAlign = 'center';
  context.fillStyle = 'rgba(167, 181, 217, 0.8)';
  context.font = `italic 800 30px ${DISPLAY}`;
  context.fillText('TIER C LEAGUE', 540, REEL_HEIGHT - 60);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The card could not be made.'))), 'image/png'));
}
