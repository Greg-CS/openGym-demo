import { mutation } from "../_generated/server";
import { v } from "convex/values";
import {
  setMode,
  performedSet,
  plannedSet,
  progressionPolicy,
} from "../shared/validators";

/** Application layer (writes) for the training context. */

const routineExerciseInput = v.object({
  exerciseId: v.string(),
  mode: setMode,
  sets: v.array(plannedSet),
  targetReps: v.optional(v.number()),
  targetSec: v.optional(v.number()),
  restSec: v.number(),
  notes: v.string(),
  policy: v.optional(progressionPolicy),
});

/** Upsert a routine — one routine per name per user; same call creates or replaces. */
export const saveRoutine = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    days: v.array(
      v.object({
        day: v.number(),
        title: v.string(),
        exercises: v.array(routineExerciseInput),
      }),
    ),
    defaultPolicy: v.optional(progressionPolicy),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        days: args.days,
        defaultPolicy: args.defaultPolicy,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("routines", {
      userId: args.userId,
      name: args.name,
      days: args.days,
      defaultPolicy: args.defaultPolicy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteRoutine = mutation({
  args: { routineId: v.id("routines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.routineId);
    return null;
  },
});

/** Log a finished workout session with all its entries and sets. */
export const logWorkout = mutation({
  args: {
    userId: v.id("users"),
    startedAt: v.number(),
    dateISO: v.string(),
    name: v.optional(v.string()),
    entries: v.array(
      v.object({
        exerciseId: v.string(),
        mode: setMode,
        sets: v.array(performedSet),
        topW: v.optional(v.number()),
        notes: v.string(),
      }),
    ),
    durationSec: v.optional(v.number()),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workouts", {
      userId: args.userId,
      startedAt: args.startedAt,
      dateISO: args.dateISO,
      name: args.name,
      entries: args.entries,
      durationSec: args.durationSec,
      notes: args.notes,
    });
  },
});

export const deleteWorkout = mutation({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.workoutId);
    return null;
  },
});

/** Register a user-created exercise (the built-in catalogue stays in apps/web). */
export const addCustomExercise = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    bodyPart: v.string(),
    equipment: v.string(),
    defaultMode: setMode,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("exercises", {
      userId: args.userId,
      name: args.name,
      bodyPart: args.bodyPart,
      equipment: args.equipment,
      defaultMode: args.defaultMode,
      createdAt: Date.now(),
    });
  },
});
