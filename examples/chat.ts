/**
 * Simple Chat Example
 *
 * Run with: npx tsx examples/chat.ts
 */

import { Message, toMxp, fromMxp } from '../src/a2a';
import { encode, decode } from '../src';

console.log('=== MXP Chat Example ===\n');

// User sends a message
const userMsg = Message.userText('What is the capital of France?');
console.log('User:', userMsg.textContent());

// Convert to MXP
const mxpMsg = toMxp(userMsg);
console.log(`Trace ID: ${mxpMsg.traceId}`);

// Encode to binary
const { bytes } = encode(mxpMsg);
console.log(`Encoded size: ${bytes.length} bytes`);

// Simulate network transfer...

// Decode on receiving end
const decoded = decode(bytes);
const { method, message } = fromMxp(decoded);

console.log(`\nReceived:`);
console.log(`  Method: ${method}`);
console.log(`  Text: ${message?.textContent()}`);

// Agent responds
const agentMsg = Message.agentText(
  'The capital of France is Paris. It is known as the City of Light.'
);
console.log(`\nAgent: ${agentMsg.textContent()}`);

// Compare sizes
const jsonSize = JSON.stringify(userMsg.toJSON()).length;
console.log(`\n📊 Size comparison:`);
console.log(`  MXP: ${bytes.length} bytes`);
console.log(`  JSON: ${jsonSize} bytes`);

