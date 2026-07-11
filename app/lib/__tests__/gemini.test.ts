import { parseAudioToMarkdown } from '../gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai');

describe('parseAudioToMarkdown', () => {
  const mockGenerateContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent,
      }),
    }));
  });

  it('throws an error if API key is missing', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = '';
    await expect(parseAudioToMarkdown('base64')).rejects.toThrow('Gemini API key is not configured in Settings.');
  });

  it('calls Gemini API and returns Markdown output', async () => {
    const mockMarkdown = `---\ndate: 2026-05-08\ncontact: John Doe\nlocation: Coffee Shop\ntags: work\n---\n\n# Project Discussion\n\nDiscussed project.`;
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockMarkdown,
      },
    });

    const result = await parseAudioToMarkdown('mockBase64');
    
    expect(result).toBe(mockMarkdown);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          inlineData: {
            data: 'mockBase64',
            mimeType: 'audio/m4a',
          },
        }),
        expect.stringContaining('You are a journaling assistant'),
      ])
    );
  });
});
