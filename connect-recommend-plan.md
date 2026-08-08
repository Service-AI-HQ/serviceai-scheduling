# Recommended Connect integration plan

Written 2026-08-07 for ServiceAI Scheduling.

## The business, in one paragraph

ServiceAI sells client-owned scheduling software. Each client — a chiropractor,
a salon, whoever — gets their own deployed instance, their own database, their
own domain. Patients book appointments and pay for them. **The money goes
directly to the practice.** ServiceAI takes no cut, is not a marketplace, and is
never in the flow of funds. Clients own the software long-term and can leave.

## Recommended configuration

| Dimension | Value |
| --- | --- |
| Charge pattern | **Direct charges** |
| Dashboard | **Full** (`dashboard: "full"`) |
| Stripe processing fees | **Connected account pays** (`fees_collector: "stripe"`) |
| Negative balance / loss liability | **Connected account** (`losses_collector: "stripe"`) |
| Onboarding | **OAuth** (Standard-style connection) |
| Application fee | **None** |

### Why this one

The practice provides the service, so the practice is the merchant of record.
Direct charges are the only pattern consistent with that. Destination or
separate charges would make ServiceAI the merchant — wrong on the economics,
wrong on liability, and wrong on the promise that clients own their business
relationship with their patients.

A full dashboard means Dr. G has a real Stripe account with his own login,
his own payouts, and his own records. If he stops paying ServiceAI tomorrow,
his payment history and customer relationships go with him. That is the product
promise, expressed in the Connect configuration.

**Because there is no application fee and charges are direct, ServiceAI carries
no payment liability of any kind** — no disputes, no refunds, no negative
balances, no processing fees, no margin exposure. This is the single most
important consequence of the configuration and it should not be given up
casually. Introducing a platform fee later would change the risk profile and
require re-reading this document.

## Compatibility check

`dashboard: "full"` + `fees_collector: "stripe"` + **direct charges** is a
supported combination.

Worth knowing, because it constrains future changes:

- `dashboard: "full"` + `fees_collector: "stripe"` with **destination or
  separate** charges is blocked. If anyone ever proposes routing money through
  ServiceAI, the dashboard or fee ownership has to change too.
- `dashboard: "full"` + `fees_collector: "application"` is sales-gated — not
  available self-serve.

## What is already implemented

The Cal.com fork ships this pattern already. Evidence, not assumption:

- `packages/app-store/stripepayment/lib/PaymentService.ts` creates every payment
  intent with `{ stripeAccount: this.credentials.stripe_user_id }` — a direct
  charge on the connected account (lines ~108, ~283).
- No `application_fee_amount` appears anywhere in the app.
- `packages/app-store/stripepayment/api/callback.ts` completes the OAuth
  connection and stores `stripe_user_id` on the credential.

So no charge-pattern code needs to be written. The remaining work is account
state and configuration.

## What remains

**In the Stripe Dashboard (Brandon — cannot be delegated)**

1. Identify or create the real ServiceAI **platform** account. As of 2026-08-07
   the CLI pointed at `acct_1TxhA69Iq4K4s4uD` (expired test key) and the browser
   session defaulted to `acct_1T9crjRt18F2ZIdX`, a sandbox. Neither is a
   confirmed live platform.
2. Activate that account and enable Connect. Note the platform is **not** a
   merchant here — it never collects money — but Stripe still requires a
   completed platform profile before live Connect.
3. Configure the platform profile and branding shown on the OAuth consent screen.

**In deployment config**

4. Swap `STRIPE_CLIENT_ID`, `STRIPE_PRIVATE_KEY`, and `STRIPE_WEBHOOK_SECRET`
   from test to live values. All three are already wired per instance; only the
   values change. `CAL_APP_KEYS_STRIPE` follows the same env-first pattern as
   every other app — see `packages/app-store/_utils/getAppKeysFromSlug.ts`.

**Per client, once**

5. The client installs the Stripe app on their instance and completes the OAuth
   connection with **their own** Stripe account. Money flows to them from the
   first booking.

## Known tradeoff: OAuth connections can be revoked

A connected practice can disconnect at any time, and payments stop until they
reconnect. Stripe's general guidance is to prefer embedded onboarding for
tighter platform control.

**That guidance is deliberately not followed here.** "Clients own their software
and can leave" is the product promise; a connection the client cannot revoke
would contradict it. The mitigation is visibility, not lock-in:

- Add the `notification_banner` embedded component so accounts don't silently
  fall out of compliance as Stripe's requirements evolve.
- Handle `account.application.deauthorized` and surface disconnections in the
  ServiceAI operator dashboard, which already receives per-instance webhooks.

## Verification before calling it live

- `stripe whoami` resolves to the intended live platform account.
- A booking on a paid event type produces a charge **in the client's own Stripe
  account**, not ServiceAI's.
- The refund path works from the client's dashboard.
- A disputed charge appears against the client's account, confirming liability
  sits where this document says it does.
