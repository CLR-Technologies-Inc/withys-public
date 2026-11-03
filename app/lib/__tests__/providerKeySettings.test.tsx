import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { DarkColors as mockColors } from '../../constants/Colors';
import SettingsScreen from '../../app/(tabs)/settings';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput', Platform: { OS: 'ios' }, StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('../ThemeProvider', () => ({
  useColors: () => mockColors,
  useTheme: () => ({ preference: 'system', resolvedTheme: 'dark' }),
}));
jest.mock('../store', () => ({ useJournalStore: () => ({ aiEnabled: true }) }));
jest.mock('../hooks', () => ({
  useEntries: () => ({ data: [] }), useContacts: () => ({ data: [] }), useAddEntry: () => ({}),
}));
const mockRead = jest.fn(() => Promise.resolve({}));
const mockWrite = jest.fn<Promise<void>, [Record<string, string>]>();
jest.mock('../apiKeys', () => ({
  getStoredApiKeys: () => mockRead(),
  saveStoredApiKeys: (keys: Record<string, string>) => mockWrite(keys),
  usesSessionOnlyApiKeys: false,
}));
jest.mock('../usePWAInstall', () => ({ usePWAInstall: () => ({}) }));
jest.mock('expo-router', () => ({ useRouter: () => ({}) }));
jest.mock('@expo/vector-icons/FontAwesome', () => () => null);

function button(tree: ReactTestRenderer, label: string) {
  const text = tree.root.findAllByType(Text).find(node => node.children.includes(label));
  let node = text?.parent;
  while (node && node.type !== TouchableOpacity) node = node.parent;
  if (!node) throw new Error(`Button missing: ${label}`);
  return node;
}

it('retains the key draft and one pending save across Settings subviews', async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  mockWrite.mockReturnValue(pending);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<SettingsScreen />); await Promise.resolve(); });
  const press = (label: string) => act(async () => { button(tree, label).props.onPress(); await Promise.resolve(); });
  try {
    await press('Add API key');
    await act(() => { tree.root.findByType(TextInput).props.onChangeText('fixture-only'); });
    await press('Import Entries');
    await press('Back');
    expect(tree.root.findByType(TextInput).props.value).toBe('fixture-only');
    await press('Save');
    await press('Export Entries');
    await press('Back');
    expect(button(tree, 'Save').props.disabled).toBe(true);
    await press('Save'); // Direct handler invocation must also respect the pending operation.
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith({ gemini: 'fixture-only' });
    expect(mockRead).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); await pending; });
    expect(tree.root.findAllByType(Text).some(node => node.children.includes('Configured'))).toBe(true);
  } finally {
    await act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
    await act(() => { tree.unmount(); });
  }
});
