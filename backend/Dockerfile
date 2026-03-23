FROM node:20-slim

# Outils de build pour native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Copie du code
COPY . .

# Compilation du backend en JavaScript
RUN npm run build:backend

# Nettoyage des devDependencies (Optionnel mais recommandé pour la prod)
# RUN npm prune --production

EXPOSE 3000

# Lancement de la version compilée (beaucoup plus léger et stable)
CMD ["node", "backend/dist/backend/server.js"]
