import { useMutation } from '@tanstack/react-query';
import { useAddEntry } from '../hooks';
import { useJournalStore } from '../store';
import { encrypt, serializeEncrypted } from '../vault';
import type { SampleEntry } from '../sampleData';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn((options) => options),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('../store', () => ({
  useJournalStore: Object.assign(jest.fn(), { getState: jest.fn() }),
}));
jest.mock('../vault', () => ({ encrypt: jest.fn(), serializeEncrypted: jest.fn() }));

type Save = (input: { entry: SampleEntry; encryptOnSave?: boolean }) => Promise<SampleEntry>;
const draft = (): SampleEntry => ({
  id: 'synthetic-entry', entry_date: '2026-09-10', contact_name: 'Test Person',
  location: '', raw_text: 'Synthetic private draft', tags: [], source: 'manual', status: 'approved',
});
const addEntry = jest.fn();
let vaultPassphrase: string | null;
let save: Save;

beforeEach(() => {
  jest.clearAllMocks();
  vaultPassphrase = 'synthetic-test-passphrase';
  (useJournalStore as unknown as jest.Mock).mockImplementation((selector) => selector({ addEntry }));
  (useJournalStore.getState as jest.Mock).mockImplementation(() => ({ vaultPassphrase }));
  (encrypt as jest.Mock).mockResolvedValue({ ciphertext: 'encrypted' });
  (serializeEncrypted as jest.Mock).mockReturnValue('VAULT:1:encrypted');
  useAddEntry();
  save = (useMutation as jest.Mock).mock.calls[0][0].mutationFn;
});

it('does not save plaintext when requested encryption fails and leaves the draft intact', async () => {
  const entry = draft();
  (encrypt as jest.Mock).mockRejectedValue(new Error('synthetic crypto failure'));
  await expect(save({ entry, encryptOnSave: true })).rejects.toThrow('Encryption failed');
  expect(addEntry).not.toHaveBeenCalled();
  expect(entry.raw_text).toBe('Synthetic private draft');
});

it('requires unlocking instead of silently downgrading an encrypted save', async () => {
  vaultPassphrase = null;
  await expect(save({ entry: draft(), encryptOnSave: true })).rejects.toThrow('Unlock your vault');
  expect(encrypt).not.toHaveBeenCalled();
  expect(addEntry).not.toHaveBeenCalled();
});

it('saves ciphertext without changing the caller draft', async () => {
  const entry = draft();
  const result = await save({ entry, encryptOnSave: true });
  expect(addEntry).toHaveBeenCalledWith({ ...entry, raw_text: 'VAULT:1:encrypted' });
  expect(result).not.toBe(entry);
  expect(entry.raw_text).toBe('Synthetic private draft');
});

it('rejects a vault lock while encryption is in flight', async () => {
  (encrypt as jest.Mock).mockImplementation(async () => {
    vaultPassphrase = null;
    return { ciphertext: 'encrypted' };
  });
  await expect(save({ entry: draft(), encryptOnSave: true })).rejects.toThrow('vault changed');
  expect(addEntry).not.toHaveBeenCalled();
});

it('continues to allow an explicitly unencrypted local entry', async () => {
  vaultPassphrase = null;
  const entry = draft();
  await expect(save({ entry })).resolves.toBe(entry);
  expect(addEntry).toHaveBeenCalledWith(entry);
  expect(encrypt).not.toHaveBeenCalled();
});
