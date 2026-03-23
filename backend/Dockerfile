FROM node:18-slim

# On installe les outils de compilation car certaines dépendances en ont besoin (ex: native modules)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm install -g ts-node typescript

EXPOSE 3000

CMD ["npx", "ts-node", "backend/server.ts"]
