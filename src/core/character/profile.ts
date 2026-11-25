import { z } from 'zod';

export const characterProfileSchema = z.strictObject({
  id: z.uuid(),

  name: z.string().trim().min(1),

  raceId: z.string().trim().min(1),

  classIds: z.array(z.string().trim().min(1)).min(1).max(2),

  level: z.int().nonnegative(),

  gender: z.string(),

  age: z.string(),

  affiliations: z.string(),

  deity: z.string(),

  campaignLabel: z.string(),

  lore: z.string(),
});

export type CharacterProfile = z.infer<typeof characterProfileSchema>;
