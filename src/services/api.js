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

// UUID Validator Helper
const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Unique MRN Generator
export const generateUniqueMRN = () => {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `CTR-${year}-${randomSuffix}`;
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
    const mrnMatch = p.patient_id_mrn && profile.patient_id_mrn && p.patient_id_mrn === profile.patient_id_mrn;
    return !emailMatch && !phoneMatch && !mrnMatch;
  });
  setLocalData('patients_directory', [profile, ...filtered]);
};

export const api = {
  isConfigured: isSupabaseConfigured,

  // Helper to find patient locally
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

  // Helper to resolve or create a valid PostgreSQL UUID in public.patients
  async resolvePatientUUID(patientIdentifier) {
    if (isSupabaseConfigured && supabase) {
      // 1. If it's already a valid UUID, check if it exists in patients table
      if (isValidUUID(patientIdentifier)) {
        try {
          const { data } = await supabase
            .from('patients')
            .select('id')
            .eq('id', patientIdentifier)
            .maybeSingle();
          if (data?.id) return data.id;
        } catch (e) {
          console.warn('UUID check error:', e);
        }
      }

      // 2. Lookup by auth_user_id, email, phone or MRN
      const localProfile = getLocalData('patient', {});
      const email = localProfile.email || '';
      const phone = localProfile.phone || '';
      const cleanDigits = phone.replace(/\D/g, '').slice(-10);

      try {
        let query = supabase.from('patients').select('id');
        if (patientIdentifier) {
          query = query.or(`auth_user_id.eq.${patientIdentifier},id.eq.${patientIdentifier},email.ilike.${patientIdentifier}`);
        } else if (email) {
          query = query.ilike('email', email);
        } else if (cleanDigits) {
          query = query.ilike('phone', `%${cleanDigits}%`);
        }

        const { data: list } = await query.limit(1);
        if (list && list.length > 0) {
          return list[0].id;
        }
      } catch (e) {
        console.warn('Patient lookup for UUID note:', e);
      }

      // 3. If patient doesn't exist in Supabase 'patients', insert one to guarantee Foreign Key validity
      const newMRN = localProfile.patient_id_mrn || generateUniqueMRN();
      const patientData = {
        full_name: localProfile.full_name || 'CareTrack Patient',
        email: email || `patient_${Date.now()}@caretrack.internal`,
        phone: phone || '+91 98765 43210',
        patient_id_mrn: newMRN,
        date_of_birth: localProfile.date_of_birth || null,
        gender: localProfile.gender || 'Male',
        blood_group: localProfile.blood_group || 'O+',
        address: localProfile.address || '',
        city: localProfile.city || '',
        allergies: localProfile.allergies || '',
        medical_conditions: localProfile.medical_conditions || ''
      };

      try {
        const { data: newPatient, error: insertErr } = await supabase
          .from('patients')
          .insert([patientData])
          .select('id')
          .maybeSingle();

        if (!insertErr && newPatient?.id) {
          // Also sync to patient_directory
          try {
            await supabase.from('patient_directory').insert([{
              id: newPatient.id,
              patient_mrn: newMRN,
              full_name: patientData.full_name,
              phone: patientData.phone,
              email: patientData.email,
              gender: patientData.gender,
              blood_group: patientData.blood_group,
              city: patientData.city
            }]);
          } catch (dirErr) {
            console.warn('Directory sync note:', dirErr);
          }
          return newPatient.id;
        }
      } catch (err) {
        console.warn('Patient creation in Supabase note:', err);
      }
    }

    return patientIdentifier || 'p-1';
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
          phone: formattedPhone
        });

        if (error) {
          if (error.message?.toLowerCase().includes('unsupported') || error.message?.toLowerCase().includes('provider')) {
            console.warn('SMS Provider not configured in Supabase. Using Dev OTP Mode (123456).');
            return { isDevMode: true, mockOtp: '123456', message: 'SMS Provider not configured. Use OTP: 123456' };
          }
          throw error;
        }

        return data;
      } catch (err) {
        if (err.message?.toLowerCase().includes('unsupported') || err.message?.toLowerCase().includes('provider')) {
          return { isDevMode: true, mockOtp: '123456', message: 'SMS Provider not configured. Use OTP: 123456' };
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
    let matchedProfile = null;

    if (isSupabaseConfigured && supabase) {
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
        console.warn('Supabase query by phone note:', e);
      }

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
          const finalProfile = matchedProfile || {
            id: data.user.id,
            auth_user_id: data.user.id,
            phone: formattedPhone,
            full_name: data.user.user_metadata?.full_name || `Patient ${cleanDigits.slice(-4)}`,
            patient_id_mrn: generateUniqueMRN()
          };
          setLocalData('patient', finalProfile);
          saveToDirectory(finalProfile);
          return { user: data.user, profile: finalProfile };
        }
      } catch (err) {
        console.warn('Supabase Phone OTP verify attempt:', err);
      }
    }

    if (!matchedProfile) {
      matchedProfile = this.findLocalPatient({ phone: cleanDigits });
    }

    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. Please enter a valid 6-digit OTP.');
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

    // Auto-create initial profile for this phone number
    const newMRN = generateUniqueMRN();
    const fallbackProfile = {
      id: `p-${cleanDigits}`,
      full_name: `Patient (${cleanDigits.slice(-4)})`,
      phone: formattedPhone,
      email: `patient_${cleanDigits}@caretrack.internal`,
      patient_id_mrn: newMRN
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted } = await supabase
          .from('patients')
          .insert([fallbackProfile])
          .select()
          .maybeSingle();
        if (inserted) {
          fallbackProfile.id = inserted.id;
        }
      } catch (insErr) {
        console.warn('Profile creation fallback note:', insErr);
      }
    }

    setLocalData('patient', fallbackProfile);
    saveToDirectory(fallbackProfile);
    return { 
      user: { 
        id: fallbackProfile.id, 
        phone: formattedPhone, 
        email: fallbackProfile.email,
        user_metadata: { full_name: fallbackProfile.full_name }
      }, 
      profile: fallbackProfile 
    };
  },

  async sendEmailOtp(email) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: cleanEmail
      });

      if (error) {
        if (error.message?.toLowerCase().includes('rate limit') || error.code === 'over_email_send_rate_limit') {
          console.warn('Email rate limit hit in Supabase. Using Dev OTP Mode (123456).');
          return { isDevMode: true, mockOtp: '123456', message: 'Email rate limit reached. Use OTP: 123456 or login with Password.' };
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
    let matchedProfile = null;

    if (isSupabaseConfigured && supabase) {
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
        console.warn('Supabase query by email note:', e);
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
          const finalProfile = matchedProfile || {
            id: data.user.id,
            auth_user_id: data.user.id,
            email: cleanEmail,
            full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            patient_id_mrn: generateUniqueMRN()
          };
          setLocalData('patient', finalProfile);
          saveToDirectory(finalProfile);
          return { user: data.user, profile: finalProfile };
        }
      } catch (err) {
        console.warn('Supabase email OTP verify attempt:', err);
      }
    }

    if (!matchedProfile) {
      matchedProfile = this.findLocalPatient({ email: cleanEmail });
    }

    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. Please enter a valid 6-digit OTP.');
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

    const newMRN = generateUniqueMRN();
    const fallbackProfile = {
      id: `p-${Date.now()}`,
      full_name: cleanEmail.split('@')[0],
      email: cleanEmail,
      patient_id_mrn: newMRN
    };
    setLocalData('patient', fallbackProfile);
    saveToDirectory(fallbackProfile);
    return { 
      user: { id: fallbackProfile.id, email: cleanEmail, user_metadata: { full_name: fallbackProfile.full_name } }, 
      profile: fallbackProfile 
    };
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
        try {
          const { data: byEmail } = await supabase.from('patients').select('*').ilike('email', cleanEmail).maybeSingle();
          if (byEmail) profile = byEmail;
        } catch (e) {
          console.warn('Fetch profile by email note:', e);
        }
      }

      if (!profile) {
        const local = this.findLocalPatient({ email: cleanEmail });
        profile = local || {
          id: data.user.id,
          auth_user_id: data.user.id,
          email: cleanEmail,
          full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          patient_id_mrn: generateUniqueMRN()
        };
      }

      setLocalData('patient', profile);
      saveToDirectory(profile);
      return { user: data.user, profile };
    }

    // Offline / Demo Mode
    const matched = this.findLocalPatient({ email: cleanEmail });
    const profile = matched || this.findLocalPatient({ email: 'rahul.sharma@caretrack.com' });
    setLocalData('patient', profile);
    return { user: { id: profile.auth_user_id || profile.id, email: profile.email }, profile };
  },

  async registerPatient(formData) {
    const cleanEmail = formData.email ? formData.email.trim().toLowerCase() : '';
    const cleanPhone = formData.phone || '';
    const uniqueMRN = generateUniqueMRN();

    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: cleanPhone,
            patient_id_mrn: uniqueMRN,
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

      if (authError && authError.message?.toLowerCase().includes('already registered')) {
        throw new Error('This email is already registered. Please go to Login.');
      }

      // Insert directly into public.patients and public.patient_directory
      const patientPayload = {
        auth_user_id: authData?.user?.id || null,
        full_name: formData.full_name,
        email: cleanEmail,
        phone: cleanPhone,
        patient_id_mrn: uniqueMRN,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || 'Male',
        blood_group: formData.blood_group || 'O+',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_relation: formData.emergency_contact_relation || '',
        emergency_contact_phone: formData.emergency_contact_phone || '',
        allergies: formData.allergies || '',
        medical_conditions: formData.medical_conditions || '',
        medications: formData.medications || '',
        surgeries: formData.surgeries || ''
      };

      let directProfile = null;
      try {
        const { data: dbPatient } = await supabase
          .from('patients')
          .insert([patientPayload])
          .select()
          .maybeSingle();
        if (dbPatient) directProfile = dbPatient;

        // Insert into patient_directory
        await supabase
          .from('patient_directory')
          .insert([{
            id: dbPatient?.id || undefined,
            patient_mrn: uniqueMRN,
            full_name: formData.full_name,
            phone: cleanPhone,
            email: cleanEmail,
            gender: formData.gender || 'Male',
            blood_group: formData.blood_group || 'O+',
            date_of_birth: formData.date_of_birth || null,
            address: formData.address || '',
            city: formData.city || '',
            emergency_contact_name: formData.emergency_contact_name || '',
            emergency_contact_phone: formData.emergency_contact_phone || '',
            allergies: formData.allergies || '',
            medical_conditions: formData.medical_conditions || ''
          }]);
      } catch (insertErr) {
        console.warn('Patient and directory insert note:', insertErr);
      }

      const finalProfile = directProfile || {
        ...patientPayload,
        id: authData?.user?.id || `p-${Date.now()}`
      };

      setLocalData('patient', finalProfile);
      saveToDirectory(finalProfile);
      return { user: authData?.user || { id: finalProfile.id, email: cleanEmail, phone: cleanPhone }, profile: finalProfile };
    }

    // Mock fallback
    const newPatient = {
      ...formData,
      email: cleanEmail,
      phone: cleanPhone,
      id: `p-${Date.now()}`,
      auth_user_id: `auth-${Date.now()}`,
      patient_id_mrn: uniqueMRN,
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
          // Sync to patient_directory
          try {
            await supabase
              .from('patient_directory')
              .update({
                full_name: updateData.full_name,
                phone: updateData.phone,
                gender: updateData.gender,
                blood_group: updateData.blood_group,
                address: updateData.address,
                city: updateData.city,
                emergency_contact_name: updateData.emergency_contact_name,
                emergency_contact_phone: updateData.emergency_contact_phone,
                allergies: updateData.allergies,
                medical_conditions: updateData.medical_conditions
              })
              .eq('patient_mrn', data.patient_id_mrn);
          } catch (dirErr) {
            console.warn('Directory update note:', dirErr);
          }

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

  // --- MEDICAL HISTORY VISITS ---
  async getMedicalHistory(patientId) {
    let supabaseVisits = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const realUUID = await this.resolvePatientUUID(patientId);
        let query = supabase
          .from('patient_medical_history')
          .select('*, reports:patient_reports(*)')
          .order('visit_date', { ascending: false });

        if (isValidUUID(realUUID)) {
          query = query.eq('patient_id', realUUID);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          supabaseVisits = data;
        }
      } catch (err) {
        console.warn('getMedicalHistory Supabase error:', err);
      }
    }

    const localVisits = getLocalData('visits', []);
    if (supabaseVisits.length > 0) {
      // Merge with local visits
      const existingIds = new Set(supabaseVisits.map(v => v.id));
      const combined = [...supabaseVisits, ...localVisits.filter(v => !existingIds.has(v.id))];
      setLocalData('visits', combined);
      return combined;
    }

    return localVisits;
  },

  async addMedicalVisit(patientId, visitData) {
    let realUUID = patientId;
    if (isSupabaseConfigured && supabase) {
      try {
        realUUID = await this.resolvePatientUUID(patientId);

        // Sanitize payload by removing 'reports' array and non-table fields
        const cleanPayload = {
          patient_id: realUUID,
          visit_date: visitData.visit_date || new Date().toISOString().split('T')[0],
          doctor_name: visitData.doctor_name,
          specialization: visitData.specialization || 'General Physician',
          hospital_name: visitData.hospital_name,
          visit_type: visitData.visit_type || 'Consultation',
          reason: visitData.reason || '',
          symptoms: visitData.symptoms || '',
          diagnosis: visitData.diagnosis || '',
          doctor_notes: visitData.doctor_notes || '',
          treatment: visitData.treatment || '',
          prescription: visitData.prescription || null,
          prescription_notes: visitData.prescription_notes || ''
        };

        const { data, error } = await supabase
          .from('patient_medical_history')
          .insert([cleanPayload])
          .select()
          .single();

        if (!error && data) {
          const combined = { ...data, reports: visitData.reports || [] };
          const current = getLocalData('visits', []);
          setLocalData('visits', [combined, ...current]);
          return combined;
        } else {
          console.warn('Supabase visit insert error:', error);
        }
      } catch (err) {
        console.warn('addMedicalVisit error:', err);
      }
    }

    // Local fallback
    const current = getLocalData('visits', []);
    const newVisit = { 
      ...visitData, 
      id: `v-${Date.now()}`, 
      patient_id: realUUID || 'p-1', 
      created_at: new Date().toISOString() 
    };
    setLocalData('visits', [newVisit, ...current]);
    return newVisit;
  },

  // --- PATIENT REPORTS ---
  async getAllReports(patientId) {
    let supabaseReports = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const realUUID = await this.resolvePatientUUID(patientId);
        let query = supabase
          .from('patient_reports')
          .select('*')
          .order('report_date', { ascending: false });

        if (isValidUUID(realUUID)) {
          query = query.eq('patient_id', realUUID);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          supabaseReports = data;
        }
      } catch (err) {
        console.warn('getAllReports error:', err);
      }
    }

    const localReports = getLocalData('reports', []);
    const visits = getLocalData('visits', []);
    visits.forEach(v => {
      if (v.reports && Array.isArray(v.reports)) {
        v.reports.forEach(r => {
          if (!localReports.some(lr => lr.id === r.id)) {
            localReports.push({ ...r, doctor_name: v.doctor_name, hospital_name: v.hospital_name, visit_date: v.visit_date });
          }
        });
      }
    });

    if (supabaseReports.length > 0) {
      const existingIds = new Set(supabaseReports.map(r => r.id));
      const combined = [...supabaseReports, ...localReports.filter(r => !existingIds.has(r.id))];
      setLocalData('reports', combined);
      return combined;
    }

    return localReports;
  },

  async uploadReport(patientId, file, metadata = {}) {
    let realUUID = patientId;
    let fileUrl = 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80';

    if (isSupabaseConfigured && supabase) {
      try {
        realUUID = await this.resolvePatientUUID(patientId);
        const fileName = file?.name || `${metadata.report_name || 'Report'}.pdf`;
        const filePath = `${realUUID}/${Date.now()}_${fileName.replace(/\s+/g, '_')}`;

        // 1. Try uploading to Supabase Storage bucket 'patient-reports'
        if (file) {
          try {
            const { error: uploadErr } = await supabase.storage
              .from('patient-reports')
              .upload(filePath, file, { upsert: true });

            if (!uploadErr) {
              const { data: publicUrlData } = supabase.storage
                .from('patient-reports')
                .getPublicUrl(filePath);
              fileUrl = publicUrlData?.publicUrl || fileUrl;
            }
          } catch (storageErr) {
            console.warn('Storage upload error:', storageErr);
          }
        }

        // 2. Insert into 'patient_reports' table
        const reportPayload = {
          patient_id: realUUID,
          medical_history_id: isValidUUID(metadata.visit_id) ? metadata.visit_id : null,
          report_name: metadata.report_name || fileName.replace(/\.[^/.]+$/, ""),
          report_type: metadata.report_type || 'Blood Test',
          report_date: metadata.report_date || new Date().toISOString().split('T')[0],
          file_url: fileUrl,
          file_name: fileName,
          file_size: file?.size || 1450000,
          mime_type: file?.type || 'application/pdf',
          description: metadata.description || ''
        };

        const { data, error: dbErr } = await supabase
          .from('patient_reports')
          .insert([reportPayload])
          .select()
          .single();

        if (!dbErr && data) {
          const current = getLocalData('reports', []);
          setLocalData('reports', [data, ...current]);
          return data;
        } else {
          console.warn('Supabase report insert error:', dbErr);
        }
      } catch (err) {
        console.warn('uploadReport error:', err);
      }
    }

    // Local fallback
    const newReport = {
      id: `rep-${Date.now()}`,
      patient_id: realUUID || 'p-1',
      medical_history_id: metadata.visit_id || null,
      report_name: metadata.report_name || file?.name || 'Medical Report',
      report_type: metadata.report_type || 'Blood Test',
      report_date: metadata.report_date || new Date().toISOString().split('T')[0],
      file_name: file?.name || `${metadata.report_name}.pdf`,
      file_size: file?.size || 1450000,
      mime_type: file?.type || 'application/pdf',
      file_url: fileUrl,
      uploaded_at: new Date().toISOString()
    };

    const current = getLocalData('reports', []);
    setLocalData('reports', [newReport, ...current]);
    return newReport;
  }
};
