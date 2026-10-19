import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  setMode,
  performedSet,
  plannedSet,
  progressionPolicy,
} from "../shared/validators";

/**
 * training/ — bounded context for "what was planned and performed".
 *
 * Aggregates (each is its own consistency boundary, rooted at a user):
 * - routines  — a named plan: days, each with exercise prescriptions.
 * - workouts  — a performed session: dated entries of completed sets.
 * - exercises — user-created (custom) exercises. The built-in catalogue
 *               (EXDB) stays a static asset in apps/web; only customs
 *               need identity and therefore live here.
 *
 * The set shapes mirror the web client's modes exactly (reps/time/cardio),
 * so existing plans, workouts and backup files read unchanged.
 */

const routineExercise = v.object({
  exerciseId: v.string(),
  mode: setMode,
  sets: v.array(plannedSet),
  targetReps: v.optional(v.number()),
  targetSec: v.optional(v.number()),
  restSec: v.number(),
  notes: v.string(),
  /** Progression policy override for this exercise (else the routine default). */
  policy: v.optional(progressionPolicy),
});

export const routines = defineTable({
  userId: v.id("users"),
  name: v.string(),
  days: v.array(
    v.object({
      day: v.number(),
      title: v.string(),
      exercises: v.array(routineExercise),
    }),
  ),
  /** Default progression policy for exercises without their own override. */
  defaultPolicy: v.optional(progressionPolicy),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"]);

export const workouts = defineTable({
  userId: v.id("users"),
  /** ms epoch — start of the session. */
  startedAt: v.number(),
  /** ISO calendar date (yyyy-mm-dd) in the user's timezone. */
  dateISO: v.string(),
  name: v.optional(v.string()),
  entries: v.array(
    v.object({
      exerciseId: v.string(),
      mode: setMode,
      sets: v.array(performedSet),
      /** Working weight confirmed after the exercise (no rep count — never used for 1RM). */
      topW: v.optional(v.number()),
      notes: v.string(),
    }),
  ),
  durationSec: v.optional(v.number()),
  notes: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "startedAt"]);

export const exercises = defineTable({
  userId: v.id("users"),
  name: v.string(),
  bodyPart: v.string(),
  equipment: v.string(),
  defaultMode: setMode,
  createdAt: v.number(),
}).index("by_user", ["userId"]);
