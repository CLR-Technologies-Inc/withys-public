import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStoredApiKeys } from './apiKeys';

async function getGeminiKey(): Promise<string> {
  if (process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  }

  const keys = await getStoredApiKeys();
  if (keys.gemini) return keys.gemini;

  throw new Error('Gemini API key is not configured in Settings.');
}

export async function parseAudioToMarkdown(base64Audio: string, mimeType: string = 'audio/m4a'): Promise<string> {
  const apiKey = await getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a journaling assistant that converts voice memos into structured Markdown journal entries with YAML frontmatter.
Listen to the audio and extract:
1. The date (if mentioned, otherwise use today's date YYYY-MM-DD).
2. The person/contact mentioned.
3. The location or channel (if mentioned).
4. A brief description of the interaction.
5. Any relevant tags or categories mentioned (e.g. #work, #dinner).

Format the output strictly as a Markdown entry with YAML frontmatter:
---
date: YYYY-MM-DD
contact: Contact Name
location: Location or Channel
tags: tag1, tag2
---

# Optional Title

Brief description of the interaction.

Do not output any other text besides the Markdown entry.
  `;

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Audio,
        mimeType,
      },
    },
    prompt,
  ]);

  return result.response.text();
}

/**
 * Generates a 3-bullet point summary of past interactions to prepare for a meeting.
 * "AI Wingman" — helps users recall context before reconnecting with someone.
 */
export async function generateBriefing(
  contactName: string,
  entries: { raw_text: string; entry_date: string }[]
): Promise<string> {
  const apiKey = await getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const context = entries
    .map((e) => `Date: ${e.entry_date}\nEntry: ${e.raw_text}`)
    .join('\n---\n');

  const prompt = `
You are an "AI Wingman" assistant for WWLO PRM. Your goal is to provide a concise, actionable, and warm briefing to help the user prepare for an upcoming interaction with ${contactName}.

Based on the past journal entries below, provide exactly 3 high-impact bullet points:
1. **Last Interaction**: A brief (1-sentence) summary of the most recent interaction, including when and what happened.
2. **Recurring Context**: Identify a consistent topic of interest, a personal detail (pets, family, hobbies), or an outstanding "favor" or promise mentioned across history.
3. **Talking Point**: Suggest a specific, natural-sounding "catch-up" question or observation that demonstrates the user has been paying attention to their life.

Past Entries:
${context}

Format the output as a simple list of 3 bullet points. Use bold headers for each point. Be concise but insightful.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini briefing generation failed:', err);
    throw err;
  }
}
