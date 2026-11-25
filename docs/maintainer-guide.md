# Guide du mainteneur

Cette procédure prépare une livraison statique privée sur serveur personnel. Utiliser un hôte de recette isolé et des fiches fictives pour les essais. Confirmer avec le porteur le système de l’hôte, les accès d’administration, le DNS, la stratégie Internet ou VPN, les sauvegardes et les droits des contenus avant toute diffusion. Consigner les résultats avec le SHA Git, sans données de personnage.

## Qualification de l’artefact

1. Exiger le contrôle GitHub Actions `Quality and tests` sur le SHA à livrer. Le job exécute Playwright avec le Chromium officiel et produit l’artefact `ulnar-rpg-build`. Les vérifications locales utilisant le Chromium système complètent ce contrôle.
2. Récupérer l’artefact depuis le run CI correspondant dans le dépôt privé. L’examiner dans un répertoire de travail isolé. Avant extraction, refuser les chemins absolus, les traversées `..`, les liens symboliques ou matériels et les entrées qui ne sont ni fichiers ordinaires ni répertoires. Vérifier le nombre d’entrées et la taille totale décompressée.
3. Examiner l’inventaire exact des fichiers extraits et le contenu généré. Conserver uniquement `index.html` et les ressources statiques explicitement approuvées. Exclure les classeurs, leurs images incorporées, les sources privées, les jeux d’essai, les cartes ou images aux droits inconnus, les données de personnage, les secrets et les fichiers `.map`. Examiner aussi le JS et le JSON, car une donnée privée peut avoir été incorporée au bundle sans créer de fichier à son nom.
4. Associer à l’archive validée le SHA Git complet, l’identifiant du run CI, les versions du schéma JSON et des règles, la version candidate et la somme SHA-256 des octets effectivement promus. Conserver la somme et le manifeste hors racine web. Vérifier l’origine du run et la somme à chaque transfert.

## Installer le point de service

Utiliser une version maintenue de Caddy avec la directive `basic_auth` (Caddy 2.8 ou ultérieur). Le [Caddyfile d’exemple](../deploy/Caddyfile.example) sert un site de consultation. Toutes les requêtes HTTPS adressées à ce site traversent l’authentification avant d’atteindre les fichiers, y compris les demandes directes d’assets. La configuration refuse les méthodes de mutation, désactive le cache de ressources protégées et ne liste pas les répertoires. Elle exploite le provisionnement HTTPS automatique de Caddy. En réseau privé, déterminer et vérifier le mécanisme TLS et la confiance des appareils invités.

Séparer les origines et les invités de recette et de production. Pour chaque instance Caddy, définir les variables suivantes via la configuration du service. Les valeurs ci-dessous sont fictives.

```ini
ULNAR_SITE_ADDRESS=ulnar-staging.example
ULNAR_RELEASE_ROOT=/srv/ulnar-staging/current
ULNAR_AUTH_FILE=/etc/ulnar/staging-guests.caddy
```

Préparer `/srv/ulnar-staging/releases/` et un lien `current` vers une première version fictive qualifiée. L’utilisateur système Caddy a uniquement accès en lecture aux versions et au fichier des invités. Le compte de mise en service peut gérer les versions et le lien `current`. Mettre les certificats, la configuration, les sauvegardes et les archives hors de ces racines. Si un autre proxy dessert l’hôte, contrôler qu’aucune autre origine HTTP, adresse ou port ne sert directement ces fichiers.

Créer un compte nominatif par invité. Générer son hachage bcrypt avec `caddy hash-password`, qui prend le mot de passe en mode interactif. Le fichier des invités contient une ligne `identifiant hachage` par compte. Restreindre ses permissions et transmettre le mot de passe via le canal privé approuvé. Pour révoquer un invité, retirer sa ligne, valider la configuration et recharger le service. Vérifier un refus avec ce compte et l’accès ordinaire avec un compte encore autorisé.

Valider le Caddyfile avec `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` dans le contexte du service, avec les mêmes variables et droits de lecture. Depuis un client invité vérifier le TLS, la redirection HTTP vers HTTPS et `401` sans identifiants ou avec un compte invalide sur `/`, `/index.html` et chaque type d’asset réel. Avec un compte valide, vérifier le rendu et les téléchargements de fichiers statiques, l’absence d’index de répertoire et l’absence de fichiers privés. Tester les adresses alternatives et l’accès après révocation. Les accès déjà copiés localement restent sur l’appareil de l’invité.

## Activer, promouvoir et revenir en arrière

1. Préparer une nouvelle version immuable sous `releases/`, sous son identifiant vérifié. Contrôler permissions, inventaire, somme, compatibilité des exports JSON et espace disque disponible. Sauvegarder configuration, comptes hachés et version actuellement active.
2. Consigner la cible actuelle de `current` et prendre un verrou par site. Créer un lien vers la nouvelle version dans le même système de fichiers, puis utiliser un renommage atomique vers `current`. Sur Debian avec GNU Coreutils, `mv -Tf chemin-du-lien-temporaire chemin-de-current` réalise le remplacement atomique lorsque les deux chemins se trouvent sur le même système de fichiers. Le test local reproduit cette opération.
3. En recette, exécuter les vérifications d’accès, la création et la réouverture d’une fiche fictive, ainsi qu’un export et un import. Vérifier l’absence de transmission de données de personnage dans les requêtes. Après accord du porteur, promouvoir en production les mêmes octets et la même somme SHA-256 avec la procédure dédiée à cette origine. Utiliser une version stable distincte d’une candidate pour tout canal automatisé futur.
4. En cas de vérification en échec, remettre le lien sur sa cible précédente sous le même verrou et refaire les vérifications. L’authentification reste indépendante du lien. Pour un retour vers un schéma plus ancien, tester auparavant récupération et portabilité des fiches fictives. Conserver au moins trois versions vérifiées si l’espace le permet et nettoyer uniquement après succès.

Le workflow existant fournit des artefacts éphémères. Une publication privée durable, un mécanisme pull et sa réservation de versions sont des opérations distinctes qui exigent validation du serveur et accord du porteur. Aucun jeton ni identifiant de production ne doit apparaître dans Git, dans le build ou dans les rapports.

## Vérification locale avec données fictives

Avec Bash, cURL et Caddy installés, exécuter depuis le dépôt :

```sh
bash deploy/smoke.sh
```

Le test utilise un port de boucle locale et une autorité TLS temporaire approuvée uniquement par cURL. Il vérifie l’authentification des pages et des assets, les en-têtes de sécurité, l’absence d’accès à un fichier hors racine, la restriction des méthodes, le retour arrière et la révocation d’un invité fictif après rechargement. La recette depuis un réseau invité et le provisionnement d’un certificat pour l’hôte réel restent à vérifier.
