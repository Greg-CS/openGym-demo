import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Application layer (writes) for the tracking context.
 *
 * All three tables are append-only by convention: new readings are
 * inserted, never patched, so trends stay honest.
 */

export const logBodyweight = mutation({
  args: {
    userId: v.id("users"),
    date: v.number(),
    dateISO: v.string(),
    kg: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bodyweight", {
      userId: args.userId,
      date: args.date,
      dateISO: args.dateISO,
      kg: args.kg,
    });
  },
});

export const logActivity = mutation({
  args: {
    userId: v.id("users"),
    date: v.number(),
    kind: v.string(),
    minutes: v.number(),
    intensity: v.string(),
    load: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      userId: args.userId,
      date: args.date,
      kind: args.kind,
      minutes: args.minutes,
      intensity: args.intensity,
      load: args.load,
    });
  },
});

export const logReadiness = mutation({
  args: {
    userId: v.id("users"),
    date: v.number(),
    energy: v.number(),
    soreness: v.number(),
    sleep: v.number(),
    prescription: v.string(),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("readinessCheckins", {
      userId: args.userId,
      date: args.date,
      energy: args.energy,
      soreness: args.soreness,
      sleep: args.sleep,
      prescription: args.prescription,
      score: args.score,
    });
  },
});
