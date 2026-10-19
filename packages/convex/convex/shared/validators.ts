import { v } from "convex/values";

/**
 * shared/ — ubiquitous-language value objects used across bounded contexts.
 *
 * These are the small types every context agrees on. They carry no identity
 * of their own (DDD value objects): a set performed in a workout is the same
 * set no matter which aggregate references it.
 */

export const unitSystem = v.union(v.literal("kg"), v.literal("lb"));

/** Which effort scale a profile logs with. null = never chose (falls back per-profile). */
export const effortScale = v.union(v.literal("rir"), v.literal("rpe"), v.null());

/**
 * How an exercise is performed (ported from the web client's modeOf):
 * - reps:   weight × reps,   sets look like { w, r }
 * - time:   a work duration, sets look like { sec, w } (w = added weight, 0 = bodyweight)
 * - cardio: duration + speed, sets look like { min, speed }
 */
export const setMode = v.union(
  v.literal("reps"),
  v.literal("time"),
  v.literal("cardio"),
);

/**
 * One performed set. `done` marks completion; `rir`/`rpe` are never rewritten —
 * switching the display scale changes what new sets ask for, nothing else.
 * Exactly one of rir/rpe is expected per rated set.
 */
export const performedSet = v.union(
  v.object({
    kind: v.literal("reps"),
    w: v.number(),
    r: v.number(),
    done: v.boolean(),
    rir: v.optional(v.number()),
    rpe: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("time"),
    sec: v.number(),
    w: v.number(),
    done: v.boolean(),
    rir: v.optional(v.number()),
    rpe: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("cardio"),
    min: v.number(),
    speed: v.number(),
    done: v.boolean(),
    rir: v.optional(v.number()),
    rpe: v.optional(v.number()),
  }),
);

/** A planned set inside a routine (no `done`, no effort ratings yet). */
export const plannedSet = v.union(
  v.object({ kind: v.literal("reps"), w: v.number(), r: v.number() }),
  v.object({ kind: v.literal("time"), sec: v.number(), w: v.number() }),
  v.object({ kind: v.literal("cardio"), min: v.number(), speed: v.number() }),
);

/** Progression policy driving load suggestions (see training/domain.ts). */
export const progressionPolicy = v.union(
  v.literal("off"),
  v.literal("linear"),
  v.literal("greyskull"),
  v.literal("double"),
  v.literal("time"),
);
