/**
 * MXP (Mesh eXchange Protocol) - JavaScript/TypeScript SDK
 *
 * High-performance binary protocol for AI agent communication.
 *
 * @example
 * ```typescript
 * import { Message, MessageType, encode, decode } from '@mxp/protocol';
 *
 * // Create a message
 * const msg = new Message(MessageType.Call, Buffer.from('Hello, agent!'));
 *
 * // Encode to binary (37x faster than JSON)
 * const bytes = encode(msg);
 *
 * // Decode from binary
 * const decoded = decode(bytes);
 * console.log('Trace ID:', decoded.traceId);
 * ```
 *
 * @packageDocumentation
 */

export { Message, MessageType, MessageFlags } from './message';
export { encode, decode, encodeHeader, decodeHeader } from './codec';
export { generateTraceId, generateMessageId } from './utils';
export type { MessageHeader, EncodedMessage } from './types';

// Re-export transport (for convenience)
export * from './transport';

// Version info
export const VERSION = '0.1.0';
export const PROTOCOL_VERSION = 1;

