# Transparent favicon

The install icon retains its opaque green felt background. The browser favicon uses a separate transparent cutout generated with the built-in image generation tool, saved as `assets/cribbage-favicon.png`, with 16-, 32- and 48-pixel PNG exports in `public/icons/`.

The favicon filenames are versioned so browsers do not keep the previous opaque tile cached. Exports preserve real alpha; exterior corner pixels are fully transparent.

## Generation prompt

Use case: background-extraction. Edit this approved cribbage icon ONLY to remove its background for a transparent browser favicon. Remove all green felt outside the wooden 29 board and all cast shadows outside the wooden silhouette. Replace that exterior completely with true alpha transparency (alpha zero), not black, not white, not a checkerboard. Preserve the wooden 29 board itself: exact joined contour, rounded maple face, walnut bevel, small colored pegs, printed cards and existing correct engraved score numbers. Do not redesign, redraw, change the board perspective, or invent text. Keep the board's filled wooden centers solid and opaque; the peg holes remain dark opaque drilled holes. The slim crescent-shaped opening below the diagonal of the 2 is an actual cutout: make its visible background transparent while preserving its wood edge. Preserve the board's warm color and crisp silhouette with clean antialiased alpha edges and absolutely no green fringe or black matte. Center the complete board on a tightly framed square transparent canvas with only a modest 5% clear border on the longest dimension. No shadow outside the board, no new border, no tile, no words, no watermark. The output must be a clean cutout on a genuinely transparent background.
