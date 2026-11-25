import { createCharacter } from '../../src/core/character/character';

export function storageCharacter() {
  return createCharacter({
    id: '47b328f4-b090-4efe-b924-4f29d33a6142',
    name: 'Personnage fictif',
    raceId: 'humain-e',
    classIds: ['barde'],
    level: 1,
    gender: '',
    age: '',
    affiliations: '',
    deity: '',
    campaignLabel: '',
    lore: 'Texte fictif accentué',
  });
}
