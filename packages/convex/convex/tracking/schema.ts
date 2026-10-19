import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * tracking/ — bounded context for body and readiness signals.
 *
 * These are time-series observations about the athlete, distinct from the
 * training performed. Tables are append-only by convention: new readings
 * are inserted, never patched, so trends stay honest.
 */
export const bodyweight = defineTable({
  userId: v.id("users"),
  /** ms epoch of the weigh-in. */
  date: v.number(),
  /** ISO calendar date (yyyy-mm-dd) in the user's timezone. */
  dateISO: v.string(),
  kg: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"]);

export const activities = defineTable({
  userId: v.id("users"),
  date: v.number(),
  kind: v.string(),
  minutes: v.number(),
  intensity: v.string(),
  load: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"]);

export const readinessCheckins = defineTable({
  userId: v.id("users"),
  date: v.number(),
  energy: v.number(),
  soreness: v.number(),
  sleep: v.number(),
  prescription: v.string(),
  score: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"]);
