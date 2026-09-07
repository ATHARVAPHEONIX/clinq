import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            const profile = await api.getPatientProfile(session.user.id);
            setPatient(profile);
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
              if (session?.user) {
                setUser(session.user);
                const profile = await api.getPatientProfile(session.user.id);
                setPatient(profile);
              } else {
                setUser(null);
                setPatient(null);
              }
              setLoading(false);
            }
          );
          return () => subscription.unsubscribe();
        } else {
          // Check local simulated session
          const storedSession = localStorage.getItem('caretrack_auth_session');
          if (storedSession) {
            const profile = await api.getPatientProfile();
            setUser({ id: profile.auth_user_id, email: profile.email });
            setPatient(profile);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginWithPhone = async (phone) => {
    setAuthError(null);
    return await api.sendPhoneOtp(phone);
  };

  const verifyPhoneOtp = async (phone, otp) => {
    setAuthError(null);
    const res = await api.verifyPhoneOtp(phone, otp);
    if (!isSupabaseConfigured) {
      localStorage.setItem('caretrack_auth_session', 'true');
      const profile = await api.getPatientProfile();
      setUser(res.user);
      setPatient(profile);
    }
    return res;
  };

  const loginWithEmail = async (email) => {
    setAuthError(null);
    return await api.sendEmailOtp(email);
  };

  const verifyEmailOtp = async (email, otp) => {
    setAuthError(null);
    const res = await api.verifyEmailOtp(email, otp);
    if (!isSupabaseConfigured) {
      localStorage.setItem('caretrack_auth_session', 'true');
      const profile = await api.getPatientProfile();
      setUser(res.user);
      setPatient(profile);
    }
    return res;
  };

  const loginWithPassword = async (email, password) => {
    setAuthError(null);
    const res = await api.loginWithPassword(email, password);
    if (!isSupabaseConfigured) {
      localStorage.setItem('caretrack_auth_session', 'true');
      const profile = await api.getPatientProfile();
      setUser(res.user);
      setPatient(profile);
    }
    return res;
  };

  const register = async (formData) => {
    setAuthError(null);
    const res = await api.registerPatient(formData);
    if (!isSupabaseConfigured) {
      localStorage.setItem('caretrack_auth_session', 'true');
      setUser(res.user);
      setPatient(res.profile);
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.signOut();
    } catch (err) {
      console.warn('Signout warning:', err);
    }
    localStorage.removeItem('caretrack_auth_session');
    setUser(null);
    setPatient(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await api.getPatientProfile(user.id);
      setPatient(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        patient,
        loading,
        authError,
        isSupabaseConfigured,
        loginWithPhone,
        verifyPhoneOtp,
        loginWithEmail,
        verifyEmailOtp,
        loginWithPassword,
        register,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
