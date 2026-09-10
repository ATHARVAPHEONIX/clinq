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
        let authUser = null;

        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            authUser = session.user;
            setUser(session.user);
            const profile = await api.getPatientProfile(session.user.id);
            setPatient(profile);
          }

          supabase.auth.onAuthStateChange(
            async (_event, session) => {
              if (session?.user) {
                setUser(session.user);
                localStorage.setItem('caretrack_auth_session', 'true');
                const profile = await api.getPatientProfile(session.user.id);
                setPatient(profile);
              } else if (!localStorage.getItem('caretrack_auth_session')) {
                setUser(null);
                setPatient(null);
              }
              setLoading(false);
            }
          );
        }

        // Fallback or stored local session check
        if (!authUser) {
          const storedSession = localStorage.getItem('caretrack_auth_session');
          if (storedSession) {
            const profile = await api.getPatientProfile();
            if (profile) {
              const fallbackUser = {
                id: profile?.auth_user_id || profile?.id || 'patient-user-1',
                email: profile?.email || '',
                phone: profile?.phone || ''
              };
              setUser(fallbackUser);
              setPatient(profile);
            } else {
              localStorage.removeItem('caretrack_auth_session');
              setUser(null);
              setPatient(null);
            }
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

  const loginWithWhatsApp = async (phone) => {
    setAuthError(null);
    return await api.sendWhatsAppOtp(phone);
  };

  const verifyWhatsAppOtp = async (phone, otp) => {
    setAuthError(null);
    const res = await api.verifyWhatsAppOtp(phone, otp);
    localStorage.setItem('caretrack_auth_session', 'true');
    const profile = res.profile || (await api.getPatientProfile(res.user?.id));
    const activeUser = res.user || { id: profile?.auth_user_id || 'whatsapp-user', phone };
    setUser(activeUser);
    setPatient(profile);
    return res;
  };

  const verifyPhoneOtp = async (phone, otp) => {
    setAuthError(null);
    const res = await api.verifyPhoneOtp(phone, otp);
    
    // Always persist authentication state
    localStorage.setItem('caretrack_auth_session', 'true');
    const profile = res.profile || (await api.getPatientProfile(res.user?.id));
    const activeUser = res.user || { id: profile?.auth_user_id || 'phone-user', phone };
    
    setUser(activeUser);
    setPatient(profile);
    return res;
  };

  const loginWithEmail = async (email) => {
    setAuthError(null);
    return await api.sendEmailOtp(email);
  };

  const verifyEmailOtp = async (email, otp) => {
    setAuthError(null);
    const res = await api.verifyEmailOtp(email, otp);
    
    localStorage.setItem('caretrack_auth_session', 'true');
    const profile = res.profile || (await api.getPatientProfile(res.user?.id));
    const activeUser = res.user || { id: profile?.auth_user_id || 'email-user', email };
    
    setUser(activeUser);
    setPatient(profile);
    return res;
  };

  const loginWithPassword = async (email, password) => {
    setAuthError(null);
    const res = await api.loginWithPassword(email, password);
    
    localStorage.setItem('caretrack_auth_session', 'true');
    const profile = res.profile || (await api.getPatientProfile(res.user?.id));
    const activeUser = res.user || { id: profile?.auth_user_id || 'email-user', email };
    
    setUser(activeUser);
    setPatient(profile);
    return res;
  };

  const register = async (formData) => {
    setAuthError(null);
    // Clear any prior cached local session
    localStorage.removeItem('caretrack_auth_session');
    localStorage.removeItem('caretrack_patient');
    
    const res = await api.registerPatient(formData);
    
    localStorage.setItem('caretrack_auth_session', 'true');
    const activeUser = res.user || { id: res.profile?.auth_user_id || 'new-user', email: formData.email };
    const profile = res.profile || (await api.getPatientProfile(activeUser.id));
    
    setUser(activeUser);
    setPatient(profile);
    return res;
  };

  const logout = async () => {
    try {
      await api.signOut();
    } catch (err) {
      console.warn('Signout warning:', err);
    }
    localStorage.removeItem('caretrack_auth_session');
    localStorage.removeItem('caretrack_patient');
    localStorage.removeItem('caretrack_visits');
    localStorage.removeItem('caretrack_reports');
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
        loginWithWhatsApp,
        verifyPhoneOtp,
        verifyWhatsAppOtp,
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
