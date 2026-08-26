# Instructions du projet

## Objectif

Cette application gère un stock de fournitures. Elle permet d'ajouter des produits avec leur image et de consulter la liste des produits enregistrés.

## Architecture

- Frontend : HTML, CSS et JavaScript vanilla.
- Backend : Node.js avec Express.
- Base de données : PostgreSQL.
- Images : enregistrées directement dans PostgreSQL avec des Large Objects.
- Pages principales : `index.html` pour l'ajout et `list.html` pour la liste paginée.

## Conventions

- Utiliser les libellés français dans l'interface utilisateur.
- Conserver le menu commun avec les liens `Home` vers `index.html` et `Liste` vers `list.html`.
- Utiliser `FormData` pour envoyer le formulaire et l'image à l'API.
- Valider les champs côté navigateur et côté serveur.
- L'image est obligatoire, doit être un type image accepté et respecter la taille maximale définie par le serveur.
- La quantité en stock doit être un nombre entier supérieur ou égal à zéro.
- Ne jamais placer les identifiants PostgreSQL directement dans le code source.
- Utiliser les variables d'environnement chargées depuis `.env`.
- Ne jamais ajouter `.env` ou des secrets au dépôt.
- Utiliser des requêtes PostgreSQL paramétrées.
- Nettoyer les Large Objects si une transaction d'insertion échoue.
- Échapper ou construire les contenus utilisateur avec des APIs DOM sûres ; ne pas utiliser `innerHTML` avec des valeurs non contrôlées.

## API attendue

- `POST /api/products` : ajoute un produit avec une image multipart.
- `GET /api/products?page=1&limit=10` : retourne les produits avec pagination.
- `GET /api/products/:id/image` : retourne l'image enregistrée dans PostgreSQL.

La pagination doit afficher au maximum 10 produits par page et fournir les informations nécessaires aux boutons `Suivant` et `Précédent`.

## Vérification

Avant de terminer une modification :

1. Exécuter `npm install` si les dépendances ont changé.
2. Exécuter `node --check server.js` pour vérifier la syntaxe du serveur.
3. Exécuter le schéma SQL sur PostgreSQL si la structure de la base a changé.
4. Tester l'ajout d'un produit valide avec une image.
5. Tester les champs manquants, la quantité invalide, l'absence d'image, les types d'image refusés et les fichiers trop volumineux.
6. Vérifier l'affichage des images et la pagination par groupes de 10.

## Démarrage

La commande de développement prévue est :

```bash
npm start
```

Le serveur doit servir les fichiers frontend et l'API depuis la même origine.
