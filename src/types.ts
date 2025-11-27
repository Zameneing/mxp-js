/**
 * Core types for MXP protocol
 */

/**
 * MXP message header structure
 */
export interface MessageHeader {
  /** Protocol version (currently 1) */
  version: number;
  /** Message type identifier */
  messageType: number;
  /** Message flags (encryption, compression, etc.) */
  flags: number;
  /** Priority level (0-255) */
  priority: number;
  /** Unique message identifier */
  messageId: bigint;
  /** Trace ID for distributed tracing */
  traceId: bigint;
  /** Correlation ID for request/response linking */
  correlationId: bigint;
  /** Payload length in bytes */
  payloadLength: number;
  /** XXHash3 checksum of payload */
  checksum: bigint;
}

/**
 * Encoded message ready for transport
 */
export interface EncodedMessage {
  /** Complete encoded bytes (header + payload) */
  bytes: Uint8Array;
  /** Header portion */
  header: Uint8Array;
  /** Payload portion */
  payload: Uint8Array;
}

/**
 * Decode result with parsed header and payload
 */
export interface DecodeResult {
  /** Parsed header */
  header: MessageHeader;
  /** Raw payload bytes */
  payload: Uint8Array;
}

/**
 * MXP protocol constants
 */
export const MXP_CONSTANTS = {
  /** Header size in bytes */
  HEADER_SIZE: 64,
  /** Current protocol version */
  PROTOCOL_VERSION: 1,
  /** Magic bytes for protocol identification */
  MAGIC: 0x4d5850, // "MXP"
  /** Maximum payload size (16MB) */
  MAX_PAYLOAD_SIZE: 16 * 1024 * 1024,
} as const;

