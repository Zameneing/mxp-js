/**
 * A2A ↔ MXP Conversion
 *
 * Bidirectional conversion between A2A JSON-RPC and MXP binary format.
 */

import { Message as MxpMessage, MessageType } from '../message';
import { encode, decode } from '../codec';
import { Message, Part, Role } from './types';
import { Task } from './task';

/**
 * Result of converting from MXP
 */
export interface ConversionResult {
  /** A2A method name */
  method: string;
  /** Reconstructed A2A message (if applicable) */
  message?: Message;
  /** Reconstructed A2A task (if applicable) */
  task?: Task;
  /** Raw payload data */
  payload: Record<string, unknown>;
}

/**
 * Convert an A2A message to MXP binary format
 *
 * @param message - A2A message to convert
 * @returns MXP message ready for transport
 *
 * @example
 * ```typescript
 * const a2aMsg = Message.userText('Hello!');
 * const mxpMsg = toMxp(a2aMsg);
 * const bytes = encode(mxpMsg);
 * // Send bytes over network
 * ```
 */
export function toMxp(message: Message): MxpMessage {
  const payload = {
    method: 'message/send',
    message: message.toJSON(),
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  return new MxpMessage(MessageType.Call, payloadBytes);
}

/**
 * Convert an MXP message back to A2A format
 *
 * @param mxpMessage - MXP message to convert
 * @returns Conversion result with A2A message/task
 *
 * @example
 * ```typescript
 * const mxpMsg = decode(receivedBytes);
 * const { method, message } = fromMxp(mxpMsg);
 * console.log('Method:', method);
 * console.log('Text:', message?.textContent());
 * ```
 */
export function fromMxp(mxpMessage: MxpMessage): ConversionResult {
  const payloadStr = mxpMessage.payloadAsString();
  const payload = JSON.parse(payloadStr) as Record<string, unknown>;

  const method = (payload.method as string) || inferMethod(mxpMessage.messageType);
  let message: Message | undefined;
  let task: Task | undefined;

  // Reconstruct A2A message if present
  if (payload.message) {
    const msgData = payload.message as Record<string, unknown>;
    message = Message.fromJSON(msgData);
  }

  // Reconstruct task if present
  if (payload.task) {
    const taskData = payload.task as Record<string, unknown>;
    task = Task.fromJSON(taskData);
  }

  return { method, message, task, payload };
}

/**
 * Convert A2A task to MXP
 */
export function taskToMxp(task: Task): MxpMessage {
  const payload = {
    method: 'tasks/send',
    task: task.toJSON(),
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  return new MxpMessage(MessageType.Response, payloadBytes);
}

/**
 * Create MXP stream open message
 */
export function toMxpStreamOpen(message: Message): MxpMessage {
  const payload = {
    method: 'message/stream',
    message: message.toJSON(),
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  return new MxpMessage(MessageType.StreamOpen, payloadBytes);
}

/**
 * Create MXP stream chunk message
 */
export function toMxpStreamChunk(content: string, correlationId: bigint): MxpMessage {
  const payloadBytes = new TextEncoder().encode(content);

  return new MxpMessage(MessageType.StreamChunk, payloadBytes, {
    correlationId,
  });
}

/**
 * Create MXP stream close message
 */
export function toMxpStreamClose(correlationId: bigint): MxpMessage {
  return MxpMessage.streamClose(correlationId);
}

/**
 * Create an error MXP message
 */
export function errorToMxp(code: number, message: string, correlationId?: bigint): MxpMessage {
  const payload = {
    error: { code, message },
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  return new MxpMessage(MessageType.Error, payloadBytes, {
    correlationId: correlationId ?? 0n,
  });
}

/**
 * Quick response helper
 */
export function quickResponse(text: string): MxpMessage {
  const message = Message.agentText(text);
  return toMxp(message);
}

/**
 * Infer A2A method from MXP message type
 */
function inferMethod(type: MessageType): string {
  switch (type) {
    case MessageType.Call:
      return 'message/send';
    case MessageType.Response:
      return 'message/send';
    case MessageType.StreamOpen:
      return 'message/stream';
    case MessageType.StreamChunk:
      return 'message/stream';
    case MessageType.StreamClose:
      return 'message/stream';
    default:
      return 'unknown';
  }
}

/**
 * Method mappings between A2A and MXP
 */
export const METHOD_MAPPINGS: Record<string, { request: MessageType; response: MessageType }> = {
  'message/send': { request: MessageType.Call, response: MessageType.Response },
  'message/stream': { request: MessageType.StreamOpen, response: MessageType.StreamChunk },
  'tasks/send': { request: MessageType.Call, response: MessageType.Response },
  'tasks/get': { request: MessageType.Call, response: MessageType.Response },
  'tasks/cancel': { request: MessageType.Call, response: MessageType.Response },
};

