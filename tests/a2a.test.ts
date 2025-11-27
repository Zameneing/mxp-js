/**
 * A2A compatibility tests
 */

import { describe, it, expect } from 'vitest';
import { Message, Part, Role, toMxp, fromMxp, AgentCard, AgentSkill, Task, TaskState } from '../src/a2a';

describe('A2A Message', () => {
  it('should create a user text message', () => {
    const msg = Message.userText('Hello!');
    
    expect(msg.role).toBe(Role.User);
    expect(msg.textContent()).toBe('Hello!');
    expect(msg.parts.length).toBe(1);
    expect(msg.contextId).toBeDefined();
    expect(msg.messageId).toBeDefined();
  });

  it('should create an agent text message', () => {
    const msg = Message.agentText('Response');
    
    expect(msg.role).toBe(Role.Agent);
    expect(msg.textContent()).toBe('Response');
  });

  it('should create a message with multiple parts', () => {
    const msg = Message.create(Role.User, [
      Part.text('Check this file:'),
      Part.fileUri('application/pdf', 'https://example.com/doc.pdf'),
      Part.data({ key: 'value' }),
    ]);
    
    expect(msg.parts.length).toBe(3);
    expect(msg.parts[0].isText()).toBe(true);
    expect(msg.parts[1].kind).toBe('file');
    expect(msg.parts[2].kind).toBe('data');
  });

  it('should serialize and deserialize', () => {
    const original = Message.userText('Test');
    const json = original.toJSON();
    const restored = Message.fromJSON(json as Record<string, unknown>);
    
    expect(restored.role).toBe(original.role);
    expect(restored.textContent()).toBe(original.textContent());
    expect(restored.contextId).toBe(original.contextId);
  });
});

describe('A2A ↔ MXP Conversion', () => {
  it('should convert A2A message to MXP and back', () => {
    const a2aMsg = Message.userText('Search for AI trends');
    const mxpMsg = toMxp(a2aMsg);
    const { method, message } = fromMxp(mxpMsg);
    
    expect(method).toBe('message/send');
    expect(message?.role).toBe(Role.User);
    expect(message?.textContent()).toBe('Search for AI trends');
  });
});

describe('AgentCard', () => {
  it('should create a basic agent card', () => {
    const card = new AgentCard('Test Agent', 'A test agent', 'https://test.com/agent');
    
    expect(card.name).toBe('Test Agent');
    expect(card.url).toBe('https://test.com/agent');
    expect(card.hasMxp()).toBe(false);
  });

  it('should create an agent card with MXP', () => {
    const card = AgentCard.withMxp(
      'MXP Agent',
      'An agent with MXP',
      'https://test.com/agent',
      'mxp://test.com:9000'
    );
    
    expect(card.hasMxp()).toBe(true);
    expect(card.mxpEndpoint()).toBe('mxp://test.com:9000');
  });

  it('should add skills', () => {
    const card = new AgentCard('Test', 'Test', 'https://test.com')
      .withSkill(new AgentSkill('search', 'Search', 'Search things'));
    
    expect(card.skills.length).toBe(1);
    expect(card.skills[0].id).toBe('search');
  });

  it('should serialize and parse', () => {
    const original = AgentCard.withMxp('Test', 'Test', 'https://test.com', 'mxp://test.com:9000')
      .withStreaming()
      .withSkill(new AgentSkill('test', 'Test', 'Test skill'));
    
    const json = original.toJSON();
    const parsed = AgentCard.fromJSON(json);
    
    expect(parsed.name).toBe(original.name);
    expect(parsed.hasMxp()).toBe(true);
    expect(parsed.capabilities.streaming).toBe(true);
    expect(parsed.skills.length).toBe(1);
  });
});

describe('Task', () => {
  it('should create a new task', () => {
    const task = new Task();
    
    expect(task.id).toBeDefined();
    expect(task.status.state).toBe(TaskState.Submitted);
    expect(task.isComplete()).toBe(false);
  });

  it('should update task status', () => {
    const task = new Task();
    task.setStatus(TaskState.Working);
    
    expect(task.status.state).toBe(TaskState.Working);
    
    task.setStatus(TaskState.Completed);
    expect(task.isComplete()).toBe(true);
  });

  it('should track artifacts', () => {
    const task = new Task();
    const { Artifact } = require('../src/a2a/task');
    
    task.addArtifact(Artifact.text('result', 'The answer is 42'));
    
    expect(task.artifacts.length).toBe(1);
    expect(task.artifacts[0].name).toBe('result');
  });
});

