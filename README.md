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

En production, fournissez un certificat pour le domaine public dans `certs/server.crt` et `certs/server.key`, puis utilisez `PUBLIC_BASE_URL` avec ce domaine. Le certificat auto-signé local n'est destiné qu'aux tests et provoquera un avertissement du navigateur.

Ouvrez ensuite [https://stock.localhost:3443/login.html](https://stock.localhost:3443/login.html). La page de connexion protège `index.html` et `list.html`.

Pour la démonstration, utilisez :

- Identifiant : `admin`
- Mot de passe : `admin`

La connexion est conservée côté serveur dans PostgreSQL et identifiée par un cookie `HttpOnly`, `Secure` et `SameSite=Strict`. Elle expire après 8 heures ou lors de la déconnexion.

## API

- `POST /api/products` : ajoute un produit avec une image multipart obligatoire.
- `GET /api/products?page=1&limit=10` : retourne au maximum 10 produits.
- `GET /api/products/:id/image` : restitue l'image enregistrée dans PostgreSQL.

Le flux facture utilise également :

- `POST /api/invoices` : ajoute une facture via `multipart/form-data` avec `nom_societe`, `description` et `document`.
- `GET /api/invoices?page=1` : retourne au maximum 10 factures.
- `GET /api/invoices/:id/file` : restitue le JPEG ou le PDF enregistré.
- `GET /api/invoices/:id` : retourne la facture et les lignes `detailfacture` correspondant à `nom_fichier_image`.
- `PUT /api/invoices/:id` : modifie les champs de la facture et permet de remplacer son fichier.

Les fichiers sont stockés directement dans PostgreSQL via Large Objects. Les factures acceptent uniquement les JPEG et PDF valides, avec une taille maximale de 5 Mo. La date de chargement est générée automatiquement dans la table `factures`.

La table `detailfacture` est destinée à l'extraction n8n. n8n peut insérer les champs `nom_fichier`, `description`, `quantite` et `montant`, puis positionner `factures.n8n_traite` à `TRUE`. La page `detail.html` affiche uniquement les lignes dont `nom_fichier` correspond à `factures.nom_fichier_image`; sinon elle affiche « Pas de données disponible ».

## Vérification

```bash
node --check server.js
node --check app.js
node --check list.js
```

Testez également un ajout valide, les champs obligatoires, une quantité négative, l'absence d'image, un format d'image refusé et la navigation entre les pages de la liste.
