# ServiceAI Scheduling — handoff

Last updated 2026-08-07.

## Start here (new session)

Read this file top to bottom before touching anything, especially
**Landmines found the hard way** — each one cost a real debugging session.

Both instances are live and healthy: booking, confirmation email with the
calendar invite, and the dashboard webhook are all verified end to end.

Next three, in order:

1. **Google OAuth for client subdomains.** Clients cannot connect Google
   Calendar at all — proven, not suspected: Google returns
   `redirect_uri_mismatch` for
   `https://arborvitae.serviceaihq.com/api/integrations/googlecalendar/callback`.
   Needs the callback registered in Google Cloud Console, and a decision on the
   consent screen (see Open work). This blocks the whole self-serve plugin idea.
2. **Stripe login.** `stripe login` against the real business account, not the
   sandbox. Then activation status, then swap test keys for live.
3. **Verify the onboarding fix live** with a throwaway un-onboarded account.
   The code is deployed and type-checked; the behaviour has not been observed
   on the live site.

## What this is

A fork of `calcom/cal.diy` (MIT) that ServiceAI sells as **client-owned**
scheduling software. One golden template (`main`), one branch and one live
instance per client. Clients own their instance; ServiceAI maintains the
template and propagates fixes.

| Instance | URL | Branch | Vercel project | Database |
| --- | --- | --- | --- | --- |
| ServiceAI | scheduling.serviceaihq.com | `main` | `serviceai-scheduling` | Neon `neondb` |
| Arbor Vitae Wellness | arborvitae.serviceaihq.com | `client/arborvitae` | `arborvitae-scheduling` | Neon `arborvitae` |

Per-instance switches (set on Vercel, emitted by `branding/apply-brand.mjs`):

| Instance | `SERVICEAI_VERTICAL` | `SERVICEAI_PAYMENTS` | Apps seeded / enabled |
| --- | --- | --- | --- |
| ServiceAI | `general` | `true` | 105 / 83 |
| Arbor Vitae | `medical` | `false` | 105 / 79 |

Both Vercel projects are git-connected: **push to the branch = deploy**. Do not
use `vercel deploy` from this repo — the CLI upload trips the 100 MB limit on
local build caches.

## Accounts

- ServiceAI instance: `info@serviceaihq.com` (ADMIN), `brandon@serviceaihq.com`
- Arbor Vitae instance: `brandon@serviceaihq.com` (ADMIN, ServiceAI's access),
  `arborvitaewellness@gmail.com` (Dr. Magdy Guirguis, username `scheduling`)
- Passwords were generated per account and given to Brandon in chat. Signup is
  disabled everywhere: **this is a paid platform, accounts are created after
  payment, never self-served.**

## Branding a client instance

Everything flows from `branding/BRAND.md` — see `branding/README.md`.

```bash
node branding/apply-brand.mjs   # rewrites theme tokens + product name in copy
```

The spec takes a brand colour and either a `neutral_hue` (derived greys, fine
from a logo alone) or **exact neutrals**, which is much better when the client's
stylesheet states them. Arbor Vitae uses exact values pulled from their site.
The script also renames ~34 locale strings that hard-code the upstream product
name, recording what it wrote in `branding/.applied-name` so a later rename or a
merge from the template can't reintroduce "Cal.diy".

Logo assets are still a manual step (favicons + wordmark SVGs, same filenames so
upstream merges stay clean).

## Landmines found the hard way — don't repeat these

1. **Client DB URL.** Build the connection string by replacing only the path
   segment after the host. A naive `.replace("/neondb", "/<client>")` also
   renames the *user* (`neondb_owner`) and the build fails on auth.
2. **Event types created by raw SQL 404 in the booker** until you also insert
   `_user_eventtype` (A = eventTypeId, B = userId). The profile page lists them
   via `userId`, so it looks fine one level up. Prefer the API.
3. **`GMAIL_SA_KEY_JSON` must be single-line valid JSON.** A PEM key with real
   newlines inside the JSON string is invalid; it silently killed every email
   for a day. Store with `json.dumps(key)` and verify by pulling it back.
4. **Onboarding used to trap new users** behind a "Select plan" wizard — every
   route redirects into onboarding until it completes. Fixed 2026-08-07: the
   plan step is skipped and `/onboarding/personal/settings` is the first step.
   Setting `users.completedOnboarding = true` at creation is still the belt-and-
   braces move when provisioning by SQL.
5. **Embeds of the service list don't work** inside a host site (the iframe
   sizes itself from events only the booker emits; the modal renders at zero
   size). Arbor Vitae's site uses native cards linking straight to each booker.
   See `ArborVitae_Website/contact.html`.
6. **The app-store seed disables working apps.** `yarn workspace @calcom/prisma
   seed-app-store` decides `enabled` from raw env names (`HUBSPOT_CLIENT_ID`),
   but these deployments supply keys as `CAL_APP_KEYS_<SLUG>`. It silently
   flipped `daily-video` off on Arbor Vitae. Snapshot the enabled slugs first,
   run the seed, then restore them:
   `select slug from "App" where enabled;`
7. **Never `source` a pulled `.env` in bash.** Bash strips the quotes, so
   `GOOGLE_API_CREDENTIALS={"web":...}` becomes `{web:...}` and every JSON env
   looks corrupt. This produced a convincing false alarm — both instances
   appeared to have malformed Google credentials while production was fine.
   Parse the file (strip one layer of quotes) and pass it as a real env dict.
8. **Client subdomains are not registered Google OAuth callbacks.** Google
   returns `redirect_uri_mismatch` for any
   `https://<client>.serviceaihq.com/api/integrations/googlecalendar/callback`.
   Every new client needs its two callbacks added in the Cloud Console.

## Integrations

Configured via `CAL_APP_KEYS_<SLUG>` env vars (env-first, falls back to
`App.keys`) — see `packages/app-store/_utils/getAppKeysFromSlug.ts`.

- **Google Calendar** — OAuth client in GCP `serviceai-tools`, consent screen
  **Internal**, so no verification and no expiry. Connected on ServiceAI.
  **Not usable by clients yet** — see landmine 8, plus Internal consent means
  only `serviceaihq.com` accounts can authorise at all. Both must be resolved
  before any client can link their calendar.
- **App catalog** — 105 apps seeded on both instances so clients can connect
  what they need themselves (calendars, video, CRM, analytics). Apps needing
  platform credentials stay disabled until keys exist; the rest take the
  client's own credentials.
- **Email** — Gmail API via the domain-wide-delegated service account
  (`gmail-sender@serviceai-tools`, `gmail.send` only), transport in
  `packages/lib/gmailServiceAccountTransport.ts`. Verified end to end 2026-08-07:
  attendee mail delivers with the ICS attached.
- **HubSpot** — app id 48204739 (private, portal 243125050). Keys deployed;
  install still needs completing in Apps.
- **Close** — OAuth app created; org was on a trial ending ~2026-08-14.
- **Stripe** — **test mode**, ServiceAI only. Direct charges to each client's
  own connected account, no application fee, so ServiceAI carries no payment
  liability — see `connect-recommend-plan.md` for the full configuration and
  why. Blocked on `stripe login` against the real business account (the CLI key
  expired and the browser session defaults to a sandbox).
  Payments are gated per instance by `SERVICEAI_VERTICAL` / `SERVICEAI_PAYMENTS`
  (`packages/lib/payments/instancePayments.ts`): opt-in everywhere, and never
  available on `medical`. That medical rule is **ServiceAI policy about patient
  payment data, not a Stripe restriction** — Stripe permits healthcare.
- **Zoom** — General App, development mode, fine for Brandon's own account.
- **Adobe PDF Services** — credentials stored; the intake-forms module is not
  built.

## Fleet plumbing

- Every instance posts booking webhooks (HMAC, `X-Cal-Signature-256`) to
  `api.serviceaihq.com/api/hooks/scheduling`, which mirrors them into Firestore
  and feeds the Scheduling card + client switcher in the operator dashboard
  (`claude_Serviceai_website/dashboard`). Client instances were added late —
  check `Webhook` rows exist when provisioning a new one.
- `agent_ro` is a read-only Postgres role granted on every client database, for
  Hermes/Optimus. See `docs/AGENT-INTEGRATION.md`.

## Open work

**Needs Brandon**
- **Google OAuth decision.** Either (a) switch the consent screen to External
  and go through Google verification for calendar scopes — one OAuth app for
  every client, or (b) each client uses their own GCP OAuth client — no
  verification burden, genuinely client-owned, but a real onboarding step.
  Either way each client's two callbacks must be registered.
- `stripe login` against the real business account, then live-mode activation
  (financial details — ServiceAI only, not an agent)
- Dr. G to confirm the 45-minute durations and which services are bookable
  online; also whether Applied Kinesiology is a separate appointment type
- DNS for `arborvitaewellness.com` from the previous vendor, then
  `booking.arborvitaewellness.com` is a one-CNAME swap onto the same instance
- Copy on the practice's Book a Visit page still says "Call or text to get on
  the schedule", written before online booking existed

**Ready to build**
- Finish the HubSpot install and confirm a booking creates a contact
- Verify the onboarding plan-chooser skip on the live site with a fresh
  un-onboarded account (deployed and type-checked, never observed live)
- Patient sign-in (magic-link auth + patient area) — Brandon wants real
  accounts, not prefilled links
- Adobe PDF intake forms
- SMS reminders (parked — Brandon proving the concept elsewhere)
- Cold starts: ~2s first load on Vercel free tier. Either a keep-warm cron or
  Vercel Pro

**Standing rules**
- No Zapier or third-party automation platforms — ServiceAI builds its own.
- Don't send email on Brandon's behalf without an explicit go-ahead.
- Verify against the live URL before reporting something fixed; deploys queue.
