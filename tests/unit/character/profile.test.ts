import { describe, expect, it } from 'vitest';
import { characterProfileSchema } from '../../../src/core/character/profile';

const validProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Personnage de test',
  raceId: 'test-race',
  classIds: ['test-class'],
  level: 5,
  gender: 'Femme',
  age: '23 ans',
  affiliations: 'Guilde de test',
  deity: '',
  campaignLabel: 'Campagne de test',
  lore: '',
};

describe('Character profile', () => {
  it('accepts a valid character profile', () => {
    expect(characterProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it('rejects an empty character name', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      name: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a whitespace-only character name', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      name: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid character identifier', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      id: 'invalid-id',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a negative level', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      level: -1,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a fractional level', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      level: 2.5,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a multiclass character', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      classIds: ['test-class', 'second-class'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects more than two classes', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      classIds: ['class-1', 'class-2', 'class-3'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a character without a class', () => {
    const result = characterProfileSchema.safeParse({
      ...validProfile,
      classIds: [],
    });

    expect(result.success).toBe(false);
  });
});

describe('Character profile validation', () => {
  it('rejects an empty race identifier', () => {
    expect(
      characterProfileSchema.safeParse({
        ...validProfile,
        raceId: '',
      }).success,
    ).toBe(false);
  });

  it('rejects an empty class identifier', () => {
    expect(
      characterProfileSchema.safeParse({
        ...validProfile,
        classIds: [''],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown properties', () => {
    expect(
      characterProfileSchema.safeParse({
        ...validProfile,
        unexpectedField: true,
      }).success,
    ).toBe(false);
  });

  it('rejects a level provided as a string', () => {
    expect(
      characterProfileSchema.safeParse({
        ...validProfile,
        level: '5',
      }).success,
    ).toBe(false);
  });

  it('normalizes whitespace in the character name', () => {
    const profile = characterProfileSchema.parse({
      ...validProfile,
      name: '  Nyssara Xalythar  ',
    });

    expect(profile.name).toBe('Nyssara Xalythar');
  });
});
