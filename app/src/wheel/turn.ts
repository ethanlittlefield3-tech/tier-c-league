/** Where the wheel stops: the angles that put a slice under the pointer at the top. */

/** Whole turns the wheel makes before it lands, for the show. */
export const TURNS = 5;

/** The middle of slice `index` of `count`, in degrees clockwise from the top. */
export function sliceMiddle(index: number, count: number): number {
  return ((index + 0.5) * 360) / count;
}

/** How far to turn the wheel, clockwise, so slice `index` lands under the pointer. */
export function landingTurn(index: number, count: number): number {
  return TURNS * 360 - sliceMiddle(index, count);
}

/** A point on the wheel's rim, `degrees` clockwise from the top, for drawing. */
export function rimPoint(degrees: number, radius: number, centre = 0): { x: number; y: number } {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: centre + radius * Math.cos(radians), y: centre + radius * Math.sin(radians) };
}

/** A slice's label: short enough to fit, cut at a word with an ellipsis when it doesn't. */
export function sliceLabel(text: string, most = 22): string {
  const clean = text.trim().replace(/[.!]$/, '');
  if (clean.length <= most) return clean;
  const cut = clean.slice(0, most - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > most / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
