# Ulnar RPG V1 — état de la candidate

La candidate permet de développer, créer et utiliser des fiches localement. La recette de publication reste ouverte sur les arbitrages métier, les droits des ressources et l’hébergement réel.

## Fonctions livrées

| Phase | Résultat |
| --- | --- |
| Moteur et sources | Catalogue officiel, extensions par fiche, six secondaires, quatre principales, progression, PV/PM maximums, initiative et budgets des traits. Les deux classeurs ont été analysés et les différences sont tracées dans la [matrice des formules](docs/rules/formula-matrix.md). |
| Fiche et interface | Application française et responsive, profil, plusieurs personnages, vue des caractéristiques et onglets. Création de races, classes et métiers propres à une fiche. |
| Équipement, sorts, traits, inventaire, banque et métiers | Édition des collections, descriptions saisies, réserve totale d’armure selon I4 et la table officielle, taux et transactions confirmés, premier jet par métier et par session, examen validé manuellement avec conservation du surplus. |
| Sessions et dés | Jets locaux avec résultats détaillés et historique, session persistante, tour explicite, saisie manuelle des PV/PM courants, postures et recharges. Les maxima sont calculés indépendamment. |
| IndexedDB et JSON | Isolation des fiches, révisions concurrentes, instantané précédent, restauration, export JSON versionné et import avec aperçu, copie ou remplacement atomique. |
| Préparation de livraison | [Guide du joueur](docs/player-guide.md), [format JSON](docs/json-format.md), [décision de persistance](docs/adr/0001-character-snapshots.md), [guide du mainteneur](docs/maintainer-guide.md), Caddy d’exemple et test fictif. |

## Résultats vérifiés

| Contrôle | Résultat local |
| --- | --- |
| ESLint, Prettier, TypeScript strict, build Vite | Réussis. Tests et configurations ont aussi passé une vérification TypeScript strict ponctuelle avec les déclarations Node de l’environnement. |
| `npm test` et `npm run test:coverage` | 104 tests passés, dont les 32 d’origine. V8 mesure 24,36 % des lignes et 30,26 % des branches sur l’ensemble de `src`, 97,42 % des lignes et 95,24 % des branches de `src/core`. |
| Playwright sur Chromium système | 13 scénarios passés, dont isolation, sauvegarde et import, quota simulé et concurrence, collections, allocation, banque, métiers, session, affichage littéral et largeur 360 px. La couverture V8 de Vitest ne compte pas ces scénarios navigateur. |
| `npm audit` | 0 vulnérabilité signalée. |
| Artefact | `dist` contient un HTML, un JS et un CSS. Le JS et le CSS font environ 49,4 ko gzip au total. Le build est exempt de classeurs, de fixtures et des marqueurs recherchés pour les données personnalisées. L’aperçu répond 404 sur les chemins privés et le serveur Vite de développement répond 403. |
| Performance locale indicative | p75 de 834 ms sur 5 chargements à froid en émulation mobile à 360 px, CPU ralenti 4×, latence 80 ms, débit descendant 200 ko/s. p95 de 23 ms sur 20 sauvegardes d’allocation incluant la mise à jour de l’écran et IndexedDB, avec 100 objets, 30 sorts et 200 jets fictifs. |
| Caddy fictif sur boucle locale | Caddy 2.11.9, archive officielle dont le SHA-512 a été vérifié. Configuration, TLS, refus des accès anonymes et identifiants erronés, accès HTML et JS invité, en-têtes, révocation, promotion et rollback validés. |

Le job GitHub Actions `Quality and tests` reste la porte de validation avec le Chromium officiel. Les résultats ci-dessus couvrent l’instance Codex avec Chromium système. La cible de 80 % de lignes sur l’ensemble de `src` n’est pas atteinte dans le relevé Vitest. Mesurer séparément ou consolider la couverture navigateur et élargir la recette clavier, contrastes, Firefox et appareils avant validation complète de N03 et N06.

## Ambiguïtés métier et prochaines étapes

1. **Caractéristiques et progression.** Faire approuver les fixtures recalculées dans Excel ou Sheets, notamment la ligne de référence pour les gains personnalisés, les dépassements d’allocation et les limites du niveau. La comparaison Python des formules et des caches ne remplace pas cet oracle ni la recette MJ. Le profil respecte la borne technique entière non négative existante.
2. **Équipement et effets.** Exécuter ou faire arbitrer les formules encapsulées d’`Équipement!M4:M9`, `M15` et `M18`. Vérifier le sens du poids global I4 quand aucun casque n’est porté. Définir les effets des enchantements, armes et traits textuels. Saisir manuellement les dés d’arme en attendant.
3. **Combat et session.** Faire valider les transitions à PV zéro, sursoin, variation des maxima, mana insuffisant, lancement de sort, déclenchement et décroissance des recharges, durée de posture et seuils de critiques des cellules AF8:AJ10. Donner au MJ des cas d’entrée et de sortie pour chaque transition. Le compteur de tour seul est automatique et les valeurs courantes sont éditées manuellement. Le jet rapide d’initiative utilise un modificateur entier.
4. **Corrections et données.** Arbitrer l’annulation de transaction, la correction d’XP et les conséquences d’un examen échoué. Un instantané IndexedDB illisible bloque actuellement l’ouverture et préserve les données. Préparer une procédure de récupération ciblée et une migration éprouvée lorsqu’une autre version du format existe.
5. **Univers.** Vérifier les droits de la carte et de chaque illustration. Ne publier que les contenus joueurs approuvés. Les classeurs et les données personnalisées restent hors des ressources de production. La branche de revue vers `main` omet les deux binaires déjà présents sur la branche privée de référence `feature/ulnar-v1`.
6. **Recette et diffusion.** Obtenir les résultats de CI sur le SHA de revue. Mesurer les parcours avec le MJ et les joueurs pilotes. Valider l’hôte, le DNS, le certificat, les accès à chaque URL et la révocation depuis un réseau invité. Tester la restauration et le retour arrière en recette avec des fiches fictives avant toute promotion.

## Critères de recette PRD

| Critère | État |
| --- | --- |
| AC01 accès invités | Réussi sur Caddy fictif. Réseau et hôte réels à qualifier. |
| AC02 profil et statistiques | Parcours et références implémentées testées. Égalité avec l’oracle natif et accord MJ à établir. |
| AC03 collections, budget et dés | Édition, budget passif et réserve d’armure testés. Dés d’armes et effets textuels à arbitrer. |
| AC04 banque | Contrôles locaux réussis, y compris refus de dette. |
| AC05 métiers | Règles confirmées validées par tests unitaires et E2E. |
| AC06 dés et historique | Jets et persistance testés. Classement automatique des critiques en attente. |
| AC07 persistance et portabilité | Parcours, concurrence, erreurs et copie validés localement. |
| AC08 pilotes | Recette et comparaison des temps avec le classeur à réaliser. |
| AC09 livraison | Préparation et pilote fictif validés. CI du SHA, recette réelle et approbations requises. |
| AC10 isolement multi-personnage | Validé localement. |
| AC11 session | Suivi manuel validé. Transitions automatiques en attente. |
| AC12 référentiels et ressources | Catalogue affiché et confidentialité du build vérifiée. Carte, illustrations et recette d’accès en attente. |
