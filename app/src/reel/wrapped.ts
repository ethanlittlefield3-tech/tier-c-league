/**
 * Season Wrapped as a picture (the commish's request, 2026-11-28): your
 * season on one card for the group chat, with your car. `seasonWrapped`
 * (telemetry/wrapped.ts) picks the numbers; this paints them.
 */
import type { CarParts } from "../art/car/draw.ts";
import {
  wrappedHours,
  wrappedOrdinal,
  type Wrapped,
} from "../telemetry/wrapped.ts";
import {
  BODY,
  DISPLAY,
  REEL_HEIGHT,
  REEL_WIDTH,
  carImage,
  fit,
} from "./card.ts";

const signed = (value: number) => String(value).replace("-", "−");

/** The six tiles, as the card and the screen both show them. */
export function wrappedTiles(
  card: Wrapped,
): { value: string; label: string }[] {
  return [
    {
      value: `${card.record.win}–${card.record.draw}–${card.record.loss}`,
      label: "Record",
    },
    { value: String(card.goals), label: "Goals hit" },
    {
      value: card.underPar === null ? "–" : wrappedHours(card.underPar),
      label: "Screen time under par",
    },
    {
      value: card.bestWeek ? signed(card.bestWeek.points) : "–",
      label: card.bestWeek
        ? `Best week · Week ${card.bestWeek.week}`
        : "Best week",
    },
    {
      value: String(card.streak),
      label:
        card.streak === 1 ? "Day streak, longest" : "Days in a row, longest",
    },
    { value: String(card.perfect), label: "Perfect days" },
  ];
}

/** Where you finished, in a few words. */
export function wrappedPlace(card: Wrapped): string | null {
  if (card.place === null) return card.champion ? "Champion" : null;
  return `${card.champion ? "Champion · " : ""}${wrappedOrdinal(card.place)} of ${card.of} · ${signed(card.seasonPoints ?? 0)} Season Points`;
}

/** Paints the card as a PNG. */
export async function drawWrapped(
  card: Wrapped,
  car: Partial<CarParts> | null,
): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`italic 900 40px ${DISPLAY}`),
    document.fonts.load(`italic 800 40px ${DISPLAY}`),
  ]).catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = REEL_WIDTH;
  canvas.height = REEL_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas to draw on.");

  // Navy with a faint cyan grid, like Telemetry, a glow behind the car and a boost streak across.
  const sky = context.createLinearGradient(0, 0, 0, REEL_HEIGHT);
  sky.addColorStop(0, "#0c1a45");
  sky.addColorStop(1, "#03060f");
  context.fillStyle = sky;
  context.fillRect(0, 0, REEL_WIDTH, REEL_HEIGHT);
  context.fillStyle = "rgba(94, 224, 255, 0.05)";
  for (let x = 0; x < REEL_WIDTH; x += 54)
    context.fillRect(x, 0, 2, REEL_HEIGHT);
  for (let y = 0; y < REEL_HEIGHT; y += 54)
    context.fillRect(0, y, REEL_WIDTH, 2);
  const glow = context.createRadialGradient(540, 430, 30, 540, 430, 440);
  glow.addColorStop(
    0,
    card.champion ? "rgba(255, 207, 63, 0.34)" : "rgba(31, 139, 255, 0.32)",
  );
  glow.addColorStop(1, "rgba(31, 139, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, REEL_WIDTH, REEL_HEIGHT);
  const streak = context.createLinearGradient(0, 0, REEL_WIDTH, 0);
  streak.addColorStop(0, "rgba(31, 139, 255, 0)");
  streak.addColorStop(0.45, "rgba(31, 139, 255, 0.55)");
  streak.addColorStop(0.75, "rgba(255, 138, 30, 0.55)");
  streak.addColorStop(1, "rgba(255, 138, 30, 0)");
  context.fillStyle = streak;
  context.save();
  context.translate(0, 232);
  context.transform(1, 0, -0.35, 1, 0, 0);
  context.fillRect(0, 0, REEL_WIDTH + 200, 12);
  context.restore();

  // Corner brackets, like a viewfinder.
  context.strokeStyle = "rgba(94, 224, 255, 0.55)";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(40, 110);
  context.lineTo(40, 40);
  context.lineTo(110, 40);
  context.moveTo(REEL_WIDTH - 40, REEL_HEIGHT - 110);
  context.lineTo(REEL_WIDTH - 40, REEL_HEIGHT - 40);
  context.lineTo(REEL_WIDTH - 110, REEL_HEIGHT - 40);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#a7b5d9";
  context.font = `italic 800 34px ${DISPLAY}`;
  context.fillText(fit(context, card.league.toUpperCase(), 940), 540, 108);
  context.fillStyle = "#f5f9ff";
  context.font = `italic 900 100px ${DISPLAY}`;
  context.fillText(fit(context, card.season.toUpperCase(), 960), 540, 205);
  context.fillStyle = "#5ee0ff";
  context.font = `italic 900 40px ${DISPLAY}`;
  context.fillText("WRAPPED", 540, 296);

  const image = await carImage(car);
  context.drawImage(image, 250, 300, 580, 305);

  context.fillStyle = "#f5f9ff";
  context.font = `italic 900 64px ${DISPLAY}`;
  context.fillText(fit(context, card.name.toUpperCase(), 940), 540, 676);
  const place = wrappedPlace(card);
  if (place) {
    context.fillStyle = "#ffcf3f";
    context.font = `italic 800 36px ${DISPLAY}`;
    context.fillText(fit(context, place, 940), 540, 728);
  }

  // Six tiles, two by three.
  const tiles = wrappedTiles(card);
  tiles.forEach((tile, index) => {
    const x = 80 + (index % 2) * 470;
    const y = 770 + Math.floor(index / 2) * 140;
    context.fillStyle = "rgba(94, 224, 255, 0.07)";
    context.strokeStyle = "rgba(94, 224, 255, 0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, 450, 122, 22);
    context.fill();
    context.stroke();
    context.textAlign = "left";
    context.fillStyle = "#f5f9ff";
    context.font = `italic 900 60px ${DISPLAY}`;
    context.fillText(fit(context, tile.value, 410), x + 26, y + 68);
    context.fillStyle = "#a7b5d9";
    context.font = `600 26px ${BODY}`;
    context.fillText(fit(context, tile.label, 410), x + 26, y + 104);
  });

  context.textAlign = "center";
  let y = 1210;
  if (card.nemesis) {
    context.fillStyle = "#ff8a8a";
    context.font = `italic 800 34px ${DISPLAY}`;
    context.fillText(
      fit(
        context,
        `NEMESIS: ${card.nemesis.name.toUpperCase()} (${card.nemesis.record})`,
        940,
      ),
      540,
      y,
    );
    y += 46;
  }
  if (card.trophies.length && y < REEL_HEIGHT - 70) {
    context.fillStyle = "#ffcf3f";
    context.font = `italic 800 30px ${DISPLAY}`;
    context.fillText(
      fit(context, `TROPHIES: ${card.trophies.join(" · ").toUpperCase()}`, 940),
      540,
      y,
    );
  }

  context.fillStyle = "rgba(167, 181, 217, 0.8)";
  context.font = `italic 800 28px ${DISPLAY}`;
  context.fillText("TIER C LEAGUE", 540, REEL_HEIGHT - 52);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("The card could not be made.")),
      "image/png",
    ),
  );
}
