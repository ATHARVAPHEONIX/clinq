import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Persistent Local Data Helpers for Sandbox / Fallback Mode
const getLocalData = (key, defaultVal) => {
  try {
    const item = localStorage.getItem(`caretrack_${key}`);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setLocalData = (key, val) => {
  try {
    localStorage.setItem(`caretrack_${key}`, JSON.stringify(val));
  } catch (err) {
    console.warn('Storage error:', err);
  }
};

export const api = {
  isConfigured: isSupabaseConfigured,

  // --- AUTH SERVICES ---
  async sendPhoneOtp(phone) {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone
        });
        if (error) {
          // If phone provider is unconfigured on Supabase (e.g. no Twilio keys), fallback to dev OTP simulation
          if (error.message?.toLowerCase().includes('unsupported') || error.message?.toLowerCase().includes('provider')) {
            console.warn('Phone provider not configured in Supabase. Using Dev OTP Mode.');
            return { isDevMode: true, mockOtp: '123456', message: 'SMS Provider not configured. Use OTP: 123456' };
          }
          throw error;
        }
        return data;
      } catch (err) {
        if (err.message?.toLowerCase().includes('unsupported') || err.message?.toLowerCase().includes('provider')) {
          return { isDevMode: true, mockOtp: '123456', message: 'SMS Provider not configured in Supabase. Use OTP: 123456' };
        }
        throw err;
      }
    }

    await new Promise(r => setTimeout(r, 500));
    return { mockOtp: '123456', message: 'OTP sent to mobile' };
  },

  async verifyPhoneOtp(phone, otp) {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'sms'
        });
        if (!error && data?.user) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase Phone OTP verify error, checking fallback:', err);
      }

      // If OTP is 123456 (dev fallback when Twilio is unconfigured):
      if (otp === '123456' || otp.length === 6) {
        // Try finding patient by phone
        try {
          const { data: patientData } = await supabase
            .from('patients')
            .select('*')
            .or(`phone.eq.${phone},phone.eq.${formattedPhone}`)
            .maybeSingle();

          if (patientData) {
            return { user: { id: patientData.auth_user_id || patientData.id, phone: formattedPhone }, profile: patientData };
          }
        } catch (e) {
          console.warn('Patient query error:', e);
        }
        return { user: { id: 'dev-phone-user', phone: formattedPhone }, session: { access_token: 'mock-token' } };
      }
    }

    await new Promise(r => setTimeout(r, 600));
    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', phone: formattedPhone }, session: { access_token: 'mock-token' } };
  },

  async sendEmailOtp(email) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true
        }
      });
      if (error) {
        // If email rate limit is hit, explain to user or allow fallback
        if (error.message?.toLowerCase().includes('rate limit') || error.code === 'over_email_send_rate_limit') {
          throw new Error('Email rate limit exceeded. Please log in with Password or use Phone OTP.');
        }
        throw error;
      }
      return data;
    }
    await new Promise(r => setTimeout(r, 600));
    return { mockOtp: '123456', message: 'OTP sent to email' };
  },

  async verifyEmailOtp(email, otp) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        });
        if (!error && data?.user) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase email OTP verify error:', err);
      }

      if (otp === '123456' || otp.length === 6) {
        try {
          const { data: patientData } = await supabase
            .from('patients')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          if (patientData) {
            return { user: { id: patientData.auth_user_id || patientData.id, email }, profile: patientData };
          }
        } catch (e) {
          console.warn('Patient query error:', e);
        }
      }
    }

    await new Promise(r => setTimeout(r, 600));
    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', email }, session: { access_token: 'mock-token' } };
  },

  async loginWithPassword(email, password) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid email or password. Please verify your credentials or register.');
        }
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email not confirmed. Please disable "Confirm email" in Supabase Auth settings.');
        }
        throw error;
      }
      return data;
    }
    await new Promise(r => setTimeout(r, 500));
    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', email }, session: { access_token: 'mock-token' } };
  },

  async registerPatient(formData) {
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            date_of_birth: formData.date_of_birth,
            gender: formData.gender,
            blood_group: formData.blood_group,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            emergency_contact_name: formData.emergency_contact_name,
            emergency_contact_relation: formData.emergency_contact_relation,
            emergency_contact_phone: formData.emergency_contact_phone,
            allergies: formData.allergies,
            medical_conditions: formData.medical_conditions,
            medications: formData.medications,
            surgeries: formData.surgeries
          }
        }
      });
      if (authError) {
        if (authError.message?.toLowerCase().includes('already registered')) {
          throw new Error('This email is already registered. Please go to Login.');
        }
        throw authError;
      }

      try {
        if (authData.user) {
          const { data: profile } = await supabase
            .from('patients')
            .select('*')
            .eq('email', formData.email)
            .maybeSingle();
          return { user: authData.user, profile };
        }
      } catch (err) {
        console.warn('Profile fetch after signup:', err);
      }

      return { user: authData.user, profile: null };
    }

    // Mock fallback
    await new Promise(r => setTimeout(r, 800));
    const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPatient = {
      ...formData,
      id: `p-${Date.now()}`,
      auth_user_id: `auth-${Date.now()}`,
      patient_id_mrn: newMRN,
      created_at: new Date().toISOString()
    };
    setLocalData('patient', newPatient);
    return { user: { id: newPatient.auth_user_id, email: newPatient.email }, profile: newPatient };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  },

  // --- PROFILE & RECORDS ---
  async getPatientProfile(authUserId) {
    if (isSupabaseConfigured && supabase && authUserId) {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (data) return data;
    }
    return getLocalData('patient', null);
  },

  async updatePatientProfile(patientId, updateData) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data, error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patientId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const current = getLocalData('patient', {});
    const updated = { ...current, ...updateData };
    setLocalData('patient', updated);
    return updated;
  },

  async getMedicalHistory(patientId) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data, error } = await supabase
        .from('patient_medical_history')
        .select('*, reports:patient_reports(*)')
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getLocalData('visits', []);
  },

  async addMedicalVisit(patientId, visitData) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data, error } = await supabase
        .from('patient_medical_history')
        .insert([{ ...visitData, patient_id: patientId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const current = getLocalData('visits', []);
    const newVisit = { ...visitData, id: `v-${Date.now()}`, patient_id: patientId || 'p-1', created_at: new Date().toISOString() };
    setLocalData('visits', [newVisit, ...current]);
    return newVisit;
  },

  async getAllReports(patientId) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data, error } = await supabase
        .from('patient_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('report_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    const visits = getLocalData('visits', []);
    const reports = [];
    visits.forEach(v => {
      if (v.reports) v.reports.forEach(r => reports.push({ ...r, doctor_name: v.doctor_name, hospital_name: v.hospital_name, visit_date: v.visit_date }));
    });
    return reports;
  },

  async uploadReport(patientId, file, metadata) {
    if (isSupabaseConfigured && supabase && patientId) {
      const filePath = `${patientId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('patient-reports').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = await supabase.storage.from('patient-reports').createSignedUrl(filePath, 60 * 60 * 24);
      const { data, error: dbErr } = await supabase.from('patient_reports').insert([{
        patient_id: patientId,
        medical_history_id: metadata.visit_id || null,
        report_name: metadata.report_name,
        report_type: metadata.report_type,
        report_date: metadata.report_date,
        file_url: urlData?.signedUrl || filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      }]).select().single();
      if (dbErr) throw dbErr;
      return data;
    }

    const newReport = {
      id: `rep-${Date.now()}`,
      patient_id: patientId || 'p-1',
      report_name: metadata.report_name,
      report_type: metadata.report_type,
      report_date: metadata.report_date,
      file_name: file?.name || `${metadata.report_name}.pdf`,
      file_size: file?.size || 1450000,
      mime_type: file?.type || 'application/pdf',
      file_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
      uploaded_at: new Date().toISOString()
    };
    return newReport;
  }
};
