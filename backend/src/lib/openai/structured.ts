import { createChatCompletion } from './client';
import { ExtractStructuredOptions, OpenAiError } from './types';

export async function extractStructured<T>(
  options: ExtractStructuredOptions<T>
): Promise<T> {
  const content = await createChatCompletion({
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userContent },
    ],
    temperature: options.temperature ?? 0,
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: options.schema.name,
        strict: true,
        schema: options.schema.schema,
      },
    },
    fetchImpl: options.fetchImpl,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenAiError('OpenAI returned invalid JSON');
  }

  if (options.parse) {
    return options.parse(parsed);
  }

  return parsed as T;
}
