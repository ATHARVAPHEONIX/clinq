import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Persistent Local Data Helpers for Sandbox Mode
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone}`
      });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 600));
    return { mockOtp: '123456', message: 'OTP sent to mobile' };
  },

  async verifyPhoneOtp(phone, otp) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone}`,
        token: otp,
        type: 'sms'
      });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 600));
    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', phone }, session: { access_token: 'mock-token' } };
  },

  async sendEmailOtp(email) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 600));
    return { mockOtp: '123456', message: 'OTP sent to email' };
  },

  async verifyEmailOtp(email, otp) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 600));
    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', email }, session: { access_token: 'mock-token' } };
  },

  async loginWithPassword(email, password) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 500));
    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', email }, session: { access_token: 'mock-token' } };
  },

  async registerPatient(formData) {
    if (isSupabaseConfigured && supabase) {
      // 1. Create Auth user with full metadata so database trigger creates the profile
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
      if (authError) throw authError;

      // 2. Try to fetch or upsert the created patient profile
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
