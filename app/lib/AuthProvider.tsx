import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useJournalStore } from './store';

export interface MockUser {
  id: string;
  email: string;
  created_at: string;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  user: MockUser;
  expires_in: number;
  expires_at: number;
}

const KEY_LOCAL_LOGGED_IN = 'prm_local_logged_in';
const KEY_LOCAL_USER_EMAIL = 'prm_local_user_email';

const MOCK_USER: MockUser = {
  id: 'local-user',
  email: 'local@prm.local',
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
};

const MOCK_SESSION: MockSession = {
  access_token: 'local-access-token',
  refresh_token: 'local-refresh-token',
  user: MOCK_USER,
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

type AuthContextType = {
  session: MockSession | null;
  loading: boolean;
  signIn: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  signIn: async () => ({ error: 'Not implemented' }),
  signOut: async () => ({ error: 'Not implemented' }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const initializeSession = useJournalStore((s) => s.initializeSession);
  const setUserId = useJournalStore((s) => s.setUserId);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const loggedIn = await AsyncStorage.getItem(KEY_LOCAL_LOGGED_IN);
        if (loggedIn === 'true') {
          const email = await AsyncStorage.getItem(KEY_LOCAL_USER_EMAIL) || MOCK_USER.email;
          const sessionData: MockSession = {
            ...MOCK_SESSION,
            user: { ...MOCK_USER, email },
          };
          setSession(sessionData);
          setUserId(sessionData.user.id);
          await initializeSession(sessionData.user.id);
        } else {
          setUserId(null);
        }
      } catch (e) {
        console.error('Failed to load local session:', e);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [initializeSession, setUserId]);

  const signIn = async (email: string) => {
    try {
      await AsyncStorage.setItem(KEY_LOCAL_LOGGED_IN, 'true');
      await AsyncStorage.setItem(KEY_LOCAL_USER_EMAIL, email);
      const sessionData: MockSession = {
        ...MOCK_SESSION,
        user: { ...MOCK_USER, email },
      };
      setSession(sessionData);
      setUserId(sessionData.user.id);
      await initializeSession(sessionData.user.id);
      return { error: null };
    } catch (e: any) {
      return { error: { message: e.message || 'Login failed' } };
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(KEY_LOCAL_LOGGED_IN);
      setSession(null);
      setUserId(null);
      return { error: null };
    } catch (e: any) {
      return { error: { message: e.message || 'Logout failed' } };
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
