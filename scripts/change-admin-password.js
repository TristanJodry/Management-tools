import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newPassword = process.argv[2];

if (!newPassword || !newPassword.trim()) {
  console.log('⚠️ Usage: npm run change-admin-pass <nouveau_mot_de_passe>');
  console.log('Exemple: npm run change-admin-pass MonNouveauCodeSecurise123!');
  process.exit(1);
}

const cleanPassword = newPassword.trim();
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(cleanPassword, salt, 10000, 64, 'sha512').toString('hex');

const configPath = path.resolve(__dirname, '../src/config/adminConfig.ts');

const fileContent = `/**
 * Configuration du compte Administrateur Principal (Sécurisé avec hachage PBKDF2 SHA-512).
 * 
 * Pour modifier le mot de passe de l'administrateur :
 * Exécutez le script : npm run change-admin-pass <nouveau_mot_de_passe>
 */
export const ADMIN_CONFIG = {
  id: 'admin-root',
  username: 'admin',
  passwordHash: '${hash}',
  salt: '${salt}',
  password: '', // Désactivé au profit du mot de passe haché
  firstName: 'Administrateur',
  lastName: 'Système',
  email: 'admin@gouvernance.local',
  role: 'Administrateur Principal',
  isAdmin: true
};
`;

fs.writeFileSync(configPath, fileContent, 'utf-8');

try {
  execSync('git update-index --skip-worktree src/config/adminConfig.ts 2>/dev/null', { stdio: 'ignore' });
} catch (e) {
  // Ignore if git is not initialized or file not committed yet
}

console.log('\n======================================================');
console.log('✅ Mot de passe Administrateur mis à jour et haché !');
console.log('======================================================');
console.log(`👤 Identifiant : admin`);
console.log(`🔑 Nouveau mot de passe (en clair) : ${cleanPassword}`);
console.log(`🔐 Empreinte hachée (PBKDF2-SHA512) : ${hash.substring(0, 32)}...`);
console.log(`🧂 Salt unique : ${salt}`);
console.log('======================================================\n');
