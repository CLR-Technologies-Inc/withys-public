/**
 * End-to-End Encrypted Vault for WWLO PRM.
 *
 * Uses AES-256-GCM via the Web Crypto API for client-side encryption.
 * Keys are derived from a user passphrase using PBKDF2 (100k iterations).
 *
 * Architecture:
 *   - Passphrase → PBKDF2 → AES-256-GCM key (never stored)
 *   - Each entry encrypted with a unique IV (12 bytes)
 *   - Ciphertext stored as: base64(salt + iv + ciphertext + authTag)
 *   - Only the encrypted blob leaves the device → Supabase stores opaque data
 *
 * This module is platform-agnostic: works on Web (native crypto) and
 * React Native (via expo-crypto polyfill or react-native-get-random-values).
 */

// ── Constants ────────────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12;   // bytes for AES-GCM
const KEY_LENGTH = 256;  // bits

// ── Types ────────────────────────────────────────────────────────────────────

export interface VaultConfig {
  /** Whether the vault is unlocked (passphrase has been entered this session) */
  isUnlocked: boolean;
  /** Whether vault has been set up (salt exists) */
  isConfigured: boolean;
  /** Hash of the passphrase for quick verification (not the key itself) */
  passphraseHash?: string;
}

export interface EncryptedPayload {
  /** Base64-encoded: salt(16) + iv(12) + ciphertext + authTag(16) */
  ciphertext: string;
  /** Version for future algorithm upgrades */
  version: 1;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function getRandomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error(
      'Cryptographically strong random number generation is not available. ' +
      'Ensure a secure environment or appropriate polyfills are loaded.'
    );
  }
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ── Key Derivation ──────────────────────────────────────────────────────────

/**
 * Derive an AES-256-GCM key from a passphrase using PBKDF2.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── Encryption ──────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext with AES-256-GCM.
 *
 * Returns a base64 blob containing salt + iv + ciphertext.
 * Each call uses a fresh random salt and IV.
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);
  const key = await deriveKey(passphrase, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    textEncoder.encode(plaintext)
  );

  // Concatenate: salt(16) + iv(12) + ciphertext+authTag
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertextBuffer.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertextBuffer), SALT_LENGTH + IV_LENGTH);

  return {
    ciphertext: arrayBufferToBase64(combined.buffer),
    version: 1,
  };
}

// ── Decryption ──────────────────────────────────────────────────────────────

/**
 * Decrypt an EncryptedPayload back to plaintext.
 *
 * Throws if the passphrase is wrong (AES-GCM auth tag verification fails).
 */
export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string> {
  if (payload.version !== 1) {
    throw new Error(`Unsupported vault version: ${payload.version}`);
  }

  const combined = new Uint8Array(base64ToArrayBuffer(payload.ciphertext));

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertextBytes = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      ciphertextBytes
    );
    return textDecoder.decode(plaintextBuffer);
  } catch {
    throw new Error('Decryption failed — wrong passphrase or corrupted data');
  }
}

// ── Passphrase Hashing (for UI verification, NOT for encryption) ─────────

/**
 * Create a hash of the passphrase for quick "is this the right passphrase?" checks.
 * This is NOT used for encryption — it's only for UX (avoiding wrong-passphrase errors).
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const salt = textEncoder.encode('prm-journal-vault-verify');
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as any, iterations: 10_000, hash: 'SHA-256' },
    key,
    256
  );
  return arrayBufferToBase64(bits);
}

/**
 * Verify a passphrase against a stored hash.
 */
export async function verifyPassphrase(passphrase: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassphrase(passphrase);
  return hash === storedHash;
}

// ── Vault Tag Helpers ────────────────────────────────────────────────────────

/**
 * Check if an entry's raw_text contains the vault tag.
 */
export function isVaultEntry(rawText: string): boolean {
  return /;\s*vault\s*:\s*true/i.test(rawText);
}

/**
 * Check if raw_text is an encrypted blob (starts with version marker).
 */
export function isEncryptedEntry(rawText: string): boolean {
  return rawText.startsWith('VAULT:1:');
}

/**
 * Wrap encrypted payload into a storable string.
 */
export function serializeEncrypted(payload: EncryptedPayload): string {
  return `VAULT:${payload.version}:${payload.ciphertext}`;
}

/**
 * Parse a stored encrypted string back into an EncryptedPayload.
 */
export function deserializeEncrypted(stored: string): EncryptedPayload {
  const match = stored.match(/^VAULT:(\d+):(.+)$/);
  if (!match) throw new Error('Invalid vault entry format');
  return {
    version: parseInt(match[1], 10) as 1,
    ciphertext: match[2],
  };
}
