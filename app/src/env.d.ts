/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'emulator' makes the app talk to the local Firebase emulators. Anything else means the real database. */
  readonly VITE_BACKEND?: string;
}
