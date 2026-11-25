# Tier C League

A free phone app where friends compete on daily habits in weekly 1v1 matchups. A Nunchucks Production.

This file will grow into the plain-steps guide for running, deploying, backing up and restoring the league. For now it covers what exists.

## What is here

| Folder | What it is |
| --- | --- |
| `docs/` | The spec (`SCOPE.md`), the build brief (`PHASE1.md`), the progress log, the decisions log and the checkpoint reports |
| `engine/` | Every game rule as plain code: scoring, calendar, schedule, standings, awards, power-up timing and receipts |
| `app/` | The phone app. So far: the theme, the install guide, the intro and title, and joining or getting back into a league |
| `firebase/` | The security rules, which decide what each phone may read and write |
| `tests/rules/` | Tests that try to break those rules against a local copy of the database |
| `tests/e2e/` | Tests that tap through the app in a browser at iPhone size |
| `scripts/` | Small tools: the ones that build the checkpoint reports, and the ones that draw the art and the icons |
| `.github/workflows/` | What GitHub does on every push: run all the tests, then publish the app |

Still to come: the rest of the app's screens and `jobs/` (the timed work).

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
npm run test:e2e
```

That starts a local copy of the database and of sign-in, builds the app to use them, and taps through it in a browser at iPhone size. Nothing real is touched. It needs Java 21, like the security-rule tests.

```bash
npm run check
```

That runs everything: the type checks, then all three sets of tests.

## Run the app on your computer

```bash
npm run dev
```

That starts a local copy of the database and of sign-in, then the app, and prints two addresses. Open the "Local" one in a browser on the same computer. A phone on the same Wi-Fi can open the "Network" one. The local database starts empty each time, so there is no league to join yet: a script that makes a test league comes with the jobs in Step 4.

```bash
npm run art
```

That redraws the title-screen scene from `scripts/art/title-scene.mjs`.

## The app icon and launch pictures

```bash
npm run icons
```

That draws the icon and writes every size a phone asks for into `app/public/icons/`, plus the still picture an iPhone shows while the app loads into `app/public/launch/`. Don't edit those files by hand.

To change the icon, open `scripts/art/icons.mjs`, change `CHOSEN` near the top to `'a'`, `'b'` or `'c'`, and run the command again. An iPhone keeps the icon from the day the app was added, so players re-add the app to see a new one. Their scores are not affected.

```bash
npm run icons -- --sheet options.png
```

That also saves one picture with the three options side by side.

## Where the live app comes from

Every push to the `main` branch runs all the tests on GitHub. If they pass, GitHub builds the app and publishes it to GitHub Pages. The address is on the repo's Settings, Pages screen. A failed test means nothing is published, and the last good version stays up.
