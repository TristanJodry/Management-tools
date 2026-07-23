import crypto from 'crypto';

export interface HashedPassword {
  hash: string;
  salt: string;
}

/**
 * Hashes a plain password using PBKDF2 with SHA-512 and a random or provided salt.
 */
export function hashPassword(password: string, existingSalt?: string): HashedPassword {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Safely verifies a user password against stored hash/salt or fallback plain password.
 */
export function verifyPassword(
  passwordAttempt: string,
  stored: { passwordHash?: string; salt?: string; password?: string }
): boolean {
  if (!passwordAttempt) return false;
  const trimmed = passwordAttempt.trim();

  // 1. PBKDF2 Salted Hash check
  if (stored.passwordHash && stored.salt) {
    const { hash } = hashPassword(trimmed, stored.salt);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(stored.passwordHash, 'hex')
      );
    } catch {
      return hash === stored.passwordHash;
    }
  }

  // 2. Legacy SHA-256 hash check
  if (stored.passwordHash && !stored.salt) {
    const legacyHash = crypto.createHash('sha256').update(trimmed).digest('hex');
    return stored.passwordHash === legacyHash || stored.passwordHash === trimmed;
  }

  // 3. Plain text fallback check
  if (stored.password) {
    return stored.password.trim() === trimmed;
  }

  return false;
}
