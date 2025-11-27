/**
 * Transport Layer Types
 */

import { Message } from '../message';

/**
 * Connection state
 */
export enum ConnectionState {
  New = 'new',
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Failed = 'failed',
  Closed = 'closed',
}

/**
 * Channel reliability mode
 */
export enum ChannelMode {
  /** Reliable, ordered delivery (like TCP) */
  Reliable = 'reliable',
  /** Unreliable, unordered delivery (like UDP) */
  Unreliable = 'unreliable',
  /** Unreliable but ordered */
  UnreliableOrdered = 'unreliable-ordered',
}

/**
 * Transport events
 */
export interface TransportEvents {
  /** Connection state changed */
  stateChange: (state: ConnectionState) => void;
  /** Message received */
  message: (message: Message, peerId: string) => void;
  /** Error occurred */
  error: (error: Error) => void;
  /** Peer connected */
  peerConnected: (peerId: string) => void;
  /** Peer disconnected */
  peerDisconnected: (peerId: string) => void;
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** STUN/TURN servers for NAT traversal */
  iceServers?: RTCIceServer[];
  /** Default channel mode */
  channelMode?: ChannelMode;
  /** Enable debug logging */
  debug?: boolean;
  /** Connection timeout in ms */
  connectionTimeout?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
}

/**
 * Default transport configuration
 */
export const DEFAULT_CONFIG: Required<TransportConfig> = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  channelMode: ChannelMode.Reliable,
  debug: false,
  connectionTimeout: 30000,
  heartbeatInterval: 5000,
};

/**
 * Signaling message types
 */
export enum SignalingType {
  Offer = 'offer',
  Answer = 'answer',
  IceCandidate = 'ice-candidate',
  Hangup = 'hangup',
}

/**
 * Signaling message
 */
export interface SignalingMessage {
  type: SignalingType;
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

/**
 * Signaling interface - implement this to provide your own signaling mechanism
 */
export interface SignalingProvider {
  /** Send a signaling message */
  send(message: SignalingMessage): Promise<void>;
  /** Register handler for incoming signaling messages */
  onMessage(handler: (message: SignalingMessage) => void): void;
  /** Get local peer ID */
  getLocalId(): string;
}

/**
 * Peer info
 */
export interface PeerInfo {
  id: string;
  state: ConnectionState;
  connectedAt?: Date;
  lastSeen?: Date;
  roundTripTime?: number;
}

/**
 * Transport statistics
 */
export interface TransportStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  peersConnected: number;
  averageLatency?: number;
}

