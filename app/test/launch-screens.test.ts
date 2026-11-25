import { describe, expect, it } from 'vitest';
import { LAUNCH_SCREENS, launchPictures } from '../launch-screens.ts';

describe('Launch pictures', () => {
  const pictures = launchPictures();

  it('Every iPhone and iPad screen gets an upright picture at its exact size in real pixels', () => {
    for (const screen of LAUNCH_SCREENS) {
      const upright = pictures.find((p) => p.pixels.w === screen.w * screen.scale && p.pixels.h === screen.h * screen.scale);
      expect(upright, screen.devices).toBeDefined();
      expect(upright?.media).toContain(`(device-width: ${screen.w}px) and (device-height: ${screen.h}px)`);
      expect(upright?.media).toContain(`(-webkit-device-pixel-ratio: ${screen.scale})`);
      expect(upright?.media).toContain('(orientation: portrait)');
    }
  });

  it('Every iPad also gets one for when it is on its side, and no iPhone does', () => {
    const sideways = pictures.filter((p) => p.media.includes('(orientation: landscape)'));
    expect(sideways).toHaveLength(LAUNCH_SCREENS.filter((s) => s.sideways).length);
    for (const picture of sideways) {
      expect(picture.pixels.w).toBeGreaterThan(picture.pixels.h);
      expect(Math.min(picture.points.w, picture.points.h)).toBeGreaterThanOrEqual(700);
    }
  });

  it('No two pictures share a file or a rule, so a screen can never be given the wrong one', () => {
    expect(new Set(pictures.map((p) => p.file)).size).toBe(pictures.length);
    expect(new Set(pictures.map((p) => p.media)).size).toBe(pictures.length);
  });

  it('The list covers the iPhone 11 class the app is tuned for, and the newest sizes', () => {
    const sizes = LAUNCH_SCREENS.map((s) => `${s.w}x${s.h}@${s.scale}`);
    expect(sizes).toContain('414x896@2');
    expect(sizes).toContain('390x844@3');
    expect(sizes).toContain('440x956@3');
  });
});
