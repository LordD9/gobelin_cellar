# Goblin Cellar

Application self-hosted pour gérer une cave à vin. Pensée pour un **homelab via Docker Compose** : un seul service, SQLite persistée dans un dossier de l'hôte.

## Déploiement (homelab)

Prérequis : Docker Engine + le plugin Compose v2 (`docker compose`).

```bash
git clone <ton-depot> goblin-cellar
cd goblin-cellar
cp .env.example .env
docker compose up -d --build
```

L'interface est sur [http://localhost:8080](http://localhost:8080) (ou le port défini dans `.env`).

Fichiers utiles :

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Service unique, restart, healthcheck, volume |
| `.env.example` | Port, dossier de données, fuseau horaire |
| `Dockerfile` | Build multi-stage front + back |

### Données et sauvegarde

La base est un fichier SQLite monté ici :

```
./data/cave.sqlite
```

Pour sauvegarder : arrête le conteneur (plus propre) puis copie le dossier `data/` :

```bash
docker compose stop
cp -a data /chemin/vers/backup/goblin-cellar-data
docker compose start
```

Avec restic / kopia / rsync, cible simplement `./data`.

### Mise à jour

```bash
git pull
docker compose up -d --build
```

Le volume `./data` n'est pas touché.

### Reverse proxy

Le service n'expose qu'un port HTTP interne (`3001`). Derrière Traefik, décommente le bloc `labels` dans `docker-compose.yml` et branche le réseau `proxy`. Derrière Caddy / Nginx Proxy Manager, pointe vers `goblin-cellar:3001` ou vers le port hôte.

## Développement local (sans Docker)

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

- API : [http://localhost:3001](http://localhost:3001)
- UI Vite : [http://localhost:5173](http://localhost:5173) (proxy `/api` vers le backend)
