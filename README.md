# CareTrack — Clinical EMR Patient Portal

A modern, responsive, and secure **Patient Portal & Medical History Management Module** built for the CareTrack Clinical EMR system.

Designed following **Modern Clinical Functionalism** with Clinical Teal (`#0F766E`), Soft Mint (`#14B8A6`), clean typography, pill badges, and elevated white cards.

---

## ✨ Features

- 🔐 **Dual-Method Authentication**:
  - Phone Number with 6-digit OTP verification & countdown timer.
  - Email address with Magic Link / OTP / Password support.
  - 5-Step Patient Registration (Account, Personal details, Emergency contact, Medical baseline, Confirmation).
- 📊 **Patient Dashboard**:
  - Health summary metrics (Visits, Reports, Last consultation, Upcoming review).
  - Quick action shortcuts to primary workflows.
  - Recent medical history feed with attached diagnostic preview badges.
- 📜 **Chronological Medical History**:
  - Vertical timeline sorted newest first (`visit_date DESC`).
  - Search by doctor, clinic, symptoms, or clinical diagnosis.
  - Specialty/Department filters and sort order toggle.
- 🏥 **Comprehensive Visit Details**:
  - Detailed symptom breakdown, assessment, and doctor remarks.
  - Interactive prescription medications table with dosage & frequency.
  - Attached report previews.
- ➕ **Add Consultation & Upload Reports**:
  - Multi-step clinical visit logger with drag-and-drop file uploader.
  - Tag files by type: Blood Test, ECG, X-Ray, MRI, CT Scan, Prescription, etc.
- 📁 **Document Repository & Viewer Modal**:
  - Centralized repository of all patient reports with search and filter.
  - In-app document viewer modal for PDFs and images with metadata sidebars.
- 👤 **Patient Profile & MRN**:
  - Full demographic profile, emergency contacts, and allergies.
  - Unique Patient Identifier (`CTR-YYYY-XXXXXX`).
  - Interactive profile editor modal.
- ⚙️ **Account & Privacy Settings**:
  - Password management, SMS 2FA toggle, communication preferences, and session controls.
- 🛡️ **Full Supabase Integration + Demo Sandbox**:
  - Native Supabase Auth, PostgreSQL schema, and Private Storage bucket (`patient-reports`).
  - Row Level Security (RLS) policies enforcing patient-only access.
  - Offline / Demo fallback for zero-config testing out-of-the-box.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Lucide React, React Router DOM
- **Backend / Database**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage)
- **Security**: Row Level Security (RLS), JWT session management

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/ATHARVAPHEONIX/clinq.git
cd clinq
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

*(In demo mode, you can log in with any phone number or email and enter OTP **`123456`**).*

---

## 🗄️ Supabase Configuration (Optional)

1. Create a project on [Supabase](https://supabase.com).
2. Run the SQL script in `supabase_schema.sql` inside the **Supabase SQL Editor**.
3. Create a `.env.local` file with your credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## 📄 License
MIT License. Built for CareTrack Clinical EMR.
