/**
 * A2A Agent Card
 *
 * Describes an agent's capabilities for discovery.
 */

/**
 * Security scheme for authentication
 */
export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  openIdConnectUrl?: string;
}

/**
 * Options for creating a skill
 */
export interface SkillOptions {
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

/**
 * Agent skill/capability
 */
export class AgentSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  tags: string[];
  examples: string[];
  inputModes: string[];
  outputModes: string[];

  constructor(id: string, name: string, description: string, options: SkillOptions = {}) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.tags = options.tags ?? [];
    this.examples = options.examples ?? [];
    this.inputModes = options.inputModes ?? ['text/plain'];
    this.outputModes = options.outputModes ?? ['text/plain'];
  }

  /**
   * Add tags to the skill
   */
  withTags(tags: string[]): AgentSkill {
    this.tags = [...this.tags, ...tags];
    return this;
  }

  /**
   * Add examples
   */
  withExamples(examples: string[]): AgentSkill {
    this.examples = [...this.examples, ...examples];
    return this;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      tags: this.tags,
      examples: this.examples,
      inputModes: this.inputModes,
      outputModes: this.outputModes,
    };
  }
}

/**
 * Agent capabilities
 */
export class AgentCapabilities {
  streaming: boolean = false;
  pushNotifications: boolean = false;
  stateTransitionHistory: boolean = false;
  mxpTransport: boolean = false;
  mxpEndpoint?: string;

  /**
   * Enable streaming
   */
  withStreaming(): AgentCapabilities {
    this.streaming = true;
    return this;
  }

  /**
   * Enable push notifications
   */
  withPushNotifications(): AgentCapabilities {
    this.pushNotifications = true;
    return this;
  }

  /**
   * Enable MXP transport
   */
  withMxp(endpoint: string): AgentCapabilities {
    this.mxpTransport = true;
    this.mxpEndpoint = endpoint;
    return this;
  }

  toJSON(): Record<string, unknown> {
    return {
      streaming: this.streaming,
      pushNotifications: this.pushNotifications,
      stateTransitionHistory: this.stateTransitionHistory,
      mxpTransport: this.mxpTransport,
      ...(this.mxpEndpoint && { mxpEndpoint: this.mxpEndpoint }),
    };
  }
}

/**
 * Options for creating an agent card
 */
export interface AgentCardOptions {
  provider?: { organization: string; url?: string };
  version?: string;
}

/**
 * A2A Agent Card
 *
 * Describes an agent for discovery via /.well-known/agent-card.json
 */
export class AgentCard {
  readonly protocolVersion: string = '0.3.0';
  readonly name: string;
  readonly description: string;
  readonly url: string;
  provider?: { organization: string; url?: string };
  version?: string;
  capabilities: AgentCapabilities;
  skills: AgentSkill[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  additionalInterfaces: Array<{ url: string; transport: string }>;
  security: Array<{
    name: string;
    scheme: SecurityScheme;
    scopes: string[];
  }>;

  constructor(name: string, description: string, url: string, options: AgentCardOptions = {}) {
    this.name = name;
    this.description = description;
    this.url = url;
    this.provider = options.provider;
    this.version = options.version;
    this.capabilities = new AgentCapabilities();
    this.skills = [];
    this.defaultInputModes = ['text/plain', 'application/json'];
    this.defaultOutputModes = ['text/plain', 'application/json'];
    this.additionalInterfaces = [];
    this.security = [];
  }

  /**
   * Create an agent card with MXP support
   */
  static withMxp(
    name: string,
    description: string,
    httpUrl: string,
    mxpUrl: string,
    options?: AgentCardOptions
  ): AgentCard {
    const card = new AgentCard(name, description, httpUrl, options);
    card.capabilities.withMxp(mxpUrl);
    card.additionalInterfaces.push({ url: mxpUrl, transport: 'MXP' });
    return card;
  }

  /**
   * Set provider information
   */
  withProvider(organization: string, url?: string): AgentCard {
    this.provider = { organization, url };
    return this;
  }

  /**
   * Enable streaming
   */
  withStreaming(): AgentCard {
    this.capabilities.withStreaming();
    return this;
  }

  /**
   * Enable push notifications
   */
  withPushNotifications(): AgentCard {
    this.capabilities.withPushNotifications();
    return this;
  }

  /**
   * Add a skill
   */
  withSkill(skill: AgentSkill): AgentCard {
    this.skills.push(skill);
    return this;
  }

  /**
   * Add security scheme
   */
  withSecurity(name: string, scheme: SecurityScheme, scopes: string[] = []): AgentCard {
    this.security.push({ name, scheme, scopes });
    return this;
  }

  /**
   * Check if MXP transport is available
   */
  hasMxp(): boolean {
    return this.capabilities.mxpTransport;
  }

  /**
   * Get MXP endpoint if available
   */
  mxpEndpoint(): string | undefined {
    return this.capabilities.mxpEndpoint;
  }

  /**
   * Serialize to JSON string
   */
  toJSON(): string {
    return JSON.stringify(
      {
        protocolVersion: this.protocolVersion,
        name: this.name,
        description: this.description,
        url: this.url,
        ...(this.provider && { provider: this.provider }),
        ...(this.version && { version: this.version }),
        capabilities: this.capabilities.toJSON(),
        skills: this.skills.map((s) => s.toJSON()),
        defaultInputModes: this.defaultInputModes,
        defaultOutputModes: this.defaultOutputModes,
        ...(this.additionalInterfaces.length > 0 && { additionalInterfaces: this.additionalInterfaces }),
        ...(this.security.length > 0 && { security: this.security }),
      },
      null,
      2
    );
  }

  /**
   * Parse from JSON string
   */
  static fromJSON(json: string): AgentCard {
    const data = JSON.parse(json);
    const card = new AgentCard(data.name, data.description, data.url, {
      provider: data.provider,
      version: data.version,
    });

    if (data.capabilities) {
      if (data.capabilities.streaming) card.capabilities.streaming = true;
      if (data.capabilities.pushNotifications) card.capabilities.pushNotifications = true;
      if (data.capabilities.mxpTransport) {
        card.capabilities.mxpTransport = true;
        card.capabilities.mxpEndpoint = data.capabilities.mxpEndpoint;
      }
    }

    if (data.skills) {
      card.skills = data.skills.map(
        (s: Record<string, unknown>) =>
          new AgentSkill(s.id as string, s.name as string, s.description as string, {
            tags: s.tags as string[],
            examples: s.examples as string[],
          })
      );
    }

    if (data.additionalInterfaces) {
      card.additionalInterfaces = data.additionalInterfaces;
    }

    return card;
  }
}

