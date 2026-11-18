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

1. Add the dep (`@penster/env` + `zod`, or `penster-env`).
2. Route **all** env reads through the one boundary: `parseEnv(schema)` /
   `PensterBaseSettings`. Replace scattered `process.env.X` / `os.getenv("X")`.
3. Delete any ad-hoc empty-string handling (`v === '' ? undefined`, `.strip() or None`, etc.).
4. Mark required vars non-optional (or `assertRequired`/`require`) — never rely on `''` being "present".
5. Make env files declare the **same key set** per env, blank where off (SPEC.md).
6. `typecheck && test` / `pytest` green; deploy to staging first.

---

## Tier 1 — centralized boundary already exists (small: add coercion + verify requireds)

- [ ] **account-service** (`src/common/config/env.ts`, zod) — model repo. Add `parseEnv`, **delete its 2 ad-hoc `z.preprocess('' → undefined)` wrappers** (PAS_STRIPE_API_BASE_URL, PAS_PUBLIC_BASE_URL). Keep `assertStartupAuthConfig` (already empty-safe). Also: add the 6 staging keys blank per the earlier env-consistency pass.
- [ ] **notifications** (`src/common/config/env.ts`, zod) — cleanest; 0 ad-hoc hacks, 4 `process.env` users. Straight swap to `parseEnv`.
- [ ] **magnet** (`src/asset_intel/config.py`, pydantic) — subclass `PensterBaseSettings`; no raw `os.getenv` to sweep.
- [ ] **x-adgen** (`adgen/settings.py`, pydantic 2.14) — subclass `PensterBaseSettings`; 1 raw getenv file to fold in.
- [ ] **marketing.crm** (`src/infrastructure/environment.ts`) — verify it's the sole boundary, route through `parseEnv`, confirm requireds are non-optional.

## Tier 2 — central boundary exists but leaks raw reads (medium: adopt + sweep stragglers)

- [ ] **prompt-mesh** (`src/config/settings.py`, pydantic 2.1.0) — subclass `PensterBaseSettings` **and** migrate 14 raw `os.getenv` across 8 files to `getenv`/`require`; drop ~143 ad-hoc empty checks as they're superseded.
- [ ] **paid-media-agent** (`src/paid_media_agent/config.py`, pydantic 2.16) — subclass base + migrate 15 raw `os.getenv` across 9 files.

## Tier 3 — NO central boundary (large: build the boundary first, then migrate — one ticket each)

- [ ] **feedgen** — polyglot monorepo, fully decentralized: **147 `process.env`** (per-package `config.ts` ×5: video-orchestrator, video-renderer, color-service, animated-reels, reel-renderer) **+ 168 raw `os.getenv`** across 51 py files (video-workers, reel-api, vpu…), 0 pydantic. Plan: one `env.ts` per TS package + one `PensterBaseSettings` per py package, then point reads at them. Biggest item. **+ merge `VIDEO_DEVICE_RENDERING_ENABLED=false` into prod while here.**
- [ ] **webgen** — no schema lib, 29 raw `process.env`, no central file. Create `env.ts` (zod) boundary, migrate reads.
- [ ] **crm** — zod present but used for domain schemas, not env; 16 raw `process.env` users. Create a central env boundary.

## Out of scope (verified)

- content-review (0 `process.env` — not a runtime-env service), nowstackit (static HTML),
  penster-utils / shared-ui-components / webgen-shared-types (libs/types), api.feedgen (archived).

## Not yet scanned (remote-only; clone + scan before scheduling)

- tenantApp-pensterAi, admin-dash.feedgen, animated-reels, canvas / video-editor / video-canvas (studio set),
  fit, convert, landing, webgen-api, design-council, hpod (Go — needs a Go recipe: treat `os.Getenv("")` as unset).
