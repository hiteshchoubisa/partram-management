/**
 * Generate shorter, more readable IDs for orders and other entities
 * Format: ORD-XXXXXX (e.g., ORD-A1B2C3)
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ID_LENGTH = 6;

/**
 * Generate a short, readable ID
 * @param prefix - Optional prefix (e.g., 'ORD' for orders)
 * @returns Short ID like 'ORD-A1B2C3'
 */
export function generateShortId(prefix: string = ''): string {
  let result = '';
  
  // Generate random string
  for (let i = 0; i < ID_LENGTH; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  
  return prefix ? `${prefix}-${result}` : result;
}

/**
 * Generate a short order ID with date format
 * @returns Order ID like 'ORD-20251011-8743'
 */
export function generateOrderId(): string {
  // Format: ORD-YYYYMMDD-XXXX
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate 4-digit sequence number
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += Math.floor(Math.random() * 10);
  }
  
  return `ORD-${dateStr}-${result}`;
}

/**
 * Generate a short product ID
 * @returns Product ID like 'PRD-A1B2C3'
 */
export function generateProductId(): string {
  return generateShortId('PRD');
}

/**
 * Generate a short client ID
 * @returns Client ID like 'CLT-A1B2C3'
 */
export function generateClientId(): string {
  return generateShortId('CLT');
}

/**
 * Check if a string looks like a short ID
 * @param id - String to check
 * @returns True if it matches the short ID pattern
 */
export function isShortId(id: string): boolean {
  return /^[A-Z]{3}-[A-Z0-9]{6}$/.test(id);
}

/**
 * Extract the prefix from a short ID
 * @param id - Short ID
 * @returns Prefix (e.g., 'ORD' from 'ORD-A1B2C3')
 */
export function getShortIdPrefix(id: string): string {
  const match = id.match(/^([A-Z]{3})-/);
  return match ? match[1] : '';
}
