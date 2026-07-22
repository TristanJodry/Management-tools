#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE GESTION ET MAINTENANCE - GOUVERNANCE PROJETS & ÉQUIPES (DEBIAN 13)
# ==============================================================================

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

DB_FILE="$APP_DIR/data/database.sqlite"
JSON_FILE="$APP_DIR/data/db.json"
BACKUP_DIR="$APP_DIR/backups"
SERVICE_NAME="gouvernance"

# Extraction du port configuré dans .env ou 3000 par défaut
if [ -f ".env" ]; then
    PORT=$(grep -E '^PORT=' .env | cut -d'=' -f2 | tr -d '\r' | tr -d ' ')
fi
PORT=${PORT:-3000}

mkdir -p "$BACKUP_DIR"

# 1. Vérification de l'intégrité des fichiers du projet
check_file_integrity() {
    echo -e "\n${CYAN}====================================================${NC}"
    echo -e "${CYAN}     VÉRIFICATION DE L'INTÉGRITÉ DES FICHIERS       ${NC}"
    echo -e "${CYAN}====================================================${NC}"

    FILES_TO_CHECK=("package.json" "server.ts" "dist/server.js" "node_modules" "data/database.sqlite" "setup.sh" "manage.sh")
    MISSING_COUNT=0

    for file in "${FILES_TO_CHECK[@]}"; do
        if [ -e "$file" ]; then
            SIZE=$(du -sh "$file" 2>/dev/null | awk '{print $1}')
            echo -e "  [${GREEN}OK${NC}] $file (Taille: $SIZE)"
        else
            echo -e "  [${RED}MANQUANT${NC}] $file"
            MISSING_COUNT=$((MISSING_COUNT + 1))
        fi
    done

    echo ""
    if [ $MISSING_COUNT -eq 0 ]; then
        echo -e "${GREEN}✓ Tous les fichiers essentiels du projet sont présents et intacts.${NC}"
    else
        echo -e "${RED}⚠ Attenion : $MISSING_COUNT fichier(s) manquant(s). Vous pouvez relancer ./setup.sh${NC}"
    fi
}

# 2. Test du service systemd et du serveur Node
check_service_status() {
    echo -e "\n${CYAN}====================================================${NC}"
    echo -e "${CYAN}        TEST DU SERVICE ET DU STATUT SERVEUR        ${NC}"
    echo -e "${CYAN}====================================================${NC}"

    echo -e "${YELLOW}Port d'écoute configuré : $PORT${NC}"

    # Vérification systemd
    if systemctl is-active --quiet ${SERVICE_NAME}.service 2>/dev/null; then
        echo -e "  Service Systemd (${SERVICE_NAME}) : ${GREEN}EN COURS D'EXÉCUTION (ACTIVE)${NC}"
    else
        echo -e "  Service Systemd (${SERVICE_NAME}) : ${RED}INACTIF OU NON CONFIGURÉ${NC}"
    fi

    # Vérification du port d'écoute avec curl
    HEALTH=$(curl -s "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true)
    if echo "$HEALTH" | grep -q "ok"; then
        echo -e "  Statut HTTP API (http://127.0.0.1:$PORT/api/health) : ${GREEN}OPÉRATIONNEL (200 OK)${NC}"
        echo -e "  Détails API : $HEALTH"
    else
        echo -e "  Statut HTTP API : ${RED}IMPOSSIBLE DE SE CONNECTER SUR LE PORT $PORT${NC}"
    fi

    # Utilisation des ressources
    PID=$(pgrep -f "dist/server.js" | head -n 1 || true)
    if [ -n "$PID" ]; then
        MEM=$(ps -o rss= -p "$PID" 2>/dev/null | awk '{print int($1/1024) " MB"}' || echo "N/A")
        CPU=$(ps -o %cpu= -p "$PID" 2>/dev/null | awk '{print $1 "%"}' || echo "N/A")
        echo -e "  Processus Node.js (PID $PID) : RAM = $MEM | CPU = $CPU"
    fi
}

# 3. Test Réseau et connectivité Internet
check_network() {
    echo -e "\n${CYAN}====================================================${NC}"
    echo -e "${CYAN}      TEST RÉSEAU & CONNECTIVITÉ INTERNET           ${NC}"
    echo -e "${CYAN}====================================================${NC}"

    echo -n "  • Test boucle locale (127.0.0.1) : "
    if ping -c 1 127.0.0.1 &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}ÉCHEC${NC}"
    fi

    echo -n "  • Test Résolution DNS (google.com) : "
    if host google.com &>/dev/null || ping -c 1 8.8.8.8 &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}ÉCHEC${NC}"
    fi

    echo -n "  • Test Connexion Internet GitHub : "
    if curl -s --connect-timeout 5 https://github.com &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}Problème de connexion externe ou pare-feu${NC}"
    fi

    IP_PUB=$(curl -s --connect-timeout 3 https://ifconfig.me 2>/dev/null || echo "Non disponible")
    echo -e "  • Adresse IP Serveur : ${MAGENTA}$IP_PUB${NC}"
}

# 4. Test d'intégrité de la Base de données SQLite
check_database_integrity() {
    echo -e "\n${CYAN}====================================================${NC}"
    echo -e "${CYAN}    TEST D'INTÉGRITÉ DE LA BASE DE DONNÉES SQLITE   ${NC}"
    echo -e "${CYAN}====================================================${NC}"

    if [ ! -f "$DB_FILE" ]; then
        echo -e "${RED}⚠ Aucune base de données trouvée dans $DB_FILE${NC}"
        return
    fi

    echo -e "Fichier BDD : ${GREEN}$DB_FILE${NC}"
    echo -e "Taille du fichier : $(du -sh "$DB_FILE" | awk '{print $1}')"

    if command -v sqlite3 &>/dev/null; then
        CHECK_RES=$(sqlite3 "$DB_FILE" "PRAGMA quick_check;" 2>&1)
        if [ "$CHECK_RES" == "ok" ]; then
            echo -e "Intégrité SQLite PRAGMA : ${GREEN}PARFAITE (ok)${NC}"
        else
            echo -e "Intégrité SQLite PRAGMA : ${RED}ERREUR ($CHECK_RES)${NC}"
        fi

        PROJ_COUNT=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM projects;" 2>/dev/null || echo "0")
        TEAM_COUNT=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM global_team;" 2>/dev/null || echo "0")

        echo -e "Nombre de Projets enregistrés en BDD : ${MAGENTA}$PROJ_COUNT${NC}"
        echo -e "Nombre de Membres d'équipe enregistrés en BDD : ${MAGENTA}$TEAM_COUNT${NC}"
    else
        echo -e "${YELLOW}sqlite3 CLI n'est pas installé. Installation recommandée pour les diagnostics précis.${NC}"
    fi
}

# 5. Menu Gestion BDD (Sauvegarde / Restauration / Export)
manage_database_menu() {
    while true; do
        echo -e "\n${MAGENTA}----------------------------------------------------${NC}"
        echo -e "${MAGENTA}         GESTION DE LA BASE DE DONNÉES              ${NC}"
        echo -e "${MAGENTA}----------------------------------------------------${NC}"
        echo " 1) Sauvegarder la BDD SQLite"
        echo " 2) Restaurer une sauvegarde SQLite"
        echo " 3) Exporter la BDD au format JSON"
        echo " 4) Réinitialiser la BDD avec des tables vides"
        echo " 0) Retour au menu principal"
        echo ""
        read -p "Votre choix [0-4] : " db_choice

        case $db_choice in
            1)
                TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
                DEST_BACKUP="$BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"
                if [ -f "$DB_FILE" ]; then
                    cp "$DB_FILE" "$DEST_BACKUP"
                    echo -e "${GREEN}✓ Sauvegarde réussie : $DEST_BACKUP${NC}"
                else
                    echo -e "${RED}Erreur : Aucune BDD à sauvegarder.${NC}"
                fi
                ;;
            2)
                echo -e "\n${YELLOW}Sauvegardes disponibles dans $BACKUP_DIR :${NC}"
                ls -lh "$BACKUP_DIR"/*.sqlite 2>/dev/null || echo "Aucune sauvegarde disponible."
                read -p "Nom du fichier à restaurer (ex: db_backup_2026...sqlite) : " bfile
                FULL_BFILE="$BACKUP_DIR/$bfile"
                if [ -f "$FULL_BFILE" ]; then
                    cp "$FULL_BFILE" "$DB_FILE"
                    echo -e "${GREEN}✓ Base de données restaurée avec succès à partir de $bfile !${NC}"
                    systemctl restart ${SERVICE_NAME}.service 2>/dev/null || true
                else
                    echo -e "${RED}Fichier introuvable.${NC}"
                fi
                ;;
            3)
                if [ -f "$DB_FILE" ] && command -v sqlite3 &>/dev/null; then
                    echo -e "${YELLOW}Génération de data/db.json à partir de la BDD SQLite...${NC}"
                    curl -s "http://127.0.0.1:$PORT/api/data" > "$JSON_FILE" 2>/dev/null || true
                    echo -e "${GREEN}✓ Fichier $JSON_FILE mis à jour.${NC}"
                else
                    echo -e "${RED}Impossible d'exporter en JSON.${NC}"
                fi
                ;;
            4)
                read -p "$(echo -e "${RED}ÊTES-VOUS SÛR de vouloir réinitialiser la BDD ? (o/N) : ${NC}")" confirm
                if [[ "$confirm" =~ ^[OoYy]$ ]]; then
                    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
                    [ -f "$DB_FILE" ] && cp "$DB_FILE" "$BACKUP_DIR/db_auto_backup_before_reset_$TIMESTAMP.sqlite"
                    rm -f "$DB_FILE" "$JSON_FILE"
                    sqlite3 "$DB_FILE" <<'EOF'
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS global_team (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
EOF
                    echo -e "${GREEN}✓ Base de données réinitialisée à zéro.${NC}"
                    systemctl restart ${SERVICE_NAME}.service 2>/dev/null || true
                fi
                ;;
            0)
                break
                ;;
            *)
                echo -e "${RED}Choix invalide.${NC}"
                ;;
        esac
    done
}

# 6. Désinstaller / Purger la BDD
uninstall_database() {
    echo -e "\n${RED}====================================================${NC}"
    echo -e "${RED}     PURGE / DÉSINSTALLATION COMPLÈTE DE LA BDD     ${NC}"
    echo -e "${RED}====================================================${NC}"
    echo -e "${YELLOW}Cette action va supprimer complètement le fichier database.sqlite et db.json.${NC}"
    echo -e "${YELLOW}Une sauvegarde automatique sera créée dans le dossier backups/ avant suppression.${NC}"
    read -p "$(echo -e "${RED}Tapez 'PURGER' pour confirmer la suppression totale de la BDD : ${NC}")" CONFIRM_PURGE

    if [ "$CONFIRM_PURGE" == "PURGER" ]; then
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        if [ -f "$DB_FILE" ]; then
            cp "$DB_FILE" "$BACKUP_DIR/db_purged_backup_$TIMESTAMP.sqlite"
            echo -e "${GREEN}✓ Sauvegarde de sécurité créée dans $BACKUP_DIR/db_purged_backup_$TIMESTAMP.sqlite${NC}"
        fi
        rm -f "$DB_FILE" "$JSON_FILE"
        echo -e "${GREEN}✓ Base de données supprimée.${NC}"

        read -p "Voulez-vous recréer une base de données vierge immédiatement ? (O/n) : " RECREATE
        RECREATE=${RECREATE:-O}
        if [[ "$RECREATE" =~ ^[OoYy]$ ]]; then
            sqlite3 "$DB_FILE" <<'EOF'
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS global_team (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
EOF
            echo -e "${GREEN}✓ Nouvelle base de données vierge réinitialisée.${NC}"
        fi

        systemctl restart ${SERVICE_NAME}.service 2>/dev/null || true
    else
        echo -e "${YELLOW}Opération annulée.${NC}"
    fi
}

# 7. Redémarrer le service
restart_application() {
    echo -e "\n${YELLOW}Redémarrage de l'application...${NC}"
    if systemctl is-active --quiet ${SERVICE_NAME}.service 2>/dev/null; then
        systemctl restart ${SERVICE_NAME}.service
        echo -e "${GREEN}✓ Service ${SERVICE_NAME}.service redémarré avec succès.${NC}"
    else
        echo -e "${YELLOW}Le service systemd n'est pas actif. Démarrage du serveur en arrière-plan...${NC}"
        pkill -f "dist/server.js" 2>/dev/null || true
        nohup node "$APP_DIR/dist/server.js" > "$APP_DIR/server.log" 2>&1 &
        echo -e "${GREEN}✓ Serveur démarré en arrière-plan (logs: server.log).${NC}"
    fi
}

# 8. Afficher les logs en direct
show_logs() {
    echo -e "\n${CYAN}Affichage des 50 dernières lignes de logs (Appuyez sur Ctrl+C pour quitter)...${NC}\n"
    if systemctl is-active --quiet ${SERVICE_NAME}.service 2>/dev/null; then
        journalctl -u ${SERVICE_NAME}.service -f -n 50
    elif [ -f "$APP_DIR/server.log" ]; then
        tail -f -n 50 "$APP_DIR/server.log"
    else
        echo -e "${RED}Aucun fichier de log trouvé.${NC}"
    fi
}

# Boucle du Menu Principal
while true; do
    echo -e "\n${CYAN}==============================================================${NC}"
    echo -e "${CYAN}  MENU DE GESTION - GOUVERNANCE PROJETS & ÉQUIPES (DEBIAN 13) ${NC}"
    echo -e "${CYAN}==============================================================${NC}"
    echo " 1) Vérification de l'intégrité des fichiers"
    echo " 2) Test du service & Statut du serveur"
    echo " 3) Test réseau & Connectivité Internet"
    echo " 4) Test de l'intégrité de la BDD SQLite"
    echo " 5) Gestion BDD (Sauvegardes, Restauration, Export JSON)"
    echo " 6) Désinstaller / Purger la BDD (Suppression complète)"
    echo " 7) Redémarrer le serveur / service"
    echo " 8) Voir les logs du serveur en direct"
    echo " 0) Quitter"
    echo ""
    read -p "Sélectionnez une option [0-8] : " choice

    case $choice in
        1) check_file_integrity ;;
        2) check_service_status ;;
        3) check_network ;;
        4) check_database_integrity ;;
        5) manage_database_menu ;;
        6) uninstall_database ;;
        7) restart_application ;;
        8) show_logs ;;
        0) echo -e "${GREEN}Au revoir !${NC}"; exit 0 ;;
        *) echo -e "${RED}Choix invalide, veuillez rechoisir.${NC}" ;;
    esac
done
