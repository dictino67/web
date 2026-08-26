# StockPilot

Application web de gestion de stock de fournitures. Elle permet d'ajouter un produit avec son image, puis de consulter les produits enregistrés par pages de 10.

## Prérequis

- Node.js 18 ou supérieur
- PostgreSQL 14 ou supérieur

## Installation

```bash
npm install
cp .env.example .env
```

Créez la base PostgreSQL, puis exécutez le schéma :

```bash
createdb stock_fournitures
psql -d stock_fournitures -f database/schema.sql
```

Renseignez ensuite les paramètres PostgreSQL dans `.env`.

## Démarrage

```bash
npm start
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000). La page `index.html` ajoute les produits et `list.html` affiche la liste paginée.

## API

- `POST /api/products` : ajoute un produit avec une image multipart obligatoire.
- `GET /api/products?page=1&limit=10` : retourne au maximum 10 produits.
- `GET /api/products/:id/image` : restitue l'image enregistrée dans PostgreSQL.

Les images sont stockées directement dans PostgreSQL via Large Objects. Les formats acceptés sont JPG, PNG, GIF et WebP, avec une taille maximale de 5 Mo.

## Vérification

```bash
node --check server.js
node --check app.js
node --check list.js
```

Testez également un ajout valide, les champs obligatoires, une quantité négative, l'absence d'image, un format d'image refusé et la navigation entre les pages de la liste.
