import { query } from "../_generated/server";
import { v } from "convex/values";

/** Application layer (reads) for the tracking context. */

export const getBodyweightSeries = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bodyweight")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("asc")
      .take(args.limit ?? 365);
  },
});

export const getLatestBodyweight = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bodyweight")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});

export const getActivities = query({
  args: {
    userId: v.id("users"),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("activities")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();
    return all.filter(
      (a) =>
        (args.from === undefined || a.date >= args.from) &&
        (args.to === undefined || a.date <= args.to),
    );
  },
});

export const getReadiness = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("readinessCheckins")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 30);
  },
});
