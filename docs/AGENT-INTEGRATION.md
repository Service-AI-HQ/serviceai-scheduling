# Agent integration — how Hermes, Optimus, or any agent talks to scheduling

Three access paths, in order of preference. Each instance (ServiceAI's own and
every client's) exposes the same three, so an agent paired once works the same
way for every client.

## 1. Push: webhooks (agent learns about bookings in real time)

The instance signs every booking event with HMAC-SHA256 over the raw body and
sends `X-Cal-Signature-256`. Subscribe by inserting a `Webhook` row (or via
Settings → Developer → Webhooks):

| field | value |
| --- | --- |
| subscriberUrl | the agent's endpoint |
| eventTriggers | `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED` |
| secret | shared secret; verify before trusting the payload |

Live example: the ServiceAI portal at `api.serviceaihq.com/api/hooks/scheduling`
(receiver in `claude_Serviceai_website/api/src/index.js` — copy that verify
block; it is ~10 lines and rejects unsigned calls with 401).

**This is how an agent should learn about bookings.** Polling is a fallback.

## 2. Pull: read-only database role (`agent_ro`)

For questions the API doesn't answer in one call ("how many bookings did each
client take last week?"), agents read directly. The `agent_ro` Postgres role
has `SELECT` on all tables and nothing else — `INSERT` returns
`permission denied`, verified. One role, granted per client database, so a
single credential answers fleet-wide questions.

Credentials belong in the agent host's env (e.g.
`~/.config/serviceai/scheduling-ro.env` on the Hermes box), never in this repo:

```
SCHEDULING_DB_SERVICEAI=postgresql://agent_ro:<pw>@<neon-host>/neondb?sslmode=require
SCHEDULING_DB_ARBORVITAE=postgresql://agent_ro:<pw>@<neon-host>/arborvitae?sslmode=require
```

Useful queries:

```sql
-- next 7 days across an instance
SELECT b."startTime", b.title, a.email
FROM "Booking" b LEFT JOIN "Attendee" a ON a."bookingId" = b.id
WHERE b.status = 'accepted' AND b."startTime" > now()
ORDER BY b."startTime" LIMIT 50;

-- cancellations last week (churn signal worth a Telegram ping)
SELECT count(*) FROM "Booking"
WHERE status = 'cancelled' AND "updatedAt" > now() - interval '7 days';
```

## 3. Act: REST API with a per-agent API key

When an agent must *do* something (create/move/cancel a booking — an AI
receptionist rebooking a patient), it needs a key, not DB access. Keys are
per-user, hashed with SHA-256 (`hashAPIKey`), and mint like this:

```js
// node, run against the instance's DB
const { createHash, randomBytes } = require("node:crypto");
const key = randomBytes(16).toString("hex");
const hashed = createHash("sha256").update(key).digest("hex");
// INSERT INTO "ApiKey" (id, "userId", note, "hashedKey") VALUES (…, 'hermes agent', hashed)
// give the agent: <API_KEY_PREFIX><key>
```

Scope one key per agent per instance so it can be revoked without affecting
anything else.

## Pairing checklist for a new client instance

1. Insert a `Webhook` row pointing at the agent endpoint (secret from the
   agent host's env).
2. `GRANT` the `agent_ro` role on the new database (see
   `branding/README.md` provisioning steps).
3. Mint an API key only if that client's agent needs to write.
4. Add the instance to the agent's own registry so it knows the client exists,
   which URL is theirs, and which database answers for them.

## What the agent should know about each instance

Keep this shape in the agent's memory/registry — it is the minimum for
answering "what's on the calendar for X" without guessing:

```yaml
- client: Arbor Vitae Wellness
  url: https://arborvitae.serviceaihq.com
  db_env: SCHEDULING_DB_ARBORVITAE
  timezone: America/Los_Angeles
  hours: Mon/Wed/Fri 07:15-17:00
```
