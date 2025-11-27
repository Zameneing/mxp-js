/**
 * JSON-RPC 2.0 Support for A2A
 *
 * Provides JSON-RPC request/response handling for HTTP gateway mode.
 */

import { v4 as uuidv4 } from 'uuid';
import { Message } from './types';
import { Task } from './task';

/**
 * Standard A2A error codes
 */
export const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TASK_NOT_FOUND: -32001,
  TASK_NOT_CANCELABLE: -32002,
  PUSH_NOTIFICATION_NOT_SUPPORTED: -32003,
  UNSUPPORTED_OPERATION: -32004,
} as const;

/**
 * A2A methods
 */
export const A2A_METHODS = [
  'message/send',
  'message/stream',
  'tasks/get',
  'tasks/cancel',
  'tasks/resubscribe',
  'tasks/pushNotificationConfig/set',
] as const;

export type A2AMethod = (typeof A2A_METHODS)[number];

/**
 * JSON-RPC Error
 */
export class JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static parseError(): JsonRpcError {
    return new JsonRpcError(ERROR_CODES.PARSE_ERROR, 'Parse error');
  }

  static invalidRequest(details?: string): JsonRpcError {
    return new JsonRpcError(ERROR_CODES.INVALID_REQUEST, details ?? 'Invalid request');
  }

  static methodNotFound(method: string): JsonRpcError {
    return new JsonRpcError(ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`);
  }

  static invalidParams(details?: string): JsonRpcError {
    return new JsonRpcError(ERROR_CODES.INVALID_PARAMS, details ?? 'Invalid params');
  }

  static internalError(details?: string): JsonRpcError {
    return new JsonRpcError(ERROR_CODES.INTERNAL_ERROR, details ?? 'Internal error');
  }

  static taskNotFound(taskId: string): JsonRpcError {
    return new JsonRpcError(ERROR_CODES.TASK_NOT_FOUND, `Task not found: ${taskId}`);
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
    };
  }
}

/**
 * Options for creating a JSON-RPC request
 */
export interface JsonRpcRequestOptions {
  id?: string | number;
}

/**
 * JSON-RPC Request
 */
export class JsonRpcRequest {
  readonly jsonrpc = '2.0' as const;
  readonly method: string;
  readonly params: Record<string, unknown>;
  readonly id: string | number;

  constructor(method: string, params: Record<string, unknown>, options: JsonRpcRequestOptions = {}) {
    this.method = method;
    this.params = params;
    this.id = options.id ?? uuidv4();
  }

  /**
   * Create a message/send request
   */
  static messageSend(message: Message, options?: JsonRpcRequestOptions): JsonRpcRequest {
    return new JsonRpcRequest(
      'message/send',
      {
        message: message.toJSON(),
      },
      options
    );
  }

  /**
   * Create a tasks/get request
   */
  static tasksGet(taskId: string, options?: JsonRpcRequestOptions): JsonRpcRequest {
    return new JsonRpcRequest(
      'tasks/get',
      {
        id: taskId,
      },
      options
    );
  }

  /**
   * Create a tasks/cancel request
   */
  static tasksCancel(taskId: string, options?: JsonRpcRequestOptions): JsonRpcRequest {
    return new JsonRpcRequest(
      'tasks/cancel',
      {
        id: taskId,
      },
      options
    );
  }

  /**
   * Check if method is a valid A2A method
   */
  isValidA2AMethod(): boolean {
    return A2A_METHODS.includes(this.method as A2AMethod);
  }

  toJSON(): string {
    return JSON.stringify({
      jsonrpc: this.jsonrpc,
      method: this.method,
      params: this.params,
      id: this.id,
    });
  }

  static fromJSON(json: string): JsonRpcRequest {
    const data = JSON.parse(json);
    return new JsonRpcRequest(data.method, data.params, { id: data.id });
  }
}

/**
 * Options for creating a JSON-RPC response
 */
export interface JsonRpcResponseOptions {
  id: string | number;
}

/**
 * JSON-RPC Response
 */
export class JsonRpcResponse {
  readonly jsonrpc = '2.0' as const;
  readonly id: string | number;
  readonly result?: unknown;
  readonly error?: JsonRpcError;

  private constructor(id: string | number, result?: unknown, error?: JsonRpcError) {
    this.id = id;
    this.result = result;
    this.error = error;
  }

  /**
   * Create a success response
   */
  static success(id: string | number, result: unknown): JsonRpcResponse {
    return new JsonRpcResponse(id, result);
  }

  /**
   * Create an error response
   */
  static error(id: string | number, error: JsonRpcError): JsonRpcResponse {
    return new JsonRpcResponse(id, undefined, error);
  }

  /**
   * Create a task response
   */
  static task(id: string | number, task: Task): JsonRpcResponse {
    return new JsonRpcResponse(id, task.toJSON());
  }

  /**
   * Check if this is an error response
   */
  isError(): boolean {
    return this.error !== undefined;
  }

  toJSON(): string {
    if (this.error) {
      return JSON.stringify({
        jsonrpc: this.jsonrpc,
        id: this.id,
        error: this.error.toJSON(),
      });
    }

    return JSON.stringify({
      jsonrpc: this.jsonrpc,
      id: this.id,
      result: this.result,
    });
  }

  static fromJSON(json: string): JsonRpcResponse {
    const data = JSON.parse(json);
    if (data.error) {
      return new JsonRpcResponse(data.id, undefined, new JsonRpcError(data.error.code, data.error.message, data.error.data));
    }
    return new JsonRpcResponse(data.id, data.result);
  }
}

