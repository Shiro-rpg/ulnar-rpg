# Ulnar RPG — Stratégie de tests

**Version de conception 1.0 — 25/11/2026 — soumise à approbation finale.** C = décision confirmée; P = recommandation à approuver; Q = détail technique ou métier à résoudre avant le lot concerné. Aucun code applicatif, test exécuté ni déploiement réalisé.

## 1. Objectifs et organisation

Pyramide : nombreux tests unitaires déterministes, tests d'intégration sur frontières et quelques E2E critiques. Tests métier à partir du classeur et des arbitrages du référent; pas d'utilisation aveugle de valeurs en cache Excel. Chaque règle possède ID, référence cellule/texte, entrée, résultat attendu, statut validé, test associé et version de règles. Données de test fictives ou anonymisées autorisées. Le fichier `Nys V3.xlsx` et les scripts sont reçus; extraire un fixture minimisé et faire valider les résultats mis en cache avant de les utiliser comme oracle.

| Niveau | Outils proposés | Déclenchement |
|---|---|---|
| Unitaires | Vitest; couverture V8 | local, PR, main |
| Intégration | Vitest, jsdom et adaptateurs de stockage testables | PR, main |
| E2E | Playwright, Chromium + Firefox, viewport mobile | PR, main et staging |
| Qualité | TypeScript strict/typecheck, ESLint, Prettier check | PR, main |
| Sécurité | npm audit, recherche de secrets Gitleaks, revue dépendances, Playwright; OWASP ZAP baseline passive sur staging autorisé si pertinent | PR/main, staging et prérelease |
| Accessibilité/perf | axe-core avec Playwright, Lighthouse ou mesures navigateur | staging, prérelease |
| Recette | référent règles, MJ et joueurs pilotes | avant release |

Ne pas confondre couverture et exactitude. Cible proposée : 90 % des branches du moteur métier et 80 % des lignes globales hors code généré; 100 % des règles MVP approuvées reliées à au moins un test, cas limites pour chacune. Ne pas baisser une cible pour masquer une lacune; justifier les exclusions. Pas de tests live dépendant d’un serveur personnel ou de credentials en PR.

## 2. Unitaires — matrice métier minimale

| Domaine / source | Cas à prévoir |
|---|---|
| Caractéristiques — Informations de base H29:Z48 | 16 points initiaux; valeurs 1 et 4, hors borne, allocation excessive; niveau 1, 2, 3, 6, 9, 10, 11, 12, 15, 18, 20 et hors plage à arbitrer; race valide/inconnue; bonus/malus et recalcul des six secondaires, quatre principales, PV/PM et initiative. Comparer à fixture référent. |
| Ressources H41/K41/T47/Z48 | Niveau et bonus impactent-ils PV/PM selon la règle validée ? Initiative paire/impaire; budget 10 par niveau; cohérence des allocations de ligne 47; changement de race, pas de double cumul. |
| Traits AF23 | Niveau 1 = budget 15 avant achats; niveau 10 = 60; niveau 11 = 75 selon formule; coût numérique, gratuit/événement, coûts invalides; classe principale/secondaire, origine. Valider ces attentes avec référent avant assertions. |
| Armure et armes | Paliers 1–4; poids D4/D6/D8; références de poids strictement identiques au classeur; aucun équipement, deux armes, attributs Légendaire, Mythologique, Protectrice, Gardienne, Blindé; enchantement indisponible; éviter addition deux fois; ne pas copier __xludf.DUMMYFUNCTION. |
| Inventaire et monnaie | Taux officiels 10 PB = 1 PA, 10 PA = 1 PO, 1000 PO = 1 PP; gain, dépense, conversion multi-palier, solde zéro, dette refusée, dépassement entier, saisie invalide/décimale (P); échec sans mutation. |
| Métiers | XP 2/4/1/0, premier jet par métier/session, échec critique à 0 XP consommant le premier jet (P), gains bloqués au palier 6, seuil exact et surplus, examen confirmé par joueur après accord MJ, aucun débit automatique, étude exclue; corrections Q; prix et compétences source à vérifier. |
| Dés | D100, D8, D20 + initiative, expression 2D6, plusieurs dés; RNG injecté min/max, totaux et détail; seuils 1/10/11/90/91/100 à confirmer; modificateurs, expression invalide, bornes de dés et faces, biais évité par algorithme testé avec valeurs rejetées; aucun test statistique fragile comme condition principale. |
| Référentiels | Unicité ID, valeurs et références valides, 11 races/21 entrées de classes/18 métiers nommés comme inventaire initial; si liste évolue, version et fixture explicitement révisées. |
| JSON | Champs obligatoires, version, enums, longueurs, types, entiers sûrs, caractères accentués, valeurs inattendues, migration approuvée; round-trip sans perdre données sources. |

Comparer les formules exécutables à des cas recalculés dans le classeur source, y compris les anomalies connues. Les caches sont des indications, pas des oracles suffisants. Toute fonction non reconstructible ou règle absente bloque son automatisation jusqu’à spécification.

## 3. Intégration

- Commandes → validation → calcul → sauvegarde : une édition invalide ne modifie ni mémoire ni persistance; mise à jour valide visible et stockée.
- Import/export : création → export → nouveau stockage → import → équivalence sémantique; JSON malformé, version future, champ inconnu dangereux, fichier trop lourd, profondeur excessive; ancien état intact, pas de perte silencieuse.
- Stockage : premier lancement sans données, redémarrage, snapshot IndexedDB corrompu, quota/stockage désactivé, migration et restauration précédente; concurrence de deux onglets (avertissement ou gestion explicite), erreur signalée.
- Interaction UI avec domaine : contrôles en lecture seule, messages compréhensibles, calcul reflété après changement de race/niveau, gestion des ressources, cooldowns et postures selon matrice, historique jet et transaction exactement une fois.
- Vérifier que l'application ne transmet pas de données de personnage sur le réseau; intercept des requêtes et inspection en staging.

## 4. E2E et recette (trace PRD)

| ID / AC | Scénario Playwright ou recette | Attendu |
|---|---|---|
| E01 / AC02 | Créer personnage fictif, sélectionner race/classe, saisir allocations, passer un niveau | Résultats de référence, pas de budget invalide silencieux |
| E02 / AC03 | Ajouter sort, trait, armure et deux armes | Budgets, dés et détails corrects |
| E03 / AC04 | Gain puis dépense avec conversion | Solde attendu, erreur non destructive |
| E04 / AC05 | Jet métier, XP, seuil, examen, surplus | Progression conforme |
| E05 / AC06 | Lancer D100 et initiative, puis un dé de dégâts | Valeurs bornées, historique lisible |
| E06 / AC07 | Actualiser, exporter, importer dans contexte vierge; importer fichier invalide | Données retrouvées, état précédent conservé |
| E07 / AC01 | Navigateur anonyme, mauvais identifiants, invité, compte révoqué; HTML/JS/JSON/images, anciennes URLs et origine directe | 401/403 sans contenu protégé; seul invité reçoit application; nouvelles requêtes révoquées refusées |
| E08 / AC08 | Navigation clavier, zoom, largeur 360 px, Chrome/Firefox | Aucune perte de fonctionnalité majeure, pas de débordement global |
| E09 / AC09 | Staging → prod → rollback d'une version fictive | Build identifié, accès protégé et données compatibles |

E07 : tests négatifs anonymes et tests de compte staging dédié, stocké hors bundle, rotation/révocation vérifiée. HTTP Basic n’a pas de déconnexion fiable; tester de nouvelles requêtes après révocation et documenter les copies locales. Ne pas rendre le site public pour tester. E09 : test d'export et réimport avant rollback si schéma change.

## 5. Sécurité et non-fonctionnel

| Risque | Test / contrôle |
|---|---|
| Contournement auth | GET direct de chaque type d'asset, URL origine directe, staging, anciens releases, variantes host/path, vérifier deny-by-default et révocation; test cache après révocation. |
| XSS stockée via lore, sort, trait, inventaire, import | Chaînes HTML/JS, URL javascript, SVG hostile; affichage texte et CSP; pas d'exécution. |
| Prototype pollution / input non borné | Clés __proto__, constructor/prototype, objets profondément imbriqués, fichier volumineux, nombres infinis; refus sûr. |
| Injection d'expression de dés | Chaînes de code, dés gigantesques, notation inconnue; erreur rapide, aucun eval. |
| Secrets / dépendances | Scanner dépôt, artefact build et lockfile; secrets bloquants, criticité high/critical triée et corrigée ou exception écrite avec échéance; pas d'exception pour fuite réelle. |
| Perte/confidentialité données locales | Quota, import invalide, révocation, appareil partagé; avertissement et export; vérifier absence de données dans logs, URLs et analytics. |
| Performance | Jeu 100 objets, 30 sorts, 200 jets; p95 recalcul ≤100 ms; 5 chargements froids p75 ≤2,5 s sur profil documenté; bundle ≤300 KiB compressés hors images. Cibles P. |
| Accessibilité | axe-core, vérification manuelle focus, libellés, contrastes et clavier; aucun problème critique sur parcours MVP. |

## 6. Recette et définition de terminé

Référent/MJ signe chaque arbitrage métier; porteur accepte le périmètre. Proposition de recette : 3 joueurs et 1 MJ, même scénario sur classeur et application (création, allocation, équipement, jet, dépense, métier et export). Chronométrer temps médian, compter erreurs et corrections; objectif proposé ≥30 % de réduction de temps, aucun écart de résultat. MJ vérifie fixture et export lisible; en V1 pas de contrôle distant. Collecter résultats et défauts anonymisés. Un test non exécuté n'est pas un test réussi.

Release autorisée si PRD AC01–AC12 satisfaits, 100 % des règles validées couvertes, CI verte, aucun défaut critique/majeur ni vulnérabilité critique/haute non traitée selon politique, pas d'accès anonyme, export/restauration et rollback vérifiés. Le rapport de tests indique commit, versions, navigateur, environnement, fixtures et résultats. Échec → ticket, correction, re-test ou décision explicite hors scope avant release.

## 7. Cas de test de référence V1.0 — spécifiés, non exécutés

| ID | Entrée | Résultat attendu |
|---|---|---|
| BANK-A | Solde 0, +10 PB | 1 PA, 0 PB |
| BANK-B | Solde 0, +10 PA | 1 PO, 0 PA |
| BANK-C | Solde 0, +1000 PO | 1 PP = 100 000 PB |
| BANK-D | 42 PA, dépense de 43 PA | Refus, solde et historique inchangés |
| BANK-E (P) | « abc », 1,9 ou dépassement d’entier sûr | Refus sans mutation |
| BANK-F | 42 PA, dépense de 42 PA | Solde 0, accepté |
| BANK-G | 1 PO, dépense de 1 PB | 9 PA et 9 PB |
| JOB-A | Palier 2, 11 XP, premier jet critique | 15 XP, palier 2 inchangé |
| JOB-B | Palier 2, 17 XP, examen confirmé après accord MJ | Palier 3, 2 XP, portefeuille inchangé |
| JOB-C | Palier 2, 14 XP, demande de montée | Refus, XP et palier inchangés |
| JOB-D | Palier 6, gain de 4 XP ou tentative de montée | Aucun gain ni montée |
| JOB-E | Deux réussites du même métier dans une session | +2 XP au total |
| JOB-F | Premier jet réussi de chaque métier, même session | +2 XP pour chacun indépendamment |
| JOB-G (P) | Premier jet échec critique puis réussite | 0 XP au total pour ce métier |
| JOB-H (P) | Premier jet, actualisation ou export/import, nouveau jet | Aucun deuxième gain dans cette session |
| JOB-I (P) | Nouvelle session explicite, premier jet réussi | +2 XP si palier < 6 |
| JOB-J | Seuil atteint mais accord MJ non confirmé | Aucune montée ni débit |

Les six arbitrages utilisateur fixent les résultats métier; P désigne une proposition de comportement à valider. Les seuils et gains issus du classeur restent à vérifier avec le référent. L’étude est exclue; les exceptions de correction ne sont pas supposées. Aucun test n’a été exécuté.

## 8. Cas additionnels V1.0 (non exécutés)

| ID / AC | Scénario | Attendu |
|---|---|---|
| MULTI-01 / AC10 | Créer A et B, modifier A, changer vers B et recharger | Deux UUID distincts, aucun transfert d’état; sélection conservée |
| MULTI-02 | Import avec UUID existant, annuler, puis copier | Annulation intacte; copie nouvel UUID; B inchangé |
| MULTI-03 | Deux onglets écrivent la même révision | Écriture obsolète refusée; aucune perte silencieuse |
| MULTI-04 | Suppression annulée puis confirmée | Annulation intacte; suppression limitée à la fiche choisie |
| SESSION-01 / AC11 | Dégâts, soin, mana, sort, tour, posture puis rechargement | Transitions conformes à la matrice, état et historique conservés |
| SESSION-02 | Action refusée (coût/conditions/valeur invalide) | Pas de modification ni de double débit, message explicite |
| SESSION-03 | Deux personnages, changement de tour sur A | Cooldowns et postures de B inchangés |
| SESSION-04 | Premier jet échoué critique puis réussite; étude | 0 XP pour le premier jet; aucun gain au second; aucune action étude en V1 |
| WORLD-01 / AC12 | Carte, illustrations et règles en accès invité puis anonyme | Accès invité seul, aucun fichier source/secret MJ dans dist |
| DEPLOY-01 / AC09 | Release staging, promotion du même SHA, échec checksum, rollback | Échec non destructif; retour à l’artefact précédent; auth inchangée |

Les résultats numériques des transitions de combat sont à écrire à partir des règles Ulnar avant le lot P4e; les critères structurels ci-dessus ne définissent pas de nouvelles mécaniques. Tester les valeurs sources de Nyssara après recalcul, notamment dépendances de poids, ligne initiale PV/PM, initiative impaire et fonctions Sheets.
