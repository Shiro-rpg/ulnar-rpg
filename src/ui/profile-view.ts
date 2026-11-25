import { ATTRIBUTE_KEYS, findRace, type RuleCatalog } from '../core/catalog/catalog';
import { createCharacter, type Character } from '../core/character/character';
import type { CharacterProfile } from '../core/character/profile';
import {
  calculateStats,
  PRIMARY_ATTRIBUTES,
  RESOURCE_ADJUSTMENT_KEYS,
  RESOURCE_KEYS,
  SECONDARY_ATTRIBUTES,
  type Allocation,
} from '../core/character/stats';
import { element, field, form, formValue, input, numberValue, panel, select } from './controls';

type Run = Parameters<typeof form>[1];
type Save = (character: Character, message?: string) => Promise<void>;

const names = {
  force: 'Force',
  finesse: 'Finesse',
  charisme: 'Charisme',
  empathie: 'Empathie',
  savoir: 'Savoir',
  instinct: 'Instinct',
  physique: 'Physique',
  social: 'Social',
  mental: 'Mental',
  volonte: 'Volonté',
  hp: 'PV',
  mp: 'PM',
  initiative: 'Initiative',
};

export function profileForm(catalog: RuleCatalog, run: Run, save: Save, character?: Character) {
  const profile = character?.profile;
  const profileForm = form(character ? 'Enregistrer le profil' : 'Créer la fiche', run, (data) => {
    const secondary = formValue(data, 'secondaryClassId');
    const nextProfile: CharacterProfile = {
      id: profile?.id ?? crypto.randomUUID(),
      name: formValue(data, 'name'),
      raceId: formValue(data, 'raceId'),
      classIds: [formValue(data, 'primaryClassId'), ...(secondary ? [secondary] : [])],
      level: numberValue(data, 'level'),
      gender: formValue(data, 'gender'),
      age: formValue(data, 'age'),
      affiliations: formValue(data, 'affiliations'),
      deity: formValue(data, 'deity'),
      campaignLabel: formValue(data, 'campaignLabel'),
      lore: formValue(data, 'lore'),
    };
    return save(
      {
        ...(character ?? createCharacter(nextProfile)),
        profile: nextProfile,
        inGameSince: formValue(data, 'inGameSince') || null,
      },
      character ? 'Profil enregistré.' : 'Personnage créé.',
    );
  });

  profileForm.setAttribute('aria-label', character ? 'Profil' : 'Nouveau personnage');
  const name = input('name', profile?.name);
  name.required = true;
  name.maxLength = 160;
  const level = input('level', profile?.level ?? 1, 'number');
  level.required = true;
  level.min = '0';
  const lore = element('textarea');
  lore.name = 'lore';
  lore.value = profile?.lore ?? '';

  const grid = element('div', undefined, 'form-grid');
  grid.append(
    field('Nom', name),
    field('Race', select('raceId', catalog.races, profile?.raceId)),
    field('Classe principale', select('primaryClassId', catalog.classes, profile?.classIds[0])),
    field(
      'Classe secondaire',
      select('secondaryClassId', catalog.classes, profile?.classIds[1], 'Aucune'),
    ),
    field('Niveau', level),
    field('Genre', input('gender', profile?.gender)),
    field('Âge', input('age', profile?.age)),
    field('Affiliations', input('affiliations', profile?.affiliations)),
    field('Divinité ou esprit', input('deity', profile?.deity)),
    field('Campagne ou guilde', input('campaignLabel', profile?.campaignLabel)),
    field('Entrée en jeu', input('inGameSince', character?.inGameSince ?? '', 'date')),
  );
  profileForm.prepend(grid, field('Histoire du personnage', lore));
  return profileForm;
}

export function renderCustomCatalog(character: Character, run: Run, save: Save): HTMLElement {
  const details = element('details', undefined, 'panel');
  details.append(element('summary', 'Ajouter une entrée personnalisée'));
  const category = select('kind', [
    { id: 'classes', name: 'Classe' },
    { id: 'races', name: 'Race' },
    { id: 'professions', name: 'Métier' },
  ]);
  const fields = element('div', undefined, 'form-grid');

  function showFields() {
    fields.replaceChildren();
    if (category.value === 'races') {
      fields.append(
        field('Base PV', input('basePv', '', 'number')),
        field('Base pp', input('basePp', '', 'number')),
      );
      for (const key of ATTRIBUTE_KEYS) fields.append(field(names[key], input(key, '', 'number')));
    }
    if (category.value === 'professions') {
      for (let tier = 1; tier <= 5; tier++) {
        fields.append(field(`Compétence du palier ${tier}`, input(`skill-${tier}`)));
      }
    }
  }
  category.addEventListener('change', showFields);

  const editor = form('Ajouter au catalogue de cette fiche', run, (data) => {
    const title = formValue(data, 'name').trim();
    if (!title) throw new Error('Renseignez un nom.');
    const entry = { id: `custom:${crypto.randomUUID()}`, name: title };
    const customCatalog = character.customCatalog
      ? structuredClone(character.customCatalog)
      : { characterId: character.profile.id, races: [], classes: [], professions: [] };
    switch (category.value) {
      case 'races':
        customCatalog.races.push({
          ...entry,
          basePv: numberValue(data, 'basePv'),
          basePp: numberValue(data, 'basePp'),
          modifiers: Object.fromEntries(
            ATTRIBUTE_KEYS.map((key) => [
              key,
              formValue(data, key) === '' ? null : numberValue(data, key),
            ]),
          ) as (typeof customCatalog.races)[number]['modifiers'],
        });
        break;
      case 'professions':
        customCatalog.professions.push({
          ...entry,
          skills: [1, 2, 3, 4, 5].map((tier) => ({
            tier,
            description: formValue(data, `skill-${tier}`).trim() || null,
          })),
        });
        break;
      default:
        customCatalog.classes.push(entry);
    }
    return save({ ...character, customCatalog }, 'Entrée personnalisée ajoutée.');
  });
  editor.prepend(field('Catégorie', category), field('Nom personnalisé', input('name')), fields);
  details.append(
    element('p', 'Les valeurs personnalisées s’appliquent uniquement à cette fiche.', 'muted'),
    editor,
  );
  return details;
}

function statGroup<T extends string>(
  title: string,
  keys: readonly T[],
  group: keyof Allocation,
  values: Record<T, number>,
) {
  const groupNode = element('fieldset');
  const grid = element('div', undefined, 'form-grid');
  groupNode.append(element('legend', title), grid);
  for (const key of keys) {
    const control = input(`${group}.${key}`, values[key], 'number');
    control.required = true;
    control.step = 'any';
    if (group === 'initial') {
      control.min = '1';
      control.max = '4';
    } else if (group === 'early' || group === 'late' || group === 'resources') {
      control.min = '0';
    }
    grid.append(field(names[key as keyof typeof names], control));
  }
  return groupNode;
}

function numbersFromForm<T extends string>(
  data: FormData,
  group: keyof Allocation,
  keys: readonly T[],
) {
  return Object.fromEntries(
    keys.map((key) => [key, numberValue(data, `${group}.${key}`)]),
  ) as Record<T, number>;
}

function valuesList(values: readonly [string, number][]) {
  const list = element('dl', undefined, 'stat-grid');
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 10 });
  for (const [label, value] of values) {
    const item = element('div');
    item.append(element('dt', label), element('dd', formatter.format(value)));
    if (value < 0) item.classList.add('negative');
    list.append(item);
  }
  return list;
}

export function renderStats(character: Character, catalog: RuleCatalog, run: Run, save: Save) {
  const race = findRace(catalog, character.profile.raceId);
  if (!race) throw new Error('Race introuvable.');
  const { allocation, profile } = character;
  const stats = calculateStats(profile.level, race, allocation);
  const summary = element('div');
  summary.append(
    valuesList([
      ['PV maximum', stats.maxHp],
      ['PM maximum', stats.maxMp],
      ['Initiative', stats.initiative],
      ...PRIMARY_ATTRIBUTES.map((key) => [names[key], stats.primary[key]] as [string, number]),
      ...SECONDARY_ATTRIBUTES.map((key) => [names[key], stats.secondary[key]] as [string, number]),
    ]),
    element('h3', 'Points disponibles'),
    valuesList([
      ['Initiaux', stats.remaining.initial],
      ['Gains précoces', stats.remaining.early],
      ['Gains tardifs', stats.remaining.late],
      ['Ressources', stats.remaining.resources],
    ]),
  );
  if (Object.values(stats.remaining).some((value) => value < 0)) {
    summary.append(
      element('p', 'Au moins une allocation dépasse le budget de la fiche source.', 'warning'),
    );
  }

  const editor = form('Enregistrer les allocations', run, (data) =>
    save(
      {
        ...character,
        allocation: {
          initial: numbersFromForm(data, 'initial', SECONDARY_ATTRIBUTES),
          early: numbersFromForm(data, 'early', SECONDARY_ATTRIBUTES),
          late: numbersFromForm(data, 'late', SECONDARY_ATTRIBUTES),
          secondaryAdjustments: numbersFromForm(data, 'secondaryAdjustments', SECONDARY_ATTRIBUTES),
          resourcesAdjustments: numbersFromForm(
            data,
            'resourcesAdjustments',
            RESOURCE_ADJUSTMENT_KEYS,
          ),
          resources: numbersFromForm(data, 'resources', RESOURCE_KEYS),
        },
      },
      'Allocations enregistrées.',
    ),
  );
  editor.prepend(
    statGroup('Valeurs initiales', SECONDARY_ATTRIBUTES, 'initial', allocation.initial),
    statGroup('Gains des niveaux 3, 6 et 9', SECONDARY_ATTRIBUTES, 'early', allocation.early),
    statGroup(
      'Ajustements manuels des secondaires',
      SECONDARY_ATTRIBUTES,
      'secondaryAdjustments',
      allocation.secondaryAdjustments,
    ),
    statGroup('Gains tardifs', SECONDARY_ATTRIBUTES, 'late', allocation.late),
    statGroup(
      'Ajustements manuels des ressources',
      RESOURCE_ADJUSTMENT_KEYS,
      'resourcesAdjustments',
      allocation.resourcesAdjustments,
    ),
    statGroup(
      'Allocations de ressources par niveau',
      RESOURCE_KEYS,
      'resources',
      allocation.resources,
    ),
  );

  const content = element('div');
  content.append(
    panel(
      'Caractéristiques calculées',
      summary,
      'Calculs de la fiche officielle. Les PV et PM maximums utilisent les caractéristiques initiales.',
    ),
    panel('Allocations', editor),
  );
  return content;
}
