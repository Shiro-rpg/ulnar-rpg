# Ulnar RPG Character Sheet — PRD

**Version de conception 1.0 — 25/11/2026 — soumise à approbation finale.** C = décision confirmée; P = recommandation à approuver; Q = détail technique ou métier à résoudre avant le lot concerné. Aucun code applicatif, test exécuté ni déploiement réalisé.

## 1. Objectif et utilisateurs

Transformer la fiche Ulnar en application de gestion de personnage : réduire les ressaisies, erreurs de calcul et interruptions en session; permettre au MJ de vérifier plus facilement les fiches, puis de les centraliser dans une version ultérieure. Le joueur crée, consulte et modifie sa fiche; le MJ est validateur métier et destinataire potentiel des exports; le mainteneur publie les versions et gère les invitations. Le MJ n'a pas d'interface privilégiée en V1.

**Statuts :** C = confirmé par le cadrage utilisateur; P = proposition à approuver; Q = question ouverte, aucune règle implicite. Les observations du classeur sont des preuves de comportement, pas une validation de sa correction.

## 2. Périmètre par version

- C — V1 joueur : profil, caractéristiques et progression, sorts et traits, équipement, inventaire, métiers, jets et historique, sauvegarde locale, import/export JSON. Dépôt privé et site réservé aux joueurs invités (cette décision remplace la démo publique initialement envisagée). Pas de compte métier ni de synchronisation.
- C — V2 : interface MJ important les exports JSON, sans API partagée imposée.
- C — V3 : API commune MJ/joueur, persistance serveur et synchronisation; détails à concevoir séparément.
- C — source métier : classeur Fiche Vierge; le personnage de référence `Nys V3.xlsx` et les scripts Google Apps Script de banque et métiers sont désormais reçus. Les formules sont reproduites strictement; les arbitrages explicites priment. Les caches ne constituent pas un oracle suffisant.
- C — plusieurs personnages par joueur sur un même profil de navigateur, sélection du personnage actif, sauvegardes et historiques indépendants; pas de compte métier ni synchronisation.
- C — carte statique, illustrations, races, classes et règles destinées aux joueurs. Vérifier les droits de diffusion des fichiers et exclure tout secret MJ avant publication.

Hors V1 : interface MJ centralisée, comptes métier, partage temps réel, jets certifiés, serveur de règles, gestion de campagne/PNJ/combats complets, messagerie, intégration Roll20, éditeur de règles collaboratif, import automatique de fichiers Excel ou Sheets, application mobile native, mode hors ligne garanti, carte interactive, étude des métiers donnant de l’XP hors premier jet. Ne pas ajouter de mécanique D&D ou d'autres systèmes.

## 3. Parcours et exigences fonctionnelles

| ID | Priorité / statut | Exigence et résultat attendu |
|---|---|---|
| F01 | Must C | Profil : nom, race, niveau, classe principale et secondaire si biclasse, genre, âge, affiliations, divinité/esprit, lore, campagne/guilde, date d'entrée en jeu; présentation dérivée des données de base. |
| F02 | Must C | Six secondaires (Force, Finesse, Charisme, Empathie, Savoir, Instinct), quatre principales (Physique, Social, Mental, Volonté), PV/PM, dés d'armure et initiative; allocations et bonus/malus raciaux, traits et gains, calculs de progression et points restants. Afficher détail du calcul, champs modifiables distingués. |
| F03 | Must C | Sorts : nom, niveau, classe, catégorie, description, dégâts, portée, statistiques supplémentaires, durée, coût et coût de base, jet, CD, niveau de création/amélioration. Traits passifs (origine, effet, coût/obtention) et psychologiques (origine, description, flavor text); budget passif. Effets textuels conservés; automatisation seulement si règle approuvée. |
| F04 | Must C | Armures casque/buste/gants/bottes/bouclier, paliers, poids, enchantements et effets; deux armes avec paliers, dégâts, portée et attributs. Calcul des réserves de dés selon règles validées. |
| F05 | Must C | Inventaire : type, nom, quantité, valeur, effet. PP/PO/PA/PB, transactions signées, conversions officielles 1 PP = 1000 PO, 1 PO = 10 PA, 1 PA = 10 PB; confirmation et refus de tout solde final négatif. |
| F06 | Must C | Deux métiers selon la fiche; choix, XP, seuil, palier, compétences et validation d'examen; XP au premier jet de chaque métier par session, aucun gain au palier 6; prix affichés, paiement manuel, montée après confirmation manuelle de l'accord du MJ et seuil atteint, surplus conservé. |
| F07 | Must C | Jets locaux adaptés aux dés présents dans la fiche (D100, D8, D20 + initiative, expressions de dégâts/armure); historique lisible avec formule, résultat, horodatage et contexte. Postures et critiques conformes aux règles sources; MJ reste arbitre des effets conditionnels non formalisés. |
| F08 | Must C | Persistance locale par personnage après modification valide, liste et sélection de personnages, export JSON individuel versionné, import validé avec aperçu et confirmation avant remplacement. Import invalide sans altération de la fiche existante. |
| F09 | Must C | Accès au site uniquement pour invités; aucune URL de ressources ou de prévisualisation ne permet de contourner l'accès. Authentification d'hébergement, distincte des comptes métier. |
| F10 | Should P | Interface responsive et accessible, navigation par onglets, champs calculés en lecture seule, erreurs explicites, synthèse de personnage consultable rapidement. |
| F11 | Must C | Gestion dynamique en session : PV/PM courants, dégâts, soins, dépense de mana, sorts, cooldowns et postures. Les valeurs courantes sont distinctes des maximums calculés; les règles de bornage et d’écoulement des tours restent à spécifier. |
| F12 | Must C | Consulter la carte statique, les illustrations et les référentiels/règles joueurs autorisés. Aucun contenu MJ secret. |
| F13 | Must C | Gérer plusieurs personnages locaux, choisir le personnage actif et isoler ses données, sessions et historiques; aucune suppression sans confirmation. |

## 4. Inventaire source et arbitrages métier

Source inspectée : `Fiche Vierge(1).xlsx` (upload du 25/11/2026). 8 onglets visibles, 136 cellules à formule (7/66/1/18/0/20/0/24 dans l'ordre ci-dessous). Les résultats du classeur vierge ne sont pas des cas de validation suffisants.

| Onglet / cellules | Observation vérifiable | Décision requise |
|---|---|---|
| Présentation générale B2:B9, AF16 | Présentation dérivée des informations de base; cases grises saisissables, brunes protégées; crédits dans AO16. | Conserver distinction saisie/calcul et crédits; valider droit de diffusion des textes et images. |
| Informations de base H29:Z48 | 16 points initiaux, bornes 1 à 4 annoncées; gains aux niveaux 3/6/9 et 12/15/18. H41/K41 PV/PM calculés avec les lignes initiales; N41/Q41/T41/W41/Z41 utilisent H31 etc. | Confirmer plafonds, règles de niveau, quelles valeurs contribuent réellement à chaque résultat et si points négatifs sont refusés. |
| Informations de base T47, H48:Z48 | Budget 10 points/niveau; T47 soustrait H47,K47,W47,Z47 seulement; certaines sommes finales excluent la ligne 47; initiative divisée par deux arrondie vers le bas. | Vérifier allocation principale, volonté, initiative impaire et niveaux hors plages. |
| Informations de base AF8:AJ10, AF28:AJ31 | Marges critiques affichées 1–10 et 91–100; postures Offensive, Défensive, Esquive, Focus. | Confirmer seuils inclusifs, interaction avec bonus, jets et effets; simple rappel si non arbitré. |
| Sorts et Traits AF23 | Budget 10 + niveau × 5 + 10 à partir du niveau 11, moins coûts numériques; texte indique 15 au niveau 1. | Niveau minimum, coût libre/gratuit, création/amélioration; pas de déduction de mana implicite. |
| Équipement M4:M10, M15/M18; Data automatisation N29:W31 | JOIN encapsulé par __xludf.DUMMYFUNCTION (compatibilité Sheets), plusieurs lignes utilisent I4, même pour autres pièces. Poids Léger D4, Intermédiaire D6, Lourd D8; paliers 1–4; attributs Légendaire/Mythologique modifient faces. | Poids global ou par pièce, cumul des dés, paliers et enchantements, effets non numériques, limites de faces. |
| Inventaire I12,I20:I23 | Bouton de transaction décrit; 1 PP=1000 PO, 1 PO=10 PA, 1 PA=10 PB. Aucun calcul de banque dans les cellules. | Script reçu : 1 PA=100 PB, 1 PO=100 PA, 1 PP=1000 PO. C : conversions écrites retenues, solde négatif interdit. P : rejet des entrées invalides; annulation/correction à préciser. |
| Métiers W2,W18:AA23; Data automatisation Q36:S41 | Premier jet par session, XP 2/4/1/0 (réussite/critique/échec/échec critique); étude possible selon texte; surplus conservé après examen; seuils XP 10/15/30/60/120 puis ∞; coûts 10/40/160/640/2480 PO. | Script reçu : incréments 2/4/1, montée avec seuil atteint et palier différent de 6, surplus conservé. Aucun contrôle de session ni de réussite d’examen, aucun débit du coût. C : premier jet de chaque métier par session, aucun gain au palier 6, paiement manuel, confirmation après accord MJ. C : étude hors V1. Q : corrections et modalités exactes de session. |
| Carte dUlnar | Image/dessin intégré; pas de cellules de données ni formule. | C : carte statique dans le MVP; vérifier les droits et la présence du fichier source. |
| Data automatisation A2:M12,O1:O21,A67:A93 | 11 races, 21 entrées de classes, 18 métiers nommés; tables d'enchantements, attributs, compétences et XP. | Inclure les listes joueurs; identifier les règles personnalisées et vérifier les droits. Ne pas publier les secrets du MJ. |

Les cellules de formule doivent être tracées dans une matrice règle → source → résultat attendu → test. C : reproduire les références, arrondis et comportements existants, même si une anomalie est suspectée. Ne pas corriger sans nouvelle décision. Les questions du tableau servent à caractériser les résultats et les cas non définis, pas à modifier les formules. Une fonction Sheets non reconstructible bloque son calcul jusqu’à obtention d’un oracle exécutable ou d’une règle explicite. Le classeur mentionne les règles de Gerik, la création de personnage et des ressources associées; elles ne sont pas fournies en tant que documents de référence ici.

## 5. Exigences non fonctionnelles (cibles proposées)

| ID | Cible mesurable à valider |
|---|---|
| N01 | Recalcul affiché en ≤100 ms au p95 sur jeu d'essai normal (100 objets, 30 sorts, 200 jets), sur appareil de référence à définir. |
| N02 | Premier affichage utile ≤2,5 s au p75 lors de 5 chargements froids sur profil mobile simulé documenté; hors saisie d’identifiants. Bundle JS/CSS initial ≤300 KiB compressés hors images. |
| N03 | Firefox et Chromium récents; Safari/mobile à confirmer. Largeur 360 px sans débordement horizontal global; clavier, libellés, contrastes WCAG AA et focus visible. |
| N04 | Aucun secret dans dépôt/bundle; aucun envoi de fiche au serveur; accès refusé à un invité non autorisé sur HTML, JS et référentiels. |
| N05 | Export/import : équivalence sémantique à 100 % sur fixtures compatibles; données précédentes préservées à 100 % lors d'import invalide; message clair si quota dépassé. |
| N06 | 100 % des règles MVP approuvées couvertes par tests de référence; aucune divergence non expliquée avec fixtures validées; CI verte avant release. |
| N07 | Objectif économique : pas d'infrastructure serveur métier payante, coûts hébergeur et quotas vérifiés avant engagement; aucune dépense sans approbation. |

## 6. Critères d'acceptation de la release (proposés)

AC01 : joueur autorisé accède à la fiche, non-invité ne reçoit aucun asset protégé. AC02 : créer personnage valide, modifier une allocation/race/niveau; résultats attendus identiques au personnage référence et aux cas limites. AC03 : éditer sort/trait/équipement; budget, dés et effets supportés recalculés. AC04 : transaction +/− et conversions correctes; règles de solde respectées. AC05 : progression métier et examen conformes aux cas de référence. AC06 : jets dans bornes, historique correct, aucune promesse de certification. AC07 : actualiser/reouvrir même navigateur et retrouver données; export/import valide sur nouveau profil, import hostile/incompatible sans écrasement. AC08 : 3 joueurs pilotes et 1 MJ (effectif proposé) réalisent un scénario complet; zéro blocage, zéro défaut critique/majeur ouvert; comparer temps et erreurs au classeur. Cible proposée : réduction d'au moins 30 % du temps médian sur scénario standard, sans dégrader l'exactitude. AC09 : CI, sécurité, déploiement et rollback vérifiés; accord écrit du MJ et du porteur. AC10 : créer deux personnages, modifier A, basculer vers B sans contamination, actualiser puis exporter/importer A sans modifier B. AC11 : session avec dégâts, soins, mana, sort, cooldown, posture; état et historique persistants et conformes à la matrice de règles. AC12 : carte et ressources joueurs accessibles aux invités uniquement; aucun secret MJ dans le build.

## 7. Décisions finales et détails restant à spécifier

C : serveur personnel, multi-personnage local, gestion dynamique complète, contenus joueurs autorisés, fidélité stricte aux formules, étude métier hors V1. Ces décisions ne sont plus des questions ouvertes.

P : ordre de priorité documentaire : arbitrages explicites > formules sources > règles écrites > scripts historiques compatibles. Si les deux classeurs divergent sur une formule, ne pas choisir silencieusement la version de référence; soumettre le conflit au MJ.

P : serveur Debian dédié ou isolé, Caddy HTTPS et comptes d'accès nominatifs à mot de passe (pas de comptes métier), IndexedDB. Cibles de performance et couverture proposées en §5 et TESTING. L'approbation du plan autorise P1, pas la correction des règles historiques.

Q à résoudre par lot : domaine et accès Internet/VPN/CGNAT, système et reverse proxy existants, nombre de joueurs et procédure d'invitation (P1); comportement des fonctions Sheets non portables, conflits entre les deux classeurs, bornes et seuils non définis (P2/P4); PV/PM à zéro, sursoin, mana insuffisant, variation des maxima, durée des postures, définition du tour et règles de recharge, application des effets textuels (P4e). Les règles absentes ne seront pas inventées; une action manuelle ou un blocage explicite est préférable en attendant leur spécification. Confirmer les droits et fichiers des contenus avant diffusion (P5).

## 8. Arbitrages métier confirmés — V1.0

Sources : script bancaire et scripts métiers transmis en texte le 25/11/2026; `Fiche Vierge(1).xlsx` et `Nys V3.xlsx`, onglet Inventaire I21:I23. La capture GitHub atteste visuellement du dépôt privé initialisé, sans vérification distante.

| ID | Comportement observé | Décision V1 |
|---|---|---|
| BANK-01 | Script : PP=10 000 000 PB, PO=10 000 PB, PA=100 PB. Texte des deux fiches : PP=100 000 PB, PO=100 PB, PA=10 PB. | C : taux de la fiche (PP=100 000 PB, PO=100 PB, PA=10 PB). |
| BANK-02 | Addition d'un solde et d'une transaction signée; normalisation en quatre monnaies; valeurs négatives toutes signées; remise à zéro de la saisie; horodatage. | C : solde négatif interdit, refus non destructif. P : aperçu et historique local. |
| BANK-03 | Saisie vide ou non finie ramenée à zéro, décimales tronquées, espaces supprimés et virgule convertie. | P : refuser saisie non entière/invalide sans mutation plutôt que perte silencieuse; zéro pour champ vide. |
| JOB-01 | XP +2 réussite, +4 critique, +1 échec; fiche : 0 échec critique. | C : comportement de la fiche et deux métiers indépendants. |
| JOB-02 | Montée si XP ≥ seuil et niveau != 6; palier +1 et XP diminuée du seuil. | C : confirmation manuelle après accord du MJ, seuil atteint et palier < 6; aucun passage automatique. |
| JOB-03 | Pas de contrôle de session dans le script; la fiche décrit le premier jet et l'étude. XP continue au palier 6. | C : premier jet par métier et par session; bloquer les gains au palier 6. P : identifiant de session persisté et bouton Nouvelle session; un échec critique à 0 XP consomme le premier jet. C : étude exclue; Q : corrections. |
| JOB-04 | Coûts de paliers dans la fiche, sans débit dans le script. | C : paiement manuel, aucune mutation bancaire lors de la confirmation d’examen. Q : conditions de paiement en cas d’échec. |

Les douze arbitrages utilisateur (banque/métiers et cadrage final) sont confirmés. Les choix d’implémentation et la validation globale des cinq documents restent soumis à approbation. Aucun code applicatif engagé.

