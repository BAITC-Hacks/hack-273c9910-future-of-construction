export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionInput = {
  messages: ChatMessage[];
  temperature?: number;
};

export interface LlmProvider {
  isConfigured(): boolean;
  complete(input: ChatCompletionInput): Promise<string>;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim());
  }

  async complete(input: ChatCompletionInput): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI provider is not configured.");
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: input.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: input.messages,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`AI provider request failed: ${response.status} ${details}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI provider returned an empty response.");
    }

    return content;
  }
}

export const defaultProvider = new OpenAiCompatibleProvider();
