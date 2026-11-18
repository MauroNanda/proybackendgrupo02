# Desarrollo conserva nodemon; producción instala solo dependencias de ejecución.
FROM node:22.22.3-bookworm-slim AS development

WORKDIR /app

# Reutiliza la capa de dependencias cuando solo cambia el código.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development
USER node
EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM node:22.22.3-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

# La API de producción se ejecuta sin permisos de administrador del contenedor.
USER node
EXPOSE 3000

CMD ["npm", "start"]
