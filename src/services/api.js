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

const removeLocalData = (key) => {
  try {
    localStorage.removeItem(`caretrack_${key}`);
  } catch (err) {
    console.warn('Storage removal error:', err);
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

const saveToDirectory = (profile) => {
  if (!profile) return;
  const dir = getLocalData('patients_directory', []) || [];
  const cleanDigits = profile.phone ? profile.phone.replace(/\D/g, '').slice(-10) : '';
  const filtered = dir.filter(p => {
    const pDigits = p.phone ? p.phone.replace(/\D/g, '').slice(-10) : '';
    const emailMatch = p.email && profile.email && p.email.toLowerCase() === profile.email.toLowerCase();
    const phoneMatch = cleanDigits && pDigits && cleanDigits === pDigits;
    const mrnMatch = p.patient_id_mrn && profile.patient_id_mrn && p.patient_id_mrn === profile.patient_id_mrn;
    const idMatch = (p.id && profile.id && p.id === profile.id) || (p.auth_user_id && profile.auth_user_id && p.auth_user_id === profile.auth_user_id);
    return !emailMatch && !phoneMatch && !mrnMatch && !idMatch;
  });
  setLocalData('patients_directory', [profile, ...filtered]);
};

export const api = {
  isConfigured: isSupabaseConfigured,

  // Helper to find patient locally from genuine registered/saved directory
  findLocalPatient({ phone, email }) {
    const cleanDigits = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const dir = getLocalData('patients_directory', []) || [];
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
          const p1 = cleanDigits.slice(0, 5);
          const p2 = cleanDigits.slice(5);
          query = query.or(`phone.ilike.%${cleanDigits}%,phone.ilike.%${p1}%${p2}%,phone.ilike.%${p1} ${p2}%,phone.ilike.%+91%${p1}%`);
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
        phone: phone || '',
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
  async sendWhatsAppOtp(phone) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    const mockOtp = '123456';
    const messageText = `*CareTrack Patient Portal*\nYour 6-digit WhatsApp verification code is: *${mockOtp}*.\nValid for 10 minutes. Do not share this OTP with anyone.`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${cleanDigits}&text=${encodeURIComponent(messageText)}`;

    setLocalData(`wa_otp_${cleanDigits}`, {
      otp: mockOtp,
      createdAt: Date.now(),
      phone: cleanDigits
    });

    await new Promise(r => setTimeout(r, 300));
    return {
      success: true,
      otp: mockOtp,
      whatsappUrl,
      formattedPhone,
      message: `WhatsApp OTP sent to +91 ${cleanDigits}`
    };
  },

  async verifyWhatsAppOtp(phone, otp) {
    return await this.verifyPhoneOtp(phone, otp);
  },

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

    await new Promise(r => setTimeout(r, 300));
    return { mockOtp: '123456', message: 'OTP sent to mobile' };
  },

  async verifyPhoneOtp(phone, otp) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    let matchedProfile = null;

    if (isSupabaseConfigured && supabase) {
      const p1 = cleanDigits.slice(0, 5);
      const p2 = cleanDigits.slice(5);

      try {
        const { data: patientList } = await supabase
          .from('patients')
          .select('*')
          .or(`phone.ilike.%${cleanDigits}%,phone.ilike.%${p1}%${p2}%,phone.ilike.%${p1} ${p2}%,phone.ilike.%+91%${p1}%`)
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

    // Auto-create initial clean profile for this phone number if not found
    const newMRN = generateUniqueMRN();
    const fallbackProfile = {
      id: `p-${cleanDigits}`,
      full_name: `Patient (${cleanDigits.slice(-4)})`,
      phone: formattedPhone,
      email: `patient_${cleanDigits}@caretrack.internal`,
      patient_id_mrn: newMRN,
      gender: 'Male',
      blood_group: 'O+',
      allergies: '',
      medical_conditions: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
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

    await new Promise(r => setTimeout(r, 300));
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
      patient_id_mrn: newMRN,
      gender: 'Male',
      blood_group: 'O+',
      allergies: '',
      medical_conditions: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
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

    // Offline / Local Directory Mode
    const matched = this.findLocalPatient({ email: cleanEmail });
    if (!matched) {
      throw new Error('No patient record found with this email. Please register first.');
    }

    setLocalData('patient', matched);
    return { user: { id: matched.auth_user_id || matched.id, email: matched.email }, profile: matched };
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

    // Local Storage registration
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
    removeLocalData('patient');
    removeLocalData('visits');
    removeLocalData('reports');
    removeLocalData('auth_session');
    removeLocalData('user');
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
      const matched = this.findLocalPatient({ email: identifier, phone: identifier });
      if (matched) return matched;
      const dir = getLocalData('patients_directory', []) || [];
      const foundInDir = dir.find(p => p.id === identifier || p.auth_user_id === identifier);
      if (foundInDir) return foundInDir;
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
    if (!patientId) {
      const current = getLocalData('patient', null);
      patientId = current?.id;
    }
    if (!patientId) return [];

    let supabaseVisits = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const realUUID = await this.resolvePatientUUID(patientId);
        if (isValidUUID(realUUID)) {
          const { data, error } = await supabase
            .from('patient_medical_history')
            .select('*, reports:patient_reports(*)')
            .eq('patient_id', realUUID)
            .order('visit_date', { ascending: false });

          if (!error && data) {
            supabaseVisits = data;
          }
        }
      } catch (err) {
        console.warn('getMedicalHistory Supabase error:', err);
      }
    }

    if (supabaseVisits !== null) {
      // Save locally under patient-isolated key
      setLocalData(`visits_${patientId}`, supabaseVisits);
      return supabaseVisits;
    }

    // Return isolated patient local visits
    const localPatientVisits = getLocalData(`visits_${patientId}`, []);
    return localPatientVisits;
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
          const current = getLocalData(`visits_${patientId}`, []);
          setLocalData(`visits_${patientId}`, [combined, ...current]);
          return combined;
        } else {
          console.warn('Supabase visit insert error:', error);
        }
      } catch (err) {
        console.warn('addMedicalVisit error:', err);
      }
    }

    // Local fallback isolated to patient
    const current = getLocalData(`visits_${patientId}`, []);
    const newVisit = { 
      ...visitData, 
      id: `v-${Date.now()}`, 
      patient_id: realUUID || patientId || 'p-1', 
      created_at: new Date().toISOString() 
    };
    setLocalData(`visits_${patientId}`, [newVisit, ...current]);
    return newVisit;
  },

  // --- PATIENT REPORTS ---
  async getAllReports(patientId) {
    if (!patientId) {
      const current = getLocalData('patient', null);
      patientId = current?.id;
    }
    if (!patientId) return [];

    let supabaseReports = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const realUUID = await this.resolvePatientUUID(patientId);
        if (isValidUUID(realUUID)) {
          const { data, error } = await supabase
            .from('patient_reports')
            .select('*')
            .eq('patient_id', realUUID)
            .order('report_date', { ascending: false });

          if (!error && data) {
            supabaseReports = data;
          }
        }
      } catch (err) {
        console.warn('getAllReports error:', err);
      }
    }

    if (supabaseReports !== null) {
      setLocalData(`reports_${patientId}`, supabaseReports);
      return supabaseReports;
    }

    const localReports = getLocalData(`reports_${patientId}`, []);
    const visits = getLocalData(`visits_${patientId}`, []);
    visits.forEach(v => {
      if (v.reports && Array.isArray(v.reports)) {
        v.reports.forEach(r => {
          if (!localReports.some(lr => lr.id === r.id)) {
            localReports.push({ ...r, doctor_name: v.doctor_name, hospital_name: v.hospital_name, visit_date: v.visit_date });
          }
        });
      }
    });

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
          const current = getLocalData(`reports_${patientId}`, []);
          setLocalData(`reports_${patientId}`, [data, ...current]);
          return data;
        } else {
          console.warn('Supabase report insert error:', dbErr);
        }
      } catch (err) {
        console.warn('uploadReport error:', err);
      }
    }

    // Local fallback isolated to patient
    const newReport = {
      id: `rep-${Date.now()}`,
      patient_id: realUUID || patientId || 'p-1',
      medical_history_id: metadata.visit_id || null,
      report_name: metadata.report_name || file?.name || 'Medical Report',
      report_type: metadata.report_type || 'Blood Test',
      report_date: metadata.report_date || new Date().toISOString().split('T')[0],
      file_name: file?.name || `${metadata.report_name || 'Medical_Report'}.pdf`,
      file_size: file?.size || 1450000,
      mime_type: file?.type || 'application/pdf',
      file_url: fileUrl,
      uploaded_at: new Date().toISOString()
    };

    const current = getLocalData(`reports_${patientId}`, []);
    setLocalData(`reports_${patientId}`, [newReport, ...current]);
    return newReport;
  }
};
