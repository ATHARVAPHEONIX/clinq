-- ==============================================================================
-- CareTrack Clinical EMR - Supabase PostgreSQL Schema & Security Policies
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop Existing Tables if cleaning up (Optional)
-- DROP TABLE IF EXISTS public.patient_reports CASCADE;
-- DROP TABLE IF EXISTS public.patient_medical_history CASCADE;
-- DROP TABLE IF EXISTS public.patients CASCADE;

-- 3. Create 'patients' Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id_mrn TEXT UNIQUE NOT NULL DEFAULT ('CTR-' || to_char(NOW(), 'YYYY') || '-' || lpad((floor(random() * 900000 + 100000))::text, 6, '0')),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
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

-- 4. Create 'patient_medical_history' Table
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

-- 5. Create 'patient_reports' Table
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
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_patients_auth_user ON public.patients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_history_patient_date ON public.patient_medical_history(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_patient_date ON public.patient_reports(patient_id, report_date DESC);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_reports ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for 'patients'
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

-- 9. RLS Policies for 'patient_medical_history'
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

-- 10. RLS Policies for 'patient_reports'
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

-- 11. Storage Bucket Creation & Security Policies
-- In Supabase dashboard: Storage -> New Bucket -> name: "patient-reports", Private: true
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-reports', 'patient-reports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Patients can upload reports" ON storage.objects;
CREATE POLICY "Patients can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-reports' AND
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Patients can read own reports" ON storage.objects;
CREATE POLICY "Patients can read own reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-reports' AND
  auth.role() = 'authenticated'
);

-- 12. Auto-Update Timestamp Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_patients_modtime
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER update_history_modtime
BEFORE UPDATE ON public.patient_medical_history
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
