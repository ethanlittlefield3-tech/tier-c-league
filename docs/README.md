# Tier C League

A free phone app where friends compete on daily habits in weekly 1v1 matchups. A Nunchucks Production.

This file will grow into the plain-steps guide for running, deploying, backing up and restoring the league. For now it covers what exists.

## What is here

| Folder | What it is |
| --- | --- |
| `docs/` | The spec (`SCOPE.md`), the build brief (`PHASE1.md`), the progress log, the decisions log and the checkpoint reports |
| `engine/` | Every game rule as plain code: scoring, calendar, schedule, standings, awards, power-up timing and receipts |
| `app/` | The phone app. So far: the theme and the title screen |
| `firebase/` | The security rules, which decide what each phone may read and write |
| `tests/rules/` | Tests that try to break those rules against a local copy of the database |
| `scripts/` | Small tools, like the ones that build the checkpoint reports |

Still to come: the rest of the app's screens, `jobs/` (the timed work) and phone-size flow tests.

## Run the tests

You need Node.js 22 or newer. In a terminal, from this folder:

```bash
npm install
```

That downloads the tools the project uses. You only need it once, and again whenever `package.json` changes.

```bash
npm test
```

That runs every rule test. Each line it checks is a game rule written in plain English.

```bash
npm run checkpoint:a
```

That rebuilds `docs/CHECKPOINT-A.md`: the list of every rule the tests prove, and three worked example weeks.

## Run the security-rule tests

These need Java 21 or newer as well, because the local copy of the database (the Firestore emulator) is a Java program.

```bash
npm run test:rules
```

That starts the emulator, runs every security test against it, and shuts it down. The first run downloads the emulator, so it takes a little longer.

```bash
npm run checkpoint:b
```

That rebuilds `docs/CHECKPOINT-B.md`: the plain-English list of what the rules allow and block.

```bash
npm run check
```

That runs everything: the type checks, the engine tests and the security tests.

## Run the app on your computer

```bash
npm run dev
```

That starts the app and prints two addresses. Open the "Local" one in a browser on the same computer. A phone on the same Wi-Fi can open the "Network" one.

```bash
npm run art
```

That redraws the title-screen scene from `scripts/art/title-scene.mjs`.
