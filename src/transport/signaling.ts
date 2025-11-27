/**
 * Signaling Providers
 *
 * Example signaling implementations for WebRTC transport.
 */

import { SignalingProvider, SignalingMessage } from './types';

/**
 * WebSocket Signaling Provider
 *
 * Uses a WebSocket server for signaling.
 *
 * @example
 * ```typescript
 * const signaling = new WebSocketSignaling('ws://localhost:8080/signal', 'my-peer-id');
 * await signaling.connect();
 *
 * const transport = new WebRTCTransport(signaling);
 * ```
 */
export class WebSocketSignaling implements SignalingProvider {
  private ws: WebSocket | null = null;
  private url: string;
  private localId: string;
  private messageHandler?: (msg: SignalingMessage) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(url: string, localId: string) {
    this.url = url;
    this.localId = localId;
  }

  /**
   * Connect to signaling server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Add localId to URL
        const wsUrl = new URL(this.url);
        wsUrl.searchParams.set('peerId', this.localId);

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log('[Signaling] Connected to server');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as SignalingMessage;
            this.messageHandler?.(msg);
          } catch (error) {
            console.error('[Signaling] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[Signaling] Disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[Signaling] Error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[Signaling] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect().catch(() => {}), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Send a signaling message
   */
  async send(message: SignalingMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Register message handler
   */
  onMessage(handler: (message: SignalingMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Get local peer ID
   */
  getLocalId(): string {
    return this.localId;
  }

  /**
   * Close connection
   */
  close(): void {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    this.ws?.close();
    this.ws = null;
  }
}

/**
 * BroadcastChannel Signaling Provider
 *
 * Uses BroadcastChannel API for same-origin signaling (same browser, different tabs).
 * Great for testing and demos.
 *
 * @example
 * ```typescript
 * const signaling = new BroadcastChannelSignaling('mxp-signal', 'peer-1');
 * const transport = new WebRTCTransport(signaling);
 * ```
 */
export class BroadcastChannelSignaling implements SignalingProvider {
  private channel: BroadcastChannel;
  private localId: string;
  private messageHandler?: (msg: SignalingMessage) => void;

  constructor(channelName: string, localId: string) {
    this.localId = localId;
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      const msg = event.data as SignalingMessage;
      // Only handle messages for us
      if (msg.to === this.localId || msg.to === '*') {
        this.messageHandler?.(msg);
      }
    };
  }

  async send(message: SignalingMessage): Promise<void> {
    this.channel.postMessage(message);
  }

  onMessage(handler: (message: SignalingMessage) => void): void {
    this.messageHandler = handler;
  }

  getLocalId(): string {
    return this.localId;
  }

  close(): void {
    this.channel.close();
  }
}

/**
 * Manual Signaling Provider
 *
 * For manual copy-paste signaling (debugging/demos).
 *
 * @example
 * ```typescript
 * const signaling = new ManualSignaling('peer-1');
 *
 * // When you receive a message from the other peer
 * signaling.receive(pastedMessage);
 *
 * // Messages to send will be logged to console
 * signaling.onOutgoing((msg) => {
 *   console.log('Send this to peer:', JSON.stringify(msg));
 * });
 * ```
 */
export class ManualSignaling implements SignalingProvider {
  private localId: string;
  private messageHandler?: (msg: SignalingMessage) => void;
  private outgoingHandler?: (msg: SignalingMessage) => void;

  constructor(localId: string) {
    this.localId = localId;
  }

  async send(message: SignalingMessage): Promise<void> {
    // Log or call handler for manual sending
    if (this.outgoingHandler) {
      this.outgoingHandler(message);
    } else {
      console.log('[Manual Signaling] Send to peer:', JSON.stringify(message, null, 2));
    }
  }

  onMessage(handler: (message: SignalingMessage) => void): void {
    this.messageHandler = handler;
  }

  getLocalId(): string {
    return this.localId;
  }

  /**
   * Register handler for outgoing messages
   */
  onOutgoing(handler: (msg: SignalingMessage) => void): void {
    this.outgoingHandler = handler;
  }

  /**
   * Manually receive a message
   */
  receive(message: SignalingMessage | string): void {
    const msg = typeof message === 'string' ? JSON.parse(message) : message;
    this.messageHandler?.(msg);
  }
}

/**
 * In-Memory Signaling Hub
 *
 * For testing - all peers in same process.
 */
export class InMemorySignalingHub {
  private peers: Map<string, (msg: SignalingMessage) => void> = new Map();

  /**
   * Create a signaling provider connected to this hub
   */
  createProvider(localId: string): SignalingProvider {
    const hub = this;

    return {
      async send(message: SignalingMessage): Promise<void> {
        const handler = hub.peers.get(message.to);
        if (handler) {
          // Simulate async
          setTimeout(() => handler(message), 0);
        }
      },

      onMessage(handler: (message: SignalingMessage) => void): void {
        hub.peers.set(localId, handler);
      },

      getLocalId(): string {
        return localId;
      },
    };
  }

  /**
   * Clear all peers
   */
  clear(): void {
    this.peers.clear();
  }
}

