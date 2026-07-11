/**
 * Unit tests for the E2E encrypted vault module.
 *
 * Tests cover:
 *   - Vault tag detection (isVaultEntry, isEncryptedEntry)
 *   - Payload serialization / deserialization
 *   - Encrypt → decrypt round-trip (AES-256-GCM via Web Crypto)
 *   - Passphrase hashing and verification
 *   - Wrong passphrase rejection
 *   - Edge cases (empty strings, invalid format)
 *
 * Note: These tests rely on Node.js's built-in Web Crypto API (crypto.subtle),
 * available in Node 16+.
 */

import {
  isVaultEntry,
  isEncryptedEntry,
  serializeEncrypted,
  deserializeEncrypted,
  encrypt,
  decrypt,
  hashPassphrase,
  verifyPassphrase,
} from '../vault';
import type { EncryptedPayload } from '../vault';

// ── Tag Detection ───────────────────────────────────────────────────────────

describe('isVaultEntry', () => {
  it('detects vault tag in raw text', () => {
    expect(isVaultEntry('2025-07-01 John\n    Secret  ; vault:true')).toBe(true);
  });

  it('detects vault tag with varied spacing', () => {
    expect(isVaultEntry(';vault:true')).toBe(true);
    expect(isVaultEntry('; vault : true')).toBe(true);
    expect(isVaultEntry(';  vault:  true')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isVaultEntry('; Vault:True')).toBe(true);
    expect(isVaultEntry('; VAULT:TRUE')).toBe(true);
  });

  it('returns false for normal text', () => {
    expect(isVaultEntry('Just a normal entry')).toBe(false);
    expect(isVaultEntry('; mood:happy')).toBe(false);
  });
});

describe('isEncryptedEntry', () => {
  it('detects VAULT:1: prefix', () => {
    expect(isEncryptedEntry('VAULT:1:base64contenthere')).toBe(true);
  });

  it('rejects non-prefixed text', () => {
    expect(isEncryptedEntry('Normal text')).toBe(false);
    expect(isEncryptedEntry('vault:1:lowercase')).toBe(false);
    // isEncryptedEntry specifically checks for 'VAULT:1:' — future versions would need updating
    expect(isEncryptedEntry('VAULT:2:version2')).toBe(false);
  });
});

// ── Serialization ───────────────────────────────────────────────────────────

describe('serializeEncrypted / deserializeEncrypted', () => {
  it('round-trips a payload correctly', () => {
    const payload: EncryptedPayload = {
      ciphertext: 'SGVsbG8gV29ybGQ=',
      version: 1,
    };
    const serialized = serializeEncrypted(payload);
    expect(serialized).toBe('VAULT:1:SGVsbG8gV29ybGQ=');

    const deserialized = deserializeEncrypted(serialized);
    expect(deserialized.version).toBe(1);
    expect(deserialized.ciphertext).toBe('SGVsbG8gV29ybGQ=');
  });

  it('throws on invalid format', () => {
    expect(() => deserializeEncrypted('INVALID FORMAT')).toThrow('Invalid vault entry format');
    expect(() => deserializeEncrypted('')).toThrow('Invalid vault entry format');
  });
});

// ── Encryption / Decryption (Web Crypto) ────────────────────────────────────

describe('encrypt / decrypt', () => {
  const passphrase = 'my-secret-passphrase-2025';

  it('round-trips plaintext through encryption and decryption', async () => {
    const plaintext = '2025-07-01 John | Coffee Shop\n    Had a great conversation';
    const encrypted = await encrypt(plaintext, passphrase);

    expect(encrypted.version).toBe(1);
    expect(typeof encrypted.ciphertext).toBe('string');
    expect(encrypted.ciphertext.length).toBeGreaterThan(0);

    const decrypted = await decrypt(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV/salt)', async () => {
    const plaintext = 'Same message';
    const a = await encrypt(plaintext, passphrase);
    const b = await encrypt(plaintext, passphrase);

    // Salt + IV are random, so ciphertexts should differ
    expect(a.ciphertext).not.toBe(b.ciphertext);

    // But both should decrypt to the same plaintext
    expect(await decrypt(a, passphrase)).toBe(plaintext);
    expect(await decrypt(b, passphrase)).toBe(plaintext);
  });

  it('throws on wrong passphrase', async () => {
    const encrypted = await encrypt('Secret data', passphrase);
    await expect(decrypt(encrypted, 'wrong-passphrase')).rejects.toThrow(
      'Decryption failed'
    );
  });

  it('handles empty string plaintext', async () => {
    const encrypted = await encrypt('', passphrase);
    const decrypted = await decrypt(encrypted, passphrase);
    expect(decrypted).toBe('');
  });

  it('handles unicode plaintext', async () => {
    const plaintext = '🔐 Encrypted entry with émojis and spëcial chars: 日本語';
    const encrypted = await encrypt(plaintext, passphrase);
    const decrypted = await decrypt(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it('handles long plaintext', async () => {
    const plaintext = 'A'.repeat(10000);
    const encrypted = await encrypt(plaintext, passphrase);
    const decrypted = await decrypt(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it('rejects unsupported version', async () => {
    const payload: EncryptedPayload = {
      ciphertext: 'doesntmatter',
      version: 99 as any,
    };
    await expect(decrypt(payload, passphrase)).rejects.toThrow('Unsupported vault version');
  });
});

// ── Passphrase Hashing ──────────────────────────────────────────────────────

describe('hashPassphrase / verifyPassphrase', () => {
  it('produces a deterministic hash for the same passphrase', async () => {
    const hash1 = await hashPassphrase('test-passphrase');
    const hash2 = await hashPassphrase('test-passphrase');
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(0);
  });

  it('produces different hashes for different passphrases', async () => {
    const hash1 = await hashPassphrase('passphrase-a');
    const hash2 = await hashPassphrase('passphrase-b');
    expect(hash1).not.toBe(hash2);
  });

  it('verifyPassphrase returns true for correct passphrase', async () => {
    const hash = await hashPassphrase('correct-horse');
    const valid = await verifyPassphrase('correct-horse', hash);
    expect(valid).toBe(true);
  });

  it('verifyPassphrase returns false for wrong passphrase', async () => {
    const hash = await hashPassphrase('correct-horse');
    const valid = await verifyPassphrase('wrong-horse', hash);
    expect(valid).toBe(false);
  });
});
