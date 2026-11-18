import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { cleanEnv, parseEnv, assertRequired, EnvValidationError } from './index';

describe('cleanEnv', () => {
  it('maps empty string to undefined and leaves others intact', () => {
    expect(cleanEnv({ A: '', B: 'x', C: ' ' })).toEqual({ A: undefined, B: 'x', C: ' ' });
  });
});

describe('parseEnv — the four combinations', () => {
  it('optional: empty behaves as unset', () => {
    const env = parseEnv(z.object({ FLAG: z.string().optional() }), { FLAG: '' });
    expect(env.FLAG).toBeUndefined();
  });

  it('default: empty falls back to the default', () => {
    const env = parseEnv(z.object({ PORT: z.coerce.number().default(3000) }), { PORT: '' });
    expect(env.PORT).toBe(3000);
  });

  it('enum+default: empty does not crash, default applies', () => {
    const schema = z.object({ CH: z.enum(['sms', 'whatsapp']).default('sms') });
    expect(parseEnv(schema, { CH: '' }).CH).toBe('sms');
    expect(parseEnv(schema, {}).CH).toBe('sms');
    expect(parseEnv(schema, { CH: 'whatsapp' }).CH).toBe('whatsapp');
  });

  it('required: empty fails loudly', () => {
    const schema = z.object({ SECRET: z.string().min(1) });
    expect(() => parseEnv(schema, { SECRET: '' })).toThrow(EnvValidationError);
    expect(() => parseEnv(schema, {})).toThrow(EnvValidationError);
    expect(parseEnv(schema, { SECRET: 'abc' }).SECRET).toBe('abc');
  });
});

describe('assertRequired', () => {
  it('rejects missing, empty, and whitespace-only', () => {
    expect(() => assertRequired({ A: 'ok', B: '' }, ['A', 'B'])).toThrow(/Missing required env: B/);
    expect(() => assertRequired({ A: '   ' }, ['A'])).toThrow(/A/);
    expect(() => assertRequired({ A: 'ok' }, ['A'])).not.toThrow();
  });
});
