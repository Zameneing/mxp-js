/**
 * WebRTC Chat Example
 *
 * Demonstrates peer-to-peer chat using MXP over WebRTC.
 *
 * To test locally, open two terminal tabs:
 *
 * Tab 1: npx tsx examples/webrtc-chat.ts peer1
 * Tab 2: npx tsx examples/webrtc-chat.ts peer2
 *
 * Then in Tab 1, type: /connect peer2
 * And start chatting!
 */

import * as readline from 'readline';
import { Message } from '../src';
import { WebRTCTransport, InMemorySignalingHub, BroadcastChannelSignaling } from '../src/transport';

// For Node.js, we need to polyfill WebRTC
// In a real app, use 'wrtc' package: npm install wrtc
// import wrtc from 'wrtc';
// globalThis.RTCPeerConnection = wrtc.RTCPeerConnection;
// globalThis.RTCSessionDescription = wrtc.RTCSessionDescription;
// globalThis.RTCIceCandidate = wrtc.RTCIceCandidate;

const peerId = process.argv[2] || `peer-${Date.now()}`;

console.log('=== MXP WebRTC Chat ===');
console.log(`Your Peer ID: ${peerId}`);
console.log('');
console.log('Commands:');
console.log('  /connect <peerId> - Connect to a peer');
console.log('  /disconnect <peerId> - Disconnect from a peer');
console.log('  /peers - List connected peers');
console.log('  /quit - Exit');
console.log('');
console.log('Or just type a message to broadcast to all peers.');
console.log('');

// Note: This example shows the API but won't run without WebRTC polyfill
// In browsers, WebRTC is available natively

// For browser usage, you would use:
// const signaling = new BroadcastChannelSignaling('mxp-chat', peerId);

// For cross-device, you need a signaling server:
// const signaling = new WebSocketSignaling('ws://your-server/signal', peerId);

// For this demo, we'll show the structure but note it needs WebRTC
console.log('⚠️  Note: This example requires WebRTC.');
console.log('   In Node.js, install: npm install wrtc');
console.log('   In browsers, it works natively.');
console.log('');

// Simulated transport for demo purposes
class DemoTransport {
  private peerId: string;

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  on(event: string, handler: (...args: unknown[]) => void): this {
    console.log(`[Demo] Registered handler for: ${event}`);
    return this;
  }

  async connect(targetPeerId: string): Promise<void> {
    console.log(`[Demo] Would connect to: ${targetPeerId}`);
    console.log('       (Requires WebRTC - see note above)');
  }

  disconnect(peerId: string): void {
    console.log(`[Demo] Would disconnect from: ${peerId}`);
  }

  send(peerId: string, message: Message): void {
    console.log(`[Demo] Would send to ${peerId}: ${message.payloadAsString()}`);
  }

  broadcast(message: Message): void {
    console.log(`[Demo] Would broadcast: ${message.payloadAsString()}`);
  }

  getConnectedPeers(): string[] {
    return [];
  }
}

// Create demo transport
const transport = new DemoTransport(peerId);

// Set up event handlers
transport.on('message', ({ message, peerId: fromPeer }: { message: Message; peerId: string }) => {
  console.log(`\n[${fromPeer}]: ${message.payloadAsString()}`);
});

transport.on('peerConnected', (connectedPeerId: string) => {
  console.log(`\n✅ Connected to: ${connectedPeerId}`);
});

transport.on('peerDisconnected', (disconnectedPeerId: string) => {
  console.log(`\n❌ Disconnected from: ${disconnectedPeerId}`);
});

// Set up readline for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.setPrompt(`[${peerId}] > `);
rl.prompt();

rl.on('line', async (input) => {
  const line = input.trim();

  if (line.startsWith('/connect ')) {
    const targetPeer = line.slice(9).trim();
    console.log(`Connecting to ${targetPeer}...`);
    await transport.connect(targetPeer);
  } else if (line.startsWith('/disconnect ')) {
    const targetPeer = line.slice(12).trim();
    transport.disconnect(targetPeer);
  } else if (line === '/peers') {
    const peers = transport.getConnectedPeers();
    console.log(`Connected peers (${peers.length}):`, peers.join(', ') || 'none');
  } else if (line === '/quit') {
    console.log('Goodbye!');
    process.exit(0);
  } else if (line) {
    // Send message to all peers
    const msg = Message.call(line);
    transport.broadcast(msg);
  }

  rl.prompt();
});

rl.on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});

// Show what the actual code would look like
console.log('');
console.log('📝 Actual implementation would be:');
console.log('');
console.log(`
import { WebRTCTransport, WebSocketSignaling } from '@mxp/protocol/transport';
import { Message } from '@mxp/protocol';

// Connect to signaling server
const signaling = new WebSocketSignaling('ws://signal.example.com', '${peerId}');
await signaling.connect();

// Create transport
const transport = new WebRTCTransport(signaling, { debug: true });

// Handle incoming messages
transport.on('message', ({ message, peerId }) => {
  console.log(\`From \${peerId}: \${message.payloadAsString()}\`);
});

// Connect to another peer
await transport.connect('other-peer-id');

// Send a message
transport.send('other-peer-id', Message.call('Hello!'));
`);

