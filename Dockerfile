FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run typecheck && npm run build

FROM node:22-alpine
WORKDIR /app
RUN mkdir -p /app/data && chown node:node /app/data
COPY --from=build /app/dist ./dist
COPY server/main.mjs server/http.mjs server/workshop-accounts.mjs ./server/
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/main.mjs"]
