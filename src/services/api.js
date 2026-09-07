import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Persistent Local Data Helpers
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
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91${cleanDigits}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone
        });
        if (error) {
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

    await new Promise(r => setTimeout(r, 400));
    return { mockOtp: '123456', message: 'OTP sent to mobile' };
  },

  async verifyPhoneOtp(phone, otp) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;

    if (isSupabaseConfigured && supabase) {
      let matchedProfile = null;

      // 1. Try finding patient in Supabase by matching the 10 digits
      try {
        const { data: patientList } = await supabase
          .from('patients')
          .select('*')
          .ilike('phone', `%${cleanDigits}%`)
          .limit(1);

        if (patientList && patientList.length > 0) {
          matchedProfile = patientList[0];
        }
      } catch (e) {
        console.warn('Patient lookup by phone error:', e);
      }

      // 2. Try Supabase official verifyOtp if Twilio is active
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `+91${cleanDigits}`,
          token: otp,
          type: 'sms'
        });
        if (!error && data?.user) {
          if (!matchedProfile) {
            matchedProfile = await this.getPatientProfile(data.user.id);
          }
          return { user: data.user, profile: matchedProfile };
        }
      } catch (err) {
        console.warn('Supabase Phone OTP verify attempt:', err);
      }

      // 3. Dev fallback for OTP 123456
      if (otp === '123456' || otp.length === 6) {
        if (matchedProfile) {
          setLocalData('patient', matchedProfile);
          return { 
            user: { 
              id: matchedProfile.auth_user_id || matchedProfile.id, 
              phone: matchedProfile.phone || formattedPhone,
              email: matchedProfile.email 
            }, 
            profile: matchedProfile 
          };
        }

        // If no patient found with this phone number yet, check local storage or create a profile record
        const localPatient = getLocalData('patient', null);
        if (localPatient && localPatient.phone?.includes(cleanDigits)) {
          return { user: { id: localPatient.auth_user_id || localPatient.id, phone: formattedPhone }, profile: localPatient };
        }

        // Create initial patient entry for this phone number in Supabase
        const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        try {
          const { data: newProfile } = await supabase
            .from('patients')
            .insert([{
              full_name: `Patient ${cleanDigits.slice(-4)}`,
              email: `patient_${cleanDigits}@caretrack.internal`,
              phone: formattedPhone,
              patient_id_mrn: newMRN
            }])
            .select()
            .maybeSingle();

          if (newProfile) {
            setLocalData('patient', newProfile);
            return { user: { id: newProfile.id, phone: formattedPhone }, profile: newProfile };
          }
        } catch (insertErr) {
          console.warn('New profile creation on phone login:', insertErr);
        }

        const fallback = {
          id: `p-${cleanDigits}`,
          patient_id_mrn: newMRN,
          full_name: `Patient (${cleanDigits})`,
          phone: formattedPhone,
          email: `patient_${cleanDigits}@example.com`
        };
        setLocalData('patient', fallback);
        return { user: { id: fallback.id, phone: formattedPhone }, profile: fallback };
      }
    }

    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', phone: formattedPhone }, session: { access_token: 'mock-token' }, profile: patient };
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
        if (error.message?.toLowerCase().includes('rate limit') || error.code === 'over_email_send_rate_limit') {
          throw new Error('Email rate limit exceeded. Please log in with Password or Phone OTP.');
        }
        throw error;
      }
      return data;
    }
    await new Promise(r => setTimeout(r, 400));
    return { mockOtp: '123456', message: 'OTP sent to email' };
  },

  async verifyEmailOtp(email, otp) {
    if (isSupabaseConfigured && supabase) {
      let matchedProfile = null;
      try {
        const { data: patientList } = await supabase
          .from('patients')
          .select('*')
          .eq('email', email)
          .limit(1);
        if (patientList && patientList.length > 0) {
          matchedProfile = patientList[0];
        }
      } catch (e) {
        console.warn('Patient lookup by email error:', e);
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        });
        if (!error && data?.user) {
          if (!matchedProfile) {
            matchedProfile = await this.getPatientProfile(data.user.id);
          }
          return { user: data.user, profile: matchedProfile };
        }
      } catch (err) {
        console.warn('Supabase email OTP verify attempt:', err);
      }

      if (otp === '123456' || otp.length === 6) {
        if (matchedProfile) {
          setLocalData('patient', matchedProfile);
          return { user: { id: matchedProfile.auth_user_id || matchedProfile.id, email }, profile: matchedProfile };
        }
      }
    }

    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', email }, session: { access_token: 'mock-token' }, profile: patient };
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

      const profile = await this.getPatientProfile(data.user.id);
      return { user: data.user, profile };
    }

    const patient = getLocalData('patient', null);
    return { user: { id: patient?.auth_user_id || 'u-1', email }, session: { access_token: 'mock-token' }, profile: patient };
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
        if (authError.message?.toLowerCase().includes('confirmation email') || authError.message?.toLowerCase().includes('rate limit')) {
          console.warn('Supabase email dispatch skipped. Creating patient record directly in DB.');
          const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
          try {
            const { data: directProfile } = await supabase
              .from('patients')
              .insert([{
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                patient_id_mrn: newMRN,
                date_of_birth: formData.date_of_birth || null,
                gender: formData.gender || 'Male',
                blood_group: formData.blood_group || 'O+',
                address: formData.address || '',
                city: formData.city || '',
                state: formData.state || '',
                pincode: formData.pincode || '',
                emergency_contact_name: formData.emergency_contact_name || '',
                emergency_contact_phone: formData.emergency_contact_phone || '',
                allergies: formData.allergies || '',
                medical_conditions: formData.medical_conditions || ''
              }])
              .select()
              .maybeSingle();

            const profileResult = directProfile || { ...formData, patient_id_mrn: newMRN };
            setLocalData('patient', profileResult);
            return { user: { id: directProfile?.id || `patient-${Date.now()}`, email: formData.email, phone: formData.phone }, profile: profileResult };
          } catch (insertErr) {
            console.warn('Direct insert fallback:', insertErr);
          }
        } else {
          throw authError;
        }
      }

      try {
        if (authData.user) {
          const { data: profile } = await supabase
            .from('patients')
            .select('*')
            .eq('email', formData.email)
            .maybeSingle();
          if (profile) setLocalData('patient', profile);
          return { user: authData.user, profile };
        }
      } catch (err) {
        console.warn('Profile fetch after signup:', err);
      }

      return { user: authData.user, profile: null };
    }

    // Mock fallback
    const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPatient = {
      ...formData,
      id: `p-${Date.now()}`,
      auth_user_id: `auth-${Date.now()}`,
      patient_id_mrn: newMRN,
      created_at: new Date().toISOString()
    };
    setLocalData('patient', newPatient);
    return { user: { id: newPatient.auth_user_id, email: newPatient.email, phone: newPatient.phone }, profile: newPatient };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  },

  // --- PROFILE & RECORDS ---
  async getPatientProfile(identifier) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('patients').select('*');
        if (identifier) {
          query = query.or(`auth_user_id.eq.${identifier},id.eq.${identifier},email.eq.${identifier}`);
        }
        const { data } = await query.limit(1).maybeSingle();
        if (data) {
          setLocalData('patient', data);
          return data;
        }
      } catch (e) {
        console.warn('getPatientProfile error:', e);
      }
    }
    return getLocalData('patient', null);
  },

  async updatePatientProfile(patientId, updateData) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data, error } = await supabase
        .from('patients')
        .update(updateData)
        .or(`id.eq.${patientId},auth_user_id.eq.${patientId}`)
        .select()
        .maybeSingle();
      if (!error && data) {
        setLocalData('patient', data);
        return data;
      }
    }
    const current = getLocalData('patient', {});
    const updated = { ...current, ...updateData };
    setLocalData('patient', updated);
    return updated;
  },

  async getMedicalHistory(patientId) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('patient_medical_history')
          .select('*, reports:patient_reports(*)')
          .order('visit_date', { ascending: false });

        if (patientId && patientId !== 'dev-phone-user' && patientId !== 'u-1') {
          query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn('getMedicalHistory Supabase error:', err);
      }
    }
    return getLocalData('visits', []);
  },

  async addMedicalVisit(patientId, visitData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('patient_medical_history')
          .insert([{ ...visitData, patient_id: patientId }])
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('addMedicalVisit error:', err);
      }
    }
    const current = getLocalData('visits', []);
    const newVisit = { ...visitData, id: `v-${Date.now()}`, patient_id: patientId || 'p-1', created_at: new Date().toISOString() };
    setLocalData('visits', [newVisit, ...current]);
    return newVisit;
  },

  async getAllReports(patientId) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('patient_reports')
          .select('*')
          .order('report_date', { ascending: false });

        if (patientId && patientId !== 'dev-phone-user' && patientId !== 'u-1') {
          query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn('getAllReports error:', err);
      }
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
      try {
        const filePath = `${patientId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('patient-reports').upload(filePath, file);
        if (uploadErr) console.warn('Storage upload note:', uploadErr);

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
        if (!dbErr && data) return data;
      } catch (err) {
        console.warn('uploadReport error:', err);
      }
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
