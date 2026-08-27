# StockPilot

Application web de gestion de factures. Elle permet d'ajouter une facture JPEG ou PDF avec le nom de la société et une description, puis de consulter les factures enregistrées par pages de 10.

## Prérequis

- Node.js 18 ou supérieur
- PostgreSQL 14 ou supérieur

## Installation

```bash
npm install
cp .env.example .env
```

Configurez la connexion PostgreSQL distante dans `.env` :

```bash
PGHOST=192.168.0.120
PGPORT=5432
PGDATABASE=n8_db
PGUSER=n8n
PGPASSWORD=secret
```

Le démarrage Docker exécute automatiquement `database/schema.sql` sur cette base distante.

## Démarrage

```bash
npm start
```

Avec Docker, depuis la racine du projet :

```bash
docker compose up --build -d
```

Ouvrez ensuite [http://localhost:3000/login.html](http://localhost:3000/login.html). La page de connexion protège `index.html` et `list.html`.

Pour la démonstration, utilisez :

- Identifiant : `admin`
- Mot de passe : `admin`

La connexion est conservée dans la session de l'onglet avec `sessionStorage`. Elle reste active pendant les rechargements et la navigation, puis est supprimée lorsque l'onglet est fermé.

## API

- `POST /api/products` : ajoute un produit avec une image multipart obligatoire.
- `GET /api/products?page=1&limit=10` : retourne au maximum 10 produits.
- `GET /api/products/:id/image` : restitue l'image enregistrée dans PostgreSQL.

Le flux facture utilise également :

- `POST /api/invoices` : ajoute une facture via `multipart/form-data` avec `nom_societe`, `description` et `document`.
- `GET /api/invoices?page=1` : retourne au maximum 10 factures.
- `GET /api/invoices/:id/file` : restitue le JPEG ou le PDF enregistré.

Les fichiers sont stockés directement dans PostgreSQL via Large Objects. Les factures acceptent uniquement les JPEG et PDF valides, avec une taille maximale de 5 Mo. La date de chargement est générée automatiquement dans la table `factures`.

## Vérification

```bash
node --check server.js
node --check app.js
node --check list.js
```

Testez également un ajout valide, les champs obligatoires, une quantité négative, l'absence d'image, un format d'image refusé et la navigation entre les pages de la liste.
