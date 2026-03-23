FROM node:20-slim

# On installe les outils de build pour les dépendances natives (ex: better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# On installe les dépendances
COPY package*.json ./
RUN npm install

# On installe ts-node globalement pour être sûr qu'il soit dans le PATH
RUN npm install -g ts-node typescript

# On copie tout le reste
COPY . .

# On expose le port (Render utilise PORT env var, mais on expose 3000 par défaut)
EXPOSE 3000

# On lance avec ts-node directement via npx pour être sûr
CMD ["npx", "ts-node", "--transpile-only", "backend/server.ts"]
