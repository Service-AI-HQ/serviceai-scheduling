import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

/**
 * Env-first app keys: CAL_APP_KEYS_<SLUG> (slug uppercased, dashes and dots
 * as underscores, e.g. CAL_APP_KEYS_GOOGLE_CALENDAR) holding the keys JSON
 * takes precedence over App.keys in the database, so per-instance deploys can
 * configure app-store credentials without seeding secrets into the DB.
 */
function getEnvKeysForSlug(slug: string): Prisma.JsonObject | null {
  const envName = `CAL_APP_KEYS_${slug.toUpperCase().replace(/[-.]/g, "_")}`;
  const raw = process.env[envName];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Prisma.JsonObject;
  } catch {
    throw new Error(`${envName} is set but is not valid JSON`);
  }
}

async function getAppKeysFromSlug(slug: string) {
  const envKeys = getEnvKeysForSlug(slug);
  if (envKeys) return envKeys;
  const app = await prisma.app.findUnique({ where: { slug } });
  return (app?.keys || {}) as Prisma.JsonObject;
}

export default getAppKeysFromSlug;
