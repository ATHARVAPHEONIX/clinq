import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://oarmuohgkjaijfphmntv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcm11b2hna2phaWpmcGhtbnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Nzc3NDEsImV4cCI6MjEwNDM1Mzc0MX0.qEmRYSj6tcLKwZnEh7y2Ir3NC-fHQx8i3pLMhxPzXSs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-url') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

// Fallback / client instance
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;
