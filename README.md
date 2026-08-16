# Goblin Cellar

Application self-hosted pour gérer une cave à vin. Un seul service Docker : UI + API + SQLite.

## Homelab — sans cloner le dépôt

L’image est publiée sur GHCR. Sur la machine cible, un fichier Compose suffit.

```bash
mkdir -p ~/goblin-cellar && cd ~/goblin-cellar
curl -fsSL -o docker-compose.yml \
  https://raw.githubusercontent.com/LordD9/gobelin_cellar/main/deploy/docker-compose.yml
docker compose up -d
```

Ou copie-colle ce compose :

```yaml
name: goblin-cellar

services:
  goblin-cellar:
    image: ghcr.io/lordd9/gobelin_cellar:latest
    container_name: goblin-cellar
    restart: unless-stopped
    init: true
    ports:
      - "8080:3001"
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3001
      DATABASE_PATH: /data/cave.sqlite
      PUBLIC_DIR: /app/public
      TZ: Europe/Paris
    volumes:
      - ./data:/data
```

Puis :

```bash
docker compose up -d
```

L’interface est sur [http://localhost:8080](http://localhost:8080).

Si le package GHCR est encore privé (premier push) :

1. GitHub → le dépôt → Packages → `gobelin_cellar` → Package settings → **Change visibility** → Public
2. Ou : `echo $GITHUB_TOKEN | docker login ghcr.io -u TON_USER --password-stdin`

Mise à jour (toujours sans clone) :

```bash
docker compose pull
docker compose up -d
```

Le dossier `./data` n’est pas touché.

## Déploiement depuis le dépôt (build local)

Prérequis : Docker Engine + Compose v2.

```bash
git clone https://github.com/LordD9/gobelin_cellar.git
cd gobelin_cellar
cp .env.example .env
docker compose up -d --build
```

`--no-cache` est utile si une ancienne image a un binaire `sqlite3` incompatible (erreur `GLIBC_2.38`).

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Build local, restart, healthcheck, volume |
| `deploy/docker-compose.yml` | Pull de l’image GHCR uniquement |
| `.env.example` | Port, dossier de données, fuseau, image |
| `Dockerfile` | Build multi-stage front + back |
| `.github/workflows/docker-publish.yml` | Push auto vers GHCR (`main` et tags `v*`) |

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

### Reverse proxy

Le service n’expose qu’un port HTTP interne (`3001`). Derrière Traefik, décommente le bloc `labels` dans le compose et branche le réseau `proxy`. Derrière Caddy / Nginx Proxy Manager, pointe vers `goblin-cellar:3001` ou vers le port hôte.

## Développement local (sans Docker)

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

- API : [http://localhost:3001](http://localhost:3001)
- UI Vite : [http://localhost:5173](http://localhost:5173) (proxy `/api` vers le backend)

## Licence

[GPL-3.0](LICENSE)
