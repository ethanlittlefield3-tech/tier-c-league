import { describe, expect, it } from 'vitest';
import { ACCENT_ZONES, BADGES, STARTER_PARTS } from '@tcl/engine';
import { BACKDROPS } from '../src/art/car/backdrops.ts';
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

  it('Every accent, finish and boost trail style in the catalog changes how the car looks', () => {
    const plain = same(drawCar(STARTER_CAR));
    for (const part of catalog.filter((each) => ['paint2', 'finish', 'trail'].includes(each.slot))) {
      if (part.id === STARTER_CAR[part.slot as keyof typeof STARTER_CAR]) continue;
      expect(same(drawCar({ ...STARTER_CAR, [part.slot]: part.id })), `${part.slot} ${part.id}`).not.toBe(plain);
    }
  });

  it('A season decal shows its season and year, and the rank decal shows the emblem of the rank it is given', () => {
    const season = drawCar({ ...STARTER_CAR, decal: 'season-s1-2027' });
    expect(season).toContain('>S1<');
    expect(season).toContain('>2027<');
    const gold = same(drawCar({ ...STARTER_CAR, decal: 'rank' }, { rank: 'gold' }));
    expect(gold).not.toBe(same(drawCar({ ...STARTER_CAR, decal: 'rank' }, { rank: 'silver' })));
    expect(gold).not.toBe(same(drawCar(STARTER_CAR)));
  });

  it('The accent goes where the player puts it: each zone changes the car, and zones layer', () => {
    const red = (accents: string[]) => same(drawCar({ ...STARTER_CAR, paint2: 'racingRed', accents }));
    const zones = ACCENT_ZONES.map((zone) => zone.id);
    const drawn = zones.map((zone) => red([zone]));
    expect(new Set(drawn).size).toBe(zones.length);
    expect(red(['lower', 'roof'])).not.toBe(red(['lower']));
    // With no accent color, no zone is drawn.
    expect(same(drawCar({ ...STARTER_CAR, paint2: 'none', accents: ['roof'] }))).toBe(same(drawCar(STARTER_CAR)));
  });

  it('Every car is drawn with its details: panel lines, a tail light, wheel arches and tire treads', () => {
    const markup = drawCar(STARTER_CAR);
    expect(markup).toContain('class="car-detail"');
    expect(markup).toContain('class="car-tread"');
  });

  it('Every backdrop in the catalog has its scene', () => {
    for (const part of catalog.filter((each) => each.slot === 'backdrop')) expect(BACKDROPS).toContain(part.id);
  });

  it('A part outside the catalog draws as the starter part, and a title is written safely', () => {
    expect(same(drawCar({ body: 'tank', wheels: 'rocket' }))).toBe(same(drawCar(STARTER_CAR)));
    expect(drawCar({}, { title: 'Bo "the <b>Boss</b>"' })).toContain('aria-label="Bo &quot;the &lt;b&gt;Boss&lt;/b&gt;&quot;"');
  });
});
