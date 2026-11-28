import { useState } from "preact/hooks";
import type { TrophyId } from "@tcl/engine";
import type { CarParts } from "../art/car/draw.ts";
import { useAll, useDoc, useWhere } from "../data/hooks.ts";
import type { Me } from "../data/identity.ts";
import { drawWrapped, wrappedPlace, wrappedTiles } from "../reel/wrapped.ts";
import type { DayEntry } from "../today/model.ts";
import { seasonWrapped, type WrappedInput } from "../telemetry/wrapped.ts";
import { Reel } from "./Reel.tsx";
import "./telemetry.css";

/**
 * Season Wrapped (the commish's request, 2026-11-28): once a season is over,
 * your season on one card, and a picture of it to share with the group chat.
 * On Game Day in the offseason, and at the top of Telemetry.
 */
export function SeasonWrapped(props: {
  me: Me;
  seasonId: string;
  season: {
    name?: string;
    par: number;
    kickoff: string;
    regularWeeks: number;
    champion?: string | null;
  };
}) {
  const leaguePath = `leagues/${props.me.league}`;
  const seasonPath = `${leaguePath}/seasons/${props.seasonId}`;
  const days = useWhere<DayEntry & { date: string }>(
    `${seasonPath}/days`,
    "player",
    props.me.player,
  );
  const kit = useWhere<{ item?: string; period?: string; date?: string }>(
    `${seasonPath}/kit`,
    "player",
    props.me.player,
  );
  const weeks = useAll<{
    week?: number;
    results?: WrappedInput["weeks"][number]["results"];
    lines?: { player: string; points: number }[];
  }>(`${seasonPath}/weeks`);
  const standings = useDoc<{
    rows?: { player: string; rank: number; seasonPoints: number }[];
  }>(`${seasonPath}/standings/current`);
  const trophies = useDoc<{
    trophies?: Partial<Record<TrophyId, { winners: string[] }>>;
  }>(`${leaguePath}/trophies/${props.seasonId}`);
  const players = useAll<{ displayName?: string; car?: Partial<CarParts> }>(
    `${leaguePath}/players`,
  );
  const [sharing, setSharing] = useState(false);
  if (days.loading || weeks.loading || standings.loading || players.loading)
    return null;

  const name = (player: string) =>
    player === "HOUSE"
      ? "The House"
      : (players.docs.find((found) => found.id === player)?.data.displayName ??
        "a former player");
  const card = seasonWrapped({
    me: props.me.player,
    league: props.me.leagueName,
    season: {
      name: props.season.name ?? "The season",
      par: props.season.par,
      kickoff: props.season.kickoff,
      regularWeeks: props.season.regularWeeks,
      champion: props.season.champion ?? null,
    },
    logs: Object.fromEntries(
      days.docs.map((found) => [found.data.date, found.data]),
    ),
    kit: kit.docs.map((found) => found.data),
    weeks: weeks.docs.map((found) => ({
      id: found.id,
      week: found.data.week,
      results: found.data.results,
      lines: found.data.lines,
    })),
    rows: standings.data?.rows ?? [],
    trophies: trophies.data?.trophies ?? null,
    name,
  });
  const car =
    players.docs.find((found) => found.id === props.me.player)?.data.car ??
    null;
  const place = wrappedPlace(card);

  return (
    <section
      class="tm-card wrapped"
      aria-labelledby="wrapped-title"
      data-champion={card.champion}
    >
      <header class="tm-card-head">
        <h2 id="wrapped-title">{card.season}, wrapped</h2>
        <span>Regular season</span>
      </header>
      {place && <p class="wrapped-place">{place}</p>}
      <div class="tm-tiles wrapped-tiles">
        {wrappedTiles(card).map((tile) => (
          <p>
            <strong>{tile.value}</strong>
            <small>{tile.label}</small>
          </p>
        ))}
      </div>
      {(card.nemesis || card.trophies.length > 0) && (
        <ul class="wrapped-extras">
          {card.nemesis && (
            <li>
              Nemesis: <strong>{card.nemesis.name}</strong>,{" "}
              {card.nemesis.record}
            </li>
          )}
          {card.trophies.length > 0 && (
            <li>
              Trophies: <strong>{card.trophies.join(", ")}</strong>
            </li>
          )}
        </ul>
      )}
      <button
        type="button"
        class="btn wrapped-share"
        onClick={() => setSharing(true)}
      >
        Share your season
      </button>
      {sharing && (
        <Reel
          title={`${card.season}, wrapped`}
          text={card.text}
          file="tier-c-wrapped.png"
          draw={() => drawWrapped(card, car)}
          onClose={() => setSharing(false)}
        />
      )}
    </section>
  );
}
