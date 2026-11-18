# penster-env

The single env-parsing boundary for every Penster service. One invariant —
**empty string ≡ unset** — implemented once per stack. See [SPEC.md](./SPEC.md)
for the why, [ROLLOUT.md](./ROLLOUT.md) for the per-repo adoption plan.

```
penster-env/
├── (root)  @penster/env     (TypeScript / Node — zod)
└── py/      penster-env       (Python — pydantic-settings 2.1+)
```

## Install (zero registry infra — uses the git auth repos already have)

```bash
# TypeScript
npm i github:penster-ai/penster-env            # + zod (peer)
# Python
pip install "penster-env @ git+https://github.com/penster-ai/penster-env.git#subdirectory=py"
```

Pin to a tag for reproducibility, e.g. `github:penster-ai/penster-env#v0.1.0`
and `...penster-env.git@v0.1.0#subdirectory=py`.

Verified against pydantic-settings 2.1.0, 2.14.2, 2.16.1 and zod 3.24.

---

## TypeScript — `@penster/env`

```ts
import { z } from 'zod';
import { parseEnv, assertRequired } from '@penster/env';

export const env = parseEnv(
  z.object({
    DATABASE_URL: z.string().url(),                 // required -> throws if empty/absent
    PORT: z.coerce.number().default(3000),           // defaulted
    OTP_CHANNEL: z.enum(['sms', 'whatsapp']).default('sms'),
    META_PIXEL_ID: z.string().optional(),            // optional -> undefined if empty/absent
  }),
);

// Optional: fail explicitly on startup secrets even if the schema is lenient.
assertRequired(process.env, ['PAS_JWT_PRIVATE_KEY_B64', 'PAS_INTERNAL_API_KEY']);
```

- `parseEnv(schema, source?)` — coerces `'' → undefined`, then `safeParse`s;
  throws `EnvValidationError` listing every bad/missing key.
- `cleanEnv(source?)` — the coercion alone, if you parse elsewhere.
- `assertRequired(env, keys)` — treats missing/empty/whitespace as absent.

Install (private org registry / workspace link):
`npm i @penster/env` + `zod` (peer).

---

## Python — `penster-env`

**pydantic-settings services** — swap the base class:

```python
from penster_env import PensterBaseSettings

class Settings(PensterBaseSettings):
    database_url: str                 # required -> raises if empty/absent
    otp_channel: str = "sms"          # defaulted
    pixel_id: str | None = None       # optional -> None if empty/absent
```

**raw `os.getenv` call sites** (use while migrating toward a Settings class):

```python
from penster_env import getenv, require

channel = getenv("OTP_CHANNEL", "sms")   # empty ≡ unset
secret  = require("JWT_PRIVATE_KEY")      # raises MissingEnvError if empty/absent
```

Install: `pip install penster-env` (or `pip install -e utils/penster-env/py`).

---

## Develop

```bash
# TS (repo root)
npm install && npm run typecheck && npm test && npm run build
# PY
cd py && pip install -e '.[dev]' && pytest
```

A git pre-commit hook (`.githooks/pre-commit`) runs both when their toolchains
are present. Enable hooks after cloning: `git config core.hooksPath .githooks`.
