import { query } from "../_generated/server";
import { v } from "convex/values";

/** Application layer (reads) for the identity context. */

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserByPasskeyId = query({
  args: { passkeyUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_passkey_id", (q) => q.eq("passkeyUserId", args.passkeyUserId))
      .first();
  },
});
