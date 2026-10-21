# Imagen del juego para el servidor de Bolas (la construye bolas-publicar en la máquina de stage).
# Un solo proceso sirve la web (dist); no hay API ni datos.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production TZ=UTC ESCUCHAR=0.0.0.0 WEB_DIR=/app/dist
COPY --from=build /app/package.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]
