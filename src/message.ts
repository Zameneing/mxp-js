/**
 * MXP Message implementation
 */

import { generateMessageId, generateTraceId } from './utils';

/**
 * Message type identifiers matching the Rust implementation
 */
export enum MessageType {
  /** Generic call/request */
  Call = 0x01,
  /** Response to a call */
  Response = 0x02,
  /** Error response */
  Error = 0x03,
  /** One-way notification */
  Notify = 0x04,

  // Streaming
  /** Open a new stream */
  StreamOpen = 0x10,
  /** Stream data chunk */
  StreamChunk = 0x11,
  /** Close a stream */
  StreamClose = 0x12,

  // Agent-specific
  /** Register an agent */
  AgentRegister = 0x20,
  /** Discover agents */
  AgentDiscover = 0x21,
  /** Agent heartbeat */
  AgentHeartbeat = 0x22,

  // Control
  /** Ping for latency measurement */
  Ping = 0xF0,
  /** Pong response */
  Pong = 0xF1,
}

/**
 * Message flags
 */
export enum MessageFlags {
  None = 0x00,
  /** Message payload is encrypted */
  Encrypted = 0x01,
  /** Message payload is compressed */
  Compressed = 0x02,
  /** Message requires acknowledgment */
  RequiresAck = 0x04,
  /** Message is a retransmission */
  Retransmit = 0x08,
  /** Message is high priority */
  HighPriority = 0x10,
}

/**
 * MXP Message
 *
 * Core message type for agent-to-agent communication.
 *
 * @example
 * ```typescript
 * const msg = new Message(MessageType.Call, Buffer.from('Hello!'));
 * console.log('Trace ID:', msg.traceId);
 * ```
 */
export class Message {
  /** Protocol version */
  readonly version: number = 1;

  /** Message type */
  readonly messageType: MessageType;

  /** Message flags */
  flags: MessageFlags;

  /** Priority (0-255, higher = more important) */
  priority: number;

  /** Unique message identifier */
  readonly messageId: bigint;

  /** Trace ID for distributed tracing */
  readonly traceId: bigint;

  /** Correlation ID for request/response linking */
  correlationId: bigint;

  /** Message payload */
  payload: Uint8Array;

  /**
   * Create a new MXP message
   *
   * @param messageType - Type of message
   * @param payload - Message payload
   * @param options - Optional configuration
   */
  constructor(
    messageType: MessageType,
    payload: Uint8Array | Buffer | string,
    options: {
      flags?: MessageFlags;
      priority?: number;
      traceId?: bigint;
      correlationId?: bigint;
    } = {}
  ) {
    this.messageType = messageType;
    this.flags = options.flags ?? MessageFlags.None;
    this.priority = options.priority ?? 0;
    this.messageId = generateMessageId();
    this.traceId = options.traceId ?? generateTraceId();
    this.correlationId = options.correlationId ?? 0n;

    // Convert payload to Uint8Array
    if (typeof payload === 'string') {
      this.payload = new TextEncoder().encode(payload);
    } else if (Buffer.isBuffer(payload)) {
      this.payload = new Uint8Array(payload);
    } else {
      this.payload = payload;
    }
  }

  /**
   * Create a Call message
   */
  static call(payload: Uint8Array | Buffer | string, options?: { priority?: number; traceId?: bigint }): Message {
    return new Message(MessageType.Call, payload, options);
  }

  /**
   * Create a Response message
   */
  static response(
    payload: Uint8Array | Buffer | string,
    correlationId: bigint,
    options?: { traceId?: bigint }
  ): Message {
    return new Message(MessageType.Response, payload, { ...options, correlationId });
  }

  /**
   * Create an Error message
   */
  static error(
    payload: Uint8Array | Buffer | string,
    correlationId: bigint,
    options?: { traceId?: bigint }
  ): Message {
    return new Message(MessageType.Error, payload, { ...options, correlationId });
  }

  /**
   * Create a StreamOpen message
   */
  static streamOpen(payload: Uint8Array | Buffer | string, options?: { traceId?: bigint }): Message {
    return new Message(MessageType.StreamOpen, payload, options);
  }

  /**
   * Create a StreamChunk message
   */
  static streamChunk(
    payload: Uint8Array | Buffer | string,
    correlationId: bigint,
    options?: { traceId?: bigint }
  ): Message {
    return new Message(MessageType.StreamChunk, payload, { ...options, correlationId });
  }

  /**
   * Create a StreamClose message
   */
  static streamClose(correlationId: bigint, options?: { traceId?: bigint }): Message {
    return new Message(MessageType.StreamClose, new Uint8Array(0), { ...options, correlationId });
  }

  /**
   * Create a Ping message
   */
  static ping(): Message {
    return new Message(MessageType.Ping, new Uint8Array(0));
  }

  /**
   * Create a Pong message in response to a Ping
   */
  static pong(ping: Message): Message {
    return new Message(MessageType.Pong, new Uint8Array(0), {
      correlationId: ping.messageId,
      traceId: ping.traceId,
    });
  }

  /**
   * Get payload as string (UTF-8)
   */
  payloadAsString(): string {
    return new TextDecoder().decode(this.payload);
  }

  /**
   * Get payload as JSON
   */
  payloadAsJson<T = unknown>(): T {
    return JSON.parse(this.payloadAsString());
  }

  /**
   * Check if this is a streaming message
   */
  isStreaming(): boolean {
    return (
      this.messageType === MessageType.StreamOpen ||
      this.messageType === MessageType.StreamChunk ||
      this.messageType === MessageType.StreamClose
    );
  }

  /**
   * Check if this message requires a response
   */
  requiresResponse(): boolean {
    return this.messageType === MessageType.Call || this.messageType === MessageType.Ping;
  }
}

