import './style.css';
import { ZodError } from 'zod';
import {
  findClass,
  findRace,
  getCharacterCatalog,
  getOfficialCatalog,
} from './core/catalog/catalog';
import type { Character } from './core/character/character';
import { remainingTraitPoints } from './core/character/stats';
import { openCharacterRepository, type CharacterSnapshot } from './storage/repository';
import {
  copyCharacter,
  decodeCharacter,
  encodeCharacter,
  MAX_IMPORT_BYTES,
} from './storage/transfer';
import { renderBank, renderProfessions, renderSession } from './ui/activity';
import { renderCollections, renderUniverse } from './ui/collections';
import { button, element, field, input, panel, select } from './ui/controls';
import { profileForm, renderCustomCatalog, renderStats } from './ui/profile-view';

const views = [
  { id: 'profile', name: 'Profil' },
  { id: 'attributes', name: 'Caractéristiques' },
  { id: 'spells', name: 'Sorts' },
  { id: 'traits', name: 'Traits' },
  { id: 'equipment', name: 'Équipement' },
  { id: 'inventory', name: 'Inventaire et banque' },
  { id: 'professions', name: 'Métiers' },
  { id: 'session', name: 'Session' },
  { id: 'universe', name: 'Univers' },
] as const;

type View = (typeof views)[number]['id'];
type PendingImport = { character: Character; existing?: CharacterSnapshot };

function describeError(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Données invalides.';
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

function fileDownload(character: Character) {
  const url = URL.createObjectURL(
    new Blob([encodeCharacter(character)], { type: 'application/json' }),
  );
  const link = element('a');
  link.href = url;
  link.download = `ulnar-${character.profile.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function initialize(app: HTMLElement) {
  const official = getOfficialCatalog();
  const repo = await openCharacterRepository();
  let snapshots: CharacterSnapshot[] = await repo.list();
  const selectedId = await repo.activeId();
  let active = snapshots.find(({ character }) => character.profile.id === selectedId);
  let view: View = 'profile';
  let creating = false;
  let pending: PendingImport | undefined;
  let busy = false;

  const status = element('p', '', 'notice');
  status.setAttribute('role', 'status');
  status.hidden = true;
  const alert = element('p', '', 'notice error');
  alert.setAttribute('role', 'alert');
  alert.hidden = true;
  const frame = element('main', undefined, 'workspace');
  frame.id = 'main-content';
  const topbar = element('header', undefined, 'topbar');
  const brand = element('div', undefined, 'brand');
  brand.append(element('span', 'U', 'mark'), element('span', 'Ulnar RPG'));
  const headerActions = element('div', undefined, 'header-actions');
  topbar.append(brand, headerActions);
  const skip = element('a', 'Aller au contenu', 'skip-link');
  skip.href = '#main-content';
  app.replaceChildren(skip, topbar, status, alert, frame);

  function showError(error: unknown) {
    status.hidden = true;
    alert.textContent = describeError(error);
    alert.hidden = false;
  }

  function showStatus(message: string) {
    alert.hidden = true;
    status.textContent = message;
    status.hidden = false;
  }

  async function perform(action: () => void | Promise<void>) {
    if (busy) throw new Error('Un enregistrement est déjà en cours.');
    busy = true;
    alert.hidden = true;
    status.hidden = true;
    try {
      await action();
    } finally {
      busy = false;
    }
  }

  function run(action: () => void | Promise<void>) {
    void perform(action).catch(showError);
  }

  async function persist(
    next: Character,
    revision: number | null,
    message: string,
    selectOnSave = false,
  ) {
    const saved = await repo.save(next, revision, selectOnSave);
    active = saved;
    snapshots = snapshots.filter(
      ({ character }) => character.profile.id !== saved.character.profile.id,
    );
    snapshots.push(saved);
    if (creating || revision === null) view = 'profile';
    creating = false;
    render();
    showStatus(message);
  }

  function renderTransfer(current?: CharacterSnapshot) {
    const details = element('details', undefined, 'transfer');
    details.open = true;
    details.append(element('summary', 'Sauvegarde et transfert'));
    const actions = element('div', undefined, 'inline-actions');
    if (current) {
      actions.append(
        button('Exporter la fiche', () => run(() => fileDownload(current.character))),
        button('Restaurer la version précédente', () =>
          run(async () => {
            if (
              !window.confirm(
                'Restaurer la sauvegarde précédente ? La fiche actuelle restera récupérable.',
              )
            )
              return;
            const restored = await repo.restore(current.character.profile.id, current.revision);
            active = restored;
            snapshots = snapshots.map((row) =>
              row.character.profile.id === restored.character.profile.id ? restored : row,
            );
            render();
            showStatus('Version précédente restaurée.');
          }),
        ),
        button(
          'Supprimer la fiche',
          () =>
            run(async () => {
              if (
                !window.confirm(
                  `Supprimer définitivement « ${current.character.profile.name} » de ce navigateur ?`,
                )
              )
                return;
              await repo.remove(current.character.profile.id, current.revision);
              snapshots = await repo.list();
              const id = await repo.activeId();
              active = snapshots.find(({ character }) => character.profile.id === id);
              view = 'profile';
              render();
              showStatus('Fiche supprimée.');
            }),
          'danger',
        ),
      );
    }
    const file = input('character-import', '', 'file');
    file.accept = '.json,application/json';
    file.addEventListener('change', () => {
      const candidate = file.files?.[0];
      if (!candidate) return;
      run(async () => {
        pending = undefined;
        if (candidate.size > MAX_IMPORT_BYTES) {
          render();
          throw new Error('Le fichier dépasse la limite de 1 Mio.');
        }
        try {
          const character = decodeCharacter(await candidate.text());
          pending = { character, existing: await repo.get(character.profile.id) };
        } finally {
          render();
        }
      });
    });
    actions.append(field('Fichier JSON', file));
    details.append(actions);
    if (pending) {
      const entry = pending;
      const preview = element('section', undefined, 'import-preview');
      const catalog = getCharacterCatalog(
        entry.character.profile.id,
        entry.character.customCatalog,
      );
      const race = findRace(catalog, entry.character.profile.raceId)?.name;
      preview.append(
        element('h2', 'Aperçu de l’import'),
        element(
          'p',
          `${entry.character.profile.name} · ${race} · Niveau ${entry.character.profile.level}`,
        ),
      );
      const buttons = element('div', undefined, 'inline-actions');
      const confirmImport = (copy: boolean) =>
        run(async () => {
          const character = copy ? copyCharacter(entry.character) : entry.character;
          await persist(
            character,
            copy ? null : (entry.existing?.revision ?? null),
            'Fiche importée.',
            true,
          );
          pending = undefined;
          render();
        });
      buttons.append(
        button(
          entry.existing ? 'Importer une copie' : 'Importer la fiche',
          () => confirmImport(!!entry.existing),
          'primary',
        ),
      );
      if (entry.existing) {
        preview.append(
          element(
            'p',
            `La fiche « ${entry.existing.character.profile.name} » utilise le même identifiant. Un remplacement conservera sa version précédente.`,
            'muted',
          ),
        );
        buttons.append(button('Remplacer la fiche existante', () => confirmImport(false)));
      }
      buttons.append(
        button('Annuler l’import', () => {
          pending = undefined;
          render();
        }),
      );
      preview.append(buttons);
      details.append(preview);
    }
    return details;
  }

  function render() {
    const current = active;
    headerActions.replaceChildren();
    if (snapshots.length) {
      const choices = snapshots
        .map(({ character }) => ({ id: character.profile.id, name: character.profile.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      const characterSelect = select(
        'active-character',
        choices,
        current?.character.profile.id ?? '',
        'Choisir une fiche',
      );
      characterSelect.addEventListener('change', () => {
        const id = characterSelect.value;
        if (!id) return;
        run(async () => {
          const selected = await repo.get(id);
          if (!selected) throw new Error('Ce personnage n’existe plus. Rechargez la page.');
          await repo.select(id);
          active = selected;
          creating = false;
          pending = undefined;
          view = 'profile';
          render();
        });
      });
      headerActions.append(field('Personnage actif', characterSelect));
    }
    headerActions.append(
      button(
        'Nouveau personnage',
        () => {
          creating = true;
          pending = undefined;
          render();
          frame.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
        },
        'primary',
      ),
    );
    frame.replaceChildren();

    if (!current || creating) {
      const intro = element('div', undefined, 'intro');
      intro.append(
        element('h1', creating ? 'Nouveau personnage' : 'Vos personnages'),
        element(
          'p',
          'Vos fiches sont enregistrées dans ce navigateur. Exportez-les pour les conserver ou les transférer.',
        ),
      );
      frame.append(intro);
      if (creating) {
        frame.append(
          panel(
            'Profil du personnage',
            profileForm(official, run, (next, message) =>
              persist(next, null, message ?? 'Fiche créée.'),
            ),
          ),
        );
        frame.append(
          button('Annuler la création', () => {
            creating = false;
            render();
          }),
        );
      }
      frame.append(renderTransfer());
      return;
    }

    const character = current.character;
    const catalog = getCharacterCatalog(character.profile.id, character.customCatalog);
    const race = findRace(catalog, character.profile.raceId);
    const classes = character.profile.classIds
      .map((id) => findClass(catalog, id)?.name)
      .join(' / ');
    const heading = element('div', undefined, 'sheet-heading');
    heading.append(
      element('h1', character.profile.name),
      element('p', `Niveau ${character.profile.level} · ${race?.name} · ${classes}`),
    );
    frame.append(heading);
    const layout = element('div', undefined, 'sheet-layout');
    const nav = element('nav', undefined, 'sheet-nav');
    nav.setAttribute('aria-label', 'Sections de la fiche');
    for (const section of views) {
      const tab = button(section.name, () => {
        view = section.id;
        render();
        navButton(section.id)?.focus();
      });
      tab.dataset.view = section.id;
      if (view === section.id) tab.setAttribute('aria-current', 'true');
      nav.append(tab);
    }
    function navButton(id: View) {
      return frame.querySelector<HTMLButtonElement>(`[data-view="${id}"]`);
    }
    const content = element('div', undefined, 'sheet-content');
    const save = (next: Character, message = 'Fiche enregistrée.') =>
      persist(next, current.revision, message);
    switch (view) {
      case 'profile':
        content.append(
          panel('Profil', profileForm(catalog, run, save, character)),
          renderCustomCatalog(character, run, save),
        );
        break;
      case 'attributes':
        content.append(renderStats(character, catalog, run, save));
        break;
      case 'professions':
        content.append(renderProfessions(character, catalog, run, save));
        break;
      case 'session':
        content.append(renderSession(character, catalog, run, save));
        break;
      case 'universe':
        content.append(renderUniverse(catalog));
        break;
      case 'inventory':
        content.append(renderBank(character, run, save));
        content.append(
          renderCollections(view, character.collections, catalog, (collections) =>
            perform(() => save({ ...character, collections })),
          ),
        );
        break;
      case 'traits': {
        const costs = character.collections.traits.flatMap((trait) =>
          trait.kind === 'passive' ? [trait.cost] : [],
        );
        const remaining = remainingTraitPoints(character.profile.level, costs);
        const budget = element(
          'p',
          `${remaining} points de traits passifs disponibles`,
          remaining < 0 ? 'warning' : 'balance',
        );
        content.append(panel('Budget des traits', budget));
        content.append(
          renderCollections(view, character.collections, catalog, (collections) =>
            perform(() => save({ ...character, collections })),
          ),
        );
        break;
      }
      default:
        content.append(
          renderCollections(view, character.collections, catalog, (collections) =>
            perform(() => save({ ...character, collections })),
          ),
        );
    }
    layout.append(nav, content);
    frame.append(layout, renderTransfer(current));
  }
  render();
}

const app = document.querySelector<HTMLElement>('#app');
if (app) {
  app.append(element('p', 'Chargement des fiches locales…', 'notice'));
  void initialize(app).catch((error: unknown) => {
    const message = element('p', describeError(error), 'notice error');
    message.setAttribute('role', 'alert');
    app.replaceChildren(element('h1', 'Ulnar RPG'), message);
  });
}
