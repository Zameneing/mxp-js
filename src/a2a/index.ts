/**
 * A2A (Agent-to-Agent) Protocol Compatibility Layer
 *
 * This module provides compatibility with Google's A2A protocol specification,
 * allowing MXP to speak A2A semantics over its high-performance transport.
 *
 * @example
 * ```typescript
 * import { Message, toMxp, fromMxp, AgentCard } from '@mxp/protocol/a2a';
 *
 * // Create an A2A message
 * const msg = Message.userText('Hello, agent!');
 *
 * // Convert to MXP for transport
 * const mxpMsg = toMxp(msg);
 *
 * // Convert back to A2A
 * const { message } = fromMxp(mxpMsg);
 * ```
 *
 * @packageDocumentation
 */

export { Message, Part, Role, PartKind } from './types';
export type { MessageOptions, FileData } from './types';

export { Task, TaskStatus, TaskState, Artifact } from './task';
export type { TaskOptions, ArtifactOptions } from './task';

export { AgentCard, AgentSkill, AgentCapabilities } from './agent-card';
export type { AgentCardOptions, SecurityScheme, SkillOptions } from './agent-card';

export { toMxp, fromMxp, toMxpStreamOpen, toMxpStreamChunk, toMxpStreamClose } from './convert';
export type { ConversionResult } from './convert';

export {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  A2A_METHODS,
  ERROR_CODES,
} from './jsonrpc';
export type { JsonRpcRequestOptions, JsonRpcResponseOptions } from './jsonrpc';

