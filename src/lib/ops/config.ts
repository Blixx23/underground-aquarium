/**
 * Settings for the AI operating team that don't belong in the database:
 * models, prices and the limits every run works inside.
 */

export const OPS_MODELS = {
  /** Judgment calls, the morning brief, weekly reviews. */
  smart: "claude-sonnet-5-5",
  /** Routine sorting and review: about half the price. */
  fast: "claude-haiku-4-5-20251001",
} as const;

export type OpsModel = (typeof OPS_MODELS)[keyof typeof OPS_MODELS];

/** US dollars per million tokens, from Anthropic's list prices. */
export const PRICE_PER_MTOK: Record<OpsModel, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};
/** Cached reads cost a tenth of normal input; writing to the cache costs a quarter more. */
export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;

/** Hard limits on every run, so a confused agent can't run up a bill. */
export const OPS_LIMITS = {
  /** Database queries an agent may run in one session. */
  maxQueries: 15,
  /** Round trips to Claude in one session. */
  maxTurns: 24,
  /** Longest single reply from Claude. */
  maxOutputTokens: 4000,
  /** Time one request may use in total (Vercel stops the function at 300s). */
  requestBudgetMs: 255_000,
  /** With this little time left, the agent must stop exploring and write its report. */
  finalReserveMs: 60_000,
  /** Don't start a run (for example the reviewer after the morning session) with less than this left. */
  minStartMs: 100_000,
  /** Characters of a query result handed back to the agent. */
  maxResultChars: 12_000,
  /** Memories loaded into a run. */
  maxMemories: 60,
  /** A run that started this long ago and never finished is treated as dead. */
  staleLockMs: 6 * 60_000,
} as const;

export const OPS_SITE = "https://www.undergroundaquarium.com";

export function opsGithubRepo(): string {
  return process.env.OPS_GITHUB_REPO || "Blixx23/underground-aquarium";
}

export function opsConfigured(): { claude: boolean; github: boolean } {
  return {
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    github: Boolean(process.env.OPS_GITHUB_TOKEN),
  };
}
