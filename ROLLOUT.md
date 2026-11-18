# Rollout plan — adopting the env standard across penster-ai

Scope = every **deployable service that parses env at boot**. Static sites,
shared libs, type packages and archived repos are out of scope.

Ordered by effort. Do Tier 1 first (proves the pattern), then Tier 2, then the
Tier 3 refactors (each its own ticket). Findings below come from the
2026-11-18 scan of locally-cloned repos; verify in-repo before the PR.

---

## Phase A — publish the libraries

- [x] Distribution decided: **git install, no registry infra** (uses the git auth repos already have).
  - TS: `npm i github:penster-ai/penster-env#v0.1.0` (+ `zod` peer).
  - PY: `pip install "penster-env @ git+https://github.com/penster-ai/penster-env.git@v0.1.0#subdirectory=py"`.
- [ ] Tag `v0.1.0` and cut a GitHub release.
- [ ] Add both to the Phase 2 "service platform contract" section of the hardening roadmap.

## Per-repo adoption recipe (same every time)

1. Add the dep (`@penster-ai/env` + `zod`, or `penster-env`).
2. Route **all** env reads through the one boundary: `parseEnv(schema)` /
   `PensterBaseSettings`. Replace scattered `process.env.X` / `os.getenv("X")`.
3. Delete any ad-hoc empty-string handling (`v === '' ? undefined`, `.strip() or None`, etc.).
4. Mark required vars non-optional (or `assertRequired`/`require`) — never rely on `''` being "present".
5. Make env files declare the **same key set** per env, blank where off (SPEC.md).
6. `typecheck && test` / `pytest` green; deploy to staging first.

---

## Tier 1 — centralized boundary already exists (small: add coercion + verify requireds)

- [x] **account-service** (`src/common/config/env.ts`, zod) — model repo. **Reference adoption PR: penster-ai/account-service.penser.ai#73.** `getEnv` → `parseEnv`, both `z.preprocess` wrappers deleted, `assertStartupAuthConfig` kept. Also fixed a latent boot crash (every other `.url().optional()` var threw on empty). _Still TODO in a follow-up: add the 6 staging keys blank per the earlier env-consistency pass._
- [x] **notifications** (`src/common/config/env.ts`, zod) — **PR penster-ai/notifications.penster.ai#5.** `getEnv` → `parseEnv`. Verified: blank optional/url vars boot clean.
- [x] **x-adgen** → repo is **penster-ai/adgen.penster.ai#7** (dir name ≠ repo name). `Settings` subclasses `PensterBaseSettings`. Verified in-venv: blank env honors defaults.
- [ ] **magnet** (`src/asset_intel/config.py`, pydantic) — ⚠ **BLOCKED: local remote is `bnPenster/magnet.penster.ai` (personal fork), not the org repo.** Confirm the canonical repo before PR.
- [ ] **marketing.crm** (`src/infrastructure/environment.ts`) — ⚠ **BLOCKED: no `origin` remote configured locally.** Add the org remote, then adopt.

## Tier 2 — central boundary exists but leaks raw reads (medium: adopt + sweep stragglers)

- [x] **prompt-mesh** (`src/config/settings.py`, pydantic **2.1.0**) — **PR penster-ai/prompt-mesh.penster.ai#72** (pydantic Settings boundary). Verified in-venv on 2.1.0: blank → default. _Follow-up PR: migrate ~14 raw `os.getenv` across 8 files to `getenv`/`require`._
- [ ] **paid-media-agent** — ⚠ **BLOCKED: local remote is `langchain-ai/paid-media-agent` (template fork), not an org repo.** Confirm canonical repo before PR. Then subclass base + migrate 15 raw `os.getenv`.

## Tier 3 — NO central boundary (large: build the boundary first, then migrate — one ticket each)

- [x] **feedgen** — polyglot monorepo. **TS done: PR penster-ai/feedgen.penster.ai#221** (base staging). The 5 `config.ts` (video-orchestrator, video-renderer + reel-renderer, animated-reels, color-service) each already had a central zod boundary — adopted by wrapping the parse input in `cleanEnv()` (not `parseEnv`, to preserve their bespoke boot-error UX / superRefine / retired-name guards / `.default('')`+`pick()` R2 fallback). Public git-dep `@penster-ai/env`#v0.1.1 in 4 package.json + lockfile; all 4 type-check clean. **Python intentionally a no-op:** `reel-api/config.py` already enforces the invariant (`(env.get(x) or '').strip()` + `_require`); **video-workers is retiring** (per user, 2026-11-18); `vpu/document` is a vendored byte-parity mirror of video-workers (`sync_vendor.py --check`) so it can't be independently edited. No pydantic introduced (would've forced a 13 GB content-hashed base rebuild). _Follow-up (deploy-config, not code): merge `VIDEO_DEVICE_RENDERING_ENABLED=false` into the prod env file._
- [ ] **webgen** — no schema lib, 29 raw `process.env`, no central file. Create `env.ts` (zod) boundary, migrate reads.
- [ ] **crm** — zod present but used for domain schemas, not env; 16 raw `process.env` users. Create a central env boundary.

## Out of scope (verified)

- content-review (0 `process.env` — not a runtime-env service), nowstackit (static HTML),
  penster-utils / shared-ui-components / webgen-shared-types (libs/types), api.feedgen (archived).

## Not yet scanned (remote-only; clone + scan before scheduling)

- tenantApp-pensterAi, admin-dash.feedgen, animated-reels, canvas / video-editor / video-canvas (studio set),
  fit, convert, landing, webgen-api, design-council, hpod (Go — needs a Go recipe: treat `os.Getenv("")` as unset).
