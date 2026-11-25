# Tier C League

A free phone app where friends compete on daily habits in weekly 1v1 matchups. A Nunchucks Production.

This file will grow into the plain-steps guide for running, deploying, backing up and restoring the league. For now it covers what exists.

## What is here

| Folder | What it is |
| --- | --- |
| `docs/` | The spec (`SCOPE.md`), the build brief (`PHASE1.md`), the progress log, the decisions log and the checkpoint reports |
| `engine/` | Every game rule as plain code: scoring, calendar, schedule, standings, awards, power-up timing and receipts |
| `app/` | The phone app. So far: the theme, the install guide, the intro and title, joining or getting back into a league, the app's frame with its five tabs, and a first Profile |
| `firebase/` | The security rules, which decide what each phone may read and write |
| `tests/rules/` | Tests that try to break those rules against a local copy of the database |
| `tests/e2e/` | Tests that tap through the app in a browser at iPhone size |
| `jobs/` | Work that runs on GitHub with the league's key: making a league and publishing the security rules. The timed jobs come later |
| `scripts/` | Small tools: the ones that build the checkpoint reports, and the ones that draw the art and the icons |
| `.github/workflows/` | What GitHub does on every push: run all the tests, then publish the app |

Still to come: the rest of the app's screens, and the timed jobs.

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

## Making a league

Leagues are made from GitHub, not from the app.

1. On GitHub, open the repo's **Actions** tab.
2. Choose **Create a league**, then **Run workflow**. Type a league name (the page is public, so nothing personal) and run it.
3. The league code and the commish's recovery key are not shown on GitHub. Read them in the Firebase console, under **Firestore Database**: the code is the name of the document in `codes`, and the key is in `leagues`, your league, `keys`.
4. In the app, tap **I'm already in a league** and enter both.

## Starting a season

1. In the app, tap your badge, then **Commish tools**.
2. Check the settings, then tap **Start the season**. The settings can change until the draft starts.
3. Within the hour, the **Keep the season calendar** job writes the season's days. To run it now, open **Actions**, choose **Keep the season calendar**, then **Run workflow**.

## Where the live rules come from

After every test has passed on `main`, a job publishes `firebase/firestore.rules` to the league's database. There is nothing to do by hand. To publish again, open **Actions**, choose **Publish the security rules**, then **Run workflow**.

## Where the live app comes from

Every push to the `main` branch runs all the tests on GitHub. If they pass, GitHub builds the app and publishes it to GitHub Pages. The address is on the repo's Settings, Pages screen. A failed test means nothing is published, and the last good version stays up.
