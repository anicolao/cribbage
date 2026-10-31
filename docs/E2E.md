# Illustrated four-player story

The single `tests/e2e/table.spec.ts` story uses four isolated browser contexts and genuine UI actions against the persistent relay. No hands, scores, turn state, fixture endpoints or computed outcomes are injected. Only identity/UUID entropy is repeatable; the host's seed intent is read back from the real log.

`TestStepHelper` checks every seated player's DOM after each action, then photographs the actor followed by every seated observer. Assertions cover phase, revision, round, running count, crib size, exact public card order, own held card identities, concealed opponent cards, scores, starter, seat orientation, interactive card count, layout fit, absence of alerts and browser errors. The story includes taking all four chairs, dealing, each crib contribution, cutting, the whole pegging phase including Go, all four hand counts, the crib count, the next deal, and reconnection. It also verifies replay of the stored log.

Every screenshot is 1180×820 with device scale 1. Both threshold and maxDiffPixels are zero; retries are disabled and ordinary runs never update baselines. The test's complete illustrated narrative is generated alongside explicitly updated references. A separate verification run must pass before generated images count as evidence.

```sh
bun install --frozen-lockfile
bun x playwright install chromium
bun run check
bun run test:unit
bun run test:e2e
```

For intentional visual changes, run `bun run test:e2e:update`, inspect the images, then run `bun run test:e2e` separately. macOS and Linux have separate references. Linux verification is pinned to ARM64 and the exact Playwright 1.61.1 container image used by Pantheon, since fonts and software perspective rasterization differ between operating systems and architectures. The CI `update_snapshots` dispatch only produces an artifact for review; it cannot silently update or bless references. Download, inspect, commit, then verify normally.

The rendered scene is demand-driven. Readiness includes all card textures, material maps, HDR environment and two paint frames. Texture noise starts from a local deterministic seed, so replay or reconnect cannot change the grain on a nameplate. Background observers are brought forward before capture. No screenshots are masked, animation containers removed, or game graphics replaced for tests.
