// LLM model selection for Ollama Cloud (OpenAI-compatible API).
// Override per deployment via Vercel env vars — no code change needed to swap.

/** Topic extraction / understanding — accuracy-critical. */
export function llmModelUnderstand(): string {
  return (
    process.env.LLM_MODEL_UNDERSTAND?.trim() ||
    process.env.LLM_MODEL?.trim() ||
    "gpt-oss:120b"
  );
}

/** Activity suggestions — latency-sensitive; a smaller model is usually enough. */
export function llmModelSuggest(): string {
  return (
    process.env.LLM_MODEL_SUGGEST?.trim() ||
    process.env.LLM_MODEL?.trim() ||
    "deepseek-v4-flash"
  );
}
