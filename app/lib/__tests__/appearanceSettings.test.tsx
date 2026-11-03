import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { DarkColors as mockDarkColors } from '../../constants/Colors';
import SettingsScreen from '../../app/(tabs)/settings';
import { appearanceText } from '../appearanceText';
import type { ThemePreference } from '../ThemeProvider';

// The assertions exercise the screen's text, accessibility props and press handlers.
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput', Platform: { OS: 'ios' },
  StyleSheet: { create: (styles: unknown) => styles },
}));

const mockPreferences = { theme: 'system' as ThemePreference, dark: true, simple: false };
jest.mock('../ThemeProvider', () => ({
  useColors: () => mockDarkColors,
  useTheme: () => ({
    preference: mockPreferences.theme,
    resolvedTheme: mockPreferences.dark ? 'dark' : 'light',
    setPreference: (value: ThemePreference) => { mockPreferences.theme = value; },
  }),
}));
jest.mock('../store', () => ({
  useJournalStore: () => ({
    simpleMode: mockPreferences.simple,
    setSimpleMode: (value: boolean) => { mockPreferences.simple = value; },
  }),
}));
jest.mock('../hooks', () => ({
  useEntries: () => ({ data: [] }),
  useContacts: () => ({ data: [] }),
  useAddEntry: () => ({}),
}));
const mockStoredKeys = Promise.resolve({});
jest.mock('../apiKeys', () => ({ getStoredApiKeys: () => mockStoredKeys }));
jest.mock('../usePWAInstall', () => ({ usePWAInstall: () => ({}) }));
jest.mock('expo-router', () => ({ useRouter: () => ({}) }));
jest.mock('@expo/vector-icons/FontAwesome', () => () => null);

it('falls back per message when a bundled translation is missing or blank', () => {
  const partial = { heading: 'Example heading', theme: '   ', simpleMode: '' };
  expect(appearanceText('heading', partial)).toBe('Example heading');
  expect(appearanceText('editorFont', partial)).toBe('Editor Font');
  expect(appearanceText('theme', partial)).toBe('Theme');
  expect(appearanceText('simpleMode', partial)).toBe('Simple Mode');
  expect(appearanceText('heading')).toBe('Appearance');
});

it('exposes the current appearance settings and keeps both control actions working', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<SettingsScreen />);
    await mockStoredKeys;
  });
  const row = (label: string) => {
    const found = tree.root.findAllByType(TouchableOpacity).filter(node => node.props.accessibilityLabel === label);
    expect(found).toHaveLength(1);
    return found[0].props;
  };
  const renderAgain = () => act(() => { tree.update(<SettingsScreen />); });

  try {
    expect(row('Editor Font').accessibilityValue.text).toBe('SpaceMono');
    expect(row('Theme').accessibilityRole).toBe('button');
    expect(row('Theme').accessibilityValue.text).toBe('System (dark)');
    mockPreferences.dark = false;
    await renderAgain();
    expect(row('Theme').accessibilityValue.text).toBe('System (light)');
    for (const next of ['Light', 'Dark', 'System (light)']) {
      row('Theme').onPress();
      await renderAgain();
      expect(row('Theme').accessibilityValue.text).toBe(next);
    }
    expect(row('Simple Mode').accessibilityRole).toBe('switch');
    expect(row('Simple Mode').accessibilityState.checked).toBe(false);
    row('Simple Mode').onPress();
    await renderAgain();
    expect(row('Simple Mode').accessibilityState.checked).toBe(true);
    expect(row('Simple Mode').accessibilityHint).toBe('Home, Journal, People only');
  } finally {
    await act(() => { tree.unmount(); });
  }
});
