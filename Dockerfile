# ==============================================================================
# DOCKERFILE - TIME'EATS GESTION DE PROJET & GOUVERNANCE SPP
# Multi-stage build léger et sécurisé (Alpine Linux + Node.js 20 LTS)
# ==============================================================================
# Usage autonome (sans Docker Compose) :
#   docker build -t timeeats-gestion-projet .
#   docker run -d -p 3001:3000 -v $(pwd)/data:/app/data --name timeeats timeeats-gestion-projet
# ==============================================================================

# ------------------------------------------------------------------------------
# Étape 1 : Construction de l'application (Builder)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des manifestes de dépendances
COPY package*.json ./

# Installation des dépendances complètes (devDependencies nécessaires pour Vite et esbuild)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copie du code source complet
COPY . .

# Compilation de l'application (Frontend Vite -> dist/ et Serveur esbuild -> dist/server.js)
RUN npm run build

# ------------------------------------------------------------------------------
# Étape 2 : Image d'exécution minimale pour la production (Runner)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Configuration de l'environnement de production
ENV NODE_ENV=production \
    PORT=3000

# Outils système essentiels (curl pour healthcheck)
RUN apk add --no-cache curl

# Copie des manifests et installation stricte des modules de production
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --ignore-scripts && npm cache clean --force; \
    else \
      npm install --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force; \
    fi

# Copie des livrables compilés depuis l'étape builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Préparation des dossiers de données persistantes (SQLite et sauvegardes) avec permissions node
RUN mkdir -p /app/data /app/backups && \
    chown -R node:node /app

# Sécurité : exécution sous le compte utilisateur non-root standard 'node'
USER node

# Déclaration des volumes pour la persistance des données
VOLUME ["/app/data", "/app/backups"]

# Port exposé à l'intérieur du conteneur
EXPOSE 3000

# Sonde de disponibilité (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Commande de démarrage
CMD ["node", "dist/server.js"]
