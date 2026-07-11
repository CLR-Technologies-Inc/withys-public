import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../AuthProvider';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TestComponent = () => {
  const { session, loading, signIn, signOut } = useAuth();
  return (
    <View>
      <Text testID="auth-status">{loading ? 'Loading' : session ? 'Logged In' : 'Logged Out'}</Text>
      {session && <Text testID="user-email">{session.user.email}</Text>}
      <TouchableOpacity testID="login-btn" onPress={() => signIn('test@prm.local')} />
      <TouchableOpacity testID="logout-btn" onPress={() => signOut()} />
    </View>
  );
};

describe('AuthProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('renders correctly and provides initial logged-out state', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    const statusText = root.root.findByProps({ testID: 'auth-status' });
    expect(statusText.props.children).toBe('Logged Out');
  });

  it('restores logged-in session from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem('prm_local_logged_in', 'true');
    await AsyncStorage.setItem('prm_local_user_email', 'restored@prm.local');

    let root: any;
    await act(async () => {
      root = renderer.create(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    const statusText = root.root.findByProps({ testID: 'auth-status' });
    expect(statusText.props.children).toBe('Logged In');

    const emailText = root.root.findByProps({ testID: 'user-email' });
    expect(emailText.props.children).toBe('restored@prm.local');
  });

  it('allows user to sign in and sign out', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Verify initial state
    expect(root.root.findByProps({ testID: 'auth-status' }).props.children).toBe('Logged Out');

    // Trigger login
    const loginBtn = root.root.findByProps({ testID: 'login-btn' });
    await act(async () => {
      loginBtn.props.onPress();
    });

    // State should now be logged in
    expect(root.root.findByProps({ testID: 'auth-status' }).props.children).toBe('Logged In');
    expect(root.root.findByProps({ testID: 'user-email' }).props.children).toBe('test@prm.local');
    expect(await AsyncStorage.getItem('prm_local_logged_in')).toBe('true');
    expect(await AsyncStorage.getItem('prm_local_user_email')).toBe('test@prm.local');

    // Trigger logout
    const logoutBtn = root.root.findByProps({ testID: 'logout-btn' });
    await act(async () => {
      logoutBtn.props.onPress();
    });

    // State should now be logged out
    expect(root.root.findByProps({ testID: 'auth-status' }).props.children).toBe('Logged Out');
    expect(await AsyncStorage.getItem('prm_local_logged_in')).toBeNull();
  });
});
