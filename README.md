# Ulnar RPG

Application privée en français pour créer plusieurs personnages Ulnar et tenir leurs fiches dans le navigateur. Elle comprend les caractéristiques calculées, les sorts et traits, l’équipement, l’inventaire, la banque, les métiers et le suivi de session.

## Développement

Node.js 24 et npm sont requis.

```sh
npm ci
npm run dev
```

Pour reproduire les contrôles de GitHub Actions sur une machine qui permet l’installation des dépendances de Chromium :

```sh
npx playwright install --with-deps chromium
npm run check
npm run test:coverage
npm audit
```

Dans Codex Cloud, utiliser `bash .cache/ulnar-cloud/check.sh` depuis le dépôt après avoir exécuté le script d’installation de l’environnement. Ce parcours utilise le Chromium système. La CI exécute la suite officielle avec le Chromium Playwright.

## Documentation

- [Guide du joueur](docs/player-guide.md) et [format JSON](docs/json-format.md).
- [Sources et formules](docs/rules/formula-matrix.md) et [décisions validées](docs/rules/validated-decisions.md).
- [Guide du mainteneur](docs/maintainer-guide.md), [exemple Caddy](deploy/Caddyfile.example) et [avancement et recette](PROGRESS.md).

L’application conserve les fiches dans IndexedDB. Exportez régulièrement une copie JSON dans un emplacement privé. Le suivi des ressources en combat et des temps de recharge est manuel en attendant la validation des transitions correspondantes.
