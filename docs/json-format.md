# Format d’échange JSON

Une exportation contient la totalité des données sources d’une fiche au format UTF-8. Le format est compatible avec une nouvelle origine ou un autre profil navigateur si la version du format et celle des règles sont prises en charge.

| Clé | Valeur |
| --- | --- |
| `schemaVersion` | Version du format. La version prise en charge est `1`. |
| `rulesVersion` | Version du référentiel de règles. La version prise en charge est `blank-sheet-v1`. |
| `exportedAt` | Horodatage UTC de l’export au format ISO 8601. |
| `character` | Profil avec UUID, date d’entrée en jeu, allocations, collections, portefeuille en bronze, transactions, métiers, session et historique des dés. Le catalogue personnalisé est facultatif et lié à l’UUID de la fiche. |

Les caractéristiques calculées, les maximums, le détail du solde et les budgets sont recalculés depuis les sources. L’enveloppe ne contient aucun identifiant d’accès au site, aucune image et aucun classeur. Les fiches incluent le texte saisi par le joueur. Conservez les exports comme des documents privés.

L’application vérifie la syntaxe JSON, une taille maximale de 1 Mio calculée en octets UTF-8, la profondeur d’imbrication et les clés interdites. Les champs inconnus, les références incohérentes et les versions incompatibles sont rejetés. La première version n’a aucun format antérieur à migrer. Une version future devra déclarer ses migrations explicitement.

L’aperçu valide et décrit le fichier sans l’enregistrer. Lors d’une collision d’UUID, le remplacement conserve une version précédente et sélectionne la fiche dans la même transaction IndexedDB. La copie crée un nouvel UUID et réattribue le catalogue personnalisé. Les références internes aux sorts, aux objets et à la session de la fiche copiée sont conservées.
