import "server-only";
import {
  CACHE_READ_MULTIPLIER,
  CACHE_WRITE_MULTIPLIER,
  PRICE_PER_MTOK,
  type OpsModel,
} from "@/lib/ops/config";

/**
 * A thin wrapper around Claude's Messages API. No SDK: one fetch, with
 * prompt caching on the parts every turn repeats (instructions, tools and
 * the conversation so far), which is what keeps agent runs cheap.
 */

export type TextBlock = { type: "text"; text: string };
export type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
export type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export type Message = { role: "user" | "assistant"; content: ContentBlock[] };

export type ToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
};

export type ClaudeReply = {
  content: ContentBlock[];
  stopReason: string;
  usage: Usage;
};

const API = "https://api.anthropic.com/v1/messages";

function withCacheMark(messages: Message[]): unknown[] {
  // Mark the newest block so the next turn reads everything before it from cache.
  return messages.map((m, i) => {
    if (i !== messages.length - 1 || m.content.length === 0) return m;
    const content = m.content.map((b, j) =>
      j === m.content.length - 1 ? { ...b, cache_control: { type: "ephemeral" } } : b
    );
    return { ...m, content };
  });
}

export async function callClaude(args: {
  model: OpsModel;
  system: string;
  tools: ToolDef[];
  messages: Message[];
  maxTokens: number;
  /** "none" forces a written answer with no more tool calls. */
  toolChoice?: "auto" | "none";
  /** Give up on a call that takes longer than this. */
  timeoutMs?: number;
}): Promise<ClaudeReply> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set in Vercel.");

  const tools = args.tools.map((t, i) =>
    i === args.tools.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t
  );
  const body: Record<string, unknown> = {
    model: args.model,
    max_tokens: args.maxTokens,
    system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
    messages: withCacheMark(args.messages),
  };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = { type: args.toolChoice ?? "auto" };
  }

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(API, {
      signal: AbortSignal.timeout(Math.max(5_000, args.timeoutMs ?? 120_000)),
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        content: ContentBlock[];
        stop_reason: string;
        usage: Partial<Usage>;
      };
      return {
        content: data.content ?? [],
        stopReason: data.stop_reason,
        usage: {
          input_tokens: data.usage?.input_tokens ?? 0,
          output_tokens: data.usage?.output_tokens ?? 0,
          cache_read_input_tokens: data.usage?.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: data.usage?.cache_creation_input_tokens ?? 0,
        },
      };
    }
    lastError = `${res.status} ${(await res.text()).slice(0, 300)}`;
    // Busy or rate limited: wait and try again. Anything else is a real error.
    if (![429, 500, 502, 503, 529].includes(res.status)) break;
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`Claude API error: ${lastError}`);
}

/** What a set of tokens cost, in cents. */
export function costCents(model: OpsModel, u: Usage): number {
  const p = PRICE_PER_MTOK[model];
  const dollars =
    (u.input_tokens * p.input +
      u.cache_read_input_tokens * p.input * CACHE_READ_MULTIPLIER +
      u.cache_creation_input_tokens * p.input * CACHE_WRITE_MULTIPLIER +
      u.output_tokens * p.output) /
    1_000_000;
  return Math.round(dollars * 100 * 100) / 100;
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
  };
}

export const ZERO_USAGE: Usage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};
