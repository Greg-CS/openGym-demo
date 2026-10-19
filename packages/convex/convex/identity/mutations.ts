import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { unitSystem, effortScale } from "../shared/validators";

/**
 * Application layer (writes) for the identity context.
 *
 * getOrCreateUser is the seam with apps/api: call it once per
 * passkey-authenticated session. Everything downstream keys off the
 * returned Convex user id.
 */

const preferencesValidator = v.object({
  unit: unitSystem,
  restSec: v.number(),
  lang: v.string(),
  theme: v.string(),
  accent: v.string(),
  effort: effortScale,
  targetW: v.optional(v.number()),
});

export const getOrCreateUser = mutation({
  args: {
    passkeyUserId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_passkey_id", (q) => q.eq("passkeyUserId", args.passkeyUserId))
      .first();
    if (existing) {
      const patch: { name?: string; email?: string } = {};
      if (existing.name !== args.name) patch.name = args.name;
      if (args.email !== undefined && existing.email !== args.email) patch.email = args.email;
      if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("users", {
      passkeyUserId: args.passkeyUserId,
      name: args.name,
      email: args.email,
      preferences: {
        unit: "kg",
        restSec: 90,
        lang: "en",
        theme: "dark",
        accent: "lime",
        effort: null,
      },
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: { name?: string; email?: string } = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.email !== undefined) patch.email = args.email;
    if (Object.keys(patch).length > 0) await ctx.db.patch(args.userId, patch);
    return args.userId;
  },
});

export const updatePreferences = mutation({
  args: { userId: v.id("users"), preferences: preferencesValidator },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { preferences: args.preferences });
    return args.userId;
  },
});
