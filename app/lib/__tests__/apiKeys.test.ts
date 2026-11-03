import type { ApiKeys } from '../apiKeys';

const legacySlot = 'prm_journal_api_keys';
const mockPlain = new Map<string, string>();
const mockSecure = new Map<string, string>();
let mockOS: 'web' | 'ios' | 'android' = 'web';
const mockRead = jest.fn(async (key: string) => mockPlain.get(key) ?? null);
const mockRemove = jest.fn(async (key: string) => { mockPlain.delete(key); });

jest.mock('react-native', () => ({ Platform: { get OS() { return mockOS; } } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockRead,
    removeItem: mockRemove,
    setItem: jest.fn(async (key: string, value: string) => { mockPlain.set(key, value); }),
  },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockSecure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockSecure.set(key, value); },
  deleteItemAsync: async (key: string) => { mockSecure.delete(key); },
}));

function openApp(platform: typeof mockOS = 'web'): typeof import('../apiKeys') {
  mockOS = platform;
  jest.resetModules();
  return jest.requireActual('../apiKeys');
}

beforeEach(() => {
  mockPlain.clear();
  mockSecure.clear();
  jest.clearAllMocks();
});

it('removes the legacy browser item at startup without reading its value or touching journal data', async () => {
  mockPlain.set(legacySlot, JSON.stringify({ gemini: 'old-fixture' }));
  mockPlain.set('journal', 'journal-fixture');
  const app = openApp();
  await app.discardLegacyBrowserApiKeys();
  expect(mockPlain.has(legacySlot)).toBe(false);
  expect(mockRead).not.toHaveBeenCalled();
  expect(mockPlain.get('journal')).toBe('journal-fixture');
  expect(await app.getStoredApiKeys()).toEqual({});
});

it('keeps independent session snapshots, supports removal, and starts empty on reload', async () => {
  const app = openApp();
  const input: ApiKeys = { gemini: 'fixture-one', openai: 'fixture-two' };
  await app.saveStoredApiKeys(input);
  delete input.gemini;
  const read = await app.getStoredApiKeys();
  expect(read.gemini).toBe('fixture-one');
  delete read.gemini;
  expect((await app.getStoredApiKeys()).gemini).toBe('fixture-one');
  await app.saveStoredApiKeys(read);
  expect(await app.getStoredApiKeys()).toEqual({ openai: 'fixture-two' });
  expect(mockPlain.size).toBe(0);
  expect(mockSecure.size).toBe(0);
  expect(await openApp().getStoredApiKeys()).toEqual({});
});

it('rejects a save when legacy cleanup fails, then retries without retaining that key', async () => {
  mockPlain.set(legacySlot, 'legacy-fixture');
  mockRemove.mockRejectedValueOnce(new Error('Storage unavailable'));
  const app = openApp();
  await expect(app.saveStoredApiKeys({ gemini: 'unsaved-fixture' })).rejects.toThrow();
  expect(await app.getStoredApiKeys()).toEqual({});
  expect(mockPlain.has(legacySlot)).toBe(false);
});

it('cannot restore a signed-out key from an in-flight save', async () => {
  const app = openApp();
  await app.saveStoredApiKeys({ gemini: 'first-fixture' });
  let finish!: () => void;
  mockRemove.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const pending = app.saveStoredApiKeys({ gemini: 'late-fixture' });
  app.endApiKeySession();
  finish();
  await expect(pending).rejects.toThrow('session ended');
  expect(await app.getStoredApiKeys()).toEqual({});
  await app.saveStoredApiKeys({ gemini: 'new-fixture' });
  await app.clearStoredApiKeys();
  expect(await app.getStoredApiKeys()).toEqual({});
});

it.each(['ios', 'android'] as const)('retains secure storage, migration and removal on %s', async os => {
  mockPlain.set(legacySlot, JSON.stringify({ gemini: 'migration-fixture' }));
  const app = openApp(os);
  await app.discardLegacyBrowserApiKeys();
  expect(mockPlain.has(legacySlot)).toBe(true);
  expect(await app.getStoredApiKeys()).toEqual({ gemini: 'migration-fixture' });
  expect(mockPlain.has(legacySlot)).toBe(false);
  await app.saveStoredApiKeys({ gemini: 'native-fixture' });
  app.endApiKeySession();
  expect(await openApp(os).getStoredApiKeys()).toEqual({ gemini: 'native-fixture' });
  // An interrupted migration must not cause a cleared key to reappear.
  mockPlain.set(legacySlot, JSON.stringify({ gemini: 'old-fixture' }));
  await app.clearStoredApiKeys();
  expect(mockSecure.size).toBe(0);
  expect(await app.getStoredApiKeys()).toEqual({});
});

it('preserves the active native key if cleanup prevents a replacement', async () => {
  const existing = JSON.stringify({ gemini: 'current-fixture' });
  mockSecure.set(legacySlot, existing);
  mockPlain.set(legacySlot, 'old-fixture');
  mockRemove.mockRejectedValueOnce(new Error('Storage unavailable'));
  const app = openApp('ios');
  await expect(app.saveStoredApiKeys({ gemini: 'replacement-fixture' })).rejects.toThrow();
  expect(mockSecure.get(legacySlot)).toBe(existing);
  expect(await app.getStoredApiKeys()).toEqual({ gemini: 'current-fixture' });
  expect(mockPlain.has(legacySlot)).toBe(false);
});
