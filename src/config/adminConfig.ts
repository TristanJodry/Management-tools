/**
 * Configuration du compte Administrateur Principal (Sécurisé avec hachage PBKDF2 SHA-512).
 * 
 * Pour modifier le mot de passe de l'administrateur :
 * Exécutez le script : npm run change-admin-pass <nouveau_mot_de_passe>
 */
export const ADMIN_CONFIG = {
  id: 'admin-root',
  username: 'admin',
  passwordHash: '7482d5fbb421a2b5ec020af3df91f8f543488a723443045193ba3f361fd53dc208e85b99e300630647b38d3088db4db25c4706b63d9da92b2f47aba6f0527a5d',
  salt: 'ba6c4d9b1e02a59586d27382b4d78058',
  password: '', // Désactivé au profit du mot de passe haché
  firstName: 'Administrateur',
  lastName: 'Système',
  email: 'admin@gouvernance.local',
  role: 'Administrateur Principal',
  isAdmin: true
};
