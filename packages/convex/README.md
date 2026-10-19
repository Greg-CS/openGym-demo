# @opengym/convex

The openGym database, reimplemented on Convex. Ported from the
`workout-tracker` repo's Convex backend and merged with openGym's richer
client-side model (set modes, RIR/RPE effort, bodyweight log, custom exercises).

## Layout — domain-driven design

```
convex/
  schema.ts            # composes the bounded contexts (no tables defined here)
  shared/
    validators.ts      # ubiquitous-language value objects (sets, modes, scales)
  identity/            # bounded context: who is training
    schema.ts          # users (aggregate root)
    queries.ts         # reads
    mutations.ts       # getOrCreateUser — the seam with apps/api (passkeys)
  training/            # bounded context: what was planned and performed
    schema.ts          # routines, workouts, exercises (custom)
    domain.ts          # PURE domain logic — no ctx, no db. Unit-testable.
    queries.ts         # reads (fetch here, compute in domain.ts)
    mutations.ts       # writes
  tracking/            # bounded context: body & readiness signals
    schema.ts          # bodyweight, activities, readinessCheckins (append-only)
    queries.ts
    mutations.ts
```

Rules:

- **One bounded context per folder.** A context owns its tables and never
  queries another context's tables directly — cross-context needs go through
  the application layer (queries/mutations), keyed by user id.
- **domain.ts is pure.** 1RM estimation, effort statistics and progression
  policies take plain data and return plain data. If it needs `ctx`, it does
  not belong there.
- **Value objects in shared/.** A performed set is the same set everywhere;
  the discriminated `performedSet` union is the single definition.
- **Aggregates are user-rooted.** routines, workouts, exercises, bodyweight,
  activities and readinessCheckins all carry `userId` + a `by_user*` index.

## Auth

Decision A: `apps/api` (passkey/WebAuthn server) stays the identity provider.
`identity.getOrCreateUser` maps a passkey-authenticated `passkeyUserId` to a
Convex user id — the only place identities enter the system.

## Run

```bash
# from the repo root
npm run convex:dev     # starts `convex dev` in packages/convex
```

First run generates `convex/_generated/` (not committed) and prompts for a
Convex project. Point `apps/web` at the generated API when wiring the client
(phase 2).
