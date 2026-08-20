// ============================================================
// AUTH CONTEXT PROVIDER — Admin Frontend
// Manages authentication state and provides auth helpers
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (mounted && data?.session) {
            setSession(data.session);
            setUser(data.session.user ?? null);
          }
        } else {
          // Fallback to stored session if Supabase is not configured
          const storedUser = localStorage.getItem('admin_user');
          const storedToken = localStorage.getItem('admin_token');
          if (mounted && storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              setUser(parsed);
              setSession({ access_token: storedToken || 'mock-admin-token' });
            } catch (e) {
              localStorage.removeItem('admin_user');
            }
          }
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    let subscription = null;
    if (supabase) {
      const authListener = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        }
      });
      subscription = authListener?.data?.subscription;
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn: async (email, password) => {
      // Demo credentials fallback
      if (email === 'admin@udhari.io' && password === 'admin123') {
        const demoUser = {
          id: 'admin-001',
          email: 'admin@udhari.io',
          role: 'platform_admin',
          full_name: 'Platform Admin'
        };
        localStorage.setItem('admin_user', JSON.stringify(demoUser));
        localStorage.setItem('admin_token', 'demo-admin-token');
        setUser(demoUser);
        setSession({ access_token: 'demo-admin-token' });
        return { user: demoUser };
      }

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

      try {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        // Verify admin role
        if (data.user.role !== 'platform_admin') {
          throw new Error('Admin access required');
        }

        localStorage.setItem('admin_user', JSON.stringify(data.user));
        if (data.session?.access_token) {
          localStorage.setItem('admin_token', data.session.access_token);
        }

        setUser(data.user);
        setSession(data.session);

        // Set Supabase session if configured
        if (supabase && data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        return data;
      } catch (err) {
        throw err;
      }
    },
    signOut: async () => {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

      // Call backend logout if token exists
      if (session?.access_token && session.access_token !== 'demo-admin-token') {
        try {
          await fetch(`${apiUrl}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
        } catch (e) {
          // ignore
        }
      }

      // Sign out from Supabase
      if (supabase) {
        await supabase.auth.signOut();
      }

      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_token');
      setUser(null);
      setSession(null);
    },
    getProfile: async () => {
      if (!session?.access_token) return null;

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      return response.json();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
