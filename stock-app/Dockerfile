# Utiliser une image Node.js légère
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

RUN apk add --no-cache postgresql-client

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --omit=dev

# Copier le reste du code source
COPY . .

# Exposer le port du serveur (3000 par défaut)
EXPOSE 3000

# Lancer l'application
CMD ["node", "server.js"]