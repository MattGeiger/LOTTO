# Arcade asset credits

## Shared pixel font — Seven Fifteen

- **Creator:** Douglas Vautour (Burpy Fresh).
- **Font:** [Seven Fifteen (7x15), version 0.013](https://burpyfresh.itch.io/seven-fifteen-font).
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
  The creator's font page and bundled readme specify this license. Credit and
  a license link are required; the font is not CC0.
- **Source file:** `src/arcade/fonts/SevenFifteen-V0_013/SevenFifteenMonoRounded-Regular.ttf`.
  Used by the Arcade layout and staff game-navigation buttons.
- **Processing:** Next.js prepares browser font files from the bundled TrueType
  file. This credit update does not modify the source font.
- **Preserved notice:** [`README-SevenFifteen.txt`](../src/arcade/fonts/SevenFifteen-V0_013/README-SevenFifteen.txt).
- **Visible credits:** About modal and repository README, with creator/source
  and license links and the web-delivery processing notice.

The font retains its CC BY 4.0 license independently of LOTTO's application code.

## Memory Grid — Free Pixel Food!

- **Creator:** Henry Software.
- **Pack:** [Free Pixel Food!](https://henrysoftware.itch.io/pixel-food).
- **License:** [Creative Commons CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
  The creator's asset page identifies the artwork as CC0. Attribution is not
  required by that dedication; LOTTO credits the creator at the owner's request.
- **Retrieved:** October 8, 2026, using the creator's free download. No Unity
  code is included or executed.
- **Files:** Twelve original 16×16 PNGs under
  `public/arcade/memory-grid/food/`: Apple, Bread, Cheese, Strawberry, MelonWater,
  Lemon, Eggplant, Pineapple, Fish, Potato, Eggs and Cherry.
- **Changes:** None. Each PNG was verified byte-for-byte against its individual
  file in `FreePixelFood.zip`. Pixel scaling at runtime uses nearest-neighbor
  rendering. The original creator readme is preserved alongside the sprites.
- **Evidence:** [`asset-manifest.json`](../public/arcade/memory-grid/asset-manifest.json)
  records source, license, archive hash, individual SHA-256 hashes and dimensions.
- **Visible credits:** About modal, Memory Grid footer and repository README.

CC0 applies to these third-party food images. LOTTO application code remains
AGPL-3.0-or-later; agency branding retains its separate ownership and trademark
terms. This asset inclusion does not transfer any codebase ownership.
