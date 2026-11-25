# Ulnar V1 — décisions confirmées et questions résiduelles

## Confirmé par le porteur
- Dépôt privé, hébergement sur serveur personnel, accès réservé aux joueurs invités; contenu joueur (carte, illustrations, races, classes, règles), sans secrets MJ. Les droits des assets individuels restent à vérifier.
- Plusieurs personnages locaux par joueur; gestion en session des PV, PM, dégâts, soins, sorts, cooldowns, postures. Pas de synchronisation ni d'espace MJ central en V1 (V2 import MJ, V3 connecté).
- Fiche vierge officielle; races/classes/métiers personnalisés par personnage. Nyssara est une référence personnalisée et ne remplace pas le catalogue commun.
- Reproduction stricte des formules existantes, y compris anomalies; les arbitrages ci-dessous priment. Ne pas corriger silencieusement une formule.
- Monnaie : 1 PP = 1000 PO; 1 PO = 10 PA; 1 PA = 10 PB. Donc 1 PP = 100000 PB, 1 PO = 100 PB, 1 PA = 10 PB. Solde final négatif interdit, transaction rejetée sans mutation.
- XP des métiers : premier jet de chaque métier par session, indépendamment; critique réussi +4, réussite +2, échec +1, échec critique +0. Palier 6 bloque les gains. Paiement d'examen manuel; montée de palier après confirmation manuelle de l'accord MJ et seuil suffisant, surplus conservé. Étude hors premier jet exclue en V1.

## Interprétations de conception (à signaler, non nouveaux arbitrages)
- Un premier jet en échec critique consomme le droit au premier jet même avec 0 XP; ouverture explicite d'une nouvelle session et état persisté.
- Montants entiers sûrs; refuser les entrées invalides plutôt que les convertir silencieusement à zéro; historique proposé et confirmation. Seuils métiers 10/15/30/60/120 et prix 10/40/160/640/2480 PO à vérifier contre le classeur. Aucun débit automatique lors de l'examen.
- Niveau 0 accepté dans le schéma de profil actuel à titre provisoire; ne pas fixer un maximum sans preuve métier. Vérifier écarts entre la fiche vierge et Nys V3 (notamment bonus de niveau). Ne pas inventer de modificateurs de classe.
- Caddy/Basic Auth, IndexedDB, modèle d'export versionné et stratégie de déploiement pull tels que documentés. Choix d'infrastructure à tester sur environnement fictif; les paramètres du serveur réel restent inconnus.

## Questions à isoler si les sources ne suffisent pas
Fonctions Sheets non reconstructibles, références d'armure, budgets et allocation de niveau, interprétation base pp, calculs de ressources et postures, limites de soins/mana et changement des maxima, critiques et cooldowns, effets textuels des traits/enchantements, corrections d'XP/transactions et droits des illustrations. Se référer aux sources exactes; signaler les ambiguïtés avec la cellule concernée et un exemple concret. Ne bloquer que le comportement concerné.
