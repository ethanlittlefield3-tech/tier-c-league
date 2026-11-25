# Tier C League

A free phone app where friends compete on daily habits. One commish runs the league and is the only stakeholder.

## Read first, in this order

1. `docs/PHASE1.md`: the non-negotiables, the build order, and how to hand steps to the commish.
2. `docs/SCOPE.md`: the full spec and the source of truth for every game rule.
3. `docs/PROGRESS.md`: what is done, what is next, what is blocked, open questions.
4. `docs/DECISIONS.md`: the commish's rulings and every rule that had to be interpreted.
5. `docs/DATA-MODEL.md`: every collection, who writes it and who reads it.

## Standing instructions

- **This repo is public, so keep personal information out of it** (commish ruling, 2026-11-25). No names, jobs, devices, spending, or links to private accounts or chats, in any file or commit message. Write "the commish". Example players get made-up names.
- **The timeline is off** (commish ruling, 2026-11-25). Build every feature in SCOPE.md, all three phases, before Season 1. Phase 1 still comes first, in PHASE1.md's order. Ignore the dates in SCOPE.md and PHASE1.md.
- **Ask, don't guess, on scoring.** If a rule is unclear or contradicts itself, ask the commish before building it, then record the answer in `docs/DECISIONS.md`.
- **One step at a time** for anything the commish has to do by hand: exact clicks or command, one sentence on why, then wait for a confirmation.
- **No secrets in the repo or in chat.** The service account key goes only into GitHub Secrets.
- **Free to run.** Firebase Spark plan only: no Cloud Functions, no Cloud Storage.
- **Original art only.** No Rocket League logos, car models, item names, sounds or fonts.
- Keep `docs/PROGRESS.md` and `docs/DECISIONS.md` current, and commit after each step.

## Commands

```bash
npm install           # once
npm test              # the engine and app logic tests: fast, nothing else needed
npm run test:rules    # the security-rule tests: starts the Firestore emulator (needs Java 21)
npm run test:e2e      # builds the app and taps through it at iPhone size (Playwright)
npm run check         # type checks, engine tests and security-rule tests
npm run checkpoint:a  # rebuild docs/CHECKPOINT-A.md from the engine tests
npm run checkpoint:b  # rebuild docs/CHECKPOINT-B.md from the security-rule tests
```

## Conventions

- `engine/` is pure TypeScript: no Firebase imports, no device clock, no randomness. The app and the jobs import it as source, so there is one copy of every rule.
- Imports use `.ts` extensions and only erasable TypeScript (no enums), so `node file.ts` runs without a build.
- Test titles are the rules in plain English. They are printed as the rule lists in the checkpoint reports, so write them for a reader who does not code.
- Write the rule tests before the code they test.
- Security rules read time only from `calendar/` documents, never from a date string. Kit, sealed and week documents are filed by period (`w02`), not week number.
- Job logs are public, because the repo is: log counts and IDs only, never names, recovery keys or photos.
- Animations move whole layers and change only `transform` and `opacity`. The resting state of every CSS rule is the finished screen.
- Flow tests freeze the clock (`page.clock`), so they never wait in real time.
