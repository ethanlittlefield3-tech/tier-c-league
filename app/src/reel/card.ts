/**
 * The highlight reel (SCOPE.md, "Live rivalry and social"): an auto-made
 * recap card of a week's best moments, drawn on the phone as a picture to
 * share with the group chat. `reelCard` picks what goes on it; `drawReel`
 * paints it.
 */
import { storylines, type StoryResult } from '@tcl/engine';
import { drawCar, type CarParts } from '../art/car/draw.ts';
import { storyText } from '../feed/stories.ts';

export interface ReelWeek {
  week: number;
  results?: Record<string, StoryResult>;
  awards?: { mvp: string[]; bust: string[]; wheel: string[] };
}

export interface ReelCard {
  league: string;
  week: number;
  /** The MVP, with their car and points; the first one, when it's shared. */
  mvp: { name: string; car: Partial<CarParts> | null; points: number } | null;
  bust: string | null;
  headlines: string[];
  /** Each matchup once, winner first: "Maya 22–18 Riley". */
  results: string[];
  /** The same card as words, for sharing where a picture can't go. */
  text: string;
}

const points = (value: number) => String(value).replace('-', '−');

/**
 * What a week's card shows. Names are real names, not "You": the card is for
 * the group chat.
 */
export function reelCard(input: { league: string; weeks: readonly ReelWeek[]; week: number; name: (player: string) => string; carOf: (player: string) => Partial<CarParts> | null }): ReelCard | null {
  const now = input.weeks.find((each) => each.week === input.week);
  if (!now?.results) return null;
  const results: string[] = [];
  const told = new Set<string>();
  for (const [player, result] of Object.entries(now.results)) {
    if (told.has(player)) continue;
    told.add(player);
    told.add(result.opponent);
    const [first, second] = result.outcome === 'loss' ? [[result.opponent, result.opponentPoints], [player, result.points]] : [[player, result.points], [result.opponent, result.opponentPoints]];
    results.push(`${input.name(String(first[0]))} ${points(Number(first[1]))}–${points(Number(second[1]))} ${input.name(String(second[0]))}`);
  }
  const settled = input.weeks.filter((each) => each.results).map((each) => ({ week: each.week, results: each.results! }));
  const headlines = storylines(settled, input.week).map((story) => storyText(story, input.name));
  const mvpId = now.awards?.mvp[0] ?? null;
  const mvp = mvpId ? { name: input.name(mvpId), car: input.carOf(mvpId), points: now.results[mvpId]?.points ?? 0 } : null;
  const bust = now.awards?.bust[0] ? input.name(now.awards.bust[0]) : null;
  const text = [
    `${input.league}: Week ${input.week} highlights`,
    ...(mvp ? [`MVP: ${mvp.name}, ${points(mvp.points)} points`] : []),
    ...headlines,
    ...results,
    ...(bust ? [`Bust: ${bust}`] : []),
  ].join('\n');
  return { league: input.league, week: input.week, mvp, bust, headlines, results, text };
}

/** The card's size: 4 by 5, the shape a chat shows best. */
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1350;

export const DISPLAY = "'Exo 2', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif";
export const BODY = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

/** A car as a picture the canvas can draw. */
export function carImage(parts: Partial<CarParts> | null): Promise<HTMLImageElement> {
  const markup = drawCar(parts ?? {}, {}).replace('<svg ', '<svg width="760" height="400" ');
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  const image = new Image();
  return new Promise((resolve, reject) => {
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The car could not be drawn.'));
    };
    image.src = url;
  });
}

/** Text cut to fit a width, with an ellipsis. */
export function fit(context: CanvasRenderingContext2D, text: string, width: number): string {
  if (context.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && context.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Paints the card as a PNG. */
export async function drawReel(card: ReelCard): Promise<Blob> {
  await Promise.all([document.fonts.load(`italic 900 40px ${DISPLAY}`), document.fonts.load(`italic 800 40px ${DISPLAY}`)]).catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = REEL_WIDTH;
  canvas.height = REEL_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas to draw on.');

  // Navy, with a glow where the MVP stands and a boost streak across.
  const sky = context.createLinearGradient(0, 0, 0, REEL_HEIGHT);
  sky.addColorStop(0, '#0a1330');
  sky.addColorStop(1, '#03060f');
  context.fillStyle = sky;
  context.fillRect(0, 0, REEL_WIDTH, REEL_HEIGHT);
  const glow = context.createRadialGradient(540, 470, 40, 540, 470, 520);
  glow.addColorStop(0, 'rgba(255, 207, 63, 0.30)');
  glow.addColorStop(1, 'rgba(255, 207, 63, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, REEL_WIDTH, REEL_HEIGHT);
  const streak = context.createLinearGradient(0, 0, REEL_WIDTH, 0);
  streak.addColorStop(0, 'rgba(31, 139, 255, 0)');
  streak.addColorStop(0.45, 'rgba(31, 139, 255, 0.55)');
  streak.addColorStop(0.75, 'rgba(255, 138, 30, 0.55)');
  streak.addColorStop(1, 'rgba(255, 138, 30, 0)');
  context.fillStyle = streak;
  context.save();
  context.translate(0, 236);
  context.transform(1, 0, -0.35, 1, 0, 0);
  context.fillRect(0, 0, REEL_WIDTH + 200, 14);
  context.restore();

  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#a7b5d9';
  context.font = `italic 800 34px ${DISPLAY}`;
  context.fillText(fit(context, card.league.toUpperCase(), 960), 540, 110);
  context.fillStyle = '#f5f9ff';
  context.font = `italic 900 108px ${DISPLAY}`;
  context.fillText(`WEEK ${card.week}`, 540, 210);
  context.fillStyle = '#ffcf3f';
  context.font = `italic 900 40px ${DISPLAY}`;
  context.fillText('HIGHLIGHTS', 540, 300);

  let y = 330;
  if (card.mvp) {
    const car = await carImage(card.mvp.car);
    context.drawImage(car, 160, y, 760, 400);
    y += 400;
    context.fillStyle = '#ffcf3f';
    context.font = `italic 900 36px ${DISPLAY}`;
    context.fillText('MVP', 540, y + 10);
    context.fillStyle = '#f5f9ff';
    context.font = `italic 900 64px ${DISPLAY}`;
    context.fillText(fit(context, `${card.mvp.name}, ${points(card.mvp.points)}`, 960), 540, y + 80);
    y += 120;
  }

  context.textAlign = 'left';
  context.font = `italic 800 38px ${DISPLAY}`;
  for (const headline of card.headlines) {
    context.fillStyle = '#ffcf3f';
    context.beginPath();
    context.arc(90, y + 26, 8, 0, Math.PI * 2);
    context.fill();
    context.fillText(fit(context, headline, 880), 116, y + 40);
    y += 58;
  }
  if (card.headlines.length) y += 16;

  context.font = `600 34px ${BODY}`;
  context.fillStyle = '#a7b5d9';
  for (const line of card.results) {
    if (y > REEL_HEIGHT - 150) break;
    context.fillText(fit(context, line, 900), 90, y + 34);
    y += 50;
  }

  context.textAlign = 'center';
  context.fillStyle = 'rgba(167, 181, 217, 0.8)';
  context.font = `italic 800 30px ${DISPLAY}`;
  context.fillText('TIER C LEAGUE', 540, REEL_HEIGHT - 60);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The card could not be made.'))), 'image/png'));
}
