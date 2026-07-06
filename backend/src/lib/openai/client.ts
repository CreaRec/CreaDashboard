import {
  CreateChatCompletionOptions,
  OpenAiConfig,
  OpenAiError,
} from './types';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export function getOpenAiConfig(): OpenAiConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const baseUrl = process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, '') || DEFAULT_BASE_URL;

  return { apiKey, model, baseUrl };
}

export function isOpenAiConfigured(): boolean {
  return getOpenAiConfig() !== null;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function createChatCompletion(
  options: CreateChatCompletionOptions
): Promise<string> {
  const config = getOpenAiConfig();
  if (!config) {
    throw new OpenAiError('OpenAI is not configured');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
    temperature: options.temperature ?? 0,
  };

  if (options.responseFormat) {
    body.response_format = options.responseFormat;
  }

  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new OpenAiError(
      payload.error?.message ?? `OpenAI request failed with status ${response.status}`,
      response.status
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenAiError('OpenAI returned an empty response');
  }

  return content;
}
