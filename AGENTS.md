# Cribbage

Use Bun for package management and scripts. Work on `codex/` branches and use pull requests. Preserve the reviewed animation lab at `/dev/animations`; the playable table is `/`.

## Game model

- Clients are trusted. The ordered, versioned intent log is the source of truth.
- Record choices, never computed hands, shuffles, scores, running totals, turns or winners. Outcomes belong in deterministic replay.
- Version 1 remains four-player-only; new tables use version 3. Preserve replay and append compatibility for versions 1 and 2. Preserve the versioned PRNG and per-round seed derivation; change the protocol version before changing replay semantics.
- Support two, three and four players. Two players receive six and discard two each; three receive five and discard one each plus one automatic concealed crib card; four receive five and discard one each. Every player has an individual track. Seating and play proceed clockwise. Only the viewer's held cards are revealed in either graphics or the accessible DOM.
- Crib contributions stay undoable until the whole crib is complete, followed by a shared five-second grace window. Undo cancels the window; completing the crib again restarts it. Store presentation deadlines locally, never in the event log. Record undo, acceptance and Go as intents, with no computed values.
- Companion decisions use their own hand and public play and submit ordinary player intents.
- Product UI speaks to players. Prefer the cards and table to explanatory words or dialogs; keep lab and implementation controls outside the playable table.

## Verification

Run `bun run check`, `bun run test:unit`, `bun run build`, and `bun run test:e2e` as appropriate. The E2E story uses `TestStepHelper` to examine the DOM and capture the actor and every seated observer after each action.

Keep captures at 1180×820, scale 1. Compare every decoded RGBA byte. Do not weaken pixel tolerance, mask game content, remove graphics, or enable retries to get green results. Wait for actual assets and paint before interacting and capturing.

Baseline generation is explicit: `bun run test:e2e:update`. Review generated images, then verify in a separate ordinary run. Preserve the pinned Linux ARM64/Playwright container for CI comparisons. CI generation dispatches only produce review artifacts; verification never updates references.

The live game and animation lab must use the same `TableView`, scene quality, state-to-frame layout, and motion sampler. New transitions need a legal-intent example in the lab, with pause/scrub and perspective review. Put pointer handlers on Threlte meshes; keep DOM equivalents for keyboard accessibility, never a visible hit overlay. Exercise native canvas clicks and enabled motion in E2E. Keep the full rendering quality in tests.
