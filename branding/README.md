# Client branding pipeline

Every client instance of this template is branded from **one file**:
`branding/BRAND.md`. Nothing else in the repo is hand-edited for branding.

## The flow

1. **Client uploads whatever they have.** A brand-guide PDF, a logo PNG/SVG/AI
   file, a Figma link, a screenshot of their site — any format, dropped into
   `branding/intake/` (never committed if it contains anything sensitive).
2. **An agent translates it into `BRAND.md`.** The agent extracts the primary
   brand color, picks hover shades and on-brand text color that pass WCAG AA
   against it, derives the neutral hue, and records name/support details.
   Rules for the agent are in "Translating a design file" below.
3. **Run the apply script.**

   ```bash
   node branding/apply-brand.mjs
   ```

   It rewrites the brand + neutral tokens in
   `packages/config/theme/tokens.css` (light and dark) and prints the env vars
   to set on the deployment. It is deterministic and idempotent: run it twice,
   nothing changes.
4. **Convert the logo assets** (agent task, macOS `sips` shown; any resizer works):

   ```bash
   M=branding/assets/logo-mark.png   # square mark, >= 512px, transparent bg
   cd apps/web/public
   for s in "16 favicon-16x16.png" "32 favicon-32x32.png" "180 apple-touch-icon.png" \
            "150 mstile-150x150.png" "192 android-chrome-192x192.png" \
            "256 android-chrome-256x256.png" "384 android-chrome-384x384.png" \
            "512 android-chrome-512x512.png"; do
     set -- $s; sips -Z $1 "$OLDPWD/$M" --out $2 >/dev/null
   done
   # favicon.ico: python3 -c "from PIL import Image; Image.open('$M').save('favicon.ico', sizes=[(16,16),(32,32),(48,48)])"
   # Wordmark SVGs (calcom-logo-white-word.svg, cal-logo-word-black.svg,
   # cal-com-icon-white.svg): embed the mark + company name; keep the same
   # filenames so there is zero code diff against upstream.
   ```
5. **Commit.** The instance is branded. No application code was touched, so
   upstream merges stay clean.

## Translating a design file (agent rules)

- **brand**: the dominant CTA/accent color from the client's materials — the
  color of their "book now" button, not their body text.
- **brand_text**: near-black tinted toward the brand hue if the brand color is
  light/mid (contrast >= 4.5:1 on brand), or near-white if the brand is dark.
- **brand_emphasis_light**: ~12% darker than brand (light-mode hover).
  **brand_emphasis_dark**: ~10% lighter than brand (dark-mode hover).
- **neutral_hue**: the hue (0-360) of the brand color — it warms/cools every
  gray in the app so the whole theme "matches" without a design file.
- If the client's guide specifies exact grays or a second palette, prefer the
  guide over the derivations, and note the override in BRAND.md prose.
- Logo: request or extract a square mark >= 512px on transparency. A wordmark
  alone is fine for the SVGs; derive the square mark from it if needed.

## Why an MD file

`BRAND.md` is the contract between humans, agents, and the build: readable in
a PR, diffable, and machine-parseable (YAML frontmatter). The client can read
exactly what their brand means in this product; the fleet agent can regenerate
the theme from it forever.
