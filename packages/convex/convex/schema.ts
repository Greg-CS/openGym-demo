import { defineSchema } from "convex/server";
import { users } from "./identity/schema";
import { routines, workouts, exercises } from "./training/schema";
import { bodyweight, activities, readinessCheckins } from "./tracking/schema";

/**
 * Root schema — composes the bounded contexts. Each context owns its tables
 * (see its schema.ts); this file only wires them together so the aggregate
 * boundaries stay visible in one place.
 *
 * Bounded contexts:
 * - identity  → who is training (users + preferences). Aggregate root: users.
 * - training  → what was planned and performed (routines, workouts, exercises).
 * - tracking  → body and readiness signals (bodyweight, activities, readinessCheckins).
 *
 * Auth decision (A): identity is issued by apps/api (passkey server).
 * users.passkeyUserId is the stable id from registration — Convex trusts it
 * and never mints identities itself.
 */
export default defineSchema({
  users,
  routines,
  workouts,
  exercises,
  bodyweight,
  activities,
  readinessCheckins,
});
