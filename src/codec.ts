/**
 * MXP Binary Codec
 *
 * Encodes and decodes MXP messages to/from binary format.
 * Wire-compatible with the Rust implementation.
 */

import { Message, MessageFlags, MessageType } from './message';
import { MessageHeader, MXP_CONSTANTS, EncodedMessage, DecodeResult } from './types';
import { bigIntToBytes, bytesToBigInt, xxhash64 } from './utils';

/**
 * Encode a message to binary format
 *
 * @param message - Message to encode
 * @returns Encoded message with header and payload
 *
 * @example
 * ```typescript
 * const msg = Message.call('Hello!');
 * const encoded = encode(msg);
 * // Send encoded.bytes over network
 * ```
 */
export function encode(message: Message): EncodedMessage {
  const header = encodeHeader(message);
  const payload = message.payload;

  // Combine header and payload
  const bytes = new Uint8Array(header.length + payload.length);
  bytes.set(header, 0);
  bytes.set(payload, header.length);

  return { bytes, header, payload };
}

/**
 * Encode just the message header
 */
export function encodeHeader(message: Message): Uint8Array {
  const header = new Uint8Array(MXP_CONSTANTS.HEADER_SIZE);
  const view = new DataView(header.buffer);

  let offset = 0;

  // Version (1 byte)
  view.setUint8(offset, message.version);
  offset += 1;

  // Message type (1 byte)
  view.setUint8(offset, message.messageType);
  offset += 1;

  // Flags (1 byte)
  view.setUint8(offset, message.flags);
  offset += 1;

  // Priority (1 byte)
  view.setUint8(offset, message.priority);
  offset += 1;

  // Reserved (4 bytes)
  offset += 4;

  // Message ID (8 bytes, little-endian)
  header.set(bigIntToBytes(message.messageId, 8), offset);
  offset += 8;

  // Trace ID (8 bytes, little-endian)
  header.set(bigIntToBytes(message.traceId, 8), offset);
  offset += 8;

  // Correlation ID (8 bytes, little-endian)
  header.set(bigIntToBytes(message.correlationId, 8), offset);
  offset += 8;

  // Payload length (4 bytes, little-endian)
  view.setUint32(offset, message.payload.length, true);
  offset += 4;

  // Reserved (12 bytes)
  offset += 12;

  // Checksum (8 bytes, little-endian)
  const checksum = xxhash64(message.payload);
  header.set(bigIntToBytes(checksum, 8), offset);

  return header;
}

/**
 * Decode a binary message
 *
 * @param bytes - Complete message bytes (header + payload)
 * @returns Decoded message
 *
 * @example
 * ```typescript
 * const decoded = decode(receivedBytes);
 * console.log('Type:', decoded.messageType);
 * console.log('Payload:', decoded.payloadAsString());
 * ```
 */
export function decode(bytes: Uint8Array): Message {
  if (bytes.length < MXP_CONSTANTS.HEADER_SIZE) {
    throw new Error(`Message too short: ${bytes.length} bytes, need at least ${MXP_CONSTANTS.HEADER_SIZE}`);
  }

  const { header, payload } = decodeRaw(bytes);

  // Create message from decoded data
  const message = new Message(header.messageType as MessageType, payload, {
    flags: header.flags as MessageFlags,
    priority: header.priority,
    traceId: header.traceId,
    correlationId: header.correlationId,
  });

  // Override the auto-generated messageId with the decoded one
  (message as { messageId: bigint }).messageId = header.messageId;

  return message;
}

/**
 * Decode header and payload separately
 */
export function decodeRaw(bytes: Uint8Array): DecodeResult {
  const header = decodeHeader(bytes.slice(0, MXP_CONSTANTS.HEADER_SIZE));
  const payload = bytes.slice(MXP_CONSTANTS.HEADER_SIZE, MXP_CONSTANTS.HEADER_SIZE + header.payloadLength);

  // Verify checksum
  const expectedChecksum = xxhash64(payload);
  if (expectedChecksum !== header.checksum) {
    throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${header.checksum}`);
  }

  return { header, payload };
}

/**
 * Decode just the header
 */
export function decodeHeader(headerBytes: Uint8Array): MessageHeader {
  if (headerBytes.length < MXP_CONSTANTS.HEADER_SIZE) {
    throw new Error(`Header too short: ${headerBytes.length} bytes`);
  }

  const view = new DataView(headerBytes.buffer, headerBytes.byteOffset);
  let offset = 0;

  const version = view.getUint8(offset);
  offset += 1;

  const messageType = view.getUint8(offset);
  offset += 1;

  const flags = view.getUint8(offset);
  offset += 1;

  const priority = view.getUint8(offset);
  offset += 1;

  // Skip reserved (4 bytes)
  offset += 4;

  const messageId = bytesToBigInt(headerBytes.slice(offset, offset + 8));
  offset += 8;

  const traceId = bytesToBigInt(headerBytes.slice(offset, offset + 8));
  offset += 8;

  const correlationId = bytesToBigInt(headerBytes.slice(offset, offset + 8));
  offset += 8;

  const payloadLength = view.getUint32(offset, true);
  offset += 4;

  // Skip reserved (12 bytes)
  offset += 12;

  const checksum = bytesToBigInt(headerBytes.slice(offset, offset + 8));

  return {
    version,
    messageType,
    flags,
    priority,
    messageId,
    traceId,
    correlationId,
    payloadLength,
    checksum,
  };
}

/**
 * Get the size of an encoded message
 */
export function encodedSize(message: Message): number {
  return MXP_CONSTANTS.HEADER_SIZE + message.payload.length;
}

