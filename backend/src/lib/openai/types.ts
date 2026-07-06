export interface OpenAiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface JsonSchemaDefinition {
  name: string;
  schema: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CreateChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  responseFormat?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  fetchImpl?: typeof fetch;
}

export interface ExtractStructuredOptions<T> {
  systemPrompt: string;
  userContent: string;
  schema: JsonSchemaDefinition;
  temperature?: number;
  fetchImpl?: typeof fetch;
  parse?: (value: unknown) => T;
}

export class OpenAiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'OpenAiError';
  }
}
