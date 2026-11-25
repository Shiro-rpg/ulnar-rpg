# Matrice de traçabilité des règles V1

La fiche vierge constitue le référentiel officiel. Les arbitrages explicites de [validated-decisions.md](validated-decisions.md) priment sur les formules de banque et de métiers. Le second classeur est une référence comparative personnalisée. Les valeurs de la fiche personnelle, son lore et ses images restent dans les sources privées.

## Lecture et recoupement

Les deux fichiers ont été lus séparément en mode formule et en mode cache avec openpyxl 3.1.5. Le comptage porte sur les cellules de formule et inclut les fonctions encapsulées. Aucune macro ni fonction Sheets n'a été exécutée.

| Onglet | Officiel | Référence | Rôle |
| --- | ---: | ---: | --- |
| Présentation générale | 7 | 7 | Renvois de profil et de calculs |
| Informations de base | 66 | 68 | Récapitulatif, entrées et caractéristiques |
| Sorts et Traits | 1 | 1 | Budget passif |
| Équipement | 18 | 18 | Armure, dés d'arme et recherches de textes |
| Inventaire | 0 | 0 | Règles écrites, scripts historiques |
| Métiers | 20 | 20 | Renvois vers les métiers et leurs compétences |
| Carte dUlnar | 0 | 0 | Contenu graphique, droits à confirmer |
| Traits disponibles | Absent | 0 | Onglet propre à la référence personnalisée |
| Data automatisation | 24 | 24 | Tables et calculs auxiliaires |
| **Total** | **136** | **138** | |

Une évaluation indépendante en Python des formules d'attributs, budgets, ressources et initiative a repris les cellules d'entrée, les tables raciales et les références de chaque classeur. Elle concorde avec 42 caches sur 42 dans la fiche vierge et 44 sur 44 dans la référence personnalisée. Le budget passif concorde également dans les deux classeurs. Ce contrôle n'est pas un recalcul natif dans Excel ou Google Sheets. Les tests du moteur utilisent des données fictives avec des résultats calculés à la main et vérifient les références et arrondis ci-dessous.

## Caractéristiques et traits

| Règle | Cellules de la fiche vierge | Entrées et résultat | Vérification |
| --- | --- | --- | --- |
| STA-01 | Informations de base H29:Y29, Z29 | Un champ par secondaire, validation décimale de 1 à 4. Budget 16 moins somme initiale. | Bornes et décimales dans `stats.test.ts`. Une allocation de 17 donne un solde de −1. |
| STA-02 | Informations de base H30:Y30, Z30, H31:Y31 | Budget précoce `QUOTIENT(MIN(niveau, 10), 3)` moins dépense. Chaque total intermédiaire additionne les lignes initiale et précoce. | Budgets aux passages de niveau et effet d'un point précoce dans `stats.test.ts`. |
| STA-03 | Informations de base H32:Y36 | Total intermédiaire, modificateur racial recherché en colonnes H à M du catalogue, ajustements signés et gains tardifs. Une cellule raciale vide vaut zéro dans la somme. | Fixture fictive avec bonus, malus et valeurs nulles dans `stats.test.ts`. |
| STA-04 | Informations de base Z35 | Au-dessous de 11, budget tardif nul. De 11 à 20, `QUOTIENT(niveau - 9, 3)`. Au-delà, `QUOTIENT(10, 3)`. Soustraire les gains attribués. | Test des niveaux 10, 11, 12, 15, 18, 20 et 21, entre autres. |
| STA-05 | Informations de base H40, K40, H41, K41, H48, K48 | PV Max = base raciale + 2 × (Force initiale + Finesse initiale) + ajustements + allocation PV. PM Max = base raciale de la colonne C + 2 × (Savoir initial + Instinct initial) + ajustements + allocation PM. Les gains précoces et tardifs ne modifient pas les bases H41/K41. | La fixture vérifie 48 PV et 31 PM avec des gains et ajustements différenciés. |
| STA-06 | Informations de base N41:W42, N48:W48 | Physique = 10 × (Force + Finesse), Social = 10 × (Charisme + Empathie), Mental = 10 × (Savoir + Instinct), Volonté = 5 × (Force + Empathie + Savoir). Ces bases lisent les totaux intermédiaires de la ligne 31. Appliquer les modificateurs principaux raciaux et les ajustements saisis. La ligne 47 n'entre que dans Volonté parmi les quatre principales. | Fixture avec modificateurs, ajustements et gains tardifs. |
| STA-07 | Informations de base T47, Z41, Z48 | Budget principal = niveau × 10 moins les quatre cellules H47/K47/W47/Z47. Initiative = Finesse + Charisme + Instinct de la ligne 31 + ajustements + `FLOOR(Z47/2, 1)`. | Dépense impaire de 5 qui ajoute 2 à l'initiative. |
| TRA-01 | Sorts et Traits AF23 | `10 + niveau × 5 + (niveau ≥ 11 ? 10 : 0)` moins la somme des coûts numériques de AE14:AI22. Le texte et les cellules vides sont ignorés par SUM. | Niveaux 1, 10 et 11, coûts décimaux, gratuité et dépassement dans `stats.test.ts`. |

Le calcul officiel suit les références surprenantes telles qu'écrites. Le champ du catalogue nommé `basePp` reste le nom de la colonne C. La cellule K40 l'utilise directement dans la colonne PM. Les ajustements saisis sont stockés comme totaux signés par statistique. Les effets textuels des traits, objets et enchantements ne modifient pas automatiquement ce total. Lorsque la somme des dépenses dépasse le budget, la formule rend un solde négatif. Le classeur ne spécifie pas la politique de blocage ou de correction de cette situation.

Dans le classeur personnalisé, `Informations de base!H33:W33` inclut la ligne H31:Y31 supplémentaire, et le budget de la ligne 50 ajoute la constante de T49. Ces références sont absentes de la fiche vierge. `Sorts et Traits!AF21` conserve le même budget avec une plage de coûts décalée. Aucune de ces cellules personnalisées ne modifie les règles communes.

## Équipement, métiers et banque

| Règle | Cellules ou source | Comportement / état de validation |
| --- | --- | --- |
| EQ-01 | Équipement M10, Data automatisation N29:W31 | Le calcul assemble les dés selon le seul poids I4. Il additionne les paliers F4:H8, les deux enchantements Protecteur Q4/Q5 avec W4/W5 et les attributs d'armes Protectrice (+1 par entrée), Gardienne (+2), Blindé (+palier d'arme). Les deux classeurs ont les mêmes formules de total. Confirmer auprès du MJ qu'une armure sans casque doit conserver la dépendance à I4. |
| EQ-02 | Équipement M4:M9 et M15/M18 | Les fonctions Sheets JOIN encapsulées par `__xludf.DUMMYFUNCTION` ne disposent pas d'un oracle exécutable. M4:M9 lit toujours I4. M15/M18 utilise le poids de l'arme et compte Légendaire (+2 faces) et Mythologique (+4 faces) dans la plage des attributs. Le second classeur contient des valeurs de secours différentes et une addition locale dans M15. Aucun résultat de cache ou de secours ne sert de règle. |
| EQ-03 | Équipement Z4/Z5, AS4, Y15:Y17, Y18:Y20 et Data automatisation A25:E61, G16:H59 | Les recherches d'enchantements et d'attributs donnent des textes. AS4 compte Protecteur × palier. Les effets formulés en prose demandent une matrice d'application et des droits de diffusion vérifiés. |
| BANK-01/02 | Inventaire I21:I23, arbitrage confirmé | 1 PP = 100 000 PB, 1 PO = 100 PB, 1 PA = 10 PB. Une transaction est atomique et un solde final négatif est refusé. Les taux et la dette du script historique sont remplacés. |
| JOB-01/04 | Métiers W2, W18:AA23, Data automatisation Q36:S41, arbitrages confirmés | Premier jet de chaque métier par session, gains 4/2/1/0, aucun gain au palier 6. Seuils 10/15/30/60/120 et coûts d'examen 10/40/160/640/2 480 PO. Examen après accord manuel du MJ, avec surplus d'XP conservé et paiement manuel. |
| JOB-02 | Métiers B2/AE2, Q3/AT3, G4/Q4/AJ4/AT4, G5/AJ5, F8:F16/AI8:AI16 (lignes paires), Data automatisation N37:N41/N47:N51 | Les renvois croisent le métier, les paliers et les compétences. Les recherches secondaires et l'indicateur d'examen sont traduits en lecture de catalogue et contrôle de seuil. Le palier 6 est terminal selon l'arbitrage explicite. |

## Présentation, session et contenus

| Source | Traitement / question restante |
| --- | --- |
| Présentation générale B2, B4:B9, Informations de base L7:L10, C15:AK15, AP16, V21, B22/F22/I22/L22 et B23/F23/I23/L23 | Renvois et concaténations de profil, caractéristiques, traits et armes. L'interface affiche ces données depuis la fiche et les calculs, indépendamment de leur placement dans le classeur. Dans la référence, les positions du récapitulatif changent et la synthèse des traits lit une plage décalée. |
| Data automatisation A16/A17 | Libellés dérivés des classes en cours. Les données disponibles n'établissent pas de modificateur de classe automatique. |
| Informations de base AF8:AJ10 et AF28:AJ31 | Seuils critiques affichés et descriptions des postures. Faire préciser bornes, moment d'application, précédence et interaction avec les jets modifiés. Le suivi manuel ne classe pas automatiquement les résultats. |
| Sorts et Traits, Informations de base et scripts historiques | Les sources n'établissent pas le comportement en cas de sursoin, PV à zéro, variation des maxima, mana insuffisant, avancement de tour ni déclenchement et expiration des cooldowns. Demander une matrice de transitions avec cas refusés et exemples avant toute automatisation. |
| Inventaire et Métiers | Modalités d'annulation de transaction, de correction d'XP et d'échec à l'examen en attente de décision. Le premier jet à 0 XP consomme le droit de gain dans la session, conformément à l'interprétation de conception documentée. |
| Carte dUlnar, Traits disponibles, fichiers graphiques | Confirmer l'origine et l'autorisation de diffusion de chaque ressource. Exclure tout contenu personnalisé ou réservé au MJ du build. |
