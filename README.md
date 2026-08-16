# Goblin Cellar

Application web **self-hosted** pour gérer une cave à vin : stock, emplacements, fenêtre de consommation (apogée), et ajout assisté par photo d’étiquette.

Un seul service : interface + API + base SQLite. Conçue pour un NAS, un mini-PC ou un VPS, derrière un reverse proxy si besoin.

## Fonctionnalités

- **Cave** — tableau de bord : nombre de bouteilles, répartition par type, vins à boire cette année, trop jeunes, ou hors apogée
- **Fiches** — domaine, cuvée, couleur, région, appellation, millésime, cépages, accords, notes
- **Emplacements** — arborescence libre (cave → armoire → ligne, ou simplement « Cuisine »)
- **Apogée** — estimation automatique à partir de règles internes (type, région, appellation), ou saisie manuelle
- **Scan d’étiquette** (optionnel) — photo → modèle vision Ollama → recherche web + petit LLM pour préremplir la fiche

## Prérequis

- Docker Engine + Compose v2, **ou** Node.js 26 pour le développement
- Pour le scan d’étiquette : [Ollama](https://ollama.com) joignable depuis l’application (même machine, hôte Docker, ou autre conteneur)

## Démarrage rapide (image publiée)

Rien à cloner. Sur la machine cible :

```bash
mkdir -p ~/goblin-cellar && cd ~/goblin-cellar
curl -fsSL -o docker-compose.yml \
  https://raw.githubusercontent.com/LordD9/gobelin_cellar/main/deploy/docker-compose.yml
docker compose up -d
```

L’interface est sur [http://localhost:8080](http://localhost:8080). Les données vivent dans `./data`.

Si le paquet GHCR est encore privé : sur GitHub, dépôt → Packages → `gobelin_cellar` → visibilité **Public**, ou `docker login ghcr.io`.

Mise à jour :

```bash
docker compose pull
docker compose up -d
```

## Déploiement depuis les sources

```bash
git clone https://github.com/LordD9/gobelin_cellar.git
cd gobelin_cellar
cp .env.example .env
docker compose up -d --build
```

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Build local, volume, healthcheck, accès à Ollama sur l’hôte |
| `deploy/docker-compose.yml` | Image GHCR uniquement (homelab) |
| `.env.example` | Port, dossier de données, fuseau, image, URL Ollama |
| `Dockerfile` | Image unique (frontend + API) |
| `.github/workflows/docker-publish.yml` | Publication GHCR (`main` et tags `v*`) |

Variables utiles (fichier `.env` ou bloc `environment` du compose) :

| Variable | Défaut | Usage |
|---|---|---|
| `GOBLIN_CELLAR_PORT` | `8080` | Port publié sur l’hôte |
| `DATA_DIR` | `./data` | Dossier SQLite |
| `TZ` | `Europe/Paris` | Fuseau des dates / logs |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | API Ollama (scan) |
| `OLLAMA_VLM_MODEL` | `qwen3-vl:2b` | Défaut vision si rien n’est enregistré |
| `OLLAMA_LLM_MODEL` | `llama3.2:3b` | Défaut texte si rien n’est enregistré |
| `SEARXNG_URL` | — | Moteur de recherche self-hosted (optionnel) |

Les modèles et l’URL Ollama se changent aussi dans **Réglages**, sans redémarrer le conteneur.

### Ollama depuis Docker

Le compose ajoute `extra_hosts: host.docker.internal:host-gateway` pour joindre Ollama installé **sur l’hôte**.

- Ollama sur l’hôte : `OLLAMA_URL=http://host.docker.internal:11434`
- Ollama dans un autre conteneur du même réseau : `OLLAMA_URL=http://ollama:11434`

### Reverse proxy

Le service n’écoute que du HTTP interne (`3001`). Pointe Caddy, Nginx Proxy Manager ou Traefik vers ce port. Pour le scan, autorise des requêtes longues (plusieurs minutes) : un modèle vision sur CPU n’est pas instantané.

Un exemple de labels Traefik est commenté dans les fichiers Compose.

### Sauvegarde

La base est un fichier SQLite :

```
./data/cave.sqlite
```

```bash
docker compose stop
cp -a data /chemin/vers/backup/goblin-cellar-data
docker compose start
```

restic, kopia ou rsync peuvent cibler uniquement `./data`.

## Scan d’étiquette

Sur une nouvelle fiche : photo ou image de l’étiquette → **Lire l’étiquette** → éventuellement **Compléter sur le web**. Les champs restent éditables avant enregistrement.

1. Installer Ollama et tirer un petit modèle vision + un petit modèle texte, par exemple :

```bash
ollama pull qwen3-vl:2b
ollama pull llama3.2:3b
```

2. Dans **Réglages**, indiquer l’URL d’Ollama, tester, choisir (ou télécharger) les modèles.

Les photos de téléphone (HEIC, 12 Mpx et plus) sont réduites et réencodées en JPEG avant d’être envoyées au modèle, pour éviter les plantages du type `unexpected EOF`.

Après chaque étape, le modèle est déchargé de la mémoire Ollama afin de pouvoir enchaîner vision puis texte sur une machine standard, même sans carte graphique dédiée.

| Rôle | Suggestion | Autres options |
|---|---|---|
| Vision | `qwen3-vl:2b` | `moondream`, `qwen2.5vl:3b`, `ministral-3:14b` |
| Texte | `llama3.2:3b` | `qwen2.5:3b`, `gemma2:2b`, `phi3:mini` |

La recherche web utilise Wikipédia et DuckDuckGo. Un [SearXNG](https://github.com/searxng/searxng) personnel peut être indiqué dans les réglages.

Le scan est **facultatif** : l’application reste utilisable entièrement à la main.

## Développement local

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

- API : [http://localhost:3001](http://localhost:3001)
- Interface Vite : [http://localhost:5173](http://localhost:5173) (le proxy `/api` pointe vers le backend)

## Licence

[GPL-3.0](LICENSE)
