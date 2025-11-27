/**
 * Streaming Example
 *
 * Run with: npx tsx examples/streaming.ts
 */

import { Message, toMxpStreamOpen, toMxpStreamChunk, toMxpStreamClose } from '../src/a2a';
import { encode, MessageType } from '../src';

console.log('=== MXP Streaming Example ===\n');

// Open a stream
const prompt = Message.userText('Explain quantum computing in simple terms');
const streamOpen = toMxpStreamOpen(prompt);
const streamId = streamOpen.messageId;

console.log(`📝 Prompt: ${prompt.textContent()}`);
console.log(`🔗 Stream ID: ${streamId}\n`);

// Simulate streaming tokens
const tokens = [
  'Quantum ', 'computing ', 'uses ', 'the ', 'principles ', 
  'of ', 'quantum ', 'mechanics ', 'to ', 'process ', 
  'information ', 'in ', 'ways ', 'that ', 'classical ',
  'computers ', 'cannot.'
];

console.log('Streaming:');
process.stdout.write('  ');

let totalMxpBytes = 0;
let totalJsonBytes = 0;

for (const token of tokens) {
  const chunk = toMxpStreamChunk(token, streamId);
  const { bytes } = encode(chunk);
  
  totalMxpBytes += bytes.length;
  totalJsonBytes += JSON.stringify({ type: 'chunk', data: token }).length;
  
  process.stdout.write(token);
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 50));
}

console.log('\n');

// Close the stream
const streamClose = toMxpStreamClose(streamId);
console.log(`Stream closed\n`);

// Stats
console.log('📊 Performance:');
console.log(`  Tokens: ${tokens.length}`);
console.log(`  MXP bytes: ${totalMxpBytes}`);
console.log(`  JSON bytes: ${totalJsonBytes}`);
console.log(`  Savings: ${((1 - totalMxpBytes / totalJsonBytes) * 100).toFixed(1)}%`);

