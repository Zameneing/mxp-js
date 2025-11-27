/**
 * Message tests
 */

import { describe, it, expect } from 'vitest';
import { Message, MessageType, encode, decode } from '../src';

describe('Message', () => {
  it('should create a call message', () => {
    const msg = Message.call('Hello, world!');
    
    expect(msg.messageType).toBe(MessageType.Call);
    expect(msg.payloadAsString()).toBe('Hello, world!');
    expect(msg.traceId).toBeDefined();
    expect(msg.messageId).toBeDefined();
  });

  it('should create a response message', () => {
    const correlationId = 12345n;
    const msg = Message.response('Response', correlationId);
    
    expect(msg.messageType).toBe(MessageType.Response);
    expect(msg.correlationId).toBe(correlationId);
  });

  it('should create streaming messages', () => {
    const open = Message.streamOpen('Start');
    const chunk = Message.streamChunk('data', open.messageId);
    const close = Message.streamClose(open.messageId);
    
    expect(open.messageType).toBe(MessageType.StreamOpen);
    expect(chunk.messageType).toBe(MessageType.StreamChunk);
    expect(close.messageType).toBe(MessageType.StreamClose);
    expect(chunk.correlationId).toBe(open.messageId);
  });

  it('should detect streaming messages', () => {
    const call = Message.call('test');
    const stream = Message.streamOpen('test');
    
    expect(call.isStreaming()).toBe(false);
    expect(stream.isStreaming()).toBe(true);
  });
});

describe('Codec', () => {
  it('should encode and decode a message', () => {
    const original = Message.call('Test payload');
    const { bytes } = encode(original);
    const decoded = decode(bytes);
    
    expect(decoded.messageType).toBe(original.messageType);
    expect(decoded.payloadAsString()).toBe('Test payload');
    expect(decoded.traceId).toBe(original.traceId);
    expect(decoded.messageId).toBe(original.messageId);
  });

  it('should handle binary payloads', () => {
    const payload = new Uint8Array([0x00, 0x01, 0x02, 0xFF]);
    const original = new Message(MessageType.Call, payload);
    const { bytes } = encode(original);
    const decoded = decode(bytes);
    
    expect(decoded.payload).toEqual(payload);
  });

  it('should handle empty payloads', () => {
    const ping = Message.ping();
    const { bytes } = encode(ping);
    const decoded = decode(bytes);
    
    expect(decoded.messageType).toBe(MessageType.Ping);
    expect(decoded.payload.length).toBe(0);
  });
});

