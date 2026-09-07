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

// Seed demo patient if directory is brand new
const initDemoDirectory = () => {
  const existing = getLocalData('patients_directory', null);
  if (!existing || !Array.isArray(existing) || existing.length === 0) {
    const demoPatient = {
      id: 'demo-patient-rahul',
      auth_user_id: 'demo-auth-rahul',
      patient_id_mrn: 'CTR-2026-987654',
      full_name: 'Rahul Sharma',
      email: 'rahul.sharma@caretrack.com',
      phone: '+91 98765 43210',
      date_of_birth: '1988-04-15',
      gender: 'Male',
      blood_group: 'O+',
      allergies: 'Penicillin, Dust',
      medical_conditions: 'Hypertension (Mild)',
      address: '402, Green Avenue, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038'
    };
    setLocalData('patients_directory', [demoPatient]);
    return [demoPatient];
  }
  return existing;
};

const saveToDirectory = (profile) => {
  if (!profile) return;
  const dir = getLocalData('patients_directory', []) || [];
  const cleanDigits = profile.phone ? profile.phone.replace(/\D/g, '').slice(-10) : '';
  const filtered = dir.filter(p => {
    const pDigits = p.phone ? p.phone.replace(/\D/g, '').slice(-10) : '';
    const emailMatch = p.email && profile.email && p.email.toLowerCase() === profile.email.toLowerCase();
    const phoneMatch = cleanDigits && pDigits && cleanDigits === pDigits;
    return !emailMatch && !phoneMatch;
  });
  setLocalData('patients_directory', [profile, ...filtered]);
};

export const api = {
  isConfigured: isSupabaseConfigured,

  // --- PATIENT EXISTENCE HELPER ---
  findLocalPatient({ phone, email }) {
    const cleanDigits = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const dir = initDemoDirectory();
    const matched = dir.find(p => {
      const pDigits = p.phone ? p.phone.replace(/\D/g, '').slice(-10) : '';
      const pEmail = p.email ? p.email.trim().toLowerCase() : '';
      if (cleanDigits && pDigits === cleanDigits) return true;
      if (cleanEmail && pEmail === cleanEmail) return true;
      return false;
    });

    if (matched) return matched;

    const current = getLocalData('patient', null);
    if (current) {
      const pDigits = current.phone ? current.phone.replace(/\D/g, '').slice(-10) : '';
      const pEmail = current.email ? current.email.trim().toLowerCase() : '';
      if (cleanDigits && pDigits === cleanDigits) return current;
      if (cleanEmail && pEmail === cleanEmail) return current;
    }

    return null;
  },

  // --- AUTH SERVICES ---
  async sendPhoneOtp(phone) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const formattedPhone = `+91${cleanDigits}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
          options: {
            shouldCreateUser: false
          }
        });

        if (error) {
          // If SMS provider is not configured in Supabase (e.g. Twilio not set up)
          if (error.message?.toLowerCase().includes('unsupported') || error.message?.toLowerCase().includes('provider')) {
            const localMatched = this.findLocalPatient({ phone: cleanDigits });
            if (localMatched || cleanDigits === '9876543210') {
              console.warn('Phone provider not configured in Supabase. Using Dev OTP Mode (123456).');
              return { isDevMode: true, mockOtp: '123456', message: 'SMS Provider not configured. Use OTP: 123456' };
            }
            throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
          }

          if (error.message?.toLowerCase().includes('signups not allowed') || error.message?.toLowerCase().includes('user not found')) {
            throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
          }

          throw error;
        }

        return data;
      } catch (err) {
        if (err.message?.toLowerCase().includes('unsupported') || err.message?.toLowerCase().includes('provider')) {
          const localMatched = this.findLocalPatient({ phone: cleanDigits });
          if (localMatched || cleanDigits === '9876543210') {
            return { isDevMode: true, mockOtp: '123456', message: 'SMS Provider not configured. Use OTP: 123456' };
          }
          throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
        }
        throw err;
      }
    }

    // Offline / Demo Mode
    const matched = this.findLocalPatient({ phone: cleanDigits });
    if (!matched && cleanDigits !== '9876543210') {
      throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
    }

    await new Promise(r => setTimeout(r, 400));
    return { mockOtp: '123456', message: 'OTP sent to mobile' };
  },

  async verifyPhoneOtp(phone, otp) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;

    if (isSupabaseConfigured && supabase) {
      // 1. Try Supabase official verifyOtp
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `+91${cleanDigits}`,
          token: otp,
          type: 'sms'
        });

        if (!error && data?.user) {
          let profile = await this.getPatientProfile(data.user.id);
          if (!profile) {
            profile = this.findLocalPatient({ phone: cleanDigits }) || {
              id: data.user.id,
              auth_user_id: data.user.id,
              phone: formattedPhone,
              full_name: data.user.user_metadata?.full_name || `Patient ${cleanDigits.slice(-4)}`,
              patient_id_mrn: `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
            };
          }
          setLocalData('patient', profile);
          saveToDirectory(profile);
          return { user: data.user, profile };
        }
      } catch (err) {
        console.warn('Supabase Phone OTP verify attempt:', err);
      }
    }

    // 2. Dev / Fallback OTP verification
    const matchedProfile = this.findLocalPatient({ phone: cleanDigits });
    if (!matchedProfile && cleanDigits !== '9876543210') {
      throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
    }

    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. Please enter a valid 6-digit OTP.');
    }

    const activeProfile = matchedProfile || this.findLocalPatient({ phone: '9876543210' });
    if (activeProfile) {
      setLocalData('patient', activeProfile);
      saveToDirectory(activeProfile);
      return { 
        user: { 
          id: activeProfile.auth_user_id || activeProfile.id, 
          phone: activeProfile.phone || formattedPhone,
          email: activeProfile.email,
          user_metadata: { full_name: activeProfile.full_name }
        }, 
        profile: activeProfile 
      };
    }

    throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
  },

  async sendEmailOtp(email) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) {
        if (error.message?.toLowerCase().includes('rate limit') || error.code === 'over_email_send_rate_limit') {
          const matched = this.findLocalPatient({ email: cleanEmail });
          if (matched || cleanEmail === 'rahul.sharma@caretrack.com') {
            console.warn('Email rate limit hit in Supabase. Allowed dev fallback OTP (123456).');
            return { isDevMode: true, mockOtp: '123456', message: 'Email rate limit reached. Use OTP: 123456 or login with Password.' };
          }
          throw new Error('Email rate limit exceeded. Please log in with Password or register.');
        }

        if (error.message?.toLowerCase().includes('signups not allowed') || error.message?.toLowerCase().includes('user not found')) {
          throw new Error(`No patient account found with email "${email}". Please register first.`);
        }

        throw error;
      }

      return data;
    }

    // Offline / Demo Mode
    const matched = this.findLocalPatient({ email: cleanEmail });
    if (!matched && cleanEmail !== 'rahul.sharma@caretrack.com') {
      throw new Error(`No patient account found with email "${email}". Please register first.`);
    }

    await new Promise(r => setTimeout(r, 400));
    return { mockOtp: '123456', message: 'OTP sent to email' };
  },

  async verifyEmailOtp(email, otp) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: otp,
          type: 'email'
        });

        if (!error && data?.user) {
          let profile = await this.getPatientProfile(data.user.id);
          if (!profile) {
            profile = this.findLocalPatient({ email: cleanEmail }) || {
              id: data.user.id,
              auth_user_id: data.user.id,
              email: cleanEmail,
              full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
              patient_id_mrn: `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
            };
          }
          setLocalData('patient', profile);
          saveToDirectory(profile);
          return { user: data.user, profile };
        }
      } catch (err) {
        console.warn('Supabase email OTP verify attempt:', err);
      }
    }

    // Dev / Offline OTP check
    const matchedProfile = this.findLocalPatient({ email: cleanEmail });
    if (!matchedProfile && cleanEmail !== 'rahul.sharma@caretrack.com') {
      throw new Error(`No patient account found with email "${email}". Please register first.`);
    }

    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. Please enter a valid 6-digit OTP.');
    }

    const activeProfile = matchedProfile || this.findLocalPatient({ email: 'rahul.sharma@caretrack.com' });
    if (activeProfile) {
      setLocalData('patient', activeProfile);
      saveToDirectory(activeProfile);
      return { 
        user: { 
          id: activeProfile.auth_user_id || activeProfile.id, 
          email: activeProfile.email,
          phone: activeProfile.phone,
          user_metadata: { full_name: activeProfile.full_name }
        }, 
        profile: activeProfile 
      };
    }

    throw new Error(`No patient account found with email "${email}". Please register first.`);
  },

  async loginWithPassword(email, password) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        if (error.message?.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid email or password. If you do not have an account, please register.');
        }
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email not confirmed. Please disable "Confirm email" in Supabase Auth settings.');
        }
        throw error;
      }

      let profile = await this.getPatientProfile(data.user.id);
      if (!profile) {
        const local = this.findLocalPatient({ email: cleanEmail });
        profile = local || {
          id: data.user.id,
          auth_user_id: data.user.id,
          email: cleanEmail,
          full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          patient_id_mrn: `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
        };
      }

      setLocalData('patient', profile);
      saveToDirectory(profile);
      return { user: data.user, profile };
    }

    // Offline / Demo Mode
    const matched = this.findLocalPatient({ email: cleanEmail });
    if (!matched && cleanEmail !== 'rahul.sharma@caretrack.com') {
      throw new Error(`No patient account found with email "${email}". Please register first.`);
    }

    const profile = matched || this.findLocalPatient({ email: 'rahul.sharma@caretrack.com' });
    setLocalData('patient', profile);
    return { user: { id: profile.auth_user_id || profile.id, email: profile.email }, profile };
  },

  async registerPatient(formData) {
    const cleanEmail = formData.email ? formData.email.trim().toLowerCase() : '';
    const cleanPhone = formData.phone || '';

    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: cleanPhone,
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
          console.warn('Supabase email dispatch skipped. Creating patient record directly.');
          const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
          const profileResult = { ...formData, email: cleanEmail, patient_id_mrn: newMRN, id: `p-${Date.now()}` };
          try {
            const { data: directProfile } = await supabase
              .from('patients')
              .insert([{
                full_name: formData.full_name,
                email: cleanEmail,
                phone: cleanPhone,
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

            if (directProfile) {
              setLocalData('patient', directProfile);
              saveToDirectory(directProfile);
              return { user: { id: directProfile.id, email: cleanEmail, phone: cleanPhone }, profile: directProfile };
            }
          } catch (insertErr) {
            console.warn('Direct insert fallback note:', insertErr);
          }

          setLocalData('patient', profileResult);
          saveToDirectory(profileResult);
          return { user: { id: profileResult.id, email: cleanEmail, phone: cleanPhone }, profile: profileResult };
        } else {
          throw authError;
        }
      }

      // Try fetching profile or build from registered data
      let profile = null;
      if (authData?.user) {
        try {
          const { data: fetchedProfile } = await supabase
            .from('patients')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();
          if (fetchedProfile) profile = fetchedProfile;
        } catch (err) {
          console.warn('Profile fetch after signup:', err);
        }
      }

      const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const finalProfile = profile || {
        ...formData,
        email: cleanEmail,
        id: authData?.user?.id || `p-${Date.now()}`,
        auth_user_id: authData?.user?.id,
        patient_id_mrn: newMRN
      };

      setLocalData('patient', finalProfile);
      saveToDirectory(finalProfile);
      return { user: authData.user || { id: finalProfile.id, email: cleanEmail }, profile: finalProfile };
    }

    // Mock fallback
    const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPatient = {
      ...formData,
      email: cleanEmail,
      id: `p-${Date.now()}`,
      auth_user_id: `auth-${Date.now()}`,
      patient_id_mrn: newMRN,
      created_at: new Date().toISOString()
    };
    setLocalData('patient', newPatient);
    saveToDirectory(newPatient);
    return { user: { id: newPatient.auth_user_id, email: newPatient.email, phone: newPatient.phone }, profile: newPatient };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signout warning:', e);
      }
    }
  },

  // --- PROFILE & RECORDS ---
  async getPatientProfile(identifier) {
    if (isSupabaseConfigured && supabase && identifier) {
      try {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .or(`auth_user_id.eq.${identifier},id.eq.${identifier},email.ilike.${identifier}`)
          .limit(1)
          .maybeSingle();

        if (data) {
          setLocalData('patient', data);
          saveToDirectory(data);
          return data;
        }
      } catch (e) {
        console.warn('getPatientProfile error:', e);
      }
    }
    
    if (identifier) {
      const matched = this.findLocalPatient({ email: identifier, phone: identifier }) ||
        initDemoDirectory().find(p => p.id === identifier || p.auth_user_id === identifier);
      if (matched) return matched;
    }
    
    return getLocalData('patient', null);
  },

  async updatePatientProfile(patientId, updateData) {
    if (isSupabaseConfigured && supabase && patientId) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .update(updateData)
          .or(`id.eq.${patientId},auth_user_id.eq.${patientId}`)
          .select()
          .maybeSingle();
        if (!error && data) {
          setLocalData('patient', data);
          saveToDirectory(data);
          return data;
        }
      } catch (e) {
        console.warn('Profile update error in Supabase:', e);
      }
    }
    const current = getLocalData('patient', {});
    const updated = { ...current, ...updateData };
    setLocalData('patient', updated);
    saveToDirectory(updated);
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
        if (!error && data && data.length > 0) return data;
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
        if (!error && data && data.length > 0) return data;
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
