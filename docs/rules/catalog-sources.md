# Ulnar — catalogue officiel et extensions par personnage (lot 2.2, V0.2)

Décision validée : Fiche Vierge(1).xlsx constitue le référentiel officiel de la V1. Des races, classes et métiers personnalisés peuvent être associés à un personnage sans modifier le référentiel commun. Cette décision remplace le choix de plusieurs catalogues de production proposé en V0.1.

## Sources et provenance

| Source | Races | Classes | Métiers | Usage |
| --- | --- | --- | --- | --- |
| Fiche Vierge(1).xlsx | A2:M12 | O1:O21 | A67:F84 | Catalogue officiel |
| Nys V3.xlsx | A2:M12 | O1:O21 | A67:F85 | Fixture de test uniquement |

Onglet `Data automatisation` ; seuils métiers Q36:S41. Les JSON extraits en V0.1 sont inchangés. `null` conserve une cellule vide. Au palier 6 le seuil ∞ est représenté par `null` ; le blocage d'XP a été validé séparément. Les compétences de palier 1 à 5 sont des textes littéraux, pas des effets exécutables. Les classes de ces plages contiennent uniquement leur nom ; aucun modificateur n'est inventé. `basePp` reprend le libellé source `base pp`. Les formules ne sont pas calculées dans ce lot.

Les divergences de Nys V3 (Ulanari, Mage, Lame Éternelle, Veilleur, Lame Céleste, Gardienne des bêtes, compétences de plusieurs métiers) ne remplacent pas le catalogue officiel et ne créent aucun alias implicite. La fixture sert à éprouver des extensions ciblées, sans importer toutes les variantes de Nys. Aucun classeur, image ou lore personnel n'est livré.

## Contrat technique proposé

- `getOfficialCatalog()` renvoie le catalogue commun, figé en mémoire ; sa version reste `blank-sheet-v1`.
- `CharacterCustomCatalog` contient `characterId`, `races`, `classes`, `professions`. L'état doit être associé à un seul personnage. Les extensions sont passées explicitement à `getCharacterCatalog(characterId, custom)` ; une discordance de propriétaire est rejetée.
- Les identifiants personnalisés ont le préfixe `custom:` suivi d'un slug ASCII minuscule (ex. `custom:ulanari`). C'est un choix technique : ils ne peuvent pas écraser une entrée officielle. Les doublons d'identifiant dans une catégorie sont refusés. Un même nom peut exister dans deux entrées distinctes.
- Une race personnalisée contient ses bases et dix modificateurs entiers sûrs ou `null` ; une classe a un nom ; un métier contient cinq entrées de compétences (texte ou `null`). Les seuils XP restent officiels. Les contrôles numériques sont structurels ; aucune limite d'équilibrage non confirmée n'est imposée.
- `findRace`, `findClass`, `findProfession` reçoivent le catalogue à consulter. `hasKnownProfileReferences(profile, custom?)` vérifie l'appartenance des identifiants de race/classe, après validation structurelle du profil. Les métiers seront contrôlés lors de la composition du modèle complet.
- Les extensions devront être enregistrées dans le futur agrégat Character et dans l'enveloppe JSON, avec le même `characterId`. Validation Zod complète des imports non fiables, UI de création, persistance et migration restent hors de ce lot. Ce contrôle de propriétaire est un invariant logiciel, pas une autorisation serveur ; l'accord du MJ reste manuel en V1.

## Intégration

Remplace les fichiers V0.1 correspondants. Si V0.1 a déjà été importée, supprimer `src/data/catalog/nys-v3.json` : seule sa copie dans `tests/fixtures/catalog/` doit subsister. Ne pas publier les fixtures. Aucun import de la fixture depuis `src/`. Le modèle `profile.ts` reste inchangé.

Exécuter `npm run format && npm run check`, puis examiner `git status --short`. Aucun changement dans la CI. La mise à jour de `ARCHITECTURE.md` est limitée à la décision ci-dessus, à reporter lors de l'intégration : catalogue officiel versionné + extensions CharacterCustomCatalog 0..1 par personnage, références personnalisées dans l'export. Les autres choix V1.0 demeurent valides.
