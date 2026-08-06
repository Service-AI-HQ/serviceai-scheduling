// Applies branding/BRAND.md to the theme. Deterministic and idempotent:
// every value it writes is a pure function of the spec, so re-running is a
// no-op and two agents can never disagree about what a brand means.
//
//   node branding/apply-brand.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandPath = join(root, "branding/BRAND.md");
const tokensPath = join(root, "packages/config/theme/tokens.css");

// --- parse the YAML frontmatter (flat key: value only, no dependency) ------
const raw = readFileSync(brandPath, "utf8");
const fm = raw.match(/^---\n([\s\S]*?)\n---/);
if (!fm) throw new Error("BRAND.md has no frontmatter");
const spec = {};
for (const line of fm[1].split("\n")) {
  // Quoted values keep everything between the quotes (hex colors contain #);
  // unquoted values have trailing comments stripped.
  const m =
    line.match(/^([a-z_]+):\s*"([^"]*)"/) || line.match(/^([a-z_]+):\s*([^#\n]+?)\s*(?:#.*)?$/);
  if (m) spec[m[1]] = m[2].trim();
}
const required = ["name", "company", "brand", "brand_emphasis_light", "brand_emphasis_dark", "brand_text", "neutral_hue"];
for (const k of required) if (!spec[k]) throw new Error(`BRAND.md missing ${k}`);
for (const k of ["brand", "brand_emphasis_light", "brand_emphasis_dark", "brand_text"]) {
  if (!/^#[0-9a-fA-F]{6}$/.test(spec[k])) throw new Error(`${k} must be a 6-digit hex color, got ${spec[k]}`);
}
const H = Number(spec.neutral_hue);
if (!(H >= 0 && H <= 360)) throw new Error("neutral_hue must be 0-360");
const lc = (s) => s.toLowerCase();

// Optional exact light-mode neutrals. Hue-derived greys are a good guess from a
// logo alone, but when a client's stylesheet states its greys, matching them is
// the difference between "same colour family" and "same design" — a derived
// scale drifts toward the brand hue and flattens the type contrast the client
// actually designed. Any key omitted falls back to the derivation.
const NEUTRAL_KEYS = {
  bg: "--cal-bg",
  bg_subtle: "--cal-bg-subtle",
  bg_muted: "--cal-bg-muted",
  bg_emphasis: "--cal-bg-emphasis",
  bg_inverted: "--cal-bg-inverted",
  border: "--cal-border",
  border_subtle: "--cal-border-subtle",
  border_muted: "--cal-border-muted",
  border_emphasis: "--cal-border-emphasis",
  text_emphasis: "--cal-text-emphasis",
  text: "--cal-text",
  text_subtle: "--cal-text-subtle",
  text_muted: "--cal-text-muted",
  text_inverted: "--cal-text-inverted",
};
const overrides = {};
for (const [key, token] of Object.entries(NEUTRAL_KEYS)) {
  if (!spec[key]) continue;
  if (!/^#[0-9a-fA-F]{6}$/.test(spec[key])) throw new Error(`${key} must be a 6-digit hex color`);
  overrides[token] = lc(spec[key]);
}

// --- token values as pure functions of the spec ----------------------------
// The neutral scales tint every gray toward the brand hue — this is what makes
// the whole app "match" a client brand even when all they give us is a logo.
const light = {
  "--cal-bg-emphasis": `hsla(${H + 4}, 25%, 90%, 1)`,
  "--cal-bg": "hsla(0, 0%, 100%, 1)",
  "--cal-bg-subtle": `hsla(${H + 4}, 22%, 94%, 1)`,
  "--cal-bg-muted": `hsla(${H + 6}, 30%, 97%, 1)`,
  "--cal-bg-inverted": `hsla(${H}, 100%, 5%, 1)`,
  "--cal-bg-primary": lc(spec.brand),
  "--cal-bg-primary-emphasis": lc(spec.brand_emphasis_light),
  "--cal-bg-primary-muted": `hsla(${H + 4}, 85%, 93%, 1)`,
  "--cal-bg-brand": lc(spec.brand),
  "--cal-bg-brand-emphasis": lc(spec.brand_emphasis_light),
  "--cal-bg-brand-muted": `hsla(${H + 4}, 85%, 93%, 1)`,
  "--cal-border-emphasis": `hsla(${H + 2}, 10%, 62%, 1)`,
  "--cal-border": `hsla(${H + 2}, 14%, 83%, 1)`,
  "--cal-border-subtle": `hsla(${H + 4}, 18%, 90%, 1)`,
  "--cal-border-muted": `hsla(${H + 4}, 20%, 94%, 1)`,
  "--cal-text-emphasis": `hsla(${H}, 60%, 5%, 1)`,
  "--cal-text": `hsla(${H}, 8%, 25%, 1)`,
  "--cal-text-subtle": `hsla(${H}, 7%, 45%, 1)`,
  "--cal-text-muted": `hsla(${H + 2}, 9%, 63%, 1)`,
  "--cal-text-inverted": "hsla(0, 0%, 100%, 1)",
  "--cal-brand": lc(spec.brand),
  "--cal-brand-emphasis": lc(spec.brand_emphasis_light),
  "--cal-brand-text": lc(spec.brand_text),
};
const dark = {
  "--cal-bg-emphasis": `hsla(${H}, 12%, 22%, 1)`,
  "--cal-bg": `hsla(${H}, 25%, 5%, 1)`,
  "--cal-bg-subtle": `hsla(${H}, 15%, 13%, 1)`,
  "--cal-bg-muted": `hsla(${H}, 20%, 8%, 1)`,
  "--cal-bg-inverted": `hsla(${H + 6}, 25%, 97%, 1)`,
  "--cal-bg-primary": lc(spec.brand),
  "--cal-bg-primary-emphasis": lc(spec.brand_emphasis_dark),
  "--cal-bg-primary-muted": `hsla(${H}, 45%, 14%, 1)`,
  "--cal-bg-brand": lc(spec.brand),
  "--cal-bg-brand-emphasis": lc(spec.brand_emphasis_dark),
  "--cal-bg-brand-muted": `hsla(${H}, 45%, 14%, 1)`,
  "--cal-border": `hsla(${H}, 10%, 29%, 1)`,
  "--cal-border-muted": `hsla(${H}, 18%, 9%, 1)`,
  "--cal-border-subtle": `hsla(${H}, 13%, 15%, 1)`,
  "--cal-border-emphasis": `hsla(${H}, 8%, 44%, 1)`,
  "--cal-text-emphasis": `hsla(${H + 6}, 30%, 97%, 1)`,
  "--cal-text": `hsla(${H + 6}, 10%, 83%, 1)`,
  "--cal-text-subtle": `hsla(${H + 4}, 7%, 64%, 1)`,
  "--cal-text-muted": `hsla(${H + 4}, 7%, 64%, 1)`,
  "--cal-text-inverted": `hsla(${H}, 60%, 4%, 1)`,
  "--cal-brand": lc(spec.brand),
  "--cal-brand-emphasis": lc(spec.brand_emphasis_dark),
  "--cal-brand-text": lc(spec.brand_text),
};

// --- rewrite tokens.css ----------------------------------------------------
let css = readFileSync(tokensPath, "utf8");
const darkStart = css.indexOf(".dark {");
if (darkStart === -1) throw new Error("tokens.css: .dark block not found");

function applyVars(section, vars, label) {
  let out = section;
  for (const [name, value] of Object.entries(vars)) {
    const re = new RegExp(`(${name.replace(/[-[\]]/g, "\\$&")}):\\s*[^;]+;`);
    if (!re.test(out)) throw new Error(`${label}: ${name} not found`);
    out = out.replace(re, `$1: ${value};`);
  }
  return out;
}

const head = applyVars(css.slice(0, darkStart), { ...light, ...overrides }, "light");
const tail = applyVars(css.slice(darkStart), dark, "dark");
writeFileSync(tokensPath, head + tail);

// --- deployment env vars ---------------------------------------------------
console.log(`Theme applied for ${spec.company} (brand ${spec.brand}, neutral hue ${H}).\n`);
console.log("Set these on the deployment:");
console.log(`  NEXT_PUBLIC_APP_NAME="${spec.name}"`);
console.log(`  NEXT_PUBLIC_COMPANY_NAME="${spec.company}"`);
if (spec.support_email) console.log(`  NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS="${spec.support_email}"`);
if (spec.support_email) console.log(`  NEXT_PUBLIC_SENDGRID_SENDER_NAME="${spec.company}"`);
console.log("\nRemaining manual steps: logo assets (branding/README.md step 4).");
