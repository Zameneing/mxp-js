/**
 * WebRTC Transport
 *
 * High-level transport using WebRTC for peer-to-peer MXP communication.
 */

import { Message } from '../message';
import { encode } from '../codec';
import { Peer } from './peer';
import {
  ConnectionState,
  TransportConfig,
  DEFAULT_CONFIG,
  SignalingProvider,
  SignalingMessage,
  SignalingType,
  PeerInfo,
  TransportStats,
} from './types';

/**
 * Event handler type
 */
type EventHandler<T = void> = (data: T) => void;

/**
 * WebRTC Transport
 *
 * Manages multiple peer connections for MXP communication.
 *
 * @example
 * ```typescript
 * const transport = new WebRTCTransport(signalingProvider, {
 *   debug: true,
 * });
 *
 * transport.on('message', (msg, peerId) => {
 *   console.log(`Message from ${peerId}:`, msg.payloadAsString());
 * });
 *
 * await transport.connect('peer-123');
 * transport.send('peer-123', Message.call('Hello!'));
 * ```
 */
export class WebRTCTransport {
  private signaling: SignalingProvider;
  private config: Required<TransportConfig>;
  private peers: Map<string, Peer> = new Map();
  private stats: TransportStats = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    peersConnected: 0,
  };

  // Event handlers
  private onStateChange?: EventHandler<{ peerId: string; state: ConnectionState }>;
  private onMessage?: EventHandler<{ message: Message; peerId: string }>;
  private onError?: EventHandler<{ error: Error; peerId?: string }>;
  private onPeerConnected?: EventHandler<string>;
  private onPeerDisconnected?: EventHandler<string>;

  constructor(signaling: SignalingProvider, config: TransportConfig = {}) {
    this.signaling = signaling;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Handle incoming signaling messages
    this.signaling.onMessage((msg) => this.handleSignalingMessage(msg));
  }

  /**
   * Get local peer ID
   */
  get localId(): string {
    return this.signaling.getLocalId();
  }

  /**
   * Connect to a peer
   */
  async connect(peerId: string): Promise<void> {
    if (this.peers.has(peerId)) {
      const existing = this.peers.get(peerId)!;
      if (existing.isConnected()) {
        return; // Already connected
      }
      existing.close();
    }

    this.log(`Connecting to peer: ${peerId}`);

    const peer = this.createPeer(peerId);
    this.peers.set(peerId, peer);

    await peer.createOffer();

    // Wait for connection with timeout
    await this.waitForConnection(peer);
  }

  /**
   * Disconnect from a peer
   */
  disconnect(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
      this.updatePeerCount();
    }
  }

  /**
   * Send a message to a peer
   */
  send(peerId: string, message: Message): void {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer not found: ${peerId}`);
    }
    if (!peer.isConnected()) {
      throw new Error(`Peer not connected: ${peerId}`);
    }

    peer.send(message);

    const { bytes } = encode(message);
    this.stats.messagesSent++;
    this.stats.bytesSent += bytes.length;
  }

  /**
   * Broadcast a message to all connected peers
   */
  broadcast(message: Message): void {
    const { bytes } = encode(message);

    for (const [peerId, peer] of this.peers) {
      if (peer.isConnected()) {
        try {
          peer.send(message);
          this.stats.messagesSent++;
          this.stats.bytesSent += bytes.length;
        } catch (error) {
          this.log(`Failed to send to ${peerId}: ${error}`);
        }
      }
    }
  }

  /**
   * Get all connected peer IDs
   */
  getConnectedPeers(): string[] {
    return Array.from(this.peers.entries())
      .filter(([_, peer]) => peer.isConnected())
      .map(([id]) => id);
  }

  /**
   * Get peer info
   */
  getPeerInfo(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId)?.getInfo();
  }

  /**
   * Get all peer infos
   */
  getAllPeerInfos(): PeerInfo[] {
    return Array.from(this.peers.values()).map((p) => p.getInfo());
  }

  /**
   * Get transport statistics
   */
  getStats(): TransportStats {
    return { ...this.stats };
  }

  /**
   * Close all connections
   */
  close(): void {
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
    this.updatePeerCount();
  }

  /**
   * Handle incoming signaling message
   */
  private async handleSignalingMessage(msg: SignalingMessage): Promise<void> {
    // Ignore messages not for us
    if (msg.to !== this.localId) {
      return;
    }

    this.log(`Signaling from ${msg.from}: ${msg.type}`);

    switch (msg.type) {
      case SignalingType.Offer:
        await this.handleOffer(msg);
        break;
      case SignalingType.Answer:
        await this.handleAnswer(msg);
        break;
      case SignalingType.IceCandidate:
        await this.handleIceCandidate(msg);
        break;
      case SignalingType.Hangup:
        this.handleHangup(msg);
        break;
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(msg: SignalingMessage): Promise<void> {
    let peer = this.peers.get(msg.from);

    if (!peer) {
      peer = this.createPeer(msg.from);
      this.peers.set(msg.from, peer);
    }

    await peer.handleOffer(msg.payload as RTCSessionDescriptionInit);
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(msg: SignalingMessage): Promise<void> {
    const peer = this.peers.get(msg.from);
    if (peer) {
      await peer.handleAnswer(msg.payload as RTCSessionDescriptionInit);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleIceCandidate(msg: SignalingMessage): Promise<void> {
    const peer = this.peers.get(msg.from);
    if (peer && msg.payload) {
      await peer.handleIceCandidate(msg.payload as RTCIceCandidateInit);
    }
  }

  /**
   * Handle hangup
   */
  private handleHangup(msg: SignalingMessage): void {
    this.disconnect(msg.from);
  }

  /**
   * Create a new peer
   */
  private createPeer(peerId: string): Peer {
    const peer = new Peer(peerId, this.localId, this.config, (msg) =>
      this.signaling.send(msg)
    );

    peer.on('stateChange', (state) => {
      this.onStateChange?.({ peerId, state });

      if (state === ConnectionState.Connected) {
        this.updatePeerCount();
        this.onPeerConnected?.(peerId);
      } else if (state === ConnectionState.Disconnected || state === ConnectionState.Closed) {
        this.updatePeerCount();
        this.onPeerDisconnected?.(peerId);
      }
    });

    peer.on('message', (message) => {
      this.stats.messagesReceived++;
      this.onMessage?.({ message, peerId });
    });

    peer.on('error', (error) => {
      this.onError?.({ error, peerId });
    });

    return peer;
  }

  /**
   * Wait for peer connection
   */
  private waitForConnection(peer: Peer): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      const checkState = (state: ConnectionState) => {
        if (state === ConnectionState.Connected) {
          clearTimeout(timeout);
          resolve();
        } else if (state === ConnectionState.Failed) {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        }
      };

      // Check current state
      if (peer.isConnected()) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      peer.on('stateChange', checkState);
    });
  }

  /**
   * Update connected peer count
   */
  private updatePeerCount(): void {
    this.stats.peersConnected = this.getConnectedPeers().length;
  }

  /**
   * Debug logging
   */
  private log(msg: string): void {
    if (this.config.debug) {
      console.log(`[WebRTC Transport] ${msg}`);
    }
  }

  // Event registration
  on(event: 'stateChange', handler: EventHandler<{ peerId: string; state: ConnectionState }>): this;
  on(event: 'message', handler: EventHandler<{ message: Message; peerId: string }>): this;
  on(event: 'error', handler: EventHandler<{ error: Error; peerId?: string }>): this;
  on(event: 'peerConnected', handler: EventHandler<string>): this;
  on(event: 'peerDisconnected', handler: EventHandler<string>): this;
  on(event: string, handler: EventHandler<unknown>): this {
    switch (event) {
      case 'stateChange':
        this.onStateChange = handler as EventHandler<{ peerId: string; state: ConnectionState }>;
        break;
      case 'message':
        this.onMessage = handler as EventHandler<{ message: Message; peerId: string }>;
        break;
      case 'error':
        this.onError = handler as EventHandler<{ error: Error; peerId?: string }>;
        break;
      case 'peerConnected':
        this.onPeerConnected = handler as EventHandler<string>;
        break;
      case 'peerDisconnected':
        this.onPeerDisconnected = handler as EventHandler<string>;
        break;
    }
    return this;
  }
}

