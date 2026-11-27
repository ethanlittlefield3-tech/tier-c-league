/**
 * What a car stands in front of (rulings R21 and R27): in the Garage and in
 * the showroom on a player's card. Each is a small scene drawn in code
 * (`BackdropArt.tsx`), so the app loads no pictures for them. The champion's
 * podium comes with the Champion badge; the rest are everyone's.
 */
export const BACKDROPS = ['garage', 'stadium', 'tunnel', 'podium', 'rooftop', 'canyon', 'snowfield', 'arcade'] as const;
export type Backdrop = (typeof BACKDROPS)[number];

/** A backdrop the app knows, or the garage. */
export const backdropOf = (value: string | undefined): Backdrop => ((BACKDROPS as readonly string[]).includes(value ?? '') ? (value as Backdrop) : 'garage');
