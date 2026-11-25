/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by vite.config.ts: 'emulator' makes the app talk to the local Firebase emulators, 'live' the real database. */
  readonly VITE_BACKEND?: string;
}
