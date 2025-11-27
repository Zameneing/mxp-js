/**
 * WebRTC Peer Connection Management
 */

import { Message, MessageType } from '../message';
import { encode, decode } from '../codec';
import {
  ConnectionState,
  ChannelMode,
  TransportConfig,
  DEFAULT_CONFIG,
  SignalingMessage,
  SignalingType,
  PeerInfo,
} from './types';

/**
 * Event emitter helper
 */
type EventHandler<T = void> = (data: T) => void;

/**
 * WebRTC Peer Connection
 *
 * Manages a single peer-to-peer connection using WebRTC.
 */
export class Peer {
  readonly id: string;
  readonly localId: string;

  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private config: Required<TransportConfig>;
  private state: ConnectionState = ConnectionState.New;
  private connectedAt?: Date;
  private lastSeen?: Date;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  // Event handlers
  private onStateChange?: EventHandler<ConnectionState>;
  private onMessage?: EventHandler<Message>;
  private onError?: EventHandler<Error>;
  private sendSignaling?: (msg: SignalingMessage) => Promise<void>;

  constructor(
    peerId: string,
    localId: string,
    config: TransportConfig = {},
    sendSignaling?: (msg: SignalingMessage) => Promise<void>
  ) {
    this.id = peerId;
    this.localId = localId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sendSignaling = sendSignaling;

    // Create RTCPeerConnection
    this.pc = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    this.setupPeerConnection();
  }

  /**
   * Set up RTCPeerConnection event handlers
   */
  private setupPeerConnection(): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.sendSignaling) {
        this.sendSignaling({
          type: SignalingType.IceCandidate,
          from: this.localId,
          to: this.id,
          payload: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.log(`Connection state: ${this.pc.connectionState}`);
      this.updateState(this.mapConnectionState(this.pc.connectionState));
    };

    this.pc.ondatachannel = (event) => {
      this.log(`Received data channel: ${event.channel.label}`);
      this.setupDataChannel(event.channel);
    };

    this.pc.oniceconnectionstatechange = () => {
      this.log(`ICE state: ${this.pc.iceConnectionState}`);
    };
  }

  /**
   * Create an offer (initiator)
   */
  async createOffer(): Promise<void> {
    this.log('Creating offer...');
    this.updateState(ConnectionState.Connecting);

    // Create data channel before offer
    const channel = this.pc.createDataChannel('mxp', {
      ordered: this.config.channelMode === ChannelMode.Reliable,
      maxRetransmits: this.config.channelMode === ChannelMode.Unreliable ? 0 : undefined,
    });
    this.setupDataChannel(channel);

    // Create and send offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    if (this.sendSignaling) {
      await this.sendSignaling({
        type: SignalingType.Offer,
        from: this.localId,
        to: this.id,
        payload: offer,
      });
    }
  }

  /**
   * Handle incoming offer (responder)
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    this.log('Handling offer...');
    this.updateState(ConnectionState.Connecting);

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Process any pending ICE candidates
    await this.processPendingCandidates();

    // Create and send answer
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    if (this.sendSignaling) {
      await this.sendSignaling({
        type: SignalingType.Answer,
        from: this.localId,
        to: this.id,
        payload: answer,
      });
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    this.log('Handling answer...');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    await this.processPendingCandidates();
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      // Queue candidate until remote description is set
      this.pendingCandidates.push(candidate);
    }
  }

  /**
   * Process queued ICE candidates
   */
  private async processPendingCandidates(): Promise<void> {
    for (const candidate of this.pendingCandidates) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingCandidates = [];
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      this.log('Data channel opened');
      this.connectedAt = new Date();
      this.updateState(ConnectionState.Connected);
      this.startHeartbeat();
    };

    channel.onclose = () => {
      this.log('Data channel closed');
      this.updateState(ConnectionState.Disconnected);
      this.stopHeartbeat();
    };

    channel.onerror = (event) => {
      this.log(`Data channel error: ${event}`);
      this.onError?.(new Error('Data channel error'));
    };

    channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: ArrayBuffer): void {
    try {
      this.lastSeen = new Date();
      const bytes = new Uint8Array(data);
      const message = decode(bytes);

      // Handle ping/pong internally
      if (message.messageType === MessageType.Ping) {
        this.sendPong(message);
        return;
      }

      if (message.messageType === MessageType.Pong) {
        // Calculate RTT if needed
        return;
      }

      this.onMessage?.(message);
    } catch (error) {
      this.log(`Failed to decode message: ${error}`);
      this.onError?.(error as Error);
    }
  }

  /**
   * Send a message to this peer
   */
  send(message: Message): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    const { bytes } = encode(message);
    this.dataChannel.send(bytes);
  }

  /**
   * Send raw bytes
   */
  sendBytes(bytes: Uint8Array): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }
    this.dataChannel.send(bytes);
  }

  /**
   * Send a ping
   */
  sendPing(): void {
    const ping = Message.ping();
    this.send(ping);
  }

  /**
   * Send a pong in response to ping
   */
  private sendPong(ping: Message): void {
    const pong = Message.pong(ping);
    this.send(pong);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (this.config.heartbeatInterval > 0) {
      this.heartbeatTimer = setInterval(() => {
        if (this.state === ConnectionState.Connected) {
          this.sendPing();
        }
      }, this.config.heartbeatInterval);
    }
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Close the connection
   */
  close(): void {
    this.log('Closing connection');
    this.stopHeartbeat();

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    this.pc.close();
    this.updateState(ConnectionState.Closed);
  }

  /**
   * Get peer info
   */
  getInfo(): PeerInfo {
    return {
      id: this.id,
      state: this.state,
      connectedAt: this.connectedAt,
      lastSeen: this.lastSeen,
    };
  }

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.Connected;
  }

  /**
   * Update state and emit event
   */
  private updateState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  /**
   * Map RTCPeerConnectionState to our ConnectionState
   */
  private mapConnectionState(rtcState: RTCPeerConnectionState): ConnectionState {
    switch (rtcState) {
      case 'new':
        return ConnectionState.New;
      case 'connecting':
        return ConnectionState.Connecting;
      case 'connected':
        return ConnectionState.Connected;
      case 'disconnected':
        return ConnectionState.Disconnected;
      case 'failed':
        return ConnectionState.Failed;
      case 'closed':
        return ConnectionState.Closed;
      default:
        return ConnectionState.New;
    }
  }

  /**
   * Debug logging
   */
  private log(msg: string): void {
    if (this.config.debug) {
      console.log(`[Peer ${this.id.slice(0, 8)}] ${msg}`);
    }
  }

  // Event registration
  on(event: 'stateChange', handler: EventHandler<ConnectionState>): void;
  on(event: 'message', handler: EventHandler<Message>): void;
  on(event: 'error', handler: EventHandler<Error>): void;
  on(event: string, handler: EventHandler<unknown>): void {
    switch (event) {
      case 'stateChange':
        this.onStateChange = handler as EventHandler<ConnectionState>;
        break;
      case 'message':
        this.onMessage = handler as EventHandler<Message>;
        break;
      case 'error':
        this.onError = handler as EventHandler<Error>;
        break;
    }
  }
}

