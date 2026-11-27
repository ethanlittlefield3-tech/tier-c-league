# Tier C League

A free phone app where friends compete on daily habits in weekly 1v1 matchups. A Nunchucks Production.

This file will grow into the plain-steps guide for running, deploying, backing up and restoring the league. For now it covers what exists.

## What is here

| Folder | What it is |
| --- | --- |
| `docs/` | The spec (`SCOPE.md`), the build brief (`PHASE1.md`), the progress log, the decisions log and the checkpoint reports |
| `engine/` | Every game rule as plain code: scoring, calendar, schedule, standings, awards, power-up timing and receipts |
| `app/` | The phone app: the install guide, the intro, joining or getting back in, Game Day (your day and your matchup), Feed, League, Garage, Profile, the draft, the Wheel of Shame and Commish tools |
| `firebase/` | The security rules, which decide what each phone may read and write |
| `tests/rules/` | Tests that try to break those rules against a local copy of the database |
| `tests/e2e/` | Tests that tap through the app in a browser at iPhone size |
| `jobs/` | Work that runs on GitHub with the league's key: making a league, keeping the season calendar, settling the weeks and drawing the Wheel, the demo and fast test leagues, backups and restores, and publishing the security rules |
| `scripts/` | Small tools: the ones that build the checkpoint reports, and the ones that draw the art and the icons |
| `.github/workflows/` | What GitHub does: on every push, run all the tests, then publish the app and the rules; every hour, the timed jobs; and the buttons in the Actions tab |


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

That starts a local copy of the database and of sign-in, then the app, and prints two addresses. Open the "Local" one in a browser on the same computer. A phone on the same Wi-Fi can open the "Network" one. The local database starts empty each time. To try the app with a league in it, use the demo league below.

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

## Trying every screen: the demo league

The demo league is a league of its own, with you and five made-up players, a season in its third week, and the Wheel waiting for you.

1. On GitHub, open **Actions**, choose **Demo league**, then **Run workflow** with **make**.
2. When it finishes, its log says where to find the league code and the recovery key in the Firebase console. Neither is printed, because the log is public.
3. On a computer, so your phone stays in your real league, open the app, tap **I'm already in a league** and enter both.
4. When you're done, run **Demo league** again with **delete** and the league id the log printed. It refuses any league that isn't a demo.

## Checkpoint D: a fast test week

A week in about an hour and a half: a demo league whose days last 8 minutes, with you and three made-up players who log, set power-ups, ask you for receipts, spin the Wheel and vote on their own.

1. On GitHub, open **Actions**, choose **Fast test week**, then **Run workflow**. The defaults are fine.
2. Its log says where to find the code and key, as for the demo league. You have 5 minutes before Monday of Week 1 starts.
3. Get in on a computer and play along: log your days, set a power-up, answer the receipts request. Today says it is a fast test league, and noon and midnight come round on its clock.
4. About an hour in, Week 1 goes final and the Wheel is drawn. If you spin, prove your dare before the run ends, about 100 minutes in, so the made-up players can vote on it.
5. Delete it after with **Demo league**, **delete**, and the league id from the log.

## Checking alerts reach your phone

1. On the phone, open Tier C from the Home Screen, tap your badge, and under **Alerts** tap **Turn on alerts**, then **Allow**.
2. On GitHub, open **Actions**, choose **Send a test alert**, then **Run workflow**.
3. Within a minute, the phone shows "Test alert". Only the commish's phones get it.

## Starting a season

1. In the app, tap your badge, then **Commish tools**.
2. Check the settings, then tap **Start the season**. The settings can change until the draft starts.
3. Within the hour, the **Keep the season calendar** job writes the season's days. To run it now, open **Actions**, choose **Keep the season calendar**, then **Run workflow**.

## What runs on its own

| Job | When | What it does |
| --- | --- | --- |
| Keep the season calendar | Every hour | Writes the season's days and, once the draft is done, its schedule |
| Settle the weeks | Every hour | Posts each week's results once its Sunday locks at noon on Monday, final at midnight on Tuesday; reveals Demolitions; draws the Wheel; keeps the standings; deletes proof photos after 14 days |
| Send alerts | Every 10 minutes | Works out which alerts came due and sends them to each phone that turned them on, holding them through its quiet hours |
| Back up the league | Every night | Copies every document to the private backups repo (see below) |
| Keep the schedules running | Once a month | Records the date, because GitHub pauses scheduled jobs in a public repo after 60 days with no activity |

GitHub can run a scheduled job late. If a week's results are late, Commish tools can settle it from your phone.

## Backups

Early every morning, **Back up the league** copies every document into a private repo, so that repo's history holds a copy from every morning. Proof photos are left out: they are deleted after 14 days anyway.

It needs a private repo and a token, set up once. The steps come one at a time in the chat when you're ready:

1. A private repo named `tier-c-backups`, made with a README so it isn't empty.
2. A fine-grained token that can only write to that repo.
3. Two secrets in this repo's **Settings**, **Secrets and variables**, **Actions**: `BACKUP_REPO` (the private repo's name, like `owner/tier-c-backups`) and `BACKUP_TOKEN` (the token).

Until both secrets are set, the job skips. A backup holds every recovery key and league code, so keep that repo private.

## Restoring

1. Open **Actions**, choose **Restore from a backup**, then **Run workflow**.
2. Type the date to go back to, like `2027-01-31`. It uses that morning's backup, or the newest one before it.
3. To restore only one league, type its id. Leave it empty to restore everything.
4. Type `restore` to confirm, and run it. The database goes back to how that backup found it: everything in the backup is written back, and anything it doesn't have is deleted. Proof photos aren't touched.

## Where the live rules come from

After every test has passed on `main`, a job publishes `firebase/firestore.rules` to the league's database. There is nothing to do by hand. To publish again, open **Actions**, choose **Publish the security rules**, then **Run workflow**.

## Where the live app comes from

Every push to the `main` branch runs all the tests on GitHub. If they pass, GitHub builds the app and publishes it to GitHub Pages. The address is on the repo's Settings, Pages screen. A failed test means nothing is published, and the last good version stays up.
