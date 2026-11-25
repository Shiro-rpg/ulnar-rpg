import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('Project initialization', () => {
  it('accepts a valid value', () => {
    expect(z.string().safeParse('Ulnar').success).toBe(true);
  });

  it('rejects an invalid value', () => {
    expect(z.string().safeParse(42).success).toBe(false);
  });
});
