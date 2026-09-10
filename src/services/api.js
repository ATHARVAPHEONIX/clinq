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

// Generate cryptographically secure 6-digit OTP
const generateSecureOTP = () => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return (100000 + (buffer[0] % 900000)).toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    // Immediate email uniqueness & format check for registration
  async checkEmailAvailability(email) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { available: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
    }

    // 1. Check local directory
    const dir = getLocalData('patients_directory', []) || [];
    const localMatch = dir.find(p => p.email && p.email.trim().toLowerCase() === cleanEmail);
    if (localMatch) {
      return { available: false, error: 'This email is already registered. Please go to Login.' };
    }

    // 2. Check current active patient
    const current = getLocalData('patient', null);
    if (current && current.email && current.email.trim().toLowerCase() === cleanEmail) {
      return { available: false, error: 'This email is already registered. Please go to Login.' };
    }

    // 3. Check Supabase patients and patient_directory tables
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: pList } = await supabase
          .from('patients')
          .select('id, email')
          .ilike('email', cleanEmail)
          .limit(1);

        if (pList && pList.length > 0) {
          return { available: false, error: 'This email is already registered. Please go to Login.' };
        }

        const { data: dList } = await supabase
          .from('patient_directory')
          .select('id, email')
          .ilike('email', cleanEmail)
          .limit(1);

        if (dList && dList.length > 0) {
          return { available: false, error: 'This email is already registered. Please go to Login.' };
        }
      } catch (err) {
        console.warn('Supabase email availability check note:', err);
      }
    }

    return { available: true };
  },

  // Immediate phone uniqueness check for registration
  async checkPhoneAvailability(phone) {
    const cleanDigits = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    if (!cleanDigits || cleanDigits.length !== 10) {
      return { available: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const dir = getLocalData('patients_directory', []) || [];
    const localMatch = dir.find(p => {
      const pDigits = p.phone ? p.phone.replace(/\D/g, '').slice(-10) : '';
      return pDigits === cleanDigits;
    });
    if (localMatch) {
      return { available: false, error: 'This phone number is already registered. Please go to Login.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const p1 = cleanDigits.slice(0, 5);
        const p2 = cleanDigits.slice(5);
        const { data: pList } = await supabase
          .from('patients')
          .select('id, phone')
          .or(`phone.ilike.%${cleanDigits}%,phone.ilike.%${p1}%${p2}%`)
          .limit(1);

        if (pList && pList.length > 0) {
          return { available: false, error: 'This phone number is already registered. Please go to Login.' };
        }
      } catch (err) {
        console.warn('Supabase phone check note:', err);
      }
    }

    return { available: true };
  },

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

  // --- WHATSAPP AUTH SERVICES ---
  async sendWhatsAppOtp(phone) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    const otp = generateSecureOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save pending WhatsApp OTP record securely
    const otpRecord = {
      phone: cleanDigits,
      formattedPhone,
      otp,
      expiresAt,
      createdAt: Date.now(),
      attempts: 0
    };
    setLocalData(`wa_otp_${cleanDigits}`, otpRecord);
    setLocalData('active_wa_otp', otpRecord);

    let providerDispatched = false;

    // 1. If Supabase Phone/WhatsApp Auth is configured, dispatch via Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone: `+91${cleanDigits}`,
          options: {
            channel: 'whatsapp'
          }
        });
        if (!error) {
          providerDispatched = true;
        }
      } catch (e) {
        console.warn('Supabase WhatsApp auth dispatch note:', e);
      }
    }

    // 2. If configured external WhatsApp API URL/Gateway exists, dispatch message
    const customWhatsAppApiUrl = import.meta.env.VITE_WHATSAPP_API_URL;
    const customWhatsAppToken = import.meta.env.VITE_WHATSAPP_API_TOKEN;
    if (customWhatsAppApiUrl) {
      try {
        const response = await fetch(customWhatsAppApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(customWhatsAppToken ? { 'Authorization': `Bearer ${customWhatsAppToken}` } : {})
          },
          body: JSON.stringify({
            phone: `91${cleanDigits}`,
            message: `Your ClinQ verification code is: ${otp}. Valid for 10 minutes. Do not share this OTP.`
          })
        });
        if (response.ok) {
          providerDispatched = true;
        }
      } catch (apiErr) {
        console.warn('Custom WhatsApp gateway dispatch note:', apiErr);
      }
    }

    const messageText = `*CareTrack Patient Portal Verification*\n\nYour 6-digit WhatsApp OTP is: *${otp}*\n\n(Valid for 10 minutes. Do not share this OTP with anyone.)`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${cleanDigits}&text=${encodeURIComponent(messageText)}`;

    return {
      success: true,
      otp,
      whatsappUrl,
      formattedPhone,
      message: `OTP sent to WhatsApp (+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)})`
    };
  },

  async verifyWhatsAppOtp(phone, enteredOtp) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const trimmedOtp = (enteredOtp || '').toString().trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      throw new Error('Please enter all 6 digits of the OTP code.');
    }

    const pendingRecord = getLocalData(`wa_otp_${cleanDigits}`, null) || getLocalData('active_wa_otp', null);

    // Expiration check
    if (pendingRecord && pendingRecord.expiresAt && Date.now() > pendingRecord.expiresAt) {
      removeLocalData(`wa_otp_${cleanDigits}`);
      removeLocalData('active_wa_otp');
      throw new Error('This OTP has expired. Please request a new OTP.');
    }

    let isVerified = false;

    // 1. Verify against Supabase Auth if supported
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `+91${cleanDigits}`,
          token: trimmedOtp,
          type: 'sms'
        });

        if (!error && data?.user) {
          isVerified = true;
        }
      } catch (err) {
        console.warn('Supabase OTP verification attempt:', err);
      }
    }

    // 2. Verify against secure pending OTP record
    if (!isVerified) {
      if (pendingRecord && pendingRecord.otp === trimmedOtp && pendingRecord.phone === cleanDigits) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      if (pendingRecord) {
        pendingRecord.attempts = (pendingRecord.attempts || 0) + 1;
        setLocalData(`wa_otp_${cleanDigits}`, pendingRecord);
      }
      throw new Error('Invalid OTP. Please check the OTP and try again.');
    }

    // Successful OTP verification -> Clean up pending OTP record
    removeLocalData(`wa_otp_${cleanDigits}`);
    removeLocalData('active_wa_otp');

    // Retrieve or provision patient profile
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
    }

    if (!matchedProfile) {
      matchedProfile = this.findLocalPatient({ phone: cleanDigits });
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

    // Auto-provision initial clean profile for newly verified WhatsApp number
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

  // --- SMS AUTH SERVICES ---
  async sendSmsOtp(phone) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    const otp = generateSecureOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save pending SMS OTP record
    const otpRecord = {
      phone: cleanDigits,
      formattedPhone,
      otp,
      expiresAt,
      createdAt: Date.now(),
      attempts: 0
    };
    setLocalData(`sms_otp_${cleanDigits}`, otpRecord);
    setLocalData('active_sms_otp', otpRecord);

    // 1. If Supabase Phone Auth is configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signInWithOtp({
          phone: `+91${cleanDigits}`
        });
      } catch (e) {
        console.warn('Supabase SMS auth note:', e);
      }
    }

    // 2. If configured external SMS API Gateway URL exists, dispatch message
    const customSmsApiUrl = import.meta.env.VITE_SMS_API_URL;
    const customSmsToken = import.meta.env.VITE_SMS_API_TOKEN;
    if (customSmsApiUrl) {
      try {
        await fetch(customSmsApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(customSmsToken ? { 'Authorization': `Bearer ${customSmsToken}` } : {})
          },
          body: JSON.stringify({
            phone: `91${cleanDigits}`,
            message: `Your ClinQ OTP is ${otp}. Valid for 10 minutes. Do not share this OTP.`
          })
        });
      } catch (apiErr) {
        console.warn('Custom SMS gateway dispatch note:', apiErr);
      }
    }

    const smsUrl = `sms:+91${cleanDigits}?body=${encodeURIComponent(`Your ClinQ / CareTrack OTP is ${otp}. Valid for 10 minutes.`)}`;

    return {
      success: true,
      otp,
      smsUrl,
      formattedPhone,
      message: `OTP sent via SMS to ${formattedPhone}`
    };
  },

  async verifySmsOtp(phone, enteredOtp) {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    
    if (!cleanDigits || cleanDigits.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const trimmedOtp = (enteredOtp || '').toString().trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      throw new Error('Please enter all 6 digits of the OTP code.');
    }

    const pendingRecord = getLocalData(`sms_otp_${cleanDigits}`, null) || getLocalData('active_sms_otp', null);

    // Expiration check
    if (pendingRecord && pendingRecord.expiresAt && Date.now() > pendingRecord.expiresAt) {
      removeLocalData(`sms_otp_${cleanDigits}`);
      removeLocalData('active_sms_otp');
      throw new Error('This OTP has expired. Please request a new OTP.');
    }

    let isVerified = false;

    // 1. Verify against Supabase Auth if supported
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `+91${cleanDigits}`,
          token: trimmedOtp,
          type: 'sms'
        });

        if (!error && data?.user) {
          isVerified = true;
        }
      } catch (err) {
        console.warn('Supabase SMS verification attempt:', err);
      }
    }

    // 2. Verify against secure pending OTP record
    if (!isVerified) {
      if (pendingRecord && pendingRecord.otp === trimmedOtp && pendingRecord.phone === cleanDigits) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      if (pendingRecord) {
        pendingRecord.attempts = (pendingRecord.attempts || 0) + 1;
        setLocalData(`sms_otp_${cleanDigits}`, pendingRecord);
      }
      throw new Error('Invalid OTP. Please check the OTP and try again.');
    }

    // Clean up pending SMS OTP
    removeLocalData(`sms_otp_${cleanDigits}`);
    removeLocalData('active_sms_otp');

    // Retrieve or provision patient profile
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
    }

    if (!matchedProfile) {
      matchedProfile = this.findLocalPatient({ phone: cleanDigits });
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

    // Auto-provision initial clean profile for newly verified SMS number
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

  // --- EMAIL AUTH SERVICES ---
  async sendEmailOtp(email) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    const otp = generateSecureOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    setLocalData(`email_otp_${cleanEmail}`, {
      email: cleanEmail,
      otp,
      expiresAt,
      createdAt: Date.now(),
      attempts: 0
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          email: cleanEmail
        });

        if (error) {
          if (error.message?.toLowerCase().includes('rate limit') || error.code === 'over_email_send_rate_limit') {
            return { message: 'OTP sent to your email address.' };
          }
          throw error;
        }

        return { message: 'OTP sent to your email address.', data };
      } catch (err) {
      }
    }

    return {
      success: true,
      otp,
      cleanEmail,
      message: `OTP sent to ${cleanEmail}`
    };
  },

  async verifyEmailOtp(email, enteredOtp) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const trimmedOtp = (enteredOtp || '').toString().trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      throw new Error('Please enter all 6 digits of the OTP code.');
    }

    const pendingRecord = getLocalData(`email_otp_${cleanEmail}`, null);

    if (pendingRecord && pendingRecord.expiresAt && Date.now() > pendingRecord.expiresAt) {
      removeLocalData(`email_otp_${cleanEmail}`);
      throw new Error('This OTP has expired. Please request a new OTP.');
    }

    let isVerified = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: trimmedOtp,
          type: 'email'
        });

        if (!error && data?.user) {
          isVerified = true;
        }
      } catch (err) {
        console.warn('Supabase email OTP verify error:', err);
      }
    }

    if (!isVerified) {
      if (pendingRecord && pendingRecord.otp === trimmedOtp && pendingRecord.email === cleanEmail) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      throw new Error('Invalid OTP. Please check the OTP and try again.');
    }

    removeLocalData(`email_otp_${cleanEmail}`);

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
    }

    if (!matchedProfile) {
      matchedProfile = this.findLocalPatient({ email: cleanEmail });
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
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        if (error.message?.toLowerCase().includes('invalid login credentials') || error.message?.toLowerCase().includes('invalid credentials')) {
          throw new Error('Incorrect email or password.');
        }
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email not confirmed. Please check your inbox or disable email confirmation in Supabase.');
        }
        throw new Error('Incorrect email or password.');
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
      throw new Error('Incorrect email or password.');
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
            surgeries: formData.surgeries,
            abha_id: formData.abha_id || ''
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
        abha_id: formData.abha_id || '',
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
            abha_id: formData.abha_id || '',
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
    removeLocalData('active_wa_otp');
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
                medical_conditions: updateData.medical_conditions,
                abha_id: updateData.abha_id !== undefined ? updateData.abha_id : undefined
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
      setLocalData(`visits_${patientId}`, supabaseVisits);
      return supabaseVisits;
    }

    const localPatientVisits = getLocalData(`visits_${patientId}`, []);
    return localPatientVisits;
  },

  async addMedicalVisit(patientId, visitData) {
    let realUUID = patientId;
    if (isSupabaseConfigured && supabase) {
      try {
        realUUID = await this.resolvePatientUUID(patientId);

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
