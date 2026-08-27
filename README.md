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

La connexion est conservée côté serveur dans PostgreSQL et identifiée par un cookie `HttpOnly` et `SameSite=Strict`. Elle expire après 8 heures ou lors de la déconnexion. HTTPS devra être ajouté devant cette application avant toute exposition sur Internet.

## API

- `POST /api/products` : ajoute un produit avec une image multipart obligatoire.
- `GET /api/products?page=1&limit=10` : retourne au maximum 10 produits.
- `GET /api/products/:id/image` : restitue l'image enregistrée dans PostgreSQL.

Le flux facture utilise également :

- `POST /api/invoices` : ajoute une facture via `multipart/form-data` avec `nom_societe`, `description` et `document`.
- `GET /api/invoices?page=1` : retourne au maximum 10 factures.
- `GET /api/invoices/:id/file` : restitue le JPEG ou le PDF enregistré.
- `GET /api/n8n/invoices/:id/file` : restitue le fichier à n8n avec l'en-tête `X-N8N-API-KEY`.
- `GET /api/invoices/:id` : retourne la facture et les lignes `detailfacture` correspondant exactement à `factures.fichier_nom`.
- `PUT /api/invoices/:id` : modifie les champs de la facture et permet de remplacer son fichier.
- `GET /api/invoices/:id/read` : déclenche le webhook n8n de lecture de la facture.

Les fichiers sont stockés directement dans PostgreSQL via Large Objects. Les factures acceptent uniquement les JPEG et PDF valides, avec une taille maximale de 5 Mo. La date de chargement est générée automatiquement dans la table `factures`.

La table `detailfacture` est destinée à l'extraction n8n. n8n peut insérer les champs `nom_fichier`, `description`, `quantite` et `montant`, puis positionner `factures.n8n_traite` à `TRUE`. La page `detail.html` affiche uniquement les lignes dont `nom_fichier` correspond exactement à `factures.fichier_nom`; sinon elle affiche « Pas de données disponible ».

Depuis `list.html`, le bouton « Lire la facture » déclenche ce webhook en GET. Après une réponse positive, l'interface indique d'attendre 30 secondes avant de consulter le détail.

### Connexion n8n

Générez une clé dédiée et placez-la uniquement dans `.env` et dans les credentials n8n :

```bash
openssl rand -hex 32
```

Dans n8n, créez un credential de type **Header Auth** :

- Nom de l'en-tête : `X-N8N-API-KEY`
- Valeur : la valeur de `N8N_API_KEY`

Utilisez ensuite cette URL dans un nœud HTTP Request :

```text
http://votre-domaine:3000/api/n8n/invoices/{id}/file
```

La clé n8n est différente du compte utilisateur et n'est jamais placée dans le JavaScript du navigateur.

## Vérification

```bash
node --check server.js
node --check app.js
node --check list.js
```

Testez également un ajout valide, les champs obligatoires, une quantité négative, l'absence d'image, un format d'image refusé et la navigation entre les pages de la liste.
