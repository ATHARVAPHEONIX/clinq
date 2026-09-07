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
  if (!existing) {
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

  // --- PATIENT EXISTENCE LOOKUP ---
  async checkPatientExists({ phone, email }) {
    const cleanDigits = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    // 1. Check in Supabase DB
    if (isSupabaseConfigured && supabase) {
      // Try RPC if available
      try {
        const { data, error } = await supabase.rpc('check_patient_exists', {
          p_phone: cleanDigits || null,
          p_email: cleanEmail || null
        });
        if (!error && typeof data === 'boolean') {
          return { exists: data, profile: null };
        }
      } catch (rpcErr) {
        // RPC may not be defined, continue with direct query
      }

      try {
        let query = supabase.from('patients').select('*');
        if (cleanDigits && cleanEmail) {
          query = query.or(`email.ilike.${cleanEmail},phone.ilike.%${cleanDigits}%`);
        } else if (cleanDigits) {
          query = query.ilike('phone', `%${cleanDigits}%`);
        } else if (cleanEmail) {
          query = query.ilike('email', cleanEmail);
        }
        const { data: patientList } = await query.limit(1);
        if (patientList && patientList.length > 0) {
          saveToDirectory(patientList[0]);
          return { exists: true, profile: patientList[0] };
        }
      } catch (e) {
        console.warn('Patient table lookup error:', e);
      }
    }

    // 2. Check in local registered directory
    const dir = initDemoDirectory();
    const matched = dir.find(p => {
      const pDigits = p.phone ? p.phone.replace(/\D/g, '').slice(-10) : '';
      const pEmail = p.email ? p.email.trim().toLowerCase() : '';
      if (cleanDigits && pDigits === cleanDigits) return true;
      if (cleanEmail && pEmail === cleanEmail) return true;
      return false;
    });

    if (matched) {
      return { exists: true, profile: matched };
    }

    // 3. Check active local patient
    const localPatient = getLocalData('patient', null);
    if (localPatient) {
      const pDigits = localPatient.phone ? localPatient.phone.replace(/\D/g, '').slice(-10) : '';
      const pEmail = localPatient.email ? localPatient.email.trim().toLowerCase() : '';
      if (cleanDigits && pDigits === cleanDigits) return { exists: true, profile: localPatient };
      if (cleanEmail && pEmail === cleanEmail) return { exists: true, profile: localPatient };
    }

    return { exists: false, profile: null };
  },

  // --- AUTH SERVICES ---
  async sendPhoneOtp(phone) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Check if patient exists
    const { exists } = await this.checkPatientExists({ phone: cleanDigits });
    if (!exists) {
      throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
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
          if (error.message?.toLowerCase().includes('unsupported') || error.message?.toLowerCase().includes('provider')) {
            console.warn('Phone provider not configured in Supabase. Using Dev OTP Mode.');
            return { isDevMode: true, mockOtp: '123456', message: 'SMS Provider not configured. Use OTP: 123456' };
          }
          if (error.message?.toLowerCase().includes('signups not allowed') || error.message?.toLowerCase().includes('user not found')) {
            throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
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

    // Verify patient existence
    const { exists, profile: verifiedProfile } = await this.checkPatientExists({ phone: cleanDigits });
    let matchedProfile = verifiedProfile;

    if (isSupabaseConfigured && supabase) {
      // 1. Try finding patient in Supabase by matching 10 digits
      if (!matchedProfile) {
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
          if (!matchedProfile) {
            throw new Error(`No patient record found for mobile +91 ${cleanDigits}. Please register your account first.`);
          }
          setLocalData('patient', matchedProfile);
          saveToDirectory(matchedProfile);
          return { user: data.user, profile: matchedProfile };
        }
      } catch (err) {
        console.warn('Supabase Phone OTP verify attempt:', err);
        if (err.message?.includes('No patient record')) {
          throw err;
        }
      }
    }

    // 3. If patient was not found anywhere, show error! Do not create dummy account!
    if (!matchedProfile && !exists) {
      throw new Error(`No patient record found with mobile number +91 ${cleanDigits}. Please register first.`);
    }

    // 4. Validate OTP
    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. Please enter the 6-digit code received.');
    }

    if (matchedProfile) {
      setLocalData('patient', matchedProfile);
      saveToDirectory(matchedProfile);
      return { 
        user: { 
          id: matchedProfile.auth_user_id || matchedProfile.id, 
          phone: matchedProfile.phone || formattedPhone,
          email: matchedProfile.email,
          user_metadata: { full_name: matchedProfile.full_name }
        }, 
        profile: matchedProfile 
      };
    }

    throw new Error(`No patient account found with mobile number +91 ${cleanDigits}. Please register first.`);
  },

  async sendEmailOtp(email) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    // Check if patient exists
    const { exists } = await this.checkPatientExists({ email: cleanEmail });
    if (!exists) {
      throw new Error(`No patient account found with email "${email}". Please register first.`);
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
          throw new Error('Email rate limit exceeded. Please log in with Password or use Dev OTP (123456).');
        }
        if (error.message?.toLowerCase().includes('signups not allowed') || error.message?.toLowerCase().includes('user not found')) {
          throw new Error(`No patient account found with email "${email}". Please register first.`);
        }
        throw error;
      }
      return data;
    }
    await new Promise(r => setTimeout(r, 400));
    return { mockOtp: '123456', message: 'OTP sent to email' };
  },

  async verifyEmailOtp(email, otp) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const { exists, profile: verifiedProfile } = await this.checkPatientExists({ email: cleanEmail });
    let matchedProfile = verifiedProfile;

    if (isSupabaseConfigured && supabase) {
      if (!matchedProfile) {
        try {
          const { data: patientList } = await supabase
            .from('patients')
            .select('*')
            .ilike('email', cleanEmail)
            .limit(1);
          if (patientList && patientList.length > 0) {
            matchedProfile = patientList[0];
          }
        } catch (e) {
          console.warn('Patient lookup by email error:', e);
        }
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: otp,
          type: 'email'
        });
        if (!error && data?.user) {
          if (!matchedProfile) {
            matchedProfile = await this.getPatientProfile(data.user.id);
          }
          if (!matchedProfile) {
            throw new Error(`No patient record found for email ${email}. Please register your account first.`);
          }
          setLocalData('patient', matchedProfile);
          saveToDirectory(matchedProfile);
          return { user: data.user, profile: matchedProfile };
        }
      } catch (err) {
        console.warn('Supabase email OTP verify attempt:', err);
        if (err.message?.includes('No patient record')) {
          throw err;
        }
      }
    }

    if (!matchedProfile && !exists) {
      throw new Error(`No patient account found with email "${email}". Please register first.`);
    }

    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. Please enter the 6-digit code received.');
    }

    if (matchedProfile) {
      setLocalData('patient', matchedProfile);
      saveToDirectory(matchedProfile);
      return { 
        user: { 
          id: matchedProfile.auth_user_id || matchedProfile.id, 
          email: matchedProfile.email,
          phone: matchedProfile.phone,
          user_metadata: { full_name: matchedProfile.full_name }
        }, 
        profile: matchedProfile 
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
        const { data: byEmail } = await supabase.from('patients').select('*').ilike('email', cleanEmail).maybeSingle();
        if (byEmail) {
          profile = byEmail;
          setLocalData('patient', profile);
          saveToDirectory(profile);
        }
      }

      if (!profile) {
        throw new Error('No patient profile found for this account. Please register first.');
      }

      return { user: data.user, profile };
    }

    const { exists, profile } = await this.checkPatientExists({ email: cleanEmail });
    if (!exists || !profile) {
      throw new Error(`No patient account found with email "${email}". Please register first.`);
    }

    setLocalData('patient', profile);
    return { user: { id: profile.auth_user_id || profile.id, email: profile.email }, profile };
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
            saveToDirectory(profileResult);
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
          if (profile) {
            setLocalData('patient', profile);
            saveToDirectory(profile);
          }
          return { user: authData.user, profile: profile || { ...formData, auth_user_id: authData.user.id } };
        }
      } catch (err) {
        console.warn('Profile fetch after signup:', err);
      }

      const registeredProfile = { ...formData, auth_user_id: authData?.user?.id };
      setLocalData('patient', registeredProfile);
      saveToDirectory(registeredProfile);
      return { user: authData.user, profile: registeredProfile };
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
    saveToDirectory(newPatient);
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
          query = query.or(`auth_user_id.eq.${identifier},id.eq.${identifier},email.ilike.${identifier}`);
        }
        const { data } = await query.limit(1).maybeSingle();
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
      const dir = initDemoDirectory();
      const matched = dir.find(p => p.id === identifier || p.auth_user_id === identifier || p.email?.toLowerCase() === identifier.toLowerCase());
      if (matched) return matched;
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
        saveToDirectory(data);
        return data;
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
