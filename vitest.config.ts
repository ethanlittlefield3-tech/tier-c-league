import { defineConfig } from 'vitest/config';

// One config for the whole repo. Each part of the project is a "project" here.
//   npm test            the engine, the app's logic and the jobs' logic: fast, needs nothing running
//   npm run test:rules  the security rules: starts the Firestore emulator first
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'engine',
          environment: 'node',
          include: ['engine/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'app',
          environment: 'node',
          include: ['app/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'jobs',
          environment: 'node',
          include: ['jobs/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'rules',
          environment: 'node',
          include: ['tests/rules/**/*.test.ts'],
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
