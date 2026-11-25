# Scripts Google Apps Script historiques — transcription comportementale

Source : code collé par le porteur dans la conversation du projet. Ce document est un résumé fidèle des opérations, pas une copie exécutable du script. Il ne constitue pas la règle officielle en cas de divergence avec validated-decisions.md.

## Banque
- SHEET_NAME = Inventaire; BALANCE_RANGE = I4:P4; DELTA_RANGE = I5:P5. Le commentaire historique mentionne M=PP N=PO O=PA P=PB, mais le destructuring effectif de toPb_ prend les indices 0,2,4,6 (I,K,M,O dans la plage). Ne pas confondre les commentaires et les opérations du script.
- PP_TO_PB = 10000000; PO_TO_PB = 10000; PA_TO_PB = 100. **Ces conversions historiques sont remplacées par les taux officiels ×10.**
- updateBank lit solde et delta, transforme chaque valeur via toInt_, convertit en bronze, additionne, normalise, réécrit la plage solde et efface les deltas; écrit I6 avec la date locale et toast.
- toPb_ destructure [pp,a,po,b,pa,c,pb,d] et somme pp*PP_TO_PB + po*PO_TO_PB + pa*PA_TO_PB + pb.
- fromPbNormalized_ prend signe et valeur absolue tronquée, décompose par division entière et reste successifs, réapplique le signe à toutes les unités et renvoie [pp,0,po,0,pa,0,pb,0]. Le script autorisait la dette; la V1 doit la refuser.
- toInt_ convertit vide/null/undefined en 0, retire les espaces, remplace une virgule par un point, convertit via Number, tronque les valeurs finies, renvoie 0 pour une entrée invalide. Ne pas reproduire ce masquage pour la validation des nouvelles saisies.

## Métiers
- SHEET_METIER = Métiers; SHEET_DATA = Data automatisation. Principal : XP N35, palier N36, seuil N37; secondaire : XP N45, palier N46, seuil N47.
- reussiteMetierPrincipal/Secondaire appellent updateMetierPrincipal/Secondaire(2); critique(4); echec(1). Aucun bouton de critique ratée dans le script fourni; la fiche prévoit 0 XP.
- updateMetierPrincipal/Secondaire lisent XP, niveau et seuil; ajoutent gain à XP, réécrivent XP et niveau inchangé, toast. Aucun verrou de session, contrôle de palier 6 ou historique.
- palierMetierPrincipal/Secondaire lisent XP, niveau, seuil; refus si niveau == 6 ou XP < seuil, sinon niveau += 1 et XP -= seuil; écrivent XP et niveau et toast. Le script ne vérifie pas le résultat d'examen et ne prélève aucun prix.
- En V1 appliquer les arbitrages confirmés : premier jet par métier et session, aucun gain au palier 6, confirmation manuelle après accord MJ, prix payé manuellement, surplus conservé, étude exclue.
