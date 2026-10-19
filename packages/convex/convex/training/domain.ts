/**
 * training/domain.ts — the domain layer. Pure functions only: no ctx, no db,
 * no Date.now(). Queries/mutations in this context call into here so the
 * training rules live in exactly one place and stay unit-testable.
 *
 * Ported from the web client's lib/ (onerm.js, effort.js, progression.js);
 * signatures are adapted from "whole client state S" to plain inputs.
 */

// ---------------------------------------------------------------------------
// 1RM estimation (from lib/onerm.js)
// ---------------------------------------------------------------------------

/** Above this many reps an estimate says more about work capacity than strength. */
export const REP_CAP = 12;

type Formula = (w: number, r: number) => number;

export const FORMULAS: Record<string, Formula> = {
  /** Epley 1985 — w · (1 + r/30). Default: the one most lifters have seen. */
  epley: (w, r) => w * (1 + r / 30),
  /** Brzycki 1993 — w · 36/(37 − r). */
  brzycki: (w, r) => (w * 36) / (37 - r),
  /** Lombardi 1989 — w · r^0.10. */
  lombardi: (w, r) => w * Math.pow(r, 0.1),
};
export const DEFAULT_FORMULA = "epley";

/**
 * Estimate a 1RM from one set. Returns null for anything it cannot honestly
 * answer: missing/zero/negative load, no reps, non-finite input, or more
 * reps than REP_CAP. A single rep is the measurement, not an estimate.
 */
export function estimate1RM(
  w: number | null | undefined,
  r: number | null | undefined,
  formula: string = DEFAULT_FORMULA,
): number | null {
  const weight = Number(w);
  const reps = Number(r);
  if (!isFinite(weight) || !isFinite(reps)) return null;
  if (weight <= 0 || reps < 1) return null;
  if (reps > REP_CAP) return null;
  const fn = FORMULAS[formula] ?? FORMULAS[DEFAULT_FORMULA];
  const est = reps === 1 ? weight : fn(weight, Math.round(reps));
  if (!isFinite(est) || est <= 0) return null;
  return Math.round(est * 10) / 10;
}

export interface RepsSet {
  kind: "reps";
  w: number;
  r: number;
  done: boolean;
}

/** Best estimate out of one workout entry's completed sets. */
export function bestSetOf(
  sets: RepsSet[],
  formula: string = DEFAULT_FORMULA,
): { est: number; w: number; r: number } | null {
  let best: { est: number; w: number; r: number } | null = null;
  for (const s of sets) {
    if (!s.done || s.kind !== "reps") continue;
    const est = estimate1RM(s.w, s.r, formula);
    if (est !== null && (!best || est > best.est)) {
      best = { est, w: Number(s.w), r: Math.round(Number(s.r)) };
    }
  }
  return best;
}

export interface E1rmPoint {
  t: number;
  dateISO: string;
  y: number;
  w: number;
  r: number;
}

/**
 * One point per workout in which the exercise produced an estimate —
 * feeds the trend chart. Input is already chronological.
 */
export function e1rmSeries(
  entries: { startedAt: number; dateISO: string; sets: RepsSet[] }[],
  formula: string = DEFAULT_FORMULA,
): E1rmPoint[] {
  const pts: E1rmPoint[] = [];
  for (const e of entries) {
    const best = bestSetOf(e.sets, formula);
    if (best) pts.push({ t: e.startedAt, dateISO: e.dateISO, y: best.est, w: best.w, r: best.r });
  }
  return pts;
}

/** All-time best estimate for an exercise, with the set and date it came from. */
export function best1RM(
  entries: { startedAt: number; dateISO: string; sets: RepsSet[] }[],
  formula: string = DEFAULT_FORMULA,
): (E1rmPoint & { est: number }) | null {
  let best: (E1rmPoint & { est: number }) | null = null;
  for (const p of e1rmSeries(entries, formula)) {
    if (!best || p.y > best.est) best = { ...p, est: p.y };
  }
  return best;
}

/**
 * Did this entry beat every estimate before it? Compare against history that
 * does NOT yet contain the entry (used for the finish summary).
 */
export function is1RMRecord(
  priorEntries: { startedAt: number; dateISO: string; sets: RepsSet[] }[],
  entrySets: RepsSet[],
  formula: string = DEFAULT_FORMULA,
): ({ est: number; w: number; r: number; prev: number } | null) {
  const now = bestSetOf(entrySets, formula);
  if (!now) return null;
  const prev = best1RM(priorEntries, formula);
  return !prev || now.est > prev.est ? { ...now, prev: prev ? prev.est : 0 } : null;
}

// ---------------------------------------------------------------------------
// Effort as a statistic (from lib/effort.js)
// ---------------------------------------------------------------------------

/**
 * One internal scale, both display scales. Everything aggregates in RIR and is
 * converted back for display — RIR has a real zero (failure) where RPE's
 * floor of 6 is only convention. RPE 8 == RIR 2.
 */
export const HARD_RIR = 3;
/** Below this many rated sets an average is noise — callers show a dash. */
export const MIN_RATED = 5;

export interface RatedSet {
  rir?: number | null;
  rpe?: number | null;
}

/** A set's effort in RIR, or null when never rated. 0 is a rating, not "empty". */
export function rirOf(s: RatedSet | null | undefined): number | null {
  if (!s) return null;
  if (s.rir != null) return s.rir;
  if (s.rpe != null) return 10 - s.rpe;
  return null;
}

/** RIR → the scale being displayed. The reverse of rirOf, for one number. */
export function toScale(kind: "rir" | "rpe", rir: number | null): number | null {
  if (rir == null) return null;
  return Math.round((kind === "rpe" ? 10 - rir : rir) * 10) / 10;
}

export function avgRir(sets: RatedSet[]): number | null {
  const vs = sets.map(rirOf).filter((v): v is number => v != null);
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
}

export interface EffortSummary {
  done: number;
  rated: number;
  hard: number;
  avg: number | null;
  hardPct: number | null;
}

/**
 * Headline numbers: how hard, how much of it was hard, and — keeping the rest
 * honest — how much of the training was rated at all.
 */
export function effortSummary(sets: RatedSet[]): EffortSummary {
  let done = 0,
    rated = 0,
    sum = 0,
    hard = 0;
  for (const s of sets) {
    done++;
    const r = rirOf(s);
    if (r == null) continue;
    rated++;
    sum += r;
    if (r <= HARD_RIR) hard++;
  }
  return {
    done,
    rated,
    hard,
    avg: rated >= MIN_RATED ? sum / rated : null,
    hardPct: rated >= MIN_RATED ? hard / rated : null,
  };
}

/** A set that counts as hard — the filter behind the muscle map's hard-sets mode. */
export function isHardSet(s: RatedSet): boolean {
  const r = rirOf(s);
  return r != null && r <= HARD_RIR;
}

// ---------------------------------------------------------------------------
// Progression policies (from lib/progression.js)
// ---------------------------------------------------------------------------

export const POLICIES = ["off", "linear", "greyskull", "double", "time"] as const;
export type Policy = (typeof POLICIES)[number];

/** Sessions of consecutive misses before a deload, per policy. */
export const DELOAD_AFTER: Record<Exclude<Policy, "off">, number> = {
  linear: 3,
  greyskull: 1,
  double: 3,
  time: 3,
};

const DELOAD_FACTOR = 0.9;
/** Body parts where a 5 kg jump is normal rather than brutal. */
const HEAVY_BODY_PARTS = ["upper legs", "lower legs", "back", "hips", "glutes"];

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Default load step. Lower-body lifts take the bigger jump. The web client
 * derives heaviness from the exercise catalogue; here the caller passes it in
 * so this package never depends on apps/web assets.
 */
export function defaultIncrement(unit: "kg" | "lb", isHeavyBodyPart: boolean): number {
  if (unit === "lb") return isHeavyBodyPart ? 10 : 5;
  return isHeavyBodyPart ? 5 : 2.5;
}

/** Snap to a loadable multiple of the step. */
export function snapToStep(v: number, step: number): number {
  if (!(step > 0)) return round1(v);
  return round1((Math.round(v / step) * step));
}

/**
 * Back off by DELOAD_FACTOR, landing on something loadable. A deload that did
 * not actually reduce anything takes one step down instead; never below a step.
 */
export function deloadTo(current: number, step: number): number {
  let next = snapToStep(current * DELOAD_FACTOR, step);
  if (next >= current) next = snapToStep(current - step, step);
  return Math.max(step, next);
}

/** How many sessions in a row ended in a miss, counting back from the most recent. */
export function stallCount(sessions: { ok: boolean }[]): number {
  let n = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].ok) break;
    n++;
  }
  return n;
}

/** Whether heaviness lookup matches the client's catalogue rule. Kept here for tests. */
export function isHeavyBodyPart(bodyPart: string): boolean {
  return HEAVY_BODY_PARTS.includes(bodyPart);
}
