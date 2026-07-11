/**
 * Secure ID Generation Utilities for WWLO PRM.
 *
 * Replaces insecure Math.random() usage with cryptographically strong
 * random values using the Web Crypto API.
 */

/**
 * Generates a cryptographically secure random alphanumeric ID.
 *
 * @param length The length of the ID to generate (default 9).
 * @returns A secure random string of [0-9a-z].
 * @throws Error if cryptographically strong random number generation is not available.
 */
export function generateSecureId(length: number = 9): string {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error(
      'Cryptographically strong random number generation is not available. ' +
      'Ensure a secure environment or appropriate polyfills are loaded.'
    );
  }

  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  globalThis.crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    // Use modulo to map random bytes to the character set.
    // Note: This introduces a tiny bias since 256 is not a multiple of 36,
    // but for 9-character local IDs, this is acceptable compared to Math.random().
    result += chars[array[i] % chars.length];
  }

  return result;
}
