# Ulnar RPG — Feuille de route de développement

**Version de conception 1.0 — 25/11/2026 — soumise à approbation finale.** C = décision confirmée; P = recommandation à approuver; Q = détail technique ou métier à résoudre avant le lot concerné. Aucun code applicatif, test exécuté ni déploiement réalisé.

## 1. Phases et dépendances

| Phase | Tâches | Dépendances | Livrables / critère de sortie |
|---|---|---|---|
| P0 — cadrage (actuel) | Analyse classeur, PRD, stack et architecture, risques, questions, droits et périmètre; obtenir décisions utilisateur | Classeur fourni, échanges antérieurs | Cinq docs V1.0, réponses et approbation écrite. Aucun développement. |
| P1 — référentiel et bootstrap | Exploiter la fiche remplie et les scripts reçus; collecter les règles officielles autorisées; inventorier formules et données; caractériser strictement les formules, sans correction; vérifier le repo privé déjà créé et son README, préparer tickets, ADR, squelette, Node/TS/Vite, lint/tests/CI; spike hébergement personnel HTTPS/auth fictif | P0 approuvée, référent disponible | Matrice règles avec priorités; fixture de référence; CI verte; URL fictive vérifiée privée, aucun contenu réel exposé; coût validé. Les règles non résolues bloquent leurs lots. |
| P2 — domaine et fiche de base | Types/schema, catalogues autorisés, calculs caractéristiques/progression, moteur de dés, commandes et UI profil/base; fixtures de niveau/race et tests unitaires | P1; matrice de fidélité statistiques et dés | AC02 et base AC06 sur staging; résultats identiques aux fixtures approuvées; aucune formule métier dans UI. |
| P3 — stockage et portabilité | Adaptateur IndexedDB, liste/sélection multi-personnage, save/load, backup précédent, migration, codec JSON, aperçu import, validation, gestion erreurs, historique de jets | P2 modèle stable | AC06/AC07/AC10 : réouverture, export/import, données intactes après erreur, test quota et deux onglets. |
| P4 — modules métier | Sorts/traits et budgets; équipement/enchantements; inventaire/banque; métiers/examens; intégration moteur de règles et référentiels. Sous-lots P4a–e (e : gestion de session) indépendants après modèle commun | P2/P3; arbitrages de chaque module | AC03–AC05/AC11, tests unitaires + intégration, validations MJ; aucun effet inventé. |
| P5 — consolidation UX/sécurité | Navigation, responsive, accessibilité, mesures perf, tests E2E; vérification confidentialité, inputs, assets, scans; carte/illustrations et référentiels joueurs autorisés | P1–P4 | N01–N07 et AC12 satisfaites ou écarts acceptés, E2E vert, staging protégé et aucun défaut critique/majeur ouvert. |
| P6 — recette et release | Joueurs pilotes/MJ, comparaison classeur, finalisation guide et règles, démo CI/CD, smoke, backup/rollback, tag v1.0.0 et promotion | P5, accord recette | AC01–AC12, preuves tests/rollback, accord référent et porteur, release V1 privée. |

Ordre recommandé : P0 → P1 → P2 → P3 → P4a/b/c/d/e → P5 → P6. P4 sous-lots peuvent être réalisés en parallèle après P3 si capacités, mais intégration et validation métier restent séquentielles par règle. Ne pas lancer V2 tant que V1 n'a pas été acceptée et qu'un besoin MJ concret n'a pas été observé.

## 2. Backlog initial et critères de fin

| ID | Lot / tâche | Dépend de | Terminé lorsque |
|---|---|---|---|
| ULR-001 | Valider scope, stack, hosting et questions | — | Décision écrite, ADR proposé approuvé |
| ULR-002 | Référence Excel, règles et scripts autorisés | 001 | Sources versionnées en privé, droits notés, matrice et cas attendus |
| ULR-003 | Dépôt, outillage et PR/CI | 001 | PR de bootstrap verte, accès mainteneur revu |
| ULR-004 | Spike serveur personnel HTTPS + auth | 001,003 | HTML et assets fictifs protégés, accès réseau et coûts vérifiés |
| ULR-005 | Modèle, catalogue, validation et calcul des statistiques | 002,003 | Fixtures validées, tests de limites, derived state |
| ULR-006 | Profil, progression et navigation | 005 | F01/F02, champs calculés protégés |
| ULR-007 | Jets de dés et historique | 005 | F07, bornes et historique testés |
| ULR-008 | IndexedDB multi-personnage, JSON et restauration | 005–007 | F08/F13/AC07/AC10, migrations et échecs non destructifs |
| ULR-009 | Sorts/traits | 008 | F03, budget validé |
| ULR-010 | Équipement | 008 | F04, dés/effets validés |
| ULR-011 | Inventaire/banque | 008 | F05, taux ×10 et refus dette testés |
| ULR-012 | Métiers | 008 | F06, gains/session, palier 6 et examen manuel testés |
| ULR-016 | Gestion de session PV/PM, sorts, cooldowns, postures | 008–010 | F11/AC11; matrice des transitions et tests validés |
| ULR-017 | Carte, illustrations et règles joueurs | 002,008 | F12/AC12; droits et absence de secrets vérifiés |
| ULR-013 | UX/accessibilité/performance | 009–012,016,017 | N01–N03 vérifiées |
| ULR-014 | Sécurité et E2E | 004,009–013 | AC01/AC07, tests hostile et réseau, CI verte |
| ULR-015 | Recette, documentation, déploiement/rollback | 013,014 | AC01–AC12, tag et preuves |

Definition of Ready : ticket a objectif, règle validée ou explicitement hors calcul, dépendances et critères de recette; pas d’implémentation d’une règle non reconstructible ou absente. Definition of Done : revue PR, tests pertinents verts, aucune régression, documentation et matrice de règles mises à jour, sécurité vérifiée selon risque, acceptation métier si changement de calcul.

## 3. Risques et blocages

| Risque | Impact / probabilité (estimations P) | Mitigation / responsable proposé |
|---|---|---|
| Formules Excel/Sheets divergentes, notamment armure, gain niveau, PV/PM | Fort / élevée | Reproduction stricte; comparer au classeur recalculé; bloquer seulement les comportements non reconstructibles/non définis |
| Scripts reçus mais divergences banque et métier | Fort / élevée | Six arbitrages confirmés; tests comportementaux; étude exclue; corrections et mécanisme de session à préciser |
| Diffusion non autorisée de carte/portraits/règles | Fort / inconnue | Porteur confirme droits, exclure contenu secret/non autorisé, revue build |
| Origine web directe ou authentification contournable | Fort / moyenne | Spike avec données fictives, tester toutes URLs; pas de publication avant succès |
| Données perdues avec IndexedDB ou ordinateur partagé | Fort / moyenne | Export fin de session, backup précédent, quota, avertissement; si isolation réelle requise, revoir stack |
| Joueur modifie JSON/jet côté client | Moyen/fort selon confiance | Transparence, pas de certification V1, contrôle MJ manuel; V3 autorité serveur |
| Périmètre s'étend à Roll20/campagne/synchro | Fort / moyenne | Définition MVP et backlog V2/V3, change request approuvée |
| DOM natif trop complexe ou stockage saturé | Moyen / moyenne | Architecture modulaire, mesure, seuils; ADR pour Vue si nécessaire; IndexedDB retenu en proposition |
| Quotas/coût/permissions GitHub ou hébergement personnel | Moyen / inconnue | Vérifier plan et permissions avant P1, alternative approuvée |
| Règles évoluent après publication | Fort / moyenne | RulesVersion séparée, changelog, migrations/test régression, accord MJ |

## 4. Documentation et livraison

À maintenir dans repo : cinq documents présents, README (prérequis, installation future, parcours de développement, liens), ADR (décisions datées), matrice règles et sources autorisées, format JSON et politique migration, guide joueur (saisie, calcul, dés, sauvegardes et limites), guide mainteneur (inviter/révoquer, CI/CD, rollback, incident), changelog, résultats de recette et licence/droits de contenu. Ces documents additionnels seront produits aux phases correspondantes après approbation.

## 5. Évolution hors MVP

V2 : étudier lecteur/import de plusieurs fiches côté MJ, synthèses utiles et détection d'incohérences, compatibilité du format V1, aucune confiance automatique dans JSON. Définir critères de charge MJ après pilote. V3 : design séparé API/BDD, identité/roles MJ-joueur par campagne, autorisation objet, migration depuis JSON, synchronisation, conflits et journal de sécurité, jets éventuellement serveur; nécessite nouveau PRD, budget, threat model et tests. Ni V2 ni V3 ne sont engagées par l'approbation V1.

## 6. Porte de validation P0 et prochaines étapes

Les douze arbitrages sont confirmés. Approbation globale encore requise pour PRD, architecture, testing, DevOps et roadmap V1.0, y compris IndexedDB, Caddy et CI/CD pull proposés. Dépôt privé déjà créé; PR documentaire `docs/project-planning` possible sans code. ULR-001 reste ouvert jusqu'à accord écrit; aucun bootstrap applicatif avant cet accord.

P1 : déterminer la machine personnelle, système, domaine, accès public ou VPN, CGNAT/NAT, pare-feu, proxy existant et capacité de sauvegarde; réaliser une URL fictive privée et CI verte. P2/P4 : matrice des formules avec oracle recalculé, sans corrections tacites; fonctions Sheets non reconstructibles et règles de session non définies bloquent les lots concernés. P4c/d : banque et métiers selon décisions confirmées; étude exclue. P5 : vérifier les droits des fichiers joueurs et absence de données MJ; P6 : recette et release privée. Aucun de ces jalons n'est déclaré exécuté.

