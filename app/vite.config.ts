import preact from '@preact/preset-vite';
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';
import { launchPictures } from './launch-screens.ts';

// The two fonts the first screen needs. Asking for them in the page itself
// starts the download before the styles have even been read.
const FIRST_SCREEN_FONTS = ['exo-2-latin-900-italic', 'bungee-latin-400-normal'];

/** Adds the lines to the page's head that are built from lists, so index.html stays readable. */
function headTags(): Plugin {
  return {
    name: 'tcl-head-tags',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const tags: HtmlTagDescriptor[] = [];
        for (const font of FIRST_SCREEN_FONTS) {
          const file = Object.keys(context.bundle ?? {}).find((name) => name.includes(font) && name.endsWith('.woff2'));
          if (file) {
            tags.push({
              tag: 'link',
              attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${file}`, crossorigin: true },
              injectTo: 'head',
            });
          }
        }
        // iOS shows one of these still pictures while the app loads from the Home Screen.
        for (const { file, media } of launchPictures()) {
          tags.push({ tag: 'link', attrs: { rel: 'apple-touch-startup-image', media, href: `./${file}` }, injectTo: 'head' });
        }
        return tags;
      },
    },
  };
}

// `base: './'` keeps every path relative, so the same build works on GitHub
// Pages (served from /tier-c-league/) and from the local dev server.
export default defineConfig({
  base: './',
  plugins: [preact(), headTags()],
  build: {
    // The database library is one big piece (about 165 kB zipped). It is not
    // part of the first screen: the app fetches it in the background while the
    // intro plays. So the usual "this piece is large" warning does not apply.
    chunkSizeWarningLimit: 700,
  },
  server: { port: 5173 },
});
