# Cribbage game room

A shared Svelte 5 / Threlte 8 / Three.js cribbage table for two, three or four players with individual scoring tracks, seeded shuffles, intent replay, and optional heuristic companions. GPL-3.0-only. The visual lab, inspired by `cribmock.png`, reviews the same renderer and animations as the game.

```sh
nix develop
bun install --frozen-lockfile
bun run dev
```

The locked Nix dev shell supplies Bun 1.3.10 (matching CI), Node.js 24, Java 21 (including `JAVA_HOME`), Git, GitHub CLI and ripgrep on Apple Silicon/Intel macOS and Linux. Firebase CLI and Playwright come from the project's locked dev dependencies. To run the emulator checks without entering an interactive shell:

```sh
nix develop --command bun run test:firebase
```

For local browser tests, install the pinned browser once with `nix develop --command bun x playwright install chromium`. Exact screenshot verification in CI continues to use the pinned Playwright Linux ARM64 container.

Open http://127.0.0.1:5197/ to play, or `/dev/animations` for the shared animation lab.

## The table

Four players have individual scoring tracks: You (turquoise, bottom left), Rowan (coral, top left), Jules (gold, top right), and Ada (plum, bottom right) in the review fixture. Only your hand is face up in the ready and dealing scenes. The public cut card lies face up on top of the deck to the left of the board; the concealed crib sits to the right with an engraved owner label (the dealer’s crib). Hands use a consistent radial fan and individual cards retain their owner throughout motion. Player areas use physical walnut-and-brass nameplates with engraved serif names, local scores, and a miniature of the matching board peg. There is no top score bar or coloured badge border. Decorative table captions and redundant starter/track labels have been removed.

The board has **four separate continuous paperclip tracks**: in its local coordinates, start at the lower left, travel up the left outer leg, around the large inverted U, down the right leg, around the second and final turn, then up the centre to a single shared 121 hole. The board is placed lengthwise across the table at a gentle angle. Each track has 120 scoring holes (24 numbered groups of five) and two starting holes. There is one shared finish hole, for 489 drilled holes total. The leg/turn counts are 35 + 10 + 35 + 5 + 35 = 120. An unlabelled line crosses hole 90 on the central leg just after the second turn. There is no third turn and no wrap back to the start. Board holes, peg positions, and the inlay texture share the coordinates in `src/table.ts`. The slimmer maple face has drilled holes with dark recessed interiors and a rounded walnut base. Scanned maple/walnut albedo, normal, and roughness maps provide the surface detail; a local HDR studio environment supplies reflections. Green baize uses fine scanned fabric normals and fibre sheen. Eight pegs track four individual scores; the peg demo leapfrogs your rear peg ahead of the front peg.

The [ACC rules](https://www.cribbage.org/NewSite/rules/rulebook_2025.pdf) document the 121-point goal, 30-point streets, and scoring. This game uses the requested four individual tracks rather than partnership scoring; the complete variant and intent protocol are described in [docs/GAME.md](docs/GAME.md).

## Responsive table layouts

The game and animation lab share the same container-based breakpoints (CSS pixels, independent of device pixel ratio): portrait below 600 px wide uses the phone composition; portrait at least 600 px wide uses the iPad composition. Landscape below 600 px high uses the compact landscape composition; taller landscape uses the original table. Resizing or rotating the device selects a layout without changing the table, cards, or replay. The lab's **Desktop · automatic** follows those same rules; named device previews force a reviewed viewport. The game renders at the device pixel ratio up to 3×, matching the phone lab previews.

Portrait uses the four-track 29-shaped maple and walnut board, with the three opponents across the top and your hand below. Phone portrait defaults to distance 19, elevation 40°, FoV 60°; iPad portrait uses distance 24, elevation 40°, FoV 45°. Compact landscape uses distance 25, elevation 45°, FoV 45°, a 1.7× board and identically enlarged cards for every player, with your hand at the lower right. Wider fans expose each choice, raised brass nameplates make scores easier to read, and a two-line crib plaque identifies its owner. Counting spreads into readable rows while the other piles move aside. The 29 outline and drilled tracks follow shared Bézier paths; the supplied reference guided the code geometry and is not bundled as an image.

## iPad landscape preview

Open http://127.0.0.1:5197/?preview=ipad for a visibly framed iPad landscape preview. It uses an 1180 × 820 point game viewport with a 2360 × 1640 render buffer, scaled to fit the available desktop space. The frame caption identifies the active size and lighting. **Display** in the external preview toolbar switches between this fixed device viewport and the desktop layout. The direct link starts with the lab hidden; Show lab in that toolbar exposes the controls. The toolbar sits outside the game viewport and is never drawn on the table. Lighting defaults to 0.7.

## Animation lab

The game and lab both mount `TableView.svelte`: the same native-resolution canvas (up to 2×), materials, 4096/2048 shadow maps, layout, and motion sampler. There is no cheaper game renderer. The lab catalogue is generated by legal engine intents, including all four players joining, dealing, discarding and playing, starter reveal, Go, peg leapfrogging, counting each hand and crib, collection/shuffle/next deal, and winning. Hover and press use the same mesh feedback as live play.

Choose a scene and **Replay**, pause, scrub its **Timeline**, change speed, or select any player's **Perspective**. **Complete hand, all four players** replays gathering through the next deal. Scene selection is reflected in the URL, for example `/dev/animations/?scenario=deal`. Counting begins with the sixteen public pegging cards; the selected owner's cards spread beside that owner's hand area. The last pegging card lands before counting starts.

The game camera stays fixed while playing. Card gestures retain the mesh selected at pointer-down and cancel on a drag or interrupted touch, so press feedback cannot switch the selected card.

Drag the lab preview to orbit, scroll to zoom, and right-drag to pan (touch: one finger orbits, two fingers pan/zoom). The projection slider selects orthographic at 0 or a vertical field of view from 1–100°. Lens changes preserve orbit direction, pan target, and apparent scale at the target plane by adjusting camera distance. Reset view, Top, and Low restore framing; Ortho and 45° are lens shortcuts. Main light X/Y/Z sliders move the key light around the table. It defaults to the front-right at (11, 17, 8), casting shadows up-left. Reset light restores that position. Warm light adjusts brightness (default 0.7). Hide lab expands the preview. Scenario selection is reflected in the URL. The live table respects reduced-motion preferences. Explicit lab playback remains available for review.

```sh
bun run check
bun run test:unit
bun run build
```

## Rendering stability

Card, maple-panel, and felt textures use the caps of their solid meshes, with separate top, underside, and edge material groups. There are no duplicate texture planes above those solids. Card thickness is smaller than the fan and stack spacing, leaving physical clearance. The transparent stitched trim uses polygon offset without writing depth.

Camera clipping follows distance to the orbit target, preserving depth precision at narrow fields of view. The key light uses a 4096px shadow map, bounded 1–50 depth range, and a small bias. The fill light also casts soft shadows with a 2048px map. Fan layers have slightly more height separation so adjacent cards receive visible shadows without duplicate surfaces or banding. Rendering regression tests cover solid caps, open board holes, layer clearance, depth precision, cut-card height, count-phase visibility, and card/board separation throughout motion; browser checks cover close-ups, card flips, and 1° / 100° lens settings.

## Structure

- `src/App.svelte`: lab catalogue controls, playback clock, and responsive shell.
- `src/TableView.svelte`: single shared canvas, render density, readout, and keyboard access.
- `src/presentation/`: shared state-to-frame layout, timed transitions, legal review fixtures, and native mesh interactivity.
- `src/Scene.svelte`: shared geometry, materials, lights, and rendered frame.
- `src/sceneLayout.ts`: shared play/count poses, card dimensions, deck height, and cut-card placement.
- `src/Board.svelte`: drilled maple panel, walnut base.
- `src/Peg.svelte`: the shared peg model used on the tracks and nameplates.
- `src/Nameplate.svelte`: walnut base, brass face, engraved name/score, and mounted track peg.
- `src/table.ts`: shared track coordinates, prepared hands, fan layout, and count totals.
- `src/CameraRig.svelte` / `src/cameraMath.ts`: orbit controls, matched-scale projection changes, and camera-distance-dependent clipping planes.
- `src/Piece.svelte` / `src/geometry.ts`: rounded paper cards and matching geometry / face UVs.
- `src/textures.ts`: board markings over scanned maple, felt albedo, paper grain, labels, and card backs.
- `src/materials.ts` / `src/Environment.svelte`: local PBR maps and HDR environment lighting.

The lab borrows replay / speed / reset conventions from Pantheon and Istanbul and the shared Threlte scene approach from Gotfive. The lab replays real game transitions. The playable table uses the deterministic rules engine and persistent relay described below.

Faces retain the classic artwork with an adjustable white margin (default 2.5%). The independent **Face margin** and **Back margin** sliders in the Cards section range from 0–10% in quarter-percent steps and repaint cached textures live (both default to 2.5%; back margin adds to the generated artwork’s existing border); the SVG physical-card outline is removed before rendering onto the solid card. Backs use the generated classic red engraved rider-style design in `public/cards/card-back-classic-v1.png`, rendered into the same 768 × 1116 texture dimensions as the faces. Both use the same 1.38 × 2 card geometry. The built-in image generation prompt is preserved in `artifacts/card-back-classic-v1.prompt.txt`.

Card face artwork is from [rnvannatta/playing-cards](https://github.com/rnvannatta/playing-cards), a fork of hayeah's playing card assets. Its public-domain dedication is preserved in `public/cards/COPYING`; SVG originals and raster textures are included locally. The card back was made with the built-in image generator. Board markings and green felt albedo are generated by this project. Scanned materials and studio lighting are CC0 assets from Poly Haven; links are recorded in [public/materials/SOURCES.md](public/materials/SOURCES.md). The reference image was provided by the project owner.

## Playable table

The playable implementation lives at `/`; the original lab remains at `/dev/animations` (old `?preview=ipad` links still open the lab). Run `bun run dev` and open http://127.0.0.1:5197/. Enter your name, share the invitation, and use **Copy invite link** to share the invitation. The host can **Deal** with two, three or four seated players. **＋ Companion** fills a chair with a heuristic bot for manual testing. Two players receive six cards each and discard two, one at a time. Three players receive five each, with an extra concealed card dealt to the crib; each player discards one. Four players retain five cards and one discard each. Cumulative scores stay engraved in the nameplates. During pegging, brief points appear beside the scoring cards. A pair plus last card moves one peg by three, keeping the other peg at the score before that play. During hand and crib counting, that hand’s points appear beside its revealed cards. Tap a card to contribute to the crib or play it; Cut, Go, Peg and Deal appear when needed. Undo returns your latest crib contribution without confirmation. It stays available while the crib is incomplete, then counts down three seconds once all four cards are present. Undoing a card cancels that timer; filling the crib again restarts it. Cut, Peg, the next-hand Deal and Go can be tapped immediately or continue automatically after three seconds once the preceding animation settles. When only one pegging card is legal, it lifts slightly and plays after the same three seconds; tap the card or Play to continue immediately. Choosing between cards and starting or restarting a match remain player decisions. Companion actions still wait 600 ms. Your perspective keeps every opponent's held cards concealed. Compact landscape puts your hand at bottom right for your right thumb; portrait centres it at the bottom.

`bun run build && bun run start` serves the built table and event relay at http://127.0.0.1:5198/. Set `HOST`/`PORT` for another interface and port. Tables persist in `.data/cribbage.sqlite`; keep that file to keep your games. Share a reachable server URL when playing from other devices. No cloud account or credentials are needed. The relay is a trusted-client prototype, not an adversarial competitive service.

The [game rules and intent protocol](docs/GAME.md) explain this table's four-player individual scoring. The [end-to-end guide](docs/E2E.md) describes the zero-tolerance, four-perspective illustrated story. CI checks types, all unit/relay/render tests, the production build and the screenshot story. The repository is GPL-3.0-only; the asset-specific public-domain and CC0 attributions above remain in place.

The complete illustrated acceptance story is available for [Linux](tests/e2e/STORY-linux.md) and [macOS](tests/e2e/STORY-darwin.md): 40 actions, each followed by the actor's view and every seated observer, for 154 captures per platform.

## Hosted pull-request previews

Retained playable previews, linked from each pull request, use the dedicated `cribbage-preview-anicolao` Firebase project with anonymous sign-in and Firestore. Invitations retain the PR's URL. Each PR has an isolated `previews/prN/tables` namespace; seats and intent history persist across reloads and are shared between devices. The host's open tab runs companions.

CI deploys retained GitHub Pages PR previews after type, unit, Firestore rules/integration, and build checks pass, independently of the exact screenshot jobs. Screenshot checks still run and report failures; they do not update baselines or weaken comparison. Production deployment from main still requires the screenshot checks to pass. Public Firebase web configuration is supplied through repository variables; deployment needs no Firebase service-account secret. Firestore rules and anonymous-provider configuration are versioned in `firestore.rules` and `firebase.json`; deploy those with `bun x firebase deploy --only auth,firestore --project cribbage-preview-anicolao` when changing the backend contract.

Local play keeps the SQLite relay by default. To exercise Firebase locally, populate `.env.local` using `.env.example` and choose a separate preview ID. `bun run test:firebase` runs four-client integration and authorization tests against an isolated demo Firestore emulator (Java 21 required).

Pointer enter, press, release and click handlers live directly on the card meshes using Threlte interactivity. Invisible DOM buttons provide keyboard equivalents and passive projected coordinates for E2E canvas clicks; there is no SVG hit surface or focus drawing over the table. Input and companions wait for committed transitions to land. Reconnecting hydrates the latest table without replaying the entire log.

The [two-player](tests/e2e/TWO-PLAYERS-linux.md) and [three-player](tests/e2e/THREE-PLAYERS-linux.md) acceptance stories complement the four-player story. Version-1 and version-2 logs continue to replay and append unchanged; new tables use version 3. See [the protocol notes](docs/GAME.md) for compatibility and the exact dealing rules. The animation lab includes six-card dealing, both two-player discards, the automatic three-player crib card, and complete two-/three-player hand replays.

Use the small **Settings** gear to choose Manual (∞) or 5–0 seconds for automatic turns, Standard/Fast/Ultra animation, chamber music and sound effects. Preferences and independent audio levels stay on your device and survive reload. Settings pauses your automatic turns while open and starts a fresh chosen window when closed; companions keep 600 ms timing and the shared crib Undo grace remains three seconds. Fast and Ultra retime the same full-quality scene by 2× and 4×. They do not shorten automatic waits or alter the music.

**Baize at Dusk** is an original 48-bar pastorale in D major, 6/8, for flute, violin and violoncello, about 103 seconds long. The recording uses CC0 acoustic samples from [VSCO 2 Community Edition](https://versilian-studios.com/vsco-community/), with a pinned source and checksums in `scores/samples.json`; the license and credits are retained in `public/music`. The original notes are in `scores/baize-at-dusk.json`, with MusicXML and MIDI beside the MP3. `bun run music:compose` regenerates the notation and MIDI; `bun run music:render` renders from the pinned samples using ffmpeg (`CRIBBAGE_FFMPEG` can specify its executable). Samples cache in `/tmp/cribbage-music-samples` or `CRIBBAGE_MUSIC_SAMPLES`.

Music is off by default and starts after a tap when enabled. Effects are quiet paper, wooden-peg and table sounds, synchronized with the visible motion. Both have separate switches and volumes; music fades when the tab is hidden, and old effects are not replayed on return.
