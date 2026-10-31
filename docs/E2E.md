# Illustrated four-player story

The single `tests/e2e/table.spec.ts` story uses four isolated browser contexts and genuine UI actions against the persistent relay. No hands, scores, turn state, fixture endpoints or computed outcomes are injected. Only identity/UUID entropy is repeatable; the host's seed intent is read back from the real log.

`TestStepHelper` checks every seated player's DOM after each action, then photographs the actor followed by every seated observer. Assertions cover phase, revision, round, running count, crib size, exact public card order, own held card identities, concealed opponent cards, scores, starter, seat orientation, interactive card count, layout fit, absence of alerts and browser errors. The story includes taking all four chairs, dealing, each crib contribution, cutting, the whole pegging phase including Go, all four hand counts, the crib count, the next deal, and reconnection. It also verifies replay of the stored log.

Every screenshot is 1180×820 with device scale 1. Every decoded RGBA byte must match; threshold and maxDiffPixels are also zero for diff reporting; retries are disabled and ordinary runs never update baselines. The test's complete illustrated narrative is generated alongside explicitly updated references. A separate verification run must pass before generated images count as evidence.

```sh
bun install --frozen-lockfile
bun x playwright install chromium
bun run check
bun run test:unit
bun run test:e2e
```

For intentional visual changes, run `bun run test:e2e:update`, inspect the images, then run `bun run test:e2e` separately. macOS and Linux have separate references. Linux verification is pinned to ARM64 and the exact Playwright 1.61.1 container image used by Pantheon, since fonts and software perspective rasterization differ between operating systems and architectures. The CI `update_snapshots` dispatch only produces an artifact for review; it cannot silently update or bless references. Download, inspect, commit, then verify normally.

The rendered scene is demand-driven. Readiness includes all card textures, material maps, HDR environment and two paint frames. Texture noise starts from a local deterministic seed, so replay or reconnect cannot change the grain on a nameplate. Background observers are brought forward before capture. No screenshots are masked, animation containers removed, or game graphics replaced for tests.

The story runs with motion enabled and uses real canvas pointer clicks at passive projected card coordinates. Capture waits for the committed motion and hover to finish. A separate lab story captures every transition at a paused 0.50-second frame; it uses the same `TableView` and sampler as live play. These references intentionally cover cards in flight, reveals, physical peg movement, hover/press, collection and dealing. No SVG target surface exists. Both stories keep the same exact RGBA comparison policy and small viewport.
