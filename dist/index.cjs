"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  EnvValidationError: () => EnvValidationError,
  assertRequired: () => assertRequired,
  cleanEnv: () => cleanEnv,
  parseEnv: () => parseEnv
});
module.exports = __toCommonJS(index_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EnvValidationError,
  assertRequired,
  cleanEnv,
  parseEnv
});
