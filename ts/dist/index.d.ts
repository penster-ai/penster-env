import { z } from 'zod';

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

type EnvSource = Record<string, string | undefined>;
/**
 * Return a shallow copy of `source` with every empty-string value replaced by
 * `undefined`. This is the whole standard in one function.
 */
declare function cleanEnv(source?: EnvSource): EnvSource;
declare class EnvValidationError extends Error {
    readonly issues: string[];
    constructor(issues: string[]);
}
/**
 * Parse `source` through a zod schema after empty-string coercion.
 * Throws `EnvValidationError` (listing every bad/missing key) on failure.
 *
 *   const env = parseEnv(z.object({ PORT: z.coerce.number().default(3000), ... }));
 */
declare function parseEnv<T extends z.ZodTypeAny>(schema: T, source?: EnvSource): z.infer<T>;
/**
 * Enforce a set of required keys independently of the schema. Treats missing,
 * empty, and whitespace-only as absent. Use for startup secrets you want to
 * fail on explicitly even if the schema marks them optional.
 */
declare function assertRequired(env: Record<string, unknown>, keys: readonly string[]): void;

export { type EnvSource, EnvValidationError, assertRequired, cleanEnv, parseEnv };
