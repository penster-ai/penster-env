/**
 * @penster/env — the one env-parsing boundary every Penster TS service uses.
 *
 * The single invariant (see ../SPEC.md):
 *   empty string ≡ unset.
 *
 * Coerce `'' -> undefined` BEFORE validation, then let the schema decide.
 * This makes every combination behave correctly without per-variable reasoning:
 *   - .optional()            empty -> undefined -> passes (feature off)
 *   - .default(x)            empty -> undefined -> default applies
 *   - z.enum([...]).default  empty -> undefined -> default applies (no crash)
 *   - required (no default)  empty -> undefined -> fails loudly
 *
 * Required-ness is enforced by the schema (non-optional) and/or `assertRequired`
 * — never by trusting that `''` counts as "present". An empty value can satisfy
 * an optional var; it can never silence a required one.
 */

import type { z } from 'zod';

export type EnvSource = Record<string, string | undefined>;

/**
 * Return a shallow copy of `source` with every empty-string value replaced by
 * `undefined`. This is the whole standard in one function.
 */
export function cleanEnv(source: EnvSource = process.env): EnvSource {
  const out: EnvSource = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = value === '' ? undefined : value;
  }
  return out;
}

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`[penster-env] Invalid environment configuration: ${issues.join('; ')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Parse `source` through a zod schema after empty-string coercion.
 * Throws `EnvValidationError` (listing every bad/missing key) on failure.
 *
 *   const env = parseEnv(z.object({ PORT: z.coerce.number().default(3000), ... }));
 */
export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: EnvSource = process.env,
): z.infer<T> {
  const parsed = schema.safeParse(cleanEnv(source));
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new EnvValidationError(issues);
  }
  return parsed.data;
}

/**
 * Enforce a set of required keys independently of the schema. Treats missing,
 * empty, and whitespace-only as absent. Use for startup secrets you want to
 * fail on explicitly even if the schema marks them optional.
 */
export function assertRequired(env: Record<string, unknown>, keys: readonly string[]): void {
  const missing = keys.filter((key) => {
    const value = env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error(`[penster-env] Missing required env: ${missing.join(', ')}`);
  }
}
