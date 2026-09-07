-- ==============================================================================
-- CareTrack Clinical EMR - Supabase Setup Script
-- Project ID: oarmuohgkjaijfphmntv
-- Run this in: https://supabase.com/dashboard/project/oarmuohgkjaijfphmntv/sql/new
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Sequence for Patient MRN (Guarantees 100% Unique Patient IDs)
CREATE SEQUENCE IF NOT EXISTS patient_mrn_seq START WITH 100101 INCREMENT BY 1;

-- 3. Create 'patients' profile table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id_mrn TEXT UNIQUE NOT NULL DEFAULT ('CTR-' || to_char(NOW(), 'YYYY') || '-' || nextval('patient_mrn_seq')::text),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
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

-- 4. Create 'patient_directory' table (Shared Central Registry for Reception, Doctor, Lab, Pharmacy & Billing Modules)
CREATE TABLE IF NOT EXISTS public.patient_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_mrn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gender TEXT DEFAULT 'Male',
    blood_group TEXT DEFAULT 'O+',
    date_of_birth DATE,
    address TEXT,
    city TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    allergies TEXT,
    medical_conditions TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create 'patient_medical_history' table (Doctor Consultations & Visits)
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

-- 6. Create 'patient_reports' table (Diagnostic & Medical Documents)
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

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_patients_auth_user ON public.patients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patient_dir_mrn ON public.patient_directory(patient_mrn);
CREATE INDEX IF NOT EXISTS idx_patient_dir_name ON public.patient_directory(full_name);
CREATE INDEX IF NOT EXISTS idx_patient_dir_phone ON public.patient_directory(phone);
CREATE INDEX IF NOT EXISTS idx_history_patient_date ON public.patient_medical_history(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_patient_date ON public.patient_reports(patient_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_history_id ON public.patient_reports(medical_history_id);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_reports ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for 'patients' (Allows app to select, insert and update records)
DROP POLICY IF EXISTS "Allow select on patients" ON public.patients;
CREATE POLICY "Allow select on patients" 
ON public.patients FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert on patients" ON public.patients;
CREATE POLICY "Allow insert on patients" 
ON public.patients FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on patients" ON public.patients;
CREATE POLICY "Allow update on patients" 
ON public.patients FOR UPDATE 
TO anon, authenticated 
USING (true);

-- 10. RLS Policies for 'patient_directory' (Open to all hospital modules)
DROP POLICY IF EXISTS "Allow select on patient_directory" ON public.patient_directory;
CREATE POLICY "Allow select on patient_directory" 
ON public.patient_directory FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert on patient_directory" ON public.patient_directory;
CREATE POLICY "Allow insert on patient_directory" 
ON public.patient_directory FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on patient_directory" ON public.patient_directory;
CREATE POLICY "Allow update on patient_directory" 
ON public.patient_directory FOR UPDATE 
TO anon, authenticated 
USING (true);

-- 11. RLS Policies for 'patient_medical_history'
DROP POLICY IF EXISTS "Allow select on medical history" ON public.patient_medical_history;
CREATE POLICY "Allow select on medical history" 
ON public.patient_medical_history FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert on medical history" ON public.patient_medical_history;
CREATE POLICY "Allow insert on medical history" 
ON public.patient_medical_history FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on medical history" ON public.patient_medical_history;
CREATE POLICY "Allow update on medical history" 
ON public.patient_medical_history FOR UPDATE 
TO anon, authenticated 
USING (true);

-- 12. RLS Policies for 'patient_reports'
DROP POLICY IF EXISTS "Allow select on patient reports" ON public.patient_reports;
CREATE POLICY "Allow select on patient reports" 
ON public.patient_reports FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert on patient reports" ON public.patient_reports;
CREATE POLICY "Allow insert on patient reports" 
ON public.patient_reports FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete on patient reports" ON public.patient_reports;
CREATE POLICY "Allow delete on patient reports" 
ON public.patient_reports FOR DELETE 
TO anon, authenticated 
USING (true);

-- 13. Storage Bucket Setup: 'patient-reports'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient-reports', 'patient-reports', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow all uploads to patient-reports" ON storage.objects;
CREATE POLICY "Allow all uploads to patient-reports" 
ON storage.objects FOR INSERT 
TO anon, authenticated
WITH CHECK (bucket_id = 'patient-reports');

DROP POLICY IF EXISTS "Allow all reads from patient-reports" ON storage.objects;
CREATE POLICY "Allow all reads from patient-reports" 
ON storage.objects FOR SELECT 
TO anon, authenticated
USING (bucket_id = 'patient-reports');

-- 14. Sync Trigger: Automatically syncs new patients into 'patient_directory'
CREATE OR REPLACE FUNCTION public.sync_patient_to_directory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.patient_directory (
    id,
    patient_mrn,
    full_name,
    phone,
    email,
    gender,
    blood_group,
    date_of_birth,
    address,
    city,
    emergency_contact_name,
    emergency_contact_phone,
    allergies,
    medical_conditions,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.patient_id_mrn,
    NEW.full_name,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.gender, 'Male'),
    COALESCE(NEW.blood_group, 'O+'),
    NEW.date_of_birth,
    NEW.address,
    NEW.city,
    NEW.emergency_contact_name,
    NEW.emergency_contact_phone,
    NEW.allergies,
    NEW.medical_conditions,
    NOW()
  )
  ON CONFLICT (patient_mrn) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    allergies = EXCLUDED.allergies,
    medical_conditions = EXCLUDED.medical_conditions,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_patient_sync_directory ON public.patients;
CREATE TRIGGER on_patient_sync_directory
  AFTER INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.sync_patient_to_directory();

-- 15. Auth Sign Up Trigger: Creates patient profile on Supabase auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_mrn TEXT;
BEGIN
  v_mrn := 'CTR-' || to_char(NOW(), 'YYYY') || '-' || nextval('patient_mrn_seq')::text;

  INSERT INTO public.patients (
    auth_user_id,
    patient_id_mrn,
    full_name,
    email,
    phone
  )
  VALUES (
    NEW.id,
    v_mrn,
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
