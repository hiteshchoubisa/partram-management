// Password utilities for the authentication system

// Simple password hashing (for development only)
// In production, use bcrypt or similar
export function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Check if password matches hash
export function verifyPassword(password: string, hash: string): boolean {
  return simpleHash(password) === hash;
}

// For testing - let's see what password generates the hash from your database
export function findPasswordForHash(targetHash: string): string | null {
  // Common passwords to test
  const commonPasswords = [
    'password',
    'admin',
    '123456',
    'hitesh',
    'patram',
    'admin123',
    'password123',
    'hitesh123',
    'patram123',
    '123456789',
    'qwerty',
    'abc123',
    'admin@123',
    'hitesh@123',
    'patram@123'
  ];

  for (const password of commonPasswords) {
    if (simpleHash(password) === targetHash) {
      return password;
    }
  }
  return null;
}

// The hash from your database: e33de153d2489cc8925911a07a4bd67bea353f9d45037a9d1d5c35785dc746e2
// This looks like a SHA-256 hash, not our simple hash
export function isSHA256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

// For now, let's use a simple approach - store the actual password
// In production, you should use proper password hashing
export function createSimplePasswordHash(password: string): string {
  // For development, we'll just use the password as-is
  // In production, use: crypto.createHash('sha256').update(password).digest('hex')
  return password;
}
