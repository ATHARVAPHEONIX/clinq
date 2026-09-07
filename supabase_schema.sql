-- ==============================================================================
-- CareTrack Clinical EMR - Supabase Setup Script
-- Project ID: oarmuohgkjaijfphmntv
-- Run this in: https://supabase.com/dashboard/project/oarmuohgkjaijfphmntv/sql/new
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'patients' profile table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id_mrn TEXT UNIQUE NOT NULL DEFAULT ('CTR-' || to_char(NOW(), 'YYYY') || '-' || lpad((floor(random() * 900000 + 100000))::text, 6, '0')),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT DEFAULT 'Male',
    blood_group TEXT DEFAULT 'O+',
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    profile_photo_url TEXT,
    emergency_contact_name TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_phone TEXT,
    allergies TEXT,
    medical_conditions TEXT,
    medications TEXT,
    surgeries TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create 'patient_medical_history' table (Doctor Consultations)
CREATE TABLE IF NOT EXISTS public.patient_medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    doctor_name TEXT NOT NULL,
    specialization TEXT DEFAULT 'General Physician',
    hospital_name TEXT NOT NULL,
    visit_type TEXT DEFAULT 'Consultation',
    reason TEXT NOT NULL,
    symptoms TEXT,
    diagnosis TEXT NOT NULL,
    doctor_notes TEXT,
    treatment TEXT,
    prescription JSONB,
    prescription_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create 'patient_reports' table (Stores all diagnostic & medical documents)
CREATE TABLE IF NOT EXISTS public.patient_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    medical_history_id UUID REFERENCES public.patient_medical_history(id) ON DELETE SET NULL,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'Blood Test',
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT DEFAULT 'application/pdf',
    description TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for fast query execution
CREATE INDEX IF NOT EXISTS idx_patients_auth_user ON public.patients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);
CREATE INDEX IF NOT EXISTS idx_history_patient_date ON public.patient_medical_history(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_patient_date ON public.patient_reports(patient_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_history_id ON public.patient_reports(medical_history_id);

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_reports ENABLE ROW LEVEL SECURITY;

-- 7. RLS Security Policies for 'patients'
DROP POLICY IF EXISTS "Patients can view own profile" ON public.patients;
CREATE POLICY "Patients can view own profile" 
ON public.patients FOR SELECT 
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Patients can update own profile" ON public.patients;
CREATE POLICY "Patients can update own profile" 
ON public.patients FOR UPDATE 
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Patients can insert own profile" ON public.patients;
CREATE POLICY "Patients can insert own profile" 
ON public.patients FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- 8. RLS Security Policies for 'patient_medical_history'
DROP POLICY IF EXISTS "Patients can view own medical history" ON public.patient_medical_history;
CREATE POLICY "Patients can view own medical history" 
ON public.patient_medical_history FOR SELECT 
USING (patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can insert own medical history" ON public.patient_medical_history;
CREATE POLICY "Patients can insert own medical history" 
ON public.patient_medical_history FOR INSERT 
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can update own medical history" ON public.patient_medical_history;
CREATE POLICY "Patients can update own medical history" 
ON public.patient_medical_history FOR UPDATE 
USING (patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid()));

-- 9. RLS Security Policies for 'patient_reports'
DROP POLICY IF EXISTS "Patients can view own reports" ON public.patient_reports;
CREATE POLICY "Patients can view own reports" 
ON public.patient_reports FOR SELECT 
USING (patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can insert own reports" ON public.patient_reports;
CREATE POLICY "Patients can insert own reports" 
ON public.patient_reports FOR INSERT 
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can delete own reports" ON public.patient_reports;
CREATE POLICY "Patients can delete own reports" 
ON public.patient_reports FOR DELETE 
USING (patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid()));

-- 10. Storage Bucket Setup: 'patient-reports'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient-reports', 'patient-reports', false) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Patients can upload report files" ON storage.objects;
CREATE POLICY "Patients can upload report files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'patient-reports' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Patients can view own report files" ON storage.objects;
CREATE POLICY "Patients can view own report files" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'patient-reports' AND 
  auth.role() = 'authenticated'
);

-- 11. Automatic Profile Creation Trigger on Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.patients (
    auth_user_id,
    full_name,
    email,
    phone
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
  )
  ON CONFLICT (email) DO UPDATE
  SET auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
