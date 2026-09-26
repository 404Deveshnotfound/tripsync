'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mockUsers, isUsingPlaceholder } from '@/lib/mockStore';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isMockMode: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  switchMockUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function initAuth() {
      // Check if we are running in mock/demo mode without live Supabase credentials
      if (isUsingPlaceholder()) {
        setIsMockMode(true);
        const storedUser = localStorage.getItem('tripsync_mock_user');
        const defaultUser = storedUser ? JSON.parse(storedUser) : mockUsers[0];
        setUser({ id: defaultUser.id, email: defaultUser.email });
        setProfile(defaultUser);
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Fetch profile
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(prof || { full_name: session.user.email?.split('@')[0], upi_id: '' });
        }
      } catch (err) {
        console.error('Supabase auth init error:', err);
        // Fallback to mock mode if network/credentials fail
        setIsMockMode(true);
        setUser({ id: mockUsers[0].id, email: mockUsers[0].email });
        setProfile(mockUsers[0]);
      } finally {
        setLoading(false);
      }

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(prof);
        } else if (!isMockMode) {
          setUser(null);
          setProfile(null);
        }
      });

      return () => subscription?.unsubscribe();
    }

    initAuth();
  }, [isMockMode]);

  // Sign In
  const signIn = async (email, password) => {
    if (isMockMode) {
      const found = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || mockUsers[0];
      setUser({ id: found.id, email: found.email });
      setProfile(found);
      localStorage.setItem('tripsync_mock_user', JSON.stringify(found));
      return { data: { user: found }, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // Sign Up
  const signUp = async ({ email, password, full_name, upi_id, phone }) => {
    if (isMockMode) {
      const newUser = {
        id: 'usr-' + Date.now(),
        email,
        full_name,
        upi_id: upi_id || '',
        phone: phone || ''
      };
      mockUsers.push(newUser);
      setUser({ id: newUser.id, email: newUser.email });
      setProfile(newUser);
      localStorage.setItem('tripsync_mock_user', JSON.stringify(newUser));
      return { data: { user: newUser }, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, upi_id, phone }
      }
    });
    return { data, error };
  };

  // Sign Out
  const signOut = async () => {
    if (isMockMode) {
      localStorage.removeItem('tripsync_mock_user');
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Switch between mock demo users instantly
  const switchMockUser = (userId) => {
    const found = mockUsers.find(u => u.id === userId);
    if (found) {
      setUser({ id: found.id, email: found.email });
      setProfile(found);
      localStorage.setItem('tripsync_mock_user', JSON.stringify(found));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isMockMode,
        signIn,
        signUp,
        signOut,
        switchMockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
