# ==============================================================================
# DOCKERFILE - TIME'EATS GESTION DE PROJET & GOUVERNANCE SPP
# Multi-stage build léger et sécurisé (Alpine Linux + Node.js 20 LTS)
# ==============================================================================

# ------------------------------------------------------------------------------
# Étape 1 : Construction des bundles Vite & esbuild
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des manifestes de dépendances
COPY package*.json ./

# Installation des dépendances complètes (devDependencies nécessaires pour Vite et esbuild)
RUN npm ci

# Copie du code source complet
COPY . .

# Compilation de l'application (Frontend Vite -> dist/ et Serveur esbuild -> dist/server.js)
RUN npm run build

# ------------------------------------------------------------------------------
# Étape 2 : Image d'exécution minimale pour la production
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Configuration de l'environnement de production
ENV NODE_ENV=production \
    PORT=3000

# Installation de curl pour le test de santé (healthcheck)
RUN apk add --no-cache curl

# Copie des manifestes et installation stricte des dépendances de production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copie des fichiers générés lors du build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Création des répertoires de données persistantes avec permissions utilisateur non-root
RUN mkdir -p /app/data /app/backups && \
    chown -R node:node /app

# Sécurité : Exécution sous l'utilisateur non-root standard 'node'
USER node

# Volumes de persistance (Base SQLite et sauvegardes)
VOLUME ["/app/data", "/app/backups"]

# Port exposé
EXPOSE 3000

# Sonde de disponibilité (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Commande de démarrage
CMD ["node", "dist/server.js"]
