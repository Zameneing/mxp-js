/**
 * MXP Transport Layer
 *
 * WebRTC-based peer-to-peer transport for MXP messages.
 *
 * @example
 * ```typescript
 * import { WebRTCTransport, WebSocketSignaling } from '@mxp-protocol/core/transport';
 *
 * // Create signaling provider
 * const signaling = new WebSocketSignaling('ws://signal.example.com', 'my-peer-id');
 * await signaling.connect();
 *
 * // Create transport
 * const transport = new WebRTCTransport(signaling, { debug: true });
 *
 * // Handle messages
 * transport.on('message', ({ message, peerId }) => {
 *   console.log(`From ${peerId}:`, message.payloadAsString());
 * });
 *
 * // Connect to peer and send message
 * await transport.connect('other-peer-id');
 * transport.send('other-peer-id', Message.call('Hello!'));
 * ```
 *
 * @packageDocumentation
 */

export { WebRTCTransport } from './webrtc';
export { Peer } from './peer';
export {
  WebSocketSignaling,
  BroadcastChannelSignaling,
  ManualSignaling,
  InMemorySignalingHub,
} from './signaling';
export {
  ConnectionState,
  ChannelMode,
  SignalingType,
  DEFAULT_CONFIG,
} from './types';
export type {
  TransportConfig,
  TransportEvents,
  SignalingProvider,
  SignalingMessage,
  PeerInfo,
  TransportStats,
} from './types';

