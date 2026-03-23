FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Nous compilons le TypeScript si nécessaire, ou on utilise ts-node en prod (moins recommandé mais simple ici)
# Pour MyChurch, on va utiliser ts-node car la structure est simple
RUN npm install -g ts-node typescript

EXPOSE 3000

CMD ["npx", "ts-node", "backend/server.ts"]
