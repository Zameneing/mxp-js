/**
 * Transport tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Message, MessageType } from '../src';
import {
  ConnectionState,
  ChannelMode,
  SignalingType,
  InMemorySignalingHub,
} from '../src/transport';
import type { SignalingMessage, SignalingProvider } from '../src/transport';

describe('Transport Types', () => {
  it('should have correct connection states', () => {
    expect(ConnectionState.New).toBe('new');
    expect(ConnectionState.Connecting).toBe('connecting');
    expect(ConnectionState.Connected).toBe('connected');
    expect(ConnectionState.Disconnected).toBe('disconnected');
    expect(ConnectionState.Failed).toBe('failed');
    expect(ConnectionState.Closed).toBe('closed');
  });

  it('should have correct channel modes', () => {
    expect(ChannelMode.Reliable).toBe('reliable');
    expect(ChannelMode.Unreliable).toBe('unreliable');
    expect(ChannelMode.UnreliableOrdered).toBe('unreliable-ordered');
  });

  it('should have correct signaling types', () => {
    expect(SignalingType.Offer).toBe('offer');
    expect(SignalingType.Answer).toBe('answer');
    expect(SignalingType.IceCandidate).toBe('ice-candidate');
    expect(SignalingType.Hangup).toBe('hangup');
  });
});

describe('InMemorySignalingHub', () => {
  let hub: InMemorySignalingHub;
  let provider1: SignalingProvider;
  let provider2: SignalingProvider;

  beforeEach(() => {
    hub = new InMemorySignalingHub();
    provider1 = hub.createProvider('peer-1');
    provider2 = hub.createProvider('peer-2');
  });

  it('should create providers with correct IDs', () => {
    expect(provider1.getLocalId()).toBe('peer-1');
    expect(provider2.getLocalId()).toBe('peer-2');
  });

  it('should deliver messages between peers', async () => {
    const received: SignalingMessage[] = [];

    provider2.onMessage((msg) => {
      received.push(msg);
    });

    await provider1.send({
      type: SignalingType.Offer,
      from: 'peer-1',
      to: 'peer-2',
      payload: { type: 'offer', sdp: 'test-sdp' } as RTCSessionDescriptionInit,
    });

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received.length).toBe(1);
    expect(received[0].type).toBe(SignalingType.Offer);
    expect(received[0].from).toBe('peer-1');
  });

  it('should not deliver to wrong peer', async () => {
    const received: SignalingMessage[] = [];

    provider2.onMessage((msg) => {
      received.push(msg);
    });

    await provider1.send({
      type: SignalingType.Offer,
      from: 'peer-1',
      to: 'peer-3', // Wrong peer
      payload: null,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received.length).toBe(0);
  });
});

describe('Message for Transport', () => {
  it('should create ping message', () => {
    const ping = Message.ping();
    expect(ping.messageType).toBe(MessageType.Ping);
    expect(ping.payload.length).toBe(0);
  });

  it('should create pong response', () => {
    const ping = Message.ping();
    const pong = Message.pong(ping);

    expect(pong.messageType).toBe(MessageType.Pong);
    expect(pong.correlationId).toBe(ping.messageId);
    expect(pong.traceId).toBe(ping.traceId);
  });

  it('should create stream messages', () => {
    const open = Message.streamOpen('Start streaming');
    const chunk = Message.streamChunk('chunk data', open.messageId);
    const close = Message.streamClose(open.messageId);

    expect(open.messageType).toBe(MessageType.StreamOpen);
    expect(chunk.messageType).toBe(MessageType.StreamChunk);
    expect(close.messageType).toBe(MessageType.StreamClose);

    expect(chunk.correlationId).toBe(open.messageId);
    expect(close.correlationId).toBe(open.messageId);
  });
});

// Note: Full WebRTC tests require browser environment or wrtc polyfill
describe('WebRTC Transport (API)', () => {
  it('should export WebRTCTransport', async () => {
    const { WebRTCTransport } = await import('../src/transport');
    expect(WebRTCTransport).toBeDefined();
  });

  it('should export Peer', async () => {
    const { Peer } = await import('../src/transport');
    expect(Peer).toBeDefined();
  });

  it('should export signaling providers', async () => {
    const {
      WebSocketSignaling,
      BroadcastChannelSignaling,
      ManualSignaling,
      InMemorySignalingHub,
    } = await import('../src/transport');

    expect(WebSocketSignaling).toBeDefined();
    expect(BroadcastChannelSignaling).toBeDefined();
    expect(ManualSignaling).toBeDefined();
    expect(InMemorySignalingHub).toBeDefined();
  });
});

