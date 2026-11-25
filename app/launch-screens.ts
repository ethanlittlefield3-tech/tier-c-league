// The iPhone and iPad screens that get a launch picture.
//
// When the app is opened from the Home Screen, iOS shows a still picture until
// the app has loaded. It only uses a picture that matches the screen exactly,
// so there is one for each size below. Sizes are in points (what CSS calls px)
// with the screen held upright; `scale` is how many real pixels each point has.
//
// When Apple ships a new screen size, add a row and run `npm run icons`.

export interface LaunchScreen {
  /** Width and height in points, held upright. */
  w: number;
  h: number;
  /** Real pixels per point. */
  scale: number;
  /** iPads also start on their side. iPhones always start upright. */
  sideways: boolean;
  /** The devices with this screen. Only for people reading this file. */
  devices: string;
}

const phone = (w: number, h: number, scale: number, devices: string): LaunchScreen => ({ w, h, scale, sideways: false, devices });
const tablet = (w: number, h: number, devices: string): LaunchScreen => ({ w, h, scale: 2, sideways: true, devices });

export const LAUNCH_SCREENS: readonly LaunchScreen[] = [
  phone(375, 667, 2, 'iPhone 8, SE (2nd and 3rd generation)'),
  phone(414, 736, 3, 'iPhone 8 Plus'),
  phone(375, 812, 3, 'iPhone X, XS, 11 Pro, 12 mini, 13 mini'),
  phone(414, 896, 2, 'iPhone XR, 11'),
  phone(414, 896, 3, 'iPhone XS Max, 11 Pro Max'),
  phone(390, 844, 3, 'iPhone 12, 12 Pro, 13, 13 Pro, 14, 16e'),
  phone(428, 926, 3, 'iPhone 12 Pro Max, 13 Pro Max, 14 Plus'),
  phone(393, 852, 3, 'iPhone 14 Pro, 15, 15 Pro, 16'),
  phone(430, 932, 3, 'iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus'),
  phone(402, 874, 3, 'iPhone 16 Pro, 17, 17 Pro'),
  phone(420, 912, 3, 'iPhone Air'),
  phone(440, 956, 3, 'iPhone 16 Pro Max, 17 Pro Max'),
  tablet(744, 1133, 'iPad mini (6th generation and later)'),
  tablet(768, 1024, 'iPad mini (5th generation), iPad 9.7-inch'),
  tablet(810, 1080, 'iPad 10.2-inch'),
  tablet(820, 1180, 'iPad (10th generation and later), iPad Air 10.9-inch and 11-inch'),
  tablet(834, 1112, 'iPad Air (3rd generation), iPad Pro 10.5-inch'),
  tablet(834, 1194, 'iPad Pro 11-inch (1st to 4th generation)'),
  tablet(834, 1210, 'iPad Pro 11-inch (M4 and later)'),
  tablet(1024, 1366, 'iPad Pro 12.9-inch, iPad Air 13-inch'),
  tablet(1032, 1376, 'iPad Pro 13-inch (M4 and later)'),
];

export interface LaunchPicture {
  /** Where the picture lives, from the app's own folder. */
  file: string;
  /** The media query that picks this picture on the screen it was drawn for. */
  media: string;
  /** The picture's size in real pixels. */
  pixels: { w: number; h: number };
  /** The same size in points, which is what the drawing is laid out in. */
  points: { w: number; h: number };
}

/** Every launch picture the app ships: one upright for each screen, and one sideways for each iPad. */
export function launchPictures(screens: readonly LaunchScreen[] = LAUNCH_SCREENS): LaunchPicture[] {
  const pictures: LaunchPicture[] = [];
  for (const { w, h, scale, sideways } of screens) {
    // iOS reports the upright width and height even while the screen is on its side.
    const screen = `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${scale})`;
    pictures.push({
      file: `launch/${w * scale}x${h * scale}.jpg`,
      media: `${screen} and (orientation: portrait)`,
      pixels: { w: w * scale, h: h * scale },
      points: { w, h },
    });
    if (sideways) {
      pictures.push({
        file: `launch/${h * scale}x${w * scale}.jpg`,
        media: `${screen} and (orientation: landscape)`,
        pixels: { w: h * scale, h: w * scale },
        points: { w: h, h: w },
      });
    }
  }
  return pictures;
}
