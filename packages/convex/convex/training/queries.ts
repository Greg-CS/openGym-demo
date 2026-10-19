import { query } from "../_generated/server";
import { v } from "convex/values";
import { best1RM, e1rmSeries, type RepsSet } from "./domain";

/** Application layer (reads) for the training context. */

export const getRoutines = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getRoutine = query({
  args: { routineId: v.id("routines") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.routineId);
  },
});

export const getWorkouts = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getWorkout = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workoutId);
  },
});

export const getCustomExercises = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Per-exercise best-set series for the trend chart, derived via the domain
 * layer — the query fetches, domain.ts computes.
 */
export const getProgression = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const byExercise = new Map<string, { startedAt: number; dateISO: string; sets: RepsSet[] }[]>();
    for (const w of workouts) {
      for (const e of w.entries) {
        const sets = e.sets.filter((s) => s.kind === "reps") as RepsSet[];
        if (!sets.some((s) => s.done)) continue;
        const list = byExercise.get(e.exerciseId) ?? [];
        list.push({ startedAt: w.startedAt, dateISO: w.dateISO, sets });
        byExercise.set(e.exerciseId, list);
      }
    }

    return [...byExercise.entries()]
      .map(([exerciseId, entries]) => ({
        exerciseId,
        entries: e1rmSeries(entries.sort((a, b) => a.startedAt - b.startedAt)),
      }))
      .filter((e) => e.entries.length > 1);
  },
});

/** All-time best estimated 1RM per exercise, with the set and date behind it. */
export const getPRs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const byExercise = new Map<string, { startedAt: number; dateISO: string; sets: RepsSet[] }[]>();
    for (const w of workouts) {
      for (const e of w.entries) {
        const sets = e.sets.filter((s) => s.kind === "reps") as RepsSet[];
        const list = byExercise.get(e.exerciseId) ?? [];
        list.push({ startedAt: w.startedAt, dateISO: w.dateISO, sets });
        byExercise.set(e.exerciseId, list);
      }
    }

    return [...byExercise.entries()]
      .map(([exerciseId, entries]) => ({ exerciseId, best: best1RM(entries) }))
      .filter((e) => e.best !== null)
      .sort((a, b) => (b.best?.est ?? 0) - (a.best?.est ?? 0));
  },
});
