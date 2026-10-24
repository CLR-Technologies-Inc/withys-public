// SPDX-License-Identifier: BSD-3-Clause
// Copyright (c) 2026, CLRTechDev
/**
 * Secure ID Generation Utilities for Withys PRM.
 *
 * Replaces insecure Math.random() usage with cryptographically strong
 * random values using the Web Crypto API.
 */

/**
 * Generates a cryptographically secure random alphanumeric ID.
 * Uses rejection sampling to eliminate modulo bias.
 *
 * Optimized for React Native: Uses bulk entropy gathering (128-byte buffer)
 * to minimize expensive bridge calls to crypto.getRandomValues().
 *
 * ⚡ Performance Optimization: The buffer and index are hoisted to module scope
 * to reuse entropy across multiple calls and reduce allocation overhead.
 *
 * @param length The length of the ID to generate (default 9).
 * @param chars The character set to use for generation (default [a-z0-9]).
 * @returns A secure random string.
 * @throws Error if cryptographically strong random number generation is not available.
 */
const BUFFER_SIZE = 128;
const randomBuffer = new Uint8Array(BUFFER_SIZE);
let bufferIndex = BUFFER_SIZE; // Start as exhausted

/** UUID representation of the application's existing cryptographic ID source. */
export function generateSecureUuid(): string {
  const hex = generateSecureId(32, '0123456789abcdef');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function generateSecureId(
  length = 9,
  chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
): string {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error(
      'Cryptographically strong random number generation is not available.'
    );
  }

  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('ID length must be a non-negative safe integer');
  }
  if (typeof chars !== 'string' || chars.length === 0) {
    throw new TypeError('ID alphabet must be a non-empty string');
  }

  const charCount = chars.length;
  if (charCount > 256) {
    throw new Error('Alphabet too large for single-byte rejection sampling');
  }

  // To eliminate modulo bias, we calculate the largest multiple of charCount <= 256
  const maxValidByte = 256 - (256 % charCount);

  let result = '';

  while (result.length < length) {
    // Refill buffer if exhausted
    if (bufferIndex >= BUFFER_SIZE) {
      globalThis.crypto.getRandomValues(randomBuffer);
      bufferIndex = 0;
    }

    const byte = randomBuffer[bufferIndex++];

    // Rejection sampling: discard values that would cause bias
    if (byte < maxValidByte) {
      result += chars[byte % charCount];
    }
  }

  return result;
}
