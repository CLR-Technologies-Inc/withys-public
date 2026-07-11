/**
 * Cerebras AI Client for WWLO PRM (in-app usage).
 *
 * Uses the Cerebras Inference API (OpenAI-compatible /v1/chat/completions)
 * for fast inference on open-weight models (Llama, Qwen, DeepSeek).
 *
 * This mirrors the Gemini client (lib/gemini.ts) in functionality,
 * providing the same AI features (voice-to-markdown, wingman briefing)
 * through the Cerebras backend.
 *
 * API Reference: https://docs.cerebras.ai/
 * Endpoint: https://api.cerebras.ai/v1/chat/completions
 * Auth: Bearer token via CEREBRAS_API_KEY
 */

// ── Configuration ───────────────────────────────────────────────────────────

const CEREBRAS_API_KEY = process.env.EXPO_PUBLIC_CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY || '';
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama3.3-70b';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

// ── Types ───────────────────────────────────────────────────────────────────

interface CerebrasMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CerebrasChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

interface CerebrasResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CerebrasChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  time_info?: {
    total_time: number;
    queue_time: number;
  };
}

// ── Core Request ────────────────────────────────────────────────────────────

/**
 * Send a chat completion request to the Cerebras API.
 *
 * @param messages - Array of chat messages (system, user, assistant)
 * @param options - Optional overrides for model, temperature, max_tokens
 * @returns The assistant's response text
 */
async function chatCompletion(
  messages: CerebrasMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
  }
): Promise<string> {
  if (!CEREBRAS_API_KEY) {
    throw new Error(
      'CEREBRAS_API_KEY is not set. ' +
      'Get a key at https://cloud.cerebras.ai and add it to your .env file.'
    );
  }

  const response = await fetch(CEREBRAS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
    },
    body: JSON.stringify({
      model: options?.model || CEREBRAS_MODEL,
      messages,
      temperature: options?.temperature ?? 0.3,
      top_p: 0.8,
      max_tokens: options?.maxTokens ?? 1024,
      ...(options?.responseFormat ? { response_format: options.responseFormat } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '(no body)');
    throw new Error(
      `Cerebras API error (${response.status}): ${errorBody}. ` +
      `Model: ${options?.model || CEREBRAS_MODEL}. ` +
      `Verify your API key and model availability.`
    );
  }

  const data: CerebrasResponse = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Cerebras API');

  return text;
}

// ── WWLO PRM AI Features ─────────────────────────────────────────────────

/**
 * Parse an audio transcript into a structured Markdown journal entry.
 * (Note: Cerebras does not support audio input directly — expects pre-transcribed text.)
 *
 * @param transcript - Pre-transcribed text from audio recording
 * @returns Markdown-formatted journal entry with YAML frontmatter
 */
export async function parseTranscriptToMarkdown(transcript: string): Promise<string> {
  const systemPrompt = `You are a journaling assistant that converts voice memo transcripts into structured Markdown journal entries with YAML frontmatter.`;

  const userPrompt = `Convert this voice memo transcript into a Markdown journal entry:

${transcript}

Extract:
1. The date (if mentioned, otherwise use today's date YYYY-MM-DD).
2. The person/contact mentioned.
3. The location or channel (if mentioned).
4. A brief description of the interaction.
5. Any relevant tags or categories mentioned.

Format the output strictly as a Markdown entry with YAML frontmatter:
---
date: YYYY-MM-DD
contact: Contact Name
location: Location or Channel
tags: tag1, tag2
---

# Optional Title

Brief description of the interaction.

Do not output any other text besides the Markdown entry.`;

  return chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

/**
 * Generates a 3-bullet point summary of past interactions to prepare for a meeting.
 * "AI Wingman" — helps users recall context before reconnecting with someone.
 */
export async function generateBriefing(
  contactName: string,
  entries: { raw_text: string; entry_date: string }[]
): Promise<string> {
  const context = entries
    .map((e) => `Date: ${e.entry_date}\nEntry: ${e.raw_text}`)
    .join('\n---\n');

  const systemPrompt = `You are an "AI Wingman" assistant for WWLO PRM. Your goal is to provide a concise, actionable, and warm briefing to help the user prepare for an upcoming interaction.`;

  const userPrompt = `Based on the past journal entries below about ${contactName}, provide exactly 3 high-impact bullet points:
1. **Last Interaction**: A brief (1-sentence) summary of the most recent interaction, including when and what happened.
2. **Recurring Context**: Identify a consistent topic of interest, a personal detail (pets, family, hobbies), or an outstanding "favor" or promise mentioned across history.
3. **Talking Point**: Suggest a specific, natural-sounding "catch-up" question or observation that demonstrates the user has been paying attention to their life.

Past Entries:
${context}

Format the output as a simple list of 3 bullet points. Use bold headers for each point. Be concise but insightful.`;

  return chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

/**
 * Summarize an email body into a concise journal entry draft.
 * Used by the Gmail integration to pre-fill entries from email conversations.
 */
export async function summarizeEmailToEntry(
  contactName: string,
  subject: string,
  emailBody: string,
  date: string
): Promise<string> {
  const systemPrompt = `You are a journal assistant that converts email exchanges into concise Markdown journal entries with YAML frontmatter. Focus on key discussion points, decisions, and action items.`;

  const userPrompt = `Create a journal entry from this email:
Subject: ${subject}
Date: ${date}
Contact: ${contactName}

Email body:
${emailBody}

Format as:
---
date: ${date}
contact: ${contactName}
type: email
subject: ${subject}
tags: email
---

# [Concise title based on content]

[2-3 sentence summary of the key points, decisions, or action items]

Only output the Markdown entry.`;

  return chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

// ── Utilities ───────────────────────────────────────────────────────────────

/**
 * Check if the Cerebras API is configured and reachable.
 */
export async function checkCerebrasHealth(): Promise<{
  isConfigured: boolean;
  isReachable: boolean;
  model: string;
  error?: string;
}> {
  if (!CEREBRAS_API_KEY) {
    return { isConfigured: false, isReachable: false, model: CEREBRAS_MODEL };
  }

  try {
    const res = await fetch('https://api.cerebras.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY}` },
    });

    return {
      isConfigured: true,
      isReachable: res.ok,
      model: CEREBRAS_MODEL,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isReachable: false,
      model: CEREBRAS_MODEL,
      error: err.message,
    };
  }
}

/**
 * List available models on the Cerebras API.
 */
export async function listCerebrasModels(): Promise<{
  id: string;
  ownedBy: string;
}[]> {
  if (!CEREBRAS_API_KEY) return [];

  const res = await fetch('https://api.cerebras.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || []).map((m: any) => ({
    id: m.id,
    ownedBy: m.owned_by || 'cerebras',
  }));
}

/**
 * Low-level export for direct chat completion access.
 */
export { chatCompletion };
