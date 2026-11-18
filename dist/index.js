// src/index.ts
function cleanEnv(source = process.env) {
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = value === "" ? void 0 : value;
  }
  return out;
}
var EnvValidationError = class extends Error {
  constructor(issues) {
    super(`[penster-env] Invalid environment configuration: ${issues.join("; ")}`);
    this.issues = issues;
    this.name = "EnvValidationError";
  }
};
function parseEnv(schema, source = process.env) {
  const parsed = schema.safeParse(cleanEnv(source));
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
    );
    throw new EnvValidationError(issues);
  }
  return parsed.data;
}
function assertRequired(env, keys) {
  const missing = keys.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error(`[penster-env] Missing required env: ${missing.join(", ")}`);
  }
}
export {
  EnvValidationError,
  assertRequired,
  cleanEnv,
  parseEnv
};
