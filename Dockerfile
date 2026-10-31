FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js index.html manifest.json sw.js games.json ./
COPY icons/ ./icons/
COPY games/ ./games/
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
