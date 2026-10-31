# Four individual tracks

This table uses a four-player individual-scoring variant, matching the four-track board requested for the lab. Each player receives five cards and contributes one to the dealer's four-card crib. Four cards remain to peg. There are no partnerships or muggins. First to 121 wins immediately, including during pegging or a cut jack.

The player left of the dealer cuts and leads. Play proceeds clockwise; a player who cannot stay at or below 31 says Go. Players with empty hands are skipped. After everyone remaining has passed, the last player scores one and the next player with cards leads a fresh count. A 31 scores two, without another last-card point. Fifteens, pairs, triples, quads and the longest trailing run score during pegging. After all sixteen cards have been played, each hand is counted in clockwise order from the dealer's left, then the dealer's crib. Crib flushes require five matching suits. The deal rotates clockwise.

Scoring follows the [American Cribbage Congress rules](https://www.cribbage.org/NewSite/rules/rulebook_2025.pdf); the independent four-player setup is this project's declared variant.

## Intent log, version 1

The immutable envelope is `{version, id, sequence, actor, intent}`. The only intents are `create(name)`, `join(name)`, `invite-bot(id, name)`, `begin(seed)`, `discard(card)`, `cut`, `play(card)`, `go`, `count`, and `deal`. Counts and deals are deliberate actions; scoring is derived. Extra fields are rejected, so hands, dealt cards, totals, scores and winners cannot be smuggled into an event.

The seed is the host's shuffle input. The PRNG is Pantheon's version-1 FNV-1a/xorshift32 and Fisher–Yates shuffle, copied under GPLv3. Each hand uses a separate `${seed}:deal:${round}` stream, and `${seed}:dealer` selects the initial dealer. Replay never uses wall clocks or ambient randomness. The source log alone recreates the entire game.

Clients are trusted, as in Pantheon/Istanbul: a determined client can derive everyone's hand from the shared seed. The interface conceals opponents' held and discarded cards, but this is not an adversarial hidden-information service. Companion bots use only their own hand and public play: maximize expected retained-hand points for discards; prioritize immediate pegging points, avoid leaving five or twenty-one, then prefer a low card. All tie breaks are stable.

Tests exercise repeatable deals, strict intent shapes, 29 hands, crib flushes, pegging combinations, legal Go, 31, immediate wins, card conservation, dealer rotation, and exact event replay through eight complete bot matches.
