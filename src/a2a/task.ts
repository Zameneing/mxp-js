/**
 * A2A Task Types
 *
 * Represents long-running tasks with status tracking and artifacts.
 */

import { v4 as uuidv4 } from 'uuid';
import { Message, Part } from './types';

/**
 * Task state
 */
export enum TaskState {
  Submitted = 'submitted',
  Working = 'working',
  InputRequired = 'input-required',
  Completed = 'completed',
  Failed = 'failed',
  Canceled = 'canceled',
}

/**
 * Task status with optional message
 */
export class TaskStatus {
  readonly state: TaskState;
  readonly message?: Message;
  readonly timestamp: Date;

  constructor(state: TaskState, message?: Message) {
    this.state = state;
    this.message = message;
    this.timestamp = new Date();
  }

  /**
   * Create a status with a message
   */
  static withMessage(state: TaskState, message: Message): TaskStatus {
    return new TaskStatus(state, message);
  }

  /**
   * Check if this is a terminal state
   */
  isTerminal(): boolean {
    return (
      this.state === TaskState.Completed ||
      this.state === TaskState.Failed ||
      this.state === TaskState.Canceled
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      state: this.state,
      ...(this.message && { message: this.message.toJSON() }),
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Options for creating an artifact
 */
export interface ArtifactOptions {
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Task artifact (output)
 */
export class Artifact {
  readonly artifactId: string;
  readonly name: string;
  readonly parts: Part[];
  description?: string;
  metadata?: Record<string, unknown>;

  constructor(name: string, parts: Part[], options: ArtifactOptions = {}) {
    this.artifactId = uuidv4();
    this.name = name;
    this.parts = parts;
    this.description = options.description;
    this.metadata = options.metadata;
  }

  /**
   * Create a text artifact
   */
  static text(name: string, content: string, options?: ArtifactOptions): Artifact {
    return new Artifact(name, [Part.text(content)], options);
  }

  /**
   * Create a data artifact
   */
  static data(name: string, content: unknown, options?: ArtifactOptions): Artifact {
    return new Artifact(name, [Part.data(content)], options);
  }

  /**
   * Create a file artifact
   */
  static file(name: string, mimeType: string, data: string, options?: ArtifactOptions): Artifact {
    return new Artifact(name, [Part.fileInline(mimeType, data)], options);
  }

  toJSON(): Record<string, unknown> {
    return {
      artifactId: this.artifactId,
      name: this.name,
      parts: this.parts.map((p) => p.toJSON()),
      ...(this.description && { description: this.description }),
      ...(this.metadata && { metadata: this.metadata }),
    };
  }
}

/**
 * Options for creating a task
 */
export interface TaskOptions {
  contextId?: string;
}

/**
 * A2A Task
 *
 * Represents a long-running operation with status tracking.
 */
export class Task {
  readonly id: string;
  readonly contextId: string;
  status: TaskStatus;
  artifacts: Artifact[];
  history: Message[];

  constructor(options: TaskOptions = {}) {
    this.id = uuidv4();
    this.contextId = options.contextId ?? uuidv4();
    this.status = new TaskStatus(TaskState.Submitted);
    this.artifacts = [];
    this.history = [];
  }

  /**
   * Update task status
   */
  setStatus(state: TaskState, message?: Message): void {
    this.status = message ? TaskStatus.withMessage(state, message) : new TaskStatus(state);
  }

  /**
   * Add an artifact to the task
   */
  addArtifact(artifact: Artifact): void {
    this.artifacts.push(artifact);
  }

  /**
   * Add a message to history
   */
  addMessage(message: Message): void {
    this.history.push(message);
  }

  /**
   * Check if task is complete
   */
  isComplete(): boolean {
    return this.status.isTerminal();
  }

  /**
   * Check if task needs input
   */
  needsInput(): boolean {
    return this.status.state === TaskState.InputRequired;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      contextId: this.contextId,
      status: this.status.toJSON(),
      artifacts: this.artifacts.map((a) => a.toJSON()),
      history: this.history.map((m) => m.toJSON()),
    };
  }

  static fromJSON(json: Record<string, unknown>): Task {
    const task = new Task({ contextId: json.contextId as string });
    (task as { id: string }).id = json.id as string;

    const statusJson = json.status as Record<string, unknown>;
    task.status = new TaskStatus(statusJson.state as TaskState);

    if (json.artifacts) {
      // Parse artifacts if needed
    }

    return task;
  }
}

