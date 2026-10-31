# Cribbage game room

A local Svelte 5 / Threlte 8 / Three.js game-table and animation prototype, initially inspired by `cribmock.png`.

```sh
bun install
bun run dev
```

Open http://127.0.0.1:5197/ (also available at `/dev/animations`).

## The table

Four players have individual scoring tracks: You (turquoise, bottom left), Rowan (coral, bottom right), Jules (gold, top right), and Ada (plum, top left). Only your hand is face up in the ready and dealing scenes. The public cut card lies face up on top of the deck to the left of the board; the concealed crib sits to the right with an engraved owner label (Jules’s Crib in the fixture). Hands use a consistent radial fan and individual cards retain their owner throughout motion. Player areas use physical walnut-and-brass nameplates with engraved serif names, local scores, and a miniature of the matching board peg. There is no top score bar or coloured badge border. Decorative table captions and redundant starter/track labels have been removed.

The board has **four separate continuous paperclip tracks**: in its local coordinates, start at the lower left, travel up the left outer leg, around the large inverted U, down the right leg, around the second and final turn, then up the centre to a single shared 121 hole. The board is placed lengthwise across the table at a gentle angle. Each track has 120 scoring holes (24 numbered groups of five) and two starting holes. There is one shared finish hole, for 489 drilled holes total. The leg/turn counts are 35 + 10 + 35 + 5 + 35 = 120. An unlabelled line crosses hole 90 on the central leg just after the second turn. There is no third turn and no wrap back to the start. Board holes, peg positions, and the inlay texture share the coordinates in `src/table.ts`. The slimmer maple face has drilled holes with dark recessed interiors and a rounded walnut base. Scanned maple/walnut albedo, normal, and roughness maps provide the surface detail; a local HDR studio environment supplies reflections. Green baize uses fine scanned fabric normals and fibre sheen. Eight pegs track four individual scores; the peg demo leapfrogs your rear peg ahead of the front peg.

The [ACC rules](https://www.cribbage.org/NewSite/rules/rulebook_2025.pdf) document the 121-point goal, 30-point streets, and scoring. This prototype uses the requested four individual tracks, rather than partnership scoring; the prepared scenarios are not a complete four-player rules engine.

## iPad landscape preview

Open http://127.0.0.1:5197/?preview=ipad for a visibly framed iPad landscape preview. It uses an 1180 × 820 point game viewport with a 2360 × 1640 render buffer, scaled to fit the available desktop space. The frame caption identifies the active size and lighting. **Display** in the external preview toolbar switches between this fixed device viewport and the desktop layout. The direct link starts with the lab hidden; Show lab in that toolbar exposes the controls. The toolbar sits outside the game viewport and is never drawn on the table. Lighting defaults to 0.7.

## Animation lab

Choose **Ready to play**, **Deal four hands**, **Play your king**, **Pegging complete**, **Count [owner]'s hand**, or **Peg twelve points**. Replay starts the chosen motion; Pause, playback speed, and Reset control it.

Played cards land in an owner's clear area of felt, outside both the rotated board and the remaining private fan. **Pegging complete** has no held cards: all sixteen cards are already played face up beside their owners. Every count scene starts from that same public position, then gathers the selected owner's played cards into a non-overlapping row. Cards are not revealed or taken out of a hand at counting time. The prepared count totals are calculated from the cards and shared cut card, including fifteens, pairs, runs, flushes, and nobs.

Drag the preview to orbit, scroll to zoom, and right-drag to pan (touch: one finger orbits, two fingers pan/zoom). The projection slider selects orthographic at 0 or a vertical field of view from 1–100°. Lens changes preserve orbit direction, pan target, and apparent scale at the target plane by adjusting camera distance. Reset view, Top, and Low restore framing; Ortho and 45° are lens shortcuts. Main light X/Y/Z sliders move the key light around the table. It defaults to the front-right at (11, 17, 8), casting shadows up-left. Reset light restores that position. Warm light adjusts brightness (default 0.7). Hide lab expands the preview. Scenario selection is reflected in the URL. System reduced-motion preferences skip animation.

```sh
bun run check
bun test tests
bun run build
```

## Rendering stability

Card, maple-panel, and felt textures use the caps of their solid meshes, with separate top, underside, and edge material groups. There are no duplicate texture planes above those solids. Card thickness is smaller than the fan and stack spacing, leaving physical clearance. The transparent stitched trim uses polygon offset without writing depth.

Camera clipping follows distance to the orbit target, preserving depth precision at narrow fields of view. The key light uses a 4096px shadow map, bounded 1–50 depth range, and a small bias. The fill light also casts soft shadows with a 2048px map. Fan layers have slightly more height separation so adjacent cards receive visible shadows without duplicate surfaces or banding. Rendering regression tests cover solid caps, open board holes, layer clearance, depth precision, cut-card height, count-phase visibility, and card/board separation throughout motion; browser checks cover close-ups, card flips, and 1° / 100° lens settings.

## Structure

- `src/App.svelte`: lab controls, playback clock, scores, and responsive shell.
- `src/Scene.svelte`: seating, ownership, concealed hands, deck/crib placement, and rendering.
- `src/sceneLayout.ts`: shared play/count poses, card dimensions, deck height, and cut-card placement.
- `src/Board.svelte`: drilled maple panel, walnut base, and four pairs of pegs.
- `src/Peg.svelte`: the shared peg model used on the tracks and nameplates.
- `src/Nameplate.svelte`: walnut base, brass face, engraved name/score, and mounted track peg.
- `src/table.ts`: shared track coordinates, prepared hands, fan layout, and count totals.
- `src/CameraRig.svelte` / `src/cameraMath.ts`: orbit controls, matched-scale projection changes, and camera-distance-dependent clipping planes.
- `src/Piece.svelte` / `src/geometry.ts`: rounded paper cards and matching geometry / face UVs.
- `src/textures.ts`: board markings over scanned maple, felt albedo, paper grain, labels, and card backs.
- `src/materials.ts` / `src/Environment.svelte`: local PBR maps and HDR environment lighting.

The lab borrows replay / speed / reset conventions from Pantheon and Istanbul and the shared Threlte scene approach from Gotfive. There is no backend or complete game engine. Prepared scenarios do not enforce turn order or implement multiplayer privacy.

Faces retain the classic artwork with an adjustable white margin (default 2.5%). The independent **Face margin** and **Back margin** sliders in the Cards section range from 0–10% in quarter-percent steps and repaint cached textures live (both default to 2.5%; back margin adds to the generated artwork’s existing border); the SVG physical-card outline is removed before rendering onto the solid card. Backs use the generated classic red engraved rider-style design in `public/cards/card-back-classic-v1.png`, rendered into the same 768 × 1116 texture dimensions as the faces. Both use the same 1.38 × 2 card geometry. The built-in image generation prompt is preserved in `artifacts/card-back-classic-v1.prompt.txt`.

Card face artwork is from [rnvannatta/playing-cards](https://github.com/rnvannatta/playing-cards), a fork of hayeah's playing card assets. Its public-domain dedication is preserved in `public/cards/COPYING`; SVG originals and raster textures are included locally. The card back was made with the built-in image generator. Board markings and green felt albedo are generated by this project. Scanned materials and studio lighting are CC0 assets from Poly Haven; links are recorded in [public/materials/SOURCES.md](public/materials/SOURCES.md). The reference image was provided by the project owner.
