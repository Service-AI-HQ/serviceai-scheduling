/**
 * Whether this instance may connect a payment processor.
 *
 * Each ServiceAI instance belongs to one client, so this is per-deployment
 * configuration rather than a per-user setting — it lives in env alongside the
 * other per-instance values that `branding/apply-brand.mjs` emits.
 *
 * Two rules, in this order:
 *
 *  1. Payments are **opt-in**. A newly provisioned client cannot take money
 *     until someone deliberately turns it on.
 *  2. Medical instances may never take payments, and cannot opt in.
 *
 * The reason for rule 2 is ServiceAI policy, not a Stripe restriction — Stripe
 * permits healthcare businesses. ServiceAI chooses not to sit anywhere near
 * patient payment data, so medical clients bill through their own systems.
 * Do not "fix" this by citing Stripe's rules; they don't say that.
 */

export type InstanceVertical = "general" | "medical";

export const INSTANCE_VERTICAL_ENV = "SERVICEAI_VERTICAL";
export const INSTANCE_PAYMENTS_ENV = "SERVICEAI_PAYMENTS";

type Env = { [key: string]: string | undefined };

export function getInstanceVertical(env: Env = process.env): InstanceVertical {
  return env[INSTANCE_VERTICAL_ENV]?.trim().toLowerCase() === "medical" ? "medical" : "general";
}

export function arePaymentsEnabled(env: Env = process.env): boolean {
  if (getInstanceVertical(env) === "medical") return false;
  return env[INSTANCE_PAYMENTS_ENV]?.trim().toLowerCase() === "true";
}

/**
 * Why payments are unavailable, or null when they're available. Returned as a
 * message so the operator sees which of the two rules applied instead of a bare
 * "not allowed" — the medical case is permanent, the opt-in case is a setting.
 */
export function paymentsUnavailableReason(env: Env = process.env): string | null {
  if (getInstanceVertical(env) === "medical") {
    return "Payments are disabled for medical instances. ServiceAI does not handle patient payments; this practice bills through its own systems.";
  }
  if (!arePaymentsEnabled(env)) {
    return `Payments are not enabled for this instance. Set ${INSTANCE_PAYMENTS_ENV}="true" to enable them.`;
  }
  return null;
}
