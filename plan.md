# Projet : Gestionnaire de Cave à Vin (Self-hosted)

## 🎯 Objectif
Développer une application web auto-hébergée (Docker) pour aider à gérer une cave à vin. L'application permettra de suivre le stock, l'emplacement physique des bouteilles, et de fournir des recommandations sur la période idéale de consommation (l'apogée).

## 🛠️ Stack Technologique Sélectionnée
- **Frontend** : React.js (via Vite) pour une interface réactive et moderne. Utilisation de CSS vanilla ou de Tailwind CSS pour un design élégant et premium, avec de belles animations (glassmorphism, mode sombre, etc.).
- **Backend** : Node.js avec Express.js. Parfait pour créer une API RESTful rapide.
- **Base de données** : SQLite. Idéal pour une application self-hosted sans configuration de base de données complexe. Facile à sauvegarder via un volume Docker.
- **Déploiement** : Docker et `docker-compose.yml` (un seul conteneur regroupant le front, le back et SQLite).

## 📦 Fonctionnalités Principales (MVP)

### 1. Gestion du Stock (CRUD Bouteilles)
- **Ajout/Modification/Suppression** d'une bouteille.
- **Champs de données principaux** :
  - Nom du domaine / Cuvée.
  - Type de vin (Rouge, Blanc, Rosé, Pétillant).
  - Région / Appellation.
  - Millésime (Année).
  - Quantité en stock.
- **Fiche détaillée du vin** : Une fois la bouteille saisie (ex: *Domaine de l'Aigle Chardonnay 2024 - Gérard Bertrand*), l'application affichera une fiche esthétique avec :
  - Des informations générales sur le domaine et le cépage.
  - Des accords mets & vins recommandés.
  - Le potentiel de garde.
  *(Note : Ces données pourront être renseignées manuellement ou enrichies via une API externe si disponible).*

### 2. Gestion de l'Emplacement (Localisation)
- Système pour indiquer le lieux de stockage (possibilité de définir plusieur lieu / emplacement) 
- Définition textuelle ou structurelle des emplacements (ex: Cave Principale > Armoire Gauche > Ligne 3).
- Affichage clair de l'emplacement sur la fiche du vin.

### 3. Gestion de l'Apogée (Temps de garde)
- **Calcul de la date de consommation idéale** (Apogée).
- **Remplissage automatique (Idéal)** : Utilisation d'une table de référence interne (ex: Les Bordeaux rouges de garde = millésime + 5 à 15 ans, etc.) ou d'une API de vins pour estimer la fenêtre de consommation.
- **Saisie manuelle (Fallback)** : L'utilisateur peut forcer les années "À boire à partir de" et "À boire avant".

### 4. Tableau de Bord et Rappels
- Vue d'ensemble de la cave (Nombre total de bouteilles, répartition).
- **Section "À boire cette année"** : Liste des vins qui sont dans leur apogée ou qui arrivent à la fin de leur période de garde idéale.

## 🚀 Plan de Développement (Phases)

### Phase 1 : Conception & Base de Données
- Définition précise du modèle de données (Tables: `Wine`, `Location`).
- Création du projet backend et configuration de SQLite.

### Phase 2 : Développement du Backend & API
- Développement des endpoints RESTful pour la gestion des vins.
- Implémentation du système d'estimation de l'apogée.

### Phase 3 : Développement du Frontend (Interface Web)
- Création d'une interface utilisateur intuitive, esthétique (Design Premium).
- Développement du tableau de bord avec les alertes de consommation.
- Formulaire d'ajout de vin ergonomique.

### Phase 4 : Conteneurisation (Docker)
- Création d'un `Dockerfile` multi-stage (build du frontend + backend).
- Préparation d'une commande Docker ou d'un `docker-compose.yml` simple à déployer sur le homeserver.

## 🔮 Évolutions Futures Possibles
- Interface mobile optimisée (PWA).
- Scanner de code-barres pour ajouter des bouteilles plus rapidement.
- Historique des bouteilles bues avec notes et commentaires.
