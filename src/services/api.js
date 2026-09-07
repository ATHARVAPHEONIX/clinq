import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DEMO_PATIENT = {
  id: 'p-1001',
  auth_user_id: 'auth-user-1001',
  patient_id_mrn: 'CTR-2026-001245',
  full_name: 'Rahul Sharma',
  email: 'rahul.sharma@example.com',
  phone: '+91 98765 43210',
  date_of_birth: '1990-05-15',
  gender: 'Male',
  blood_group: 'O+',
  address: '42, Green Park Avenue, Flat 3B',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  profile_photo_url: null,
  emergency_contact_name: 'Pooja Sharma',
  emergency_contact_relation: 'Spouse',
  emergency_contact_phone: '+91 98765 43211',
  allergies: 'Penicillin, Dust Mites',
  medical_conditions: 'Hypertension (Stage 1)',
  medications: 'Telmisartan 40mg (OD), Multivitamins',
  surgeries: 'Appendectomy (2018)',
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-08-12T14:30:00Z'
};

const DEMO_VISITS = [
  {
    id: 'v-1',
    patient_id: 'p-1001',
    visit_date: '2026-08-12',
    doctor_name: 'Dr. Rahul Sharma',
    specialization: 'Cardiology',
    hospital_name: 'Apollo Clinic',
    visit_type: 'Consultation',
    reason: 'Routine cardiac consultation & BP follow-up',
    symptoms: 'Mild morning headache, occasional dizziness',
    diagnosis: 'Hypertension monitoring - BP well controlled with current dosage',
    doctor_notes: 'Patient advised to continue low sodium diet and regular 30 min morning walk. Repeat lipid profile after 3 months.',
    treatment: 'Lifestyle modification, continue current anti-hypertensive medication',
    prescription: [
      { name: 'Telmisartan 40mg', dosage: '1 tablet', frequency: 'Once daily after breakfast', duration: '90 days' },
      { name: 'Rosuvastatin 10mg', dosage: '1 tablet', frequency: 'Once daily at bedtime', duration: '90 days' }
    ],
    prescription_notes: 'Take medications regularly at the same time each day.',
    created_at: '2026-08-12T11:00:00Z',
    reports: [
      {
        id: 'rep-1',
        report_name: 'Complete Blood Count & Lipid Profile',
        report_type: 'Blood Test',
        report_date: '2026-08-12',
        file_name: 'Blood_Test_Aug2026.pdf',
        file_size: 1420000,
        file_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
        mime_type: 'application/pdf'
      },
      {
        id: 'rep-2',
        report_name: '12-Lead Resting ECG',
        report_type: 'ECG',
        report_date: '2026-08-12',
        file_name: 'ECG_Report_Aug2026.pdf',
        file_size: 850000,
        file_url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80',
        mime_type: 'application/pdf'
      }
    ]
  },
  {
    id: 'v-2',
    patient_id: 'p-1001',
    visit_date: '2026-05-04',
    doctor_name: 'Dr. Priya Mehta',
    specialization: 'General Physician',
    hospital_name: 'City Care Hospital',
    visit_type: 'Consultation',
    reason: 'High fever, persistent cough, and cold symptoms',
    symptoms: 'Fever 101.4°F for 3 days, sore throat, fatigue',
    diagnosis: 'Acute viral upper respiratory tract infection',
    doctor_notes: 'Chest clear on auscultation. Hydration recommended.',
    treatment: 'Symptomatic relief, adequate rest, warm saline gargles',
    prescription: [
      { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: 'Thrice daily if fever > 100°F', duration: '5 days' },
      { name: 'Levocetirizine 5mg', dosage: '1 tablet', frequency: 'Once daily at night', duration: '5 days' },
      { name: 'Azithromycin 500mg', dosage: '1 tablet', frequency: 'Once daily after lunch', duration: '3 days' }
    ],
    prescription_notes: 'Drink plenty of fluids. Review if fever persists past 5 days.',
    created_at: '2026-05-04T16:30:00Z',
    reports: [
      {
        id: 'rep-3',
        report_name: 'Chest X-Ray PA View',
        report_type: 'X-Ray',
        report_date: '2026-05-04',
        file_name: 'Chest_XRay_May2026.pdf',
        file_size: 3200000,
        file_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
        mime_type: 'application/pdf'
      }
    ]
  },
  {
    id: 'v-3',
    patient_id: 'p-1001',
    visit_date: '2026-01-20',
    doctor_name: 'Dr. Arvind Sen',
    specialization: 'Orthopedics',
    hospital_name: 'Max Healthcare',
    visit_type: 'Diagnostic',
    reason: 'Left knee stiffness after running',
    symptoms: 'Mild pain when climbing stairs',
    diagnosis: 'Mild patellofemoral tracking syndrome',
    doctor_notes: 'Recommended quadriceps strengthening physiotherapy.',
    treatment: 'Physiotherapy sessions 3x/week for 4 weeks',
    prescription: [
      { name: 'Aceclofenac + Paracetamol', dosage: '1 tablet', frequency: 'Twice daily after meals', duration: '5 days' }
    ],
    prescription_notes: 'Apply ice pack for 15 mins after exercise.',
    created_at: '2026-01-20T10:15:00Z',
    reports: [
      {
        id: 'rep-4',
        report_name: 'Left Knee MRI Scan',
        report_type: 'MRI',
        report_date: '2026-01-20',
        file_name: 'Knee_MRI_Jan2026.pdf',
        file_size: 5100000,
        file_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
        mime_type: 'application/pdf'
      }
    ]
  }
];

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
    // Mock simulation
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
    // Mock validation
    await new Promise(r => setTimeout(r, 600));
    if (otp !== '123456' && otp.length === 6) {
      // Allow any 6 digit in mock for easy testing
    }
    const patient = getLocalData('patient', DEMO_PATIENT);
    return { user: { id: patient.auth_user_id, phone }, session: { access_token: 'mock-token' } };
  },

  async sendEmailOtp(email) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 600));
    return { mockOtp: '123456', message: 'OTP sent to email' };
  },

  async verifyEmailOtp(email, otp) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 600));
    const patient = getLocalData('patient', DEMO_PATIENT);
    return { user: { id: patient.auth_user_id, email }, session: { access_token: 'mock-token' } };
  },

  async loginWithPassword(email, password) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    }
    await new Promise(r => setTimeout(r, 500));
    const patient = getLocalData('patient', DEMO_PATIENT);
    return { user: { id: patient.auth_user_id, email }, session: { access_token: 'mock-token' } };
  },

  async registerPatient(formData) {
    if (isSupabaseConfigured && supabase) {
      // 1. Create Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone
          }
        }
      });
      if (authError) throw authError;

      // 2. Insert into patients table
      const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: patientProfile, error: profileError } = await supabase
        .from('patients')
        .insert([{
          auth_user_id: authData.user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          blood_group: formData.blood_group,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          allergies: formData.allergies || null,
          medical_conditions: formData.medical_conditions || null,
          medications: formData.medications || null,
          surgeries: formData.surgeries || null
        }])
        .select()
        .single();

      if (profileError) throw profileError;
      return { user: authData.user, profile: patientProfile };
    }

    // Mock registration
    await new Promise(r => setTimeout(r, 800));
    const newMRN = `CTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPatient = {
      ...formData,
      id: `p-${Date.now()}`,
      auth_user_id: `auth-${Date.now()}`,
      patient_id_mrn: newMRN,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setLocalData('patient', newPatient);
    return { user: { id: newPatient.auth_user_id, email: newPatient.email }, profile: newPatient };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },

  // --- PATIENT PROFILE ---
  async getPatientProfile(authUserId) {
    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();
      if (error) throw error;
      return data;
    }
    return getLocalData('patient', DEMO_PATIENT);
  },

  async updatePatientProfile(patientId, updateData) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data, error } = await supabase
        .from('patients')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', patientId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const current = getLocalData('patient', DEMO_PATIENT);
    const updated = { ...current, ...updateData, updated_at: new Date().toISOString() };
    setLocalData('patient', updated);
    return updated;
  },

  // --- MEDICAL HISTORY ---
  async getMedicalHistory(patientId) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data, error } = await supabase
        .from('patient_medical_history')
        .select(`
          *,
          reports:patient_reports(*)
        `)
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getLocalData('visits', DEMO_VISITS);
  },

  async addMedicalVisit(patientId, visitData) {
    if (isSupabaseConfigured && supabase && patientId) {
      const { data: visit, error } = await supabase
        .from('patient_medical_history')
        .insert([{
          patient_id: patientId,
          visit_date: visitData.visit_date,
          doctor_name: visitData.doctor_name,
          hospital_name: visitData.hospital_name,
          diagnosis: visitData.diagnosis,
          symptoms: visitData.symptoms,
          treatment: visitData.treatment,
          prescription_notes: visitData.prescription_notes
        }])
        .select()
        .single();
      if (error) throw error;
      return visit;
    }

    const currentVisits = getLocalData('visits', DEMO_VISITS);
    const newVisit = {
      ...visitData,
      id: `v-${Date.now()}`,
      patient_id: patientId || 'p-1001',
      created_at: new Date().toISOString(),
      reports: visitData.reports || []
    };
    const updated = [newVisit, ...currentVisits];
    setLocalData('visits', updated);
    return newVisit;
  },

  // --- REPORTS ---
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
    const visits = getLocalData('visits', DEMO_VISITS);
    const allReports = [];
    visits.forEach(v => {
      if (v.reports) {
        v.reports.forEach(r => {
          allReports.push({
            ...r,
            doctor_name: v.doctor_name,
            hospital_name: v.hospital_name,
            visit_date: v.visit_date,
            visit_id: v.id
          });
        });
      }
    });
    return allReports;
  },

  async uploadReport(patientId, file, metadata) {
    if (isSupabaseConfigured && supabase && patientId) {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${patientId}/${fileName}`;

      const { data: storageData, error: uploadError } = await supabase.storage
        .from('patient-reports')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Generate signed URL for private bucket
      const { data: urlData } = await supabase.storage
        .from('patient-reports')
        .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours

      // 3. Save metadata into patient_reports
      const { data: reportRecord, error: dbError } = await supabase
        .from('patient_reports')
        .insert([{
          patient_id: patientId,
          medical_history_id: metadata.visit_id || null,
          report_name: metadata.report_name,
          report_type: metadata.report_type,
          report_date: metadata.report_date,
          file_url: urlData?.signedUrl || filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }])
        .select()
        .single();

      if (dbError) throw dbError;
      return reportRecord;
    }

    // Mock Upload
    await new Promise(r => setTimeout(r, 1000));
    const newReport = {
      id: `rep-${Date.now()}`,
      patient_id: patientId || 'p-1001',
      report_name: metadata.report_name,
      report_type: metadata.report_type,
      report_date: metadata.report_date,
      file_name: file?.name || `${metadata.report_name}.pdf`,
      file_size: file?.size || 1500000,
      mime_type: file?.type || 'application/pdf',
      file_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
      uploaded_at: new Date().toISOString()
    };

    // If attached to a visit, update visits
    const visits = getLocalData('visits', DEMO_VISITS);
    if (metadata.visit_id) {
      const vIndex = visits.findIndex(v => v.id === metadata.visit_id);
      if (vIndex !== -1) {
        visits[vIndex].reports = [...(visits[vIndex].reports || []), newReport];
        setLocalData('visits', visits);
      }
    }
    return newReport;
  }
};
