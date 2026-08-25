// ============================================================
// AUTH CONTEXT PROVIDER — Client (Owner) Frontend
// Manages authentication state and provides auth helpers.
//
// State exposed:
//   user        → basic auth user (email, id)
//   userProfile → full profile from user_profiles table
//                 includes: role, full_name, tenant_id, tenant data
//   session     → Supabase session with access_token
//   loading     → true during initial auth check
//   tenantId    → convenience accessor for userProfile.tenant_id
//   businessName → convenience accessor for tenant name
//   tenantStatus → 'active' | 'inactive' | 'suspended' | null
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [userProfile, setUserProfile] = useState(null); // full profile from DB
  const [session,     setSession]     = useState(null);
  const [loading,     setLoading]     = useState(true);

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  // ── Fetch full profile from /api/owner/profile ──
  const fetchProfile = useCallback(async (accessToken) => {
    if (!accessToken || accessToken === 'demo-owner-token') return null;
    try {
      const res = await fetch(`${apiUrl}/owner/profile`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn('Profile fetch error (non-fatal):', err);
    }
    return null;
  }, [apiUrl]);

  // ── Apply session + fetch full profile ──
  const applySession = useCallback(async (newSession, newUser) => {
    setSession(newSession);
    setUser(newUser);

    if (newSession?.access_token && newSession.access_token !== 'demo-owner-token') {
      const profile = await fetchProfile(newSession.access_token);
      if (profile) {
        setUserProfile(profile);
        // Persist enriched user for offline/refresh context
        localStorage.setItem('client_user', JSON.stringify({
          ...newUser,
          ...profile,
        }));
      }
    }
  }, [fetchProfile]);

  // ── Initialize auth on mount ──
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (mounted && data?.session) {
            const fetchedProfile = await fetchProfile(data.session.access_token);
            if (mounted) {
              setSession(data.session);
              setUser(data.session.user ?? null);
              setUserProfile(fetchedProfile);
            }
          } else if (mounted) {
            // No active Supabase session — check localStorage fallback
            const storedUser = localStorage.getItem('client_user');
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch (e) {
                localStorage.removeItem('client_user');
              }
            }
          }
        } else {
          // Supabase not configured — use localStorage
          const storedUser  = localStorage.getItem('client_user');
          const storedToken = localStorage.getItem('client_token');
          if (mounted && storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              setUser(parsed);
              setUserProfile(parsed.tenant ? parsed : null);
              setSession({ access_token: storedToken || 'mock-client-token' });
            } catch (e) {
              localStorage.removeItem('client_user');
            }
          }
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    let subscription = null;
    if (supabase) {
      const authListener = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;
        if (newSession) {
          const profile = await fetchProfile(newSession.access_token);
          if (mounted) {
            setSession(newSession);
            setUser(newSession.user ?? null);
            setUserProfile(profile);
            setLoading(false);
          }
        } else {
          // Signed out
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      });
      subscription = authListener?.data?.subscription;
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const value = {
    user,
    userProfile,
    session,
    loading,

    // Convenience accessors from the profile
    tenantId:     userProfile?.tenant_id || user?.tenant_id || null,
    tenantStatus: userProfile?.tenant?.status || null,
    businessName: userProfile?.tenant?.business_name || user?.business_name || null,

    // ── SIGN IN ──
    signIn: async (credentials) => {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      // Verify this is an owner (not admin trying to use client portal)
      if (data.user?.role === 'platform_admin') {
        throw new Error('Please use the Admin Portal to login as a platform administrator');
      }

      // Store basic user data
      localStorage.setItem('client_user', JSON.stringify(data.user));
      if (data.session?.access_token) {
        localStorage.setItem('client_token', data.session.access_token);
      }

      setUser(data.user);
      setSession(data.session);

      // Set Supabase session if configured
      if (supabase && data.session) {
        await supabase.auth.setSession({
          access_token:  data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        // onAuthStateChange will fire and fetch the profile
      } else {
        // No Supabase — fetch profile manually with the token
        const profile = await fetchProfile(data.session?.access_token);
        setUserProfile(profile);
      }

      return data;
    },

    // ── SIGN OUT ──
    signOut: async () => {
      if (session?.access_token && session.access_token !== 'demo-owner-token') {
        try {
          await fetch(`${apiUrl}/auth/logout`, {
            method:  'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
        } catch (e) { /* ignore logout errors */ }
      }

      if (supabase) await supabase.auth.signOut();

      localStorage.removeItem('client_user');
      localStorage.removeItem('client_token');
      setUser(null);
      setUserProfile(null);
      setSession(null);
    },

    // ── REFRESH PROFILE ──
    // Call this after making changes to the owner's profile
    refreshProfile: async () => {
      if (!session?.access_token) return;
      const profile = await fetchProfile(session.access_token);
      if (profile) setUserProfile(profile);
    },

    // ── GET PROFILE (legacy) ──
    getProfile: async () => {
      if (!session?.access_token) return null;
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
