# Illustrated gameplay and animation stories

`tests/e2e/table.spec.ts` has complete two-, three- and four-player stories, each with isolated browser contexts and genuine UI actions against the persistent relay. No hands, scores, turn state, fixture endpoints or computed outcomes are injected. Identity/UUID entropy is repeatable and survives reload. Wall-clock time is fixed for countdown captures and explicitly advanced to exercise expiry; animation frames, performance time and browser timers remain real. The host's seed intent is read back from the real log.

`TestStepHelper` checks every seated player's DOM after each action, then photographs the actor followed by every seated observer. Assertions cover phase, revision, round, running count, crib size, exact public card order, own held card identities, concealed opponent cards, scores, starter, seat orientation, interactive card count, layout fit, absence of alerts and browser errors. Each gameplay story includes gathering the chosen number of players, dealing, each crib contribution, cutting, the whole pegging phase including Go, all four hand counts, the crib count, the next deal, and reconnection. It also verifies replay of the stored log.

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

The story runs with motion enabled and uses real canvas pointer clicks at passive projected card coordinates. Capture waits for the committed motion and hover to finish. A separate lab story captures every transition at a paused 0.50-second frame; it uses the same `TableView` and sampler as live play. These references intentionally cover cards in flight, reveals, physical peg movement, hover/press, collection and dealing. No SVG target surface exists. All stories keep the same exact RGBA comparison policy and small viewport.

The host’s visible **Copy invite link** button is clicked in the two-player story; the clipboard must equal the invitation URL and **Link copied** is captured for the actor and observer. Two-player actions include both discards per player and the “Choose one more” prompt. The three-player story checks the initial concealed crib card. Starting early, all player counts, complete pegging, every hand and crib count, rotating the deal and reconnecting are covered.

Semantic checks read a complete DOM snapshot after the expected revision has settled, preserving all privacy, legality and layout assertions while avoiding thousands of polling requests. CI runs the three independent games and lab story in separate pinned-container jobs. This parallelizes execution without changing rendering, screenshot sizes, comparison tolerance or coverage. Generation artifacts contain only their own story’s references; download and review each artifact before the ordinary comparison run.

UI actions and scene readiness allow 60 seconds for full-quality software-rendered browser work on CI. The full-quality software renderer can complete a frame after the former 20-second deadline; failure diagnostics record readiness attributes. This changes only the deadline: retries remain zero and every decoded screenshot pixel must still match.

The two-player story leaves the first contribution in the crib for six seconds, verifies untimed Undo, returns it to the fan, and contributes again. Once the whole crib is full, it reloads an observer, checks one second remains, undoes a card, verifies the timer disappears for both perspectives, fills the crib again and checks a fresh three seconds. Every game captures automatic crib acceptance and a mandatory Go at three and one seconds followed by automatic play. Engraved nameplate totals must exactly match the semantic player scores after peg landing. Counting annotations must match the current hand or crib and reference its four actual cards; they never show cumulative player totals.

A browser canvas-text drawing counter verifies that card motion reuses score and nameplate textures while their text is unchanged. This observes rendering work without changing game state, graphics or clocks.

Native-card targeting reads each projected coordinate pair atomically and waits for hover to settle before pressing. The top card uses its exposed centre; lower cards use their exposed left edges. A solid-mesh raycast regression checks four-, five- and six-card fans before hover, during hover, and while pressed.

The pair and pair-plus-last-card lab scenes replay neutralized legal choices from the reported consecutive-aces incident. Their captures pause at 1.20 seconds to inspect the +2 and +1 labels. Gameplay checks inspect both physical peg scores after every action and on reconnect; transient pegging labels must be gone when the action settles.

Gameplay stories leave Cut, Go, hand/crib Peg and next-hand Deal to their three-second countdowns. They click cards only when a choice exists; sole legal cards play automatically. The two-player story reloads during a forced-card window, captures one second remaining from both perspectives, and observes its play. Every pending turn countdown is checked against the controlled wall clock. Five additional lab scenes review Cut, Peg, Deal, a sole card that fits and the final card.

The settings story exercises the native modal and focus restoration, all saved controls, actual Web Audio MP3 decoding/playback, independent music/effects switches, volumes and reload. Sound-cue counts must increase during an unmuted replay and stay unchanged when muted. The two-player gameplay story opens settings during a forced turn, proves the turn stays pending, switches to Manual and waits six seconds, verifies a five-second deadline survives reload, and then restores three seconds. Settings images use the same 1180×820 exact-pixel policy.
