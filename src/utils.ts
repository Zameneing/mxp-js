/**
 * Utility functions for MXP
 */

// Cross-platform crypto support (Node.js and browsers)
// In Node.js 19+, globalThis.crypto is available
// In older Node.js, we need to use the crypto module
let cryptoImpl: Crypto;

if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
  cryptoImpl = globalThis.crypto;
} else {
  // Node.js environment - use require for sync loading
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('node:crypto');
  cryptoImpl = nodeCrypto.webcrypto as Crypto;
}

/**
 * Get random values (cross-platform)
 */
function getRandomValues(buffer: Uint8Array): Uint8Array {
  return cryptoImpl.getRandomValues(buffer);
}

/**
 * Generate a random trace ID (64-bit)
 *
 * Uses crypto.getRandomValues for secure randomness.
 */
export function generateTraceId(): bigint {
  const buffer = new Uint8Array(8);
  getRandomValues(buffer);
  return bytesToBigInt(buffer);
}

/**
 * Generate a random message ID (64-bit)
 */
export function generateMessageId(): bigint {
  const buffer = new Uint8Array(8);
  getRandomValues(buffer);
  return bytesToBigInt(buffer);
}

/**
 * Convert Uint8Array to BigInt (little-endian)
 */
export function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Convert BigInt to Uint8Array (little-endian)
 */
export function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

/**
 * Simple XXHash3-like hash for checksums
 *
 * Note: This is a simplified implementation. For production,
 * consider using a proper XXHash3 library.
 */
export function xxhash64(data: Uint8Array): bigint {
  // Simplified hash - in production use xxhash-wasm or similar
  // Mask to ensure 64-bit result
  const mask64 = 0xffffffffffffffffn;
  let hash = 0n;
  const prime1 = 11400714785074694791n;
  const prime2 = 14029467366897019727n;

  for (let i = 0; i < data.length; i++) {
    hash ^= BigInt(data[i]) * prime1;
    hash = hash & mask64;
    hash = (((hash << 31n) | (hash >> 33n)) * prime2) & mask64;
  }

  return hash;
}

/**
 * Format a trace ID as hex string
 */
export function formatTraceId(traceId: bigint): string {
  return traceId.toString(16).padStart(16, '0');
}

/**
 * Parse a hex trace ID string to BigInt
 */
export function parseTraceId(hex: string): bigint {
  return BigInt('0x' + hex);
}
