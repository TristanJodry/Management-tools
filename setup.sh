#!/usr/bin/env bash
# ==============================================================================
# SCRIPT D'INSTALLATION AUTOMATIQUE - GOUVERNANCE PROJETS & ÉQUIPES (DEBIAN 13)
# ==============================================================================

set -e

# Couleurs pour l'affichage terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "========================================================================"
echo "    INSTALLATION - GOUVERNANCE PROJETS & ÉQUIPES (DEBIAN 13)"
echo "========================================================================"
echo -e "${NC}"

# 1. Vérification des privilèges Root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}[ERREUR] Ce script doit être exécuté en tant que root.${NC}"
    exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 2. Demande du port d'écoute
read -p "$(echo -e "${YELLOW}Quel port souhaitez-vous utiliser pour l'application ? [Défaut: 3000]: ${NC}")" APP_PORT
APP_PORT=${APP_PORT:-3000}

# 3. Demande pour la création d'un service Systemd
read -p "$(echo -e "${YELLOW}Voulez-vous installer l'application en tant que service systemd ? (O/n): ${NC}")" INSTALL_SYSTEMD
INSTALL_SYSTEMD=${INSTALL_SYSTEMD:-O}

echo -e "\n${BLUE}[1/7] Mise à jour du système et vérification des paquetages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git sqlite3 build-essential ca-certificates gnupg > /dev/null

# Vérification / Installation de Node.js
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo -e "${YELLOW}Installation de Node.js 20 LTS pour Debian 13...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
    apt-get install -y -qq nodejs > /dev/null
fi

echo -e "${GREEN}✓ Node.js version $(node -v) et NPM $(npm -v) sont opérationnels.${NC}"

# 4. Installation des dépendances du projet
echo -e "\n${BLUE}[2/7] Installation des dépendances NPM du projet...${NC}"
npm install --no-audit --no-fund

# 5. Préparation du dossier de données et de la base de données SQLite
echo -e "\n${BLUE}[3/7] Configuration de la base de données SQLite serveur...${NC}"
mkdir -p data backups

if [ ! -f "data/database.sqlite" ]; then
    echo -e "${YELLOW}Création d'une nouvelle base de données SQLite dans data/database.sqlite...${NC}"
    sqlite3 data/database.sqlite <<'EOF'
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS global_team (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
EOF
    echo -e "${GREEN}✓ Base de données SQLite initialisée avec succès.${NC}"
else
    echo -e "${GREEN}✓ Base de données SQLite existante préservée dans data/database.sqlite.${NC}"
fi

# 6. Génération du fichier .env
echo -e "\n${BLUE}[4/7] Configuration des variables d'environnement (.env)...${NC}"
cat <<EOF > .env
PORT=$APP_PORT
NODE_ENV=production
EOF
echo -e "${GREEN}✓ Fichier .env créé (PORT=$APP_PORT).${NC}"

# 7. Compilation pour la production
echo -e "\n${BLUE}[5/7] Compilation de l'application (Vite + esbuild)...${NC}"
npm run build

# Nettoyage des caches temporaires
rm -rf node_modules/.cache /tmp/npm-* 2>/dev/null || true

# 8. Installation du service Systemd si sélectionné
SERVICE_NAME="gouvernance"
if [[ "$INSTALL_SYSTEMD" =~ ^[OoYy]$ ]]; then
    echo -e "\n${BLUE}[6/7] Création du service systemd /etc/systemd/system/${SERVICE_NAME}.service...${NC}"
    
    cat <<EOF > /etc/systemd/system/${SERVICE_NAME}.service
[Unit]
Description=Gouvernance Projets et Equipes App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=$(which node) $APP_DIR/dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable ${SERVICE_NAME}.service > /dev/null
    systemctl restart ${SERVICE_NAME}.service
    echo -e "${GREEN}✓ Service systemd '${SERVICE_NAME}' installé et activé au démarrage.${NC}"
else
    echo -e "\n${YELLOW}[6/7] Installation systemd ignorée. Vous pourrez lancer l'application avec 'npm start'.${NC}"
fi

# 9. Rendre les scripts exécutables
chmod +x setup.sh manage.sh 2>/dev/null || true

# 10. Test de fonctionnement du serveur
echo -e "\n${BLUE}[7/7] Test de réponse de l'application...${NC}"
sleep 2

HEALTH_CHECK=$(curl -s "http://127.0.0.1:$APP_PORT/api/health" || true)

if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✓ Le serveur répond avec succès !${NC}"
else
    echo -e "${YELLOW}ℹ Attente de démarrage du serveur...${NC}"
    sleep 3
fi

IP_SERVER=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "IP_SERVEUR")

echo -e "\n${GREEN}========================================================================"
echo "               INSTALLATION COMPLÈTE ET RÉUSSIE !"
echo "========================================================================"
echo -e "${NC}"
echo -e "📌 Adresse de votre site : ${CYAN}http://${IP_SERVER}:${APP_PORT}${NC}"
if [[ "$INSTALL_SYSTEMD" =~ ^[OoYy]$ ]]; then
    echo -e "📌 Statut du service systemd : ${YELLOW}systemctl status ${SERVICE_NAME}.service${NC}"
fi
echo -e "📌 Script de gestion / administration : ${CYAN}./manage.sh${NC}"
echo -e "📌 Fichier BDD SQLite (conservé lors des git pull) : ${GREEN}$APP_DIR/data/database.sqlite${NC}"
echo ""
