import blankSheet from '../../data/catalog/blank-sheet-v1.json';

export const OFFICIAL_RULES_VERSION = 'blank-sheet-v1' as const;
export type RulesVersion = typeof OFFICIAL_RULES_VERSION;

export const ATTRIBUTE_KEYS = [
  'physique',
  'social',
  'mental',
  'volonte',
  'force',
  'finesse',
  'charisme',
  'empathie',
  'savoir',
  'instinct',
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export interface RaceDefinition {
  readonly id: string;
  readonly name: string;
  readonly basePv: number;
  readonly basePp: number;
  readonly modifiers: Readonly<Record<AttributeKey, number | null>>;
  readonly sourceRange?: string;
}
export interface ClassDefinition {
  readonly id: string;
  readonly name: string;
  readonly sourceRange?: string;
}
export interface ProfessionDefinition {
  readonly id: string;
  readonly name: string;
  readonly skills: readonly { readonly tier: number; readonly description: string | null }[];
  readonly sourceRange?: string;
}
export interface RuleCatalog {
  readonly rulesVersion: string;
  readonly sourceWorkbook: string;
  readonly sourceSheet: string;
  readonly races: readonly RaceDefinition[];
  readonly classes: readonly ClassDefinition[];
  readonly professions: readonly ProfessionDefinition[];
  readonly professionThresholds: readonly {
    readonly tier: number;
    readonly xpRequired: number | null;
    readonly successText: string;
    readonly sourceRange: string;
  }[];
}

// Character-owned extensions, never added to the shared catalog.
export interface CharacterCustomCatalog {
  readonly characterId: string;
  readonly races: readonly Omit<RaceDefinition, 'sourceRange'>[];
  readonly classes: readonly Omit<ClassDefinition, 'sourceRange'>[];
  readonly professions: readonly Omit<ProfessionDefinition, 'sourceRange'>[];
}

function freezeRace(race: RaceDefinition): RaceDefinition {
  return Object.freeze({ ...race, modifiers: Object.freeze({ ...race.modifiers }) });
}

function freezeClass(entry: ClassDefinition): ClassDefinition {
  return Object.freeze({ ...entry });
}

function freezeProfession(profession: ProfessionDefinition): ProfessionDefinition {
  return Object.freeze({
    ...profession,
    skills: Object.freeze(profession.skills.map((skill) => Object.freeze({ ...skill }))),
  });
}

const officialCatalog: RuleCatalog = Object.freeze({
  ...blankSheet,
  races: Object.freeze(blankSheet.races.map(freezeRace)),
  classes: Object.freeze(blankSheet.classes.map(freezeClass)),
  professions: Object.freeze(blankSheet.professions.map(freezeProfession)),
  professionThresholds: Object.freeze(
    blankSheet.professionThresholds.map((entry) => Object.freeze({ ...entry })),
  ),
});

export function getOfficialCatalog(): RuleCatalog {
  return officialCatalog;
}

// Technical identifiers are deliberately distinct from official identifiers.
function assertCustomEntries(entries: readonly { id: string; name: string }[]): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!/^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
      throw new Error(`Invalid custom identifier: ${entry.id}`);
    }
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate custom identifier: ${entry.id}`);
    }
    if (entry.name.trim().length === 0) {
      throw new Error(`Empty custom entry name: ${entry.id}`);
    }
    ids.add(entry.id);
  }
}

function assertCustomRace(race: CharacterCustomCatalog['races'][number]): void {
  if (!Number.isSafeInteger(race.basePv) || !Number.isSafeInteger(race.basePp)) {
    throw new Error(`Invalid racial base: ${race.id}`);
  }
  if (
    Object.keys(race.modifiers).length !== ATTRIBUTE_KEYS.length ||
    ATTRIBUTE_KEYS.some(
      (key) =>
        !Object.hasOwn(race.modifiers, key) ||
        (race.modifiers[key] !== null && !Number.isSafeInteger(race.modifiers[key])),
    )
  ) {
    throw new Error(`Invalid racial modifiers: ${race.id}`);
  }
}

function assertCustomProfession(profession: CharacterCustomCatalog['professions'][number]): void {
  if (
    profession.skills.length !== 5 ||
    profession.skills.some(
      (skill, i) =>
        skill.tier !== i + 1 ||
        (skill.description !== null && typeof skill.description !== 'string'),
    )
  ) {
    throw new Error(`Invalid profession skills: ${profession.id}`);
  }
}

// The caller supplies only the selected character's extensions. No global registry.
// This is a domain invariant, not an authorization mechanism. Untrusted JSON will
// also need full structural validation at the import boundary in a later lot.
export function getCharacterCatalog(
  characterId: string,
  custom?: CharacterCustomCatalog,
): RuleCatalog {
  if (!custom) return officialCatalog;
  if (custom.characterId !== characterId) {
    throw new Error('Custom catalog belongs to another character');
  }
  assertCustomEntries(custom.races);
  assertCustomEntries(custom.classes);
  assertCustomEntries(custom.professions);
  custom.races.forEach(assertCustomRace);
  custom.professions.forEach(assertCustomProfession);
  return Object.freeze({
    ...officialCatalog,
    races: Object.freeze([...officialCatalog.races, ...custom.races.map(freezeRace)]),
    classes: Object.freeze([...officialCatalog.classes, ...custom.classes.map(freezeClass)]),
    professions: Object.freeze([
      ...officialCatalog.professions,
      ...custom.professions.map(freezeProfession),
    ]),
  });
}

export function findRace(catalog: RuleCatalog, id: string): RaceDefinition | undefined {
  return catalog.races.find((entry) => entry.id === id);
}
export function findClass(catalog: RuleCatalog, id: string): ClassDefinition | undefined {
  return catalog.classes.find((entry) => entry.id === id);
}
export function findProfession(catalog: RuleCatalog, id: string): ProfessionDefinition | undefined {
  return catalog.professions.find((entry) => entry.id === id);
}

// Structural validation of the profile remains in characterProfileSchema.
export function hasKnownProfileReferences(
  profile: { id: string; raceId: string; classIds: readonly string[] },
  custom?: CharacterCustomCatalog,
): boolean {
  const catalog = getCharacterCatalog(profile.id, custom);
  return (
    findRace(catalog, profile.raceId) !== undefined &&
    profile.classIds.every((id) => findClass(catalog, id) !== undefined)
  );
}
