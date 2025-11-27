/**
 * A2A Core Types
 *
 * These types mirror Google's A2A protocol specification.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Role in a conversation
 */
export enum Role {
  User = 'user',
  Agent = 'agent',
}

/**
 * Kind of message part
 */
export enum PartKind {
  Text = 'text',
  File = 'file',
  Data = 'data',
}

/**
 * File data within a message part
 */
export interface FileData {
  mimeType: string;
  data?: string; // base64 for inline
  uri?: string; // URL for reference
}

/**
 * Part of a message (text, file, or structured data)
 */
export class Part {
  readonly kind: PartKind;
  readonly text?: string;
  readonly file?: FileData;
  readonly data?: unknown;

  private constructor(kind: PartKind, content: { text?: string; file?: FileData; data?: unknown }) {
    this.kind = kind;
    this.text = content.text;
    this.file = content.file;
    this.data = content.data;
  }

  /**
   * Create a text part
   */
  static text(content: string): Part {
    return new Part(PartKind.Text, { text: content });
  }

  /**
   * Create a file part with inline base64 data
   */
  static fileInline(mimeType: string, base64Data: string): Part {
    return new Part(PartKind.File, {
      file: { mimeType, data: base64Data },
    });
  }

  /**
   * Create a file part with URI reference
   */
  static fileUri(mimeType: string, uri: string): Part {
    return new Part(PartKind.File, {
      file: { mimeType, uri },
    });
  }

  /**
   * Create a data part with structured content
   */
  static data(content: unknown): Part {
    return new Part(PartKind.Data, { data: content });
  }

  /**
   * Get text content if this is a text part
   */
  asText(): string | undefined {
    return this.text;
  }

  /**
   * Check if this is a text part
   */
  isText(): boolean {
    return this.kind === PartKind.Text;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = { kind: this.kind };
    if (this.text !== undefined) result.text = this.text;
    if (this.file !== undefined) result.file = this.file;
    if (this.data !== undefined) result.data = this.data;
    return result;
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: Record<string, unknown>): Part {
    const kind = json.kind as PartKind;
    return new Part(kind, {
      text: json.text as string | undefined,
      file: json.file as FileData | undefined,
      data: json.data,
    });
  }
}

/**
 * Options for creating a message
 */
export interface MessageOptions {
  contextId?: string;
  messageId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * A2A Message
 *
 * Represents a message in an agent conversation.
 */
export class Message {
  readonly role: Role;
  readonly parts: Part[];
  readonly contextId: string;
  readonly messageId: string;
  taskId?: string;
  metadata?: Record<string, unknown>;

  constructor(role: Role, parts: Part[], options: MessageOptions = {}) {
    this.role = role;
    this.parts = parts;
    this.contextId = options.contextId ?? uuidv4();
    this.messageId = options.messageId ?? uuidv4();
    this.taskId = options.taskId;
    this.metadata = options.metadata;
  }

  /**
   * Create a user message with text content
   */
  static userText(text: string, options?: MessageOptions): Message {
    return new Message(Role.User, [Part.text(text)], options);
  }

  /**
   * Create an agent message with text content
   */
  static agentText(text: string, options?: MessageOptions): Message {
    return new Message(Role.Agent, [Part.text(text)], options);
  }

  /**
   * Create a message with multiple parts
   */
  static create(role: Role, parts: Part[], options?: MessageOptions): Message {
    return new Message(role, parts, options);
  }

  /**
   * Add context linking to another conversation
   */
  withContext(contextId: string): Message {
    return new Message(this.role, this.parts, {
      ...this.getOptions(),
      contextId,
    });
  }

  /**
   * Link to a task
   */
  withTask(taskId: string): Message {
    const msg = new Message(this.role, this.parts, this.getOptions());
    msg.taskId = taskId;
    return msg;
  }

  /**
   * Get all text content concatenated
   */
  textContent(): string {
    return this.parts
      .filter((p) => p.isText())
      .map((p) => p.asText())
      .join('');
  }

  /**
   * Get options for cloning
   */
  private getOptions(): MessageOptions {
    return {
      contextId: this.contextId,
      messageId: this.messageId,
      taskId: this.taskId,
      metadata: this.metadata,
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      role: this.role,
      parts: this.parts.map((p) => p.toJSON()),
      contextId: this.contextId,
      messageId: this.messageId,
      ...(this.taskId && { taskId: this.taskId }),
      ...(this.metadata && { metadata: this.metadata }),
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: Record<string, unknown>): Message {
    const role = json.role as Role;
    const parts = (json.parts as Record<string, unknown>[]).map((p) => Part.fromJSON(p));
    return new Message(role, parts, {
      contextId: json.contextId as string,
      messageId: json.messageId as string,
      taskId: json.taskId as string | undefined,
      metadata: json.metadata as Record<string, unknown> | undefined,
    });
  }
}

