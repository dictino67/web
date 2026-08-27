# Analyse du Projet Web AGENTOllama

## Authentification de l'interface

- `login.html` est le point d'entrée de l'application.
- `auth.js` redirige les visiteurs non connectés vers `login.html` et protège `index.html` ainsi que `list.html`.
- Les identifiants de démonstration sont `admin` / `admin`.
- La session est conservée uniquement avec `sessionStorage` et disparaît à la fermeture de l'onglet.

## 1. Vue d'ensemble du Projet

**AGENTOllama** est une solution web permettant de numériser et de gérer automatiquement les factures PDF. Le projet utilise une architecture hybride (Frontend + Backend léger + Base de données PostgreSQL distante).

## 2. Architecture Technique

### 2.1. Composants du Projet

- **Frontend** :
    - Fichier HTML : `index.html`
    - Librairie JavaScript : `pdf.js` (pour la lecture et la conversion des PDF en images JPEG)

- **Backend** :
    - Fichier Python : `app.py`
    - Framework Python : Flask
    - Connexion à la base de données : psycopg2

- **Base de Données** :
    - PostgreSQL (hébergée à distance)
    - Table `factures`

### 2.2. Flux de Données

1. L'utilisateur charge un fichier PDF via `index.html`.
2. Le PDF est lu et converti en image JPEG en utilisant `pdf.js`.
3. L'image JPEG et les métadonnées (nom de la société, description) sont envoyées au serveur via une requête HTTP POST.
4. Le serveur Python reçoit les données et les insère dans la base de données PostgreSQL distante.
5. Une confirmation est renvoyée à l'utilisateur via `index.html`.

## 3. Technologies Utilisées

### 3.1. Frontend

- **Technologies** :
    - HTML5
    - CSS
    - JavaScript
    - `pdf.js` (pour la lecture et la conversion des PDF en images)

### 3.2. Backend

- **Technologies** :
    - Python
    - Flask (framework web)
    - psycopg2 (pour la connexion à PostgreSQL)

### 3.3. Base de Données

- **Technologie** :
    - PostgreSQL (hébergée à distance)

## 4. Fonctionnalités Clés

1. **Dépôt de PDF** : Permet à l'utilisateur de charger des fichiers PDF.
2. **Conversion PDF en Image** : Convertit le PDF en une image JPEG pour un aperçu visuel.
3. **Entrée des Métadonnées** : L'utilisateur peut entrer des informations supplémentaires comme le nom de la société et une description.
4. **Envoi des Données** : Envoie les données (image JPEG et métadonnées) au serveur.
5. **Stockage en Base de Données** : Stocke les données dans une base de données PostgreSQL distante.

## 5. Base de Données

### 5.1. Schéma de la Table `factures`


