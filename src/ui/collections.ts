import { ZodError } from 'zod';
import type { RuleCatalog } from '../core/catalog/catalog';
import {
  ARMOR_SLOTS,
  EQUIPMENT_WEIGHTS,
  WEAPON_SLOTS,
  armorDicePool,
  characterCollectionsSchema,
  equipmentSchema,
  inventoryItemSchema,
  spellSchema,
  traitSchema,
  type CharacterCollections,
  type Equipment,
  type InventoryItem,
  type Spell,
  type Trait,
} from '../core/character/collections';
import { button, element, field as labelFor, formValue } from './controls';

export type CollectionKind = 'spells' | 'traits' | 'equipment' | 'inventory';
type EditorKind = 'spell' | 'passive' | 'psychological' | 'armor' | 'weapon' | 'inventory';
type Entry = Spell | Trait | Equipment | InventoryItem;
type Save = (value: CharacterCollections) => Promise<void> | void;
type Option = readonly [value: string, label: string];

interface Field {
  key: string;
  label: string;
  multiline?: boolean;
  options?: readonly Option[];
  step?: 1 | 'any';
  nullable?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
}

const slotLabels: Record<Equipment['slot'], string> = {
  helmet: 'Casque',
  chest: 'Buste',
  gloves: 'Gants',
  boots: 'Bottes',
  shield: 'Bouclier',
  'weapon-1': 'Arme 1',
  'weapon-2': 'Arme 2',
};

const groupActions: Record<CollectionKind, readonly [EditorKind, string][]> = {
  spells: [['spell', 'Ajouter un sort']],
  traits: [
    ['passive', 'Ajouter un trait passif'],
    ['psychological', 'Ajouter un trait psychologique'],
  ],
  equipment: [
    ['armor', 'Ajouter une pièce d’armure'],
    ['weapon', 'Ajouter une arme'],
  ],
  inventory: [['inventory', 'Ajouter un objet']],
};

const weights: Option[] = [
  ['', 'Non renseigné'],
  ...EQUIPMENT_WEIGHTS.map((weight): Option => [weight, weight]),
];
const armorWeight: Field = {
  key: 'armorWeight',
  label: 'Poids de l’armure',
  options: weights,
  nullable: true,
};
const nameField: Field = { key: 'name', label: 'Nom', required: true };
const descriptionField: Field = {
  key: 'description',
  label: 'Description et effets',
  multiline: true,
};

function control(field: Field, value: unknown): HTMLLabelElement {
  const input = field.options
    ? element('select')
    : field.multiline
      ? element('textarea')
      : element('input');
  if (input instanceof HTMLSelectElement) {
    for (const [value, caption] of field.options ?? []) {
      const option = element('option', caption);
      option.value = value;
      input.append(option);
    }
  } else if (input instanceof HTMLInputElement && field.step !== undefined) {
    input.type = 'number';
    input.step = String(field.step);
    if (field.min !== undefined) input.min = String(field.min);
    if (field.max !== undefined) input.max = String(field.max);
  } else {
    input.maxLength = field.key === 'name' ? 160 : field.multiline ? 8000 : 500;
  }
  input.name = field.key;
  input.required = field.required ?? false;
  if (typeof value === 'number' || typeof value === 'string') input.value = String(value);
  return labelFor(field.label, input);
}

function makeForm(
  fields: readonly Field[],
  values: Readonly<Record<string, unknown>>,
  label: string,
  submit: (values: Record<string, string | number | null>) => Promise<void>,
): HTMLFormElement {
  const form = element('form');
  form.className = 'collection-editor';
  const grid = element('div');
  grid.className = 'form-grid';
  for (const field of fields) grid.append(control(field, values[field.key]));
  const save = element('button', label, 'primary');
  save.type = 'submit';
  const actions = element('div', undefined, 'form-actions');
  actions.append(save);
  const status = element('p', undefined, 'error');
  status.setAttribute('role', 'alert');
  status.hidden = true;
  form.append(grid, actions, status);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (save.disabled) return;
    save.disabled = true;
    status.hidden = true;
    status.textContent = '';
    try {
      const data = new FormData(form);
      const parsed = Object.fromEntries(
        fields.map((field) => {
          const value = formValue(data, field.key);
          return [
            field.key,
            field.step !== undefined
              ? value === ''
                ? null
                : Number(value)
              : field.nullable && value === ''
                ? null
                : value,
          ];
        }),
      );
      await submit(parsed);
    } catch (error) {
      status.hidden = false;
      status.textContent = saveError(error, fields);
    } finally {
      save.disabled = false;
    }
  });
  return form;
}

function saveError(error: unknown, fields: readonly Field[]): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (issue?.code === 'custom') return issue.message;
    const field = fields.find((field) => field.key === issue?.path[0]);
    return field ? `Vérifiez le champ « ${field.label} ».` : 'Vérifiez les données de la fiche.';
  }
  return error instanceof Error ? error.message : 'Impossible d’enregistrer.';
}

function openSlots(mode: 'armor' | 'weapon', entries: readonly Equipment[]): Option[] {
  const slots = mode === 'armor' ? ARMOR_SLOTS : WEAPON_SLOTS;
  return slots
    .filter((slot) => !entries.some((entry) => entry.slot === slot))
    .map((slot) => [slot, slotLabels[slot]]);
}

function fieldsFor(mode: EditorKind, catalog: RuleCatalog, slots: readonly Option[]): Field[] {
  switch (mode) {
    case 'spell':
      return [
        nameField,
        { key: 'level', label: 'Niveau du sort', step: 1 },
        {
          key: 'classId',
          label: 'Classe',
          nullable: true,
          options: [
            ['', 'Non renseignée'],
            ...catalog.classes.map(({ id, name }): Option => [id, name]),
          ],
        },
        { key: 'category', label: 'Catégorie' },
        descriptionField,
        { key: 'damage', label: 'Dégâts' },
        { key: 'range', label: 'Portée' },
        { key: 'extraStats', label: 'Statistiques supplémentaires' },
        { key: 'duration', label: 'Durée' },
        { key: 'manaCost', label: 'Coût en mana', step: 1 },
        { key: 'baseCost', label: 'Coût de base', step: 1 },
        { key: 'roll', label: 'Jet' },
        { key: 'cooldown', label: 'Temps de recharge' },
        { key: 'creationOrUpgrade', label: 'Niveau de création ou d’amélioration' },
      ];
    case 'passive':
      return [
        nameField,
        { key: 'origin', label: 'Origine' },
        descriptionField,
        { key: 'cost', label: 'Coût en points', step: 'any' },
        { key: 'acquisition', label: 'Obtention (événement, offert…)' },
      ];
    case 'psychological':
      return [
        nameField,
        { key: 'origin', label: 'Origine' },
        descriptionField,
        { key: 'flavor', label: 'Texte d’ambiance', multiline: true },
      ];
    case 'inventory':
      return [
        nameField,
        { key: 'category', label: 'Type d’objet' },
        { key: 'quantity', label: 'Quantité', step: 1, required: true, min: 0 },
        { key: 'value', label: 'Valeur' },
        descriptionField,
      ];
    default: {
      const common: Field[] = [
        { key: 'slot', label: 'Emplacement', options: slots },
        nameField,
        { key: 'tier', label: 'Palier', step: 1, required: true, min: 1, max: 4 },
      ];
      if (mode === 'armor') {
        return [
          ...common,
          { key: 'enchantment', label: 'Enchantement' },
          {
            key: 'enchantmentTier',
            label: 'Palier de l’enchantement',
            step: 1,
            min: 1,
            max: 4,
          },
          { key: 'effect', label: 'Effet décrit', multiline: true },
        ];
      }
      return [
        ...common,
        { key: 'weight', label: 'Poids', options: weights, nullable: true },
        { key: 'range', label: 'Portée' },
        { key: 'damage', label: 'Dés de dégâts (indication du MJ)' },
        ...[1, 2, 3].flatMap((number) => [
          { key: `attribute${number}`, label: `Attribut ${number}` },
          {
            key: `effect${number}`,
            label: `Effet décrit de l’attribut ${number}`,
            multiline: true,
          },
        ]),
      ];
    }
  }
}

function entryId(entry: Entry): string {
  return 'id' in entry ? entry.id : entry.slot;
}

function parseEntry(
  mode: EditorKind,
  data: Record<string, string | number | null>,
  id?: string,
): Entry {
  if (mode === 'armor') return equipmentSchema.parse({ ...data, kind: mode });
  if (mode === 'weapon') {
    const { attribute1, attribute2, attribute3, effect1, effect2, effect3, ...rest } = data;
    const attributes = [
      { name: attribute1, effect: effect1 },
      { name: attribute2, effect: effect2 },
      { name: attribute3, effect: effect3 },
    ].filter(({ name, effect }) => name || effect);
    return equipmentSchema.parse({ ...rest, kind: mode, attributes });
  }
  const identified = { ...data, id: id ?? crypto.randomUUID() };
  if (mode === 'spell') return spellSchema.parse(identified);
  if (mode === 'inventory') return inventoryItemSchema.parse(identified);
  return traitSchema.parse({ ...identified, kind: mode });
}

function currentValues(entry?: Entry): Readonly<Record<string, unknown>> {
  if (!entry) return { tier: 1, quantity: 1 };
  if ('attributes' in entry) {
    return {
      ...entry,
      ...Object.fromEntries(
        entry.attributes.flatMap(({ name, effect }, index) => [
          [`attribute${index + 1}`, name],
          [`effect${index + 1}`, effect],
        ]),
      ),
    };
  }
  return entry;
}

function entryMode(kind: CollectionKind, entry: Entry): EditorKind {
  if ('kind' in entry) return entry.kind;
  return kind === 'spells' ? 'spell' : 'inventory';
}

function entrySummary(entry: Entry): string {
  if ('slot' in entry) {
    return `${slotLabels[entry.slot]} · palier ${entry.tier}`;
  }
  if ('quantity' in entry) {
    return [`${entry.quantity} en stock`, entry.category, entry.value].filter(Boolean).join(' · ');
  }
  if ('kind' in entry) {
    return [entry.kind === 'passive' ? 'Passif' : 'Psychologique', entry.origin]
      .filter(Boolean)
      .join(' · ');
  }
  return [entry.level === null ? null : `Niveau ${entry.level}`, entry.category]
    .filter(Boolean)
    .join(' · ');
}

export function renderCollections(
  kind: CollectionKind,
  collections: CharacterCollections,
  catalog: RuleCatalog,
  onSave: Save,
): HTMLElement {
  const section = element('section');
  section.className = 'collection-view';
  const entries: readonly Entry[] = collections[kind];
  const actions = element('div');
  actions.className = 'collection-actions actions';
  const editor = element('div');
  const list = element('div');
  list.className = 'collection-list';
  const feedback = element('p', undefined, 'error');
  feedback.setAttribute('role', 'alert');
  feedback.hidden = true;

  const commit = (entries: readonly Entry[]) =>
    onSave(characterCollectionsSchema.parse({ ...collections, [kind]: entries }));

  function showEditor(mode: EditorKind, title: string, entry?: Entry) {
    const heading = element('h3', title);
    const slotOptions =
      entry && 'slot' in entry
        ? [[entry.slot, slotLabels[entry.slot]] as const]
        : mode === 'armor' || mode === 'weapon'
          ? openSlots(mode, collections.equipment)
          : [];
    const form = makeForm(
      fieldsFor(mode, catalog, slotOptions),
      currentValues(entry),
      'Enregistrer',
      async (data) => {
        const value = parseEntry(mode, data, entry ? entryId(entry) : undefined);
        await commit(
          entry ? entries.map((item) => (item === entry ? value : item)) : [...entries, value],
        );
      },
    );
    form.setAttribute('aria-label', title);
    form.querySelector('.form-actions')?.append(button('Annuler', () => editor.replaceChildren()));
    editor.replaceChildren(heading, form);
    form.querySelector<HTMLInputElement>('[name="name"]')?.focus();
  }

  if (kind === 'equipment') {
    const total = element('p');
    total.append(element('strong', 'Réserve d’armure '), armorDicePool(collections) ?? '—');
    section.append(
      total,
      makeForm([armorWeight], collections, 'Enregistrer le poids', async (data) => {
        await onSave(
          characterCollectionsSchema.parse({ ...collections, armorWeight: data.armorWeight }),
        );
      }),
      element(
        'p',
        'Les réserves par pièce et les dés d’arme restent à confirmer. Saisissez les dés d’arme indiqués par le MJ.',
      ),
    );
  }

  for (const [mode, label] of groupActions[kind]) {
    const action = button(label, () => showEditor(mode, label));
    if (mode === 'armor' || mode === 'weapon') {
      action.disabled = openSlots(mode, collections.equipment).length === 0;
    }
    actions.append(action);
  }

  for (const entry of entries) {
    const article = element('article', undefined, 'item-card');
    const summary = entrySummary(entry);
    article.append(element('h3', entry.name));
    if (summary) article.append(element('p', summary));
    if ('description' in entry && entry.description)
      article.append(element('p', entry.description));
    if ('effect' in entry && entry.effect) article.append(element('p', entry.effect));
    if ('enchantment' in entry && entry.enchantment) {
      article.append(
        element(
          'p',
          [
            entry.enchantment,
            entry.enchantmentTier === null ? '' : `palier ${entry.enchantmentTier}`,
          ]
            .filter(Boolean)
            .join(' · '),
        ),
      );
    }
    if ('attributes' in entry && entry.attributes.length) {
      const attributes = element('ul');
      for (const { name, effect } of entry.attributes) {
        attributes.append(element('li', [name, effect].filter(Boolean).join(' · ')));
      }
      article.append(attributes);
    }
    if ('damage' in entry && entry.damage) article.append(element('p', `Dégâts ${entry.damage}`));
    if ('manaCost' in entry && entry.manaCost !== null)
      article.append(element('p', `${entry.manaCost} PM`));
    if ('cost' in entry && entry.cost !== null) {
      article.append(element('p', `Coût en points ${entry.cost}`));
    }
    const commands = element('div');
    commands.className = 'collection-actions actions';
    const remove = button('Supprimer', async () => {
      if (!window.confirm(`Supprimer « ${entry.name} » ?`)) return;
      remove.disabled = true;
      feedback.hidden = true;
      feedback.textContent = '';
      try {
        await commit(entries.filter((item) => item !== entry));
      } catch (error) {
        feedback.hidden = false;
        feedback.textContent = saveError(error, []);
      } finally {
        remove.disabled = false;
      }
    });
    const modify = button('Modifier', () =>
      showEditor(entryMode(kind, entry), 'Modifier la fiche', entry),
    );
    modify.setAttribute('aria-label', `Modifier ${entry.name}`);
    remove.setAttribute('aria-label', `Supprimer ${entry.name}`);
    commands.append(modify, remove);
    article.append(commands);
    list.append(article);
  }
  if (!entries.length) list.append(element('p', 'Aucune entrée.'));
  section.append(actions, editor, feedback, list);
  return section;
}

export function renderUniverse(catalog: RuleCatalog): HTMLElement {
  const section = element('section');
  section.className = 'universe-view';

  const races = element('ul');
  for (const race of catalog.races) {
    races.append(element('li', race.name));
  }

  const classes = element('ul');
  for (const entry of catalog.classes) {
    classes.append(element('li', entry.name));
  }

  section.append(
    element('h3', 'Races'),
    races,
    element('h3', 'Classes'),
    classes,
    element('h3', 'Métiers'),
  );
  for (const entry of catalog.professions) {
    const detail = element('details');
    const skills = element('ol');
    for (const { tier, description } of entry.skills) {
      if (description !== null) {
        const item = element('li', description);
        item.value = tier;
        skills.append(item);
      }
    }
    detail.append(element('summary', entry.name));
    if (skills.childElementCount) detail.append(skills);
    section.append(detail);
  }

  section.append(
    element(
      'p',
      'La carte et les illustrations sont en attente de vérification des droits de diffusion.',
    ),
  );
  return section;
}
