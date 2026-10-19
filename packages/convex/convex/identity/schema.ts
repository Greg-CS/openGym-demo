import { defineTable } from "convex/server";
import { v } from "convex/values";
import { unitSystem, effortScale } from "../shared/validators";

/**
 * identity/ — bounded context for "who is training".
 *
 * Aggregate root: users. Everything else in the system references a user by
 * id; nothing here reaches into training or tracking.
 *
 * Auth (decision A): the passkey server in apps/api remains the identity
 * provider. passkeyUserId is the stable id minted at registration — the
 * value the old db.json stored as users[].id. Convex never creates
 * identities on its own; getOrCreateUser is the single seam where a
 * passkey-authenticated session becomes a domain user.
 */
export const users = defineTable({
  passkeyUserId: v.string(),
  email: v.optional(v.string()),
  name: v.string(),
  preferences: v.object({
    unit: unitSystem,
    restSec: v.number(),
    lang: v.string(),
    theme: v.string(),
    accent: v.string(),
    /** Which per-set effort scale is logged — 'rir' | 'rpe'. null = never chose. */
    effort: effortScale,
    targetW: v.optional(v.number()),
  }),
  createdAt: v.number(),
}).index("by_passkey_id", ["passkeyUserId"]);
