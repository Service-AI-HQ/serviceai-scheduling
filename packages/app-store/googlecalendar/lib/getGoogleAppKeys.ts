import { z } from "zod";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const googleAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uris: z.array(z.string()),
});

export const getGoogleAppKeys = async () => {
  // Prefer env-provided credentials so per-instance deploys don't need the
  // secret seeded into the App table.
  if (process.env.GOOGLE_API_CREDENTIALS) {
    const { web } = JSON.parse(process.env.GOOGLE_API_CREDENTIALS) as { web: unknown };
    return googleAppKeysSchema.parse(web);
  }
  return getParsedAppKeysFromSlug("google-calendar", googleAppKeysSchema);
};
