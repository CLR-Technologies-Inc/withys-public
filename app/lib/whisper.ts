/**
 * Local Whisper client for WWLO PRM.
 *
 * Connects to the local Whisper transcription server (scripts/whisper-server.py)
 * for fully private, offline speech-to-text.
 *
 * Pipeline:
 *   Voice Memo → Whisper (localhost:8178) → Raw Transcript → Ollama/Gemma → Structured Markdown
 */
import { getStoredApiKeys } from './apiKeys';

const WHISPER_URL = process.env.EXPO_PUBLIC_WHISPER_URL || 'http://localhost:8178';

// ── Health Check ─────────────────────────────────────────────────────────────

export interface WhisperHealthResponse {
  status: string;
  model: string;
  service: string;
}

/**
 * Check if the local Whisper server is running.
 * Returns null if unreachable.
 */
export async function checkWhisperHealth(): Promise<WhisperHealthResponse | null> {
  try {
    const res = await fetch(`${WHISPER_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Transcription ────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  processing_time: number;
}

/**
 * Transcribe a base64-encoded audio file to text using local Whisper.
 *
 * @param base64Audio - Base64-encoded audio data (m4a, wav, mp3, ogg, flac)
 * @param mimeType - MIME type of the audio (default: audio/m4a)
 * @returns Transcription result with text, detected language, and timing info
 * @throws Error if the Whisper server is unreachable or transcription fails
 */
export async function transcribeAudio(
  base64Audio: string,
  mimeType: string = 'audio/m4a',
): Promise<TranscriptionResult> {
  // Convert base64 to binary
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Determine file extension from MIME type
  const extMap: Record<string, string> = {
    'audio/m4a': 'recording.m4a',
    'audio/mp4': 'recording.m4a',
    'audio/x-m4a': 'recording.m4a',
    'audio/mpeg': 'recording.mp3',
    'audio/mp3': 'recording.mp3',
    'audio/wav': 'recording.wav',
    'audio/x-wav': 'recording.wav',
    'audio/ogg': 'recording.ogg',
    'audio/flac': 'recording.flac',
    'audio/webm': 'recording.webm',
  };
  const filename = extMap[mimeType] || 'recording.wav';

  // Build multipart form data (OpenAI-compatible format)
  const formData = new FormData();
  const blob = new Blob([bytes], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1'); // Ignored by our server but matches OpenAI format

  const res = await fetch(`${WHISPER_URL}/v1/audio/transcriptions`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(120_000), // 2 minute timeout for long recordings
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Transcription failed' }));
    throw new Error(error.error || `Whisper server returned ${res.status}`);
  }

  return await res.json();
}

// ── Two-Stage Pipeline ───────────────────────────────────────────────────────

const OLLAMA_URL = process.env.EXPO_PUBLIC_OLLAMA_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';

const FORMAT_PROMPT = `You are a journaling assistant for WWLO PRM. Convert the following voice memo transcript into a structured Markdown entry with YAML frontmatter.

Extract from the transcript:
1. The date (if mentioned, otherwise use today's date in YYYY-MM-DD format).
2. The person/contact mentioned (required — if unclear, use "Unknown").
3. The location or channel (if mentioned).
4. The interaction type (one of: phone, email, text, meeting, event, video, linkedin, voicemail, in-person, project, reflection, other).
5. Any relevant tags or categories.
6. A clean, concise summary of what was discussed.

Format the output strictly as:
---
date: YYYY-MM-DD
contact: Contact Name
location: Location or Channel
type: interaction-type
tags: tag1, tag2
---

# Brief Title

Clean summary of the interaction in 2-4 sentences. Remove filler words, false starts, and repetition from the transcript. Keep the tone natural but concise.

**Action items:**
- List any follow-ups or tasks mentioned (omit this section if none)

Do not output any text before the --- frontmatter block or after the entry.`;

/**
 * Full local voice-to-markdown pipeline:
 * 1. Whisper (localhost:8178) → raw transcript
 * 2. Ollama/Gemma (localhost:11434) → structured markdown
 *
 * @param base64Audio - Base64-encoded audio data
 * @param mimeType - MIME type of the audio
 * @returns Structured markdown entry ready for the journal
 */
export async function voiceToMarkdown(
  base64Audio: string,
  mimeType: string = 'audio/m4a',
): Promise<{ markdown: string; transcript: string; transcriptionTime: number; formattingTime: number }> {
  // Stage 1: Whisper transcription
  const transcription = await transcribeAudio(base64Audio, mimeType);

  if (!transcription.text || transcription.text.trim().length === 0) {
    throw new Error('Whisper returned an empty transcription. The audio may be too short or silent.');
  }

  // Stage 2: Ollama/Gemma formatting
  const today = new Date().toISOString().split('T')[0];
  const formattingStart = Date.now();

  const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      system: FORMAT_PROMPT,
      prompt: `Today's date is ${today}.\n\nTranscript:\n${transcription.text}`,
      stream: false,
      options: {
        temperature: 0.2,
        top_p: 0.9,
        num_predict: 1024,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!ollamaRes.ok) {
    throw new Error(`Ollama returned ${ollamaRes.status}. Is Ollama running?`);
  }

  const ollamaData = await ollamaRes.json();
  const formattingTime = (Date.now() - formattingStart) / 1000;

  return {
    markdown: ollamaData.response?.trim() || '',
    transcript: transcription.text,
    transcriptionTime: transcription.processing_time,
    formattingTime,
  };
}

// ── Provider Detection ───────────────────────────────────────────────────────

export type VoicePipelineProvider = 'local' | 'gemini' | 'none';

/**
 * Detect the best available voice-to-text pipeline.
 * Prefers local (Whisper + Ollama) over cloud (Gemini).
 */
export async function detectVoicePipeline(): Promise<{
  provider: VoicePipelineProvider;
  whisperAvailable: boolean;
  ollamaAvailable: boolean;
  geminiAvailable: boolean;
}> {
  // Check Whisper
  const whisper = await checkWhisperHealth();
  const whisperAvailable = whisper !== null;

  // Check Ollama
  let ollamaAvailable = false;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    ollamaAvailable = r.ok;
  } catch { /* not running */ }

  // Check Gemini
  let geminiAvailable = false;
  try {
    const keys = await getStoredApiKeys();
    geminiAvailable = !!keys.gemini;
    if (!geminiAvailable && process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
      geminiAvailable = true;
    }
  } catch { /* ignore */ }

  let provider: VoicePipelineProvider = 'none';
  if (whisperAvailable && ollamaAvailable) {
    provider = 'local';
  } else if (geminiAvailable) {
    provider = 'gemini';
  }

  return { provider, whisperAvailable, ollamaAvailable, geminiAvailable };
}
