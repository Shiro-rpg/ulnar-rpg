# 0001 — Persistance et transfert des fiches V1

La fiche est un agrégat local par UUID. Les valeurs calculées sont dérivées à partir du profil, des allocations et du catalogue, tandis que les valeurs courantes d’une session sont des observations saisies par le joueur. Le catalogue officiel reste partagé et immuable. Une extension personnalisée est liée à sa seule fiche.

IndexedDB conserve l’instantané courant, le précédent et la sélection. Les révisions monotones et les transactions empêchent deux onglets d’écraser silencieusement leurs écritures. La restauration échange les deux instantanés. Le joueur choisit entre copie et remplacement lorsque l’identifiant d’un fichier importé existe déjà. Les imports valident indépendamment la version du format et la version des règles.

L’interface native demeure une application statique. Les données sont rendues sous forme de texte et restent dans le navigateur, à l’exception des fichiers que le joueur exporte explicitement. L’authentification de l’hébergeur protège la distribution de l’application. Elle ne sépare pas les utilisateurs d’un même profil de navigateur.

La version 1 inaugure ce schéma IndexedDB. Une migration future requiert une stratégie explicite, un test de compatibilité avec les instantanés existants et la préservation des données en cas d’erreur.
