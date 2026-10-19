import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Модель для ответов в чате и модель для карточки лида. */
export const CHAT_MODEL = "claude-sonnet-5-5";
export const LEAD_MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
/** Ключ читается только на сервере из ANTHROPIC_API_KEY и в браузер не попадает. */
export function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

export class Refused extends Error {}

type JsonCall = {
  model: string;
  effort: "low" | "medium" | "high";
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: Record<string, unknown>;
  maxTokens: number;
};

/**
 * Один запрос к Claude со структурированным JSON-ответом.
 * Серверный fallback ("default") повторяет запрос на рекомендованной модели,
 * если классификатор безопасности отклонил его.
 */
export async function callJson<T>(c: Anthropic, p: JsonCall): Promise<T> {
  const response = await c.beta.messages.create({
    model: p.model,
    max_tokens: p.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: p.system,
    messages: p.messages,
    output_config: { effort: p.effort, format: { type: "json_schema", schema: p.schema } },
  });
  if (response.stop_reason === "refusal") throw new Refused("refusal");
  const block = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
  if (!block) throw new Error(`Пустой ответ модели (stop_reason: ${response.stop_reason})`);
  return JSON.parse(block.text) as T;
}

/** Понятный текст ошибки для посетителя сайта и HTTP-статус. */
export function describeError(error: unknown): { status: number; message: string } {
  if (error instanceof Refused)
    return { status: 200, message: "Не могу ответить на это сообщение. Переформулируйте, пожалуйста." };
  if (error instanceof Anthropic.RateLimitError)
    return { status: 429, message: "Слишком много сообщений, подождите минуту." };
  if (error instanceof Anthropic.AuthenticationError)
    return { status: 503, message: "Демо временно недоступно: проверьте ключ API на сервере." };
  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic API error", error.status, error.message);
    return { status: 502, message: "Не удалось получить ответ. Отправьте сообщение ещё раз." };
  }
  console.error(error);
  return { status: 500, message: "Не удалось получить ответ. Отправьте сообщение ещё раз." };
}
