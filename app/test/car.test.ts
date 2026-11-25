import { describe, expect, it } from 'vitest';
import { BADGES, STARTER_PARTS } from '@tcl/engine';
import { DRAWN, STARTER_CAR, drawCar } from '../src/art/car/draw.ts';

/** Markup with its one-off gradient names evened out, so two drawings compare. */
const same = (markup: string) => markup.replace(/car\d+/g, 'car');

describe('Drawing cars', () => {
  const catalog = [...STARTER_PARTS, ...BADGES.flatMap((badge) => badge.unlocks)];

  it('Every body and paint in the catalog is drawn', () => {
    for (const part of catalog.filter((each) => each.slot === 'body')) expect(DRAWN.body).toContain(part.id);
    for (const part of catalog.filter((each) => each.slot === 'paint')) expect(DRAWN.paint).toContain(part.id);
  });

  it('Every decal, wheel, boost trail and topper in the catalog changes how the car looks', () => {
    const plain = same(drawCar(STARTER_CAR));
    for (const part of catalog.filter((each) => ['decal', 'wheels', 'boost', 'topper'].includes(each.slot))) {
      if (part.id === STARTER_CAR[part.slot as keyof typeof STARTER_CAR]) continue;
      expect(same(drawCar({ ...STARTER_CAR, [part.slot]: part.id })), part.id).not.toBe(plain);
    }
  });

  it('A part outside the catalog draws as the starter part, and a title is written safely', () => {
    expect(same(drawCar({ body: 'tank', wheels: 'rocket' }))).toBe(same(drawCar(STARTER_CAR)));
    expect(drawCar({}, { title: 'Bo "the <b>Boss</b>"' })).toContain('aria-label="Bo &quot;the &lt;b&gt;Boss&lt;/b&gt;&quot;"');
  });
});
