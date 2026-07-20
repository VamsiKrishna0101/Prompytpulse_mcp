FROM node:22-slim

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev

COPY migrations ./migrations
COPY src ./src

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
