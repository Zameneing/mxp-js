/**
 * Agent Card Example
 *
 * Run with: npx tsx examples/agent-card.ts
 */

import { AgentCard, AgentSkill } from '../src/a2a';

console.log('=== MXP Agent Card Example ===\n');

// Create an agent card with MXP support
const card = AgentCard.withMxp(
  'Research Assistant',
  'An AI agent that helps with research and analysis',
  'https://research.example.com/a2a/v1',
  'mxp://research.example.com:9000'
)
  .withProvider('Example Corp', 'https://example.com')
  .withStreaming()
  .withPushNotifications()
  .withSkill(
    new AgentSkill(
      'web-search',
      'Web Search',
      'Search the web for information'
    )
      .withTags(['search', 'web', 'research'])
      .withExamples([
        'Find recent papers on machine learning',
        'Search for Rust best practices',
      ])
  )
  .withSkill(
    new AgentSkill(
      'summarize',
      'Document Summarizer',
      'Create concise summaries of documents'
    )
      .withTags(['nlp', 'summarization'])
  );

console.log('Agent Card:\n');
console.log(card.toJSON());

console.log('\n📋 Summary:');
console.log(`  Name: ${card.name}`);
console.log(`  URL: ${card.url}`);
console.log(`  MXP: ${card.hasMxp() ? card.mxpEndpoint() : 'N/A'}`);
console.log(`  Streaming: ${card.capabilities.streaming}`);
console.log(`  Skills: ${card.skills.length}`);

card.skills.forEach(skill => {
  console.log(`    - ${skill.name}: ${skill.description}`);
});

// Parse a remote agent card
console.log('\n--- Parsing Remote Agent Card ---\n');

const remoteJson = `{
  "protocolVersion": "0.3.0",
  "name": "Code Assistant",
  "description": "Helps with coding tasks",
  "url": "https://code.example.com/a2a",
  "capabilities": {
    "streaming": true,
    "mxpTransport": true,
    "mxpEndpoint": "mxp://code.example.com:9000"
  },
  "skills": [
    {
      "id": "code-review",
      "name": "Code Review",
      "description": "Review code for issues",
      "tags": ["code", "review"]
    }
  ]
}`;

const parsed = AgentCard.fromJSON(remoteJson);
console.log(`Discovered: ${parsed.name}`);
console.log(`MXP Available: ${parsed.hasMxp()}`);

if (parsed.hasMxp()) {
  console.log(`\n💡 Use MXP for better performance: ${parsed.mxpEndpoint()}`);
}

