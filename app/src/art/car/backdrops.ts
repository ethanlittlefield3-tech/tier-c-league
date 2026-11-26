/**
 * What a car stands in front of (ruling R21): in the Garage and in the
 * showroom on a player's card. Each is drawn in CSS (`garage.css`), so the
 * app loads no pictures for them. The champion's podium comes with the
 * Champion badge.
 */
export const BACKDROPS = ['garage', 'stadium', 'tunnel', 'podium'] as const;
export type Backdrop = (typeof BACKDROPS)[number];

/** A backdrop the app knows, or the garage. */
export const backdropOf = (value: string | undefined): Backdrop => ((BACKDROPS as readonly string[]).includes(value ?? '') ? (value as Backdrop) : 'garage');
