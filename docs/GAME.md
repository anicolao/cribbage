# Two, three or four individual tracks

The host can deal when two, three or four people are seated. Each player scores independently to 121; there are no partnerships or muggins. A game ends immediately at 121, including during pegging or a cut jack. Seats close when the host deals.

| Players | Cards dealt to each | Each player discards | Extra card dealt to crib |
| --- | --- | --- | --- |
| 2 | 6 | 2, one card at a time | None |
| 3 | 5 | 1 | 1, concealed |
| 4 | 5 | 1 | None |

Every player keeps four cards and the dealer always has a four-card crib. The two- and three-player rules follow [Bicycle](https://bicyclecards.com/how-to-play/cribbage) and [Pagat](https://www.pagat.com/adders/crib6.html#three). Four players retain the independent-scoring variant requested for this project.

The player left of the dealer cuts and leads. Play proceeds clockwise; a player who cannot stay at or below 31 says Go. Players with empty hands are skipped. After everyone remaining has passed, the last player scores one and the next player with cards leads a fresh count. A 31 scores two, without another last-card point. Fifteens, pairs, triples, quads and the longest trailing run score during pegging. After every player has played all four cards, each hand is counted in clockwise order from the dealer's left, then the dealer's crib. Crib flushes require five matching suits. The deal rotates clockwise.

Scoring follows the [American Cribbage Congress rules](https://www.cribbage.org/NewSite/rules/rulebook_2025.pdf); the independent four-player setup is this project's declared variant.

## Intent log, versions 1 and 2

The immutable envelope is `{version, id, sequence, actor, intent}`. The only intents are `create(name)`, `join(name)`, `invite-bot(id, name)`, `begin(seed)`, `discard(card)`, `cut`, `play(card)`, `go`, `count`, and `deal`. Counts and deals are deliberate actions; scoring is derived. Extra fields are rejected, so hands, dealt cards, totals, scores and winners cannot be smuggled into an event.

New tables use version 2. Version 1 remains a four-player game and retains its original deal, initial-dealer choice, turn order, scoring and seeded replay. Existing logs continue to append version-1 events. Every event in a table must use the same version; mixed and unsupported versions are rejected by replay and Firestore rules. A frozen legacy log checks every original outcome, including the next deal. The event envelope and intent shapes are unchanged: choosing to start with the currently seated players is `begin(seed)`, and each discarded card is its own `discard(card)` choice. The automatic three-player crib card is derived from the shuffled deck, never recorded as a separate event or computed payload.

The seed is the host's shuffle input. The PRNG is Pantheon's version-1 FNV-1a/xorshift32 and Fisher–Yates shuffle, copied under GPLv3. Each hand uses a separate `${seed}:deal:${round}` stream, and `${seed}:dealer` selects the initial dealer. Replay never uses wall clocks or ambient randomness. The source log alone recreates the entire game.

Clients are trusted, as in Pantheon/Istanbul: a determined client can derive everyone's hand from the shared seed. The interface conceals opponents' held and discarded cards, but this is not an adversarial hidden-information service. Companion bots use only their own hand, their own known discards and public play: maximize expected retained-hand points for discards; prioritize immediate pegging points, avoid leaving five or twenty-one, then prefer a low card. All tie breaks are stable.

Tests exercise repeatable deals, strict intent shapes, 29 hands, crib flushes, pegging combinations, legal Go, 31, immediate wins, card conservation, dealer rotation, and exact event replay through sixteen complete bot matches across all three player counts.

The host's tab runs companion turns; keep it open when using companions. Player positions advance clockwise around the table, so the next seat is visibly to the dealer's left from each personal perspective.

## Firebase previews

Hosted previews use anonymous Firebase Auth identities and a Firestore transaction for each intent. The transaction checks the current revision, reconciles the command ID, replays the committed prefix and validates the choice before atomically writing an immutable event, command lookup and access-control metadata. Only owner, members, companion IDs and revision are materialized; hands, scores and other game outcomes remain exclusively derived from replay. Rules enforce authentication, seat/companion ownership, append-only ordering and strict intent shapes. The host alone may start or invite companions. No Firebase administrator credentials enter the browser or deployment workflow.

Each retained PR has its own namespace. The invitation's base path and every local asset URL follow the build base, so a shared `/cribbage/pr3/?table=…` invitation stays in the same preview. Local SQLite/SSE play remains available without Firebase configuration.
