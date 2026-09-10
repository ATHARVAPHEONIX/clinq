import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  MapPin, 
  HeartHandshake, 
  FileHeart, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Step 1: Account
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    // Step 2: Personal
    date_of_birth: '',
    gender: 'Male',
    blood_group: 'O+',
    address: '',
    city: '',
    state: '',
    pincode: '',
    // Step 3: Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    // Step 4: Medical Info
    allergies: '',
    medical_conditions: '',
    medications: '',
    surgeries: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.full_name.trim()) {
        showError('Please enter your full legal name.');
        return false;
      }
      if (!formData.email.includes('@')) {
        showError('Please enter a valid email address.');
        return false;
      }
      if (!formData.phone || formData.phone.length < 10) {
        showError('Please enter a valid 10-digit mobile number.');
        return false;
      }
      if (formData.password.length < 6) {
        showError('Password must be at least 6 characters.');
        return false;
      }
      if (formData.password !== formData.confirm_password) {
        showError('Passwords do not match.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.date_of_birth) {
        showError('Please enter your date of birth.');
        return false;
      }
      if (!formData.city.trim() || !formData.pincode.trim()) {
        showError('Please fill in city and pincode.');
        return false;
      }
    } else if (step === 3) {
      if (!formData.emergency_contact_name.trim() || !formData.emergency_contact_phone.trim()) {
        showError('Please enter emergency contact name and phone number.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, 5));
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      showSuccess('Your CareTrack patient account has been created successfully!');
      navigate('/dashboard');
    } catch (err) {
      showError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Account' },
    { num: 2, label: 'Personal' },
    { num: 3, label: 'Emergency' },
    { num: 4, label: 'Medical' },
    { num: 5, label: 'Review' }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8FF] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#0B1C30]">CareTrack</span>
          </div>
          <h2 className="text-xl font-bold text-[#0B1C30]">Patient Account Registration</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Create your secure personal healthcare profile.
          </p>
        </div>

        {/* Multi-step progress bar */}
        <div className="card !p-4 mb-6 shadow-xs border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s.num
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : step > s.num
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-xs hidden sm:inline font-medium ${step >= s.num ? 'text-[#0B1C30]' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > idx + 1 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Form Container */}
        <div className="card shadow-lg border border-[#E2E8F0] p-6 sm:p-8">
          {/* STEP 1: ACCOUNT */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-5 h-5 text-[#0F766E]" />
                <span>Step 1 — Account Credentials</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full legal name"
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. 9876543210"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="input-field"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PERSONAL INFO */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2 pb-3 border-b border-slate-100">
                <MapPin className="w-5 h-5 text-[#0F766E]" />
                <span>Step 2 — Personal & Residential Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="input-field bg-white">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Blood Group *</label>
                  <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="input-field bg-white">
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                    <option>O+</option>
                    <option>O-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Street Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Flat / House No, Street name"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Mumbai"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Maharashtra"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="e.g. 400001"
                    className="input-field"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EMERGENCY CONTACT */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2 pb-3 border-b border-slate-100">
                <HeartHandshake className="w-5 h-5 text-[#0F766E]" />
                <span>Step 3 — Emergency Contact</span>
              </h3>
              <p className="text-xs text-[#64748B]">
                Who should our clinical staff reach out to during emergencies?
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Contact Name *</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="e.g. Contact Person Full Name"
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Relationship</label>
                  <input
                    type="text"
                    name="emergency_contact_relation"
                    value={formData.emergency_contact_relation}
                    onChange={handleChange}
                    placeholder="e.g. Spouse / Parent / Sibling"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Emergency Phone *</label>
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    placeholder="e.g. 9876543211"
                    className="input-field"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: MEDICAL INFO (OPTIONAL) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2">
                  <FileHeart className="w-5 h-5 text-[#0F766E]" />
                  <span>Step 4 — Medical History (Optional)</span>
                </h3>
                <span className="badge badge-gray text-[10px]">Optional</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Known Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="e.g. Penicillin, Peanuts, Dust"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Existing Medical Conditions</label>
                <input
                  type="text"
                  name="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={handleChange}
                  placeholder="e.g. Hypertension, Diabetes Type 2"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Current Medications</label>
                <input
                  type="text"
                  name="medications"
                  value={formData.medications}
                  onChange={handleChange}
                  placeholder="e.g. Daily vitamins or prescribed medicines"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Previous Surgeries</label>
                <input
                  type="text"
                  name="surgeries"
                  value={formData.surgeries}
                  onChange={handleChange}
                  placeholder="e.g. Appendectomy (2020)"
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & CONFIRM */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2 pb-3 border-b border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-[#0F766E]" />
                <span>Step 5 — Confirmation & Summary</span>
              </h3>

              <div className="bg-[#FAF8FF] border border-[#E2E8F0] rounded-xl p-4 text-xs space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-[#64748B]">Full Name:</span> <strong className="text-[#0B1C30]">{formData.full_name}</strong></div>
                  <div><span className="text-[#64748B]">Email:</span> <strong className="text-[#0B1C30]">{formData.email}</strong></div>
                  <div><span className="text-[#64748B]">Phone:</span> <strong className="text-[#0B1C30]">{formData.phone}</strong></div>
                  <div><span className="text-[#64748B]">DOB:</span> <strong className="text-[#0B1C30]">{formData.date_of_birth}</strong></div>
                  <div><span className="text-[#64748B]">Blood Group:</span> <strong className="text-[#0B1C30]">{formData.blood_group}</strong></div>
                  <div><span className="text-[#64748B]">City/State:</span> <strong className="text-[#0B1C30]">{formData.city}, {formData.state}</strong></div>
                  <div><span className="text-[#64748B]">Emergency Contact:</span> <strong className="text-[#0B1C30]">{formData.emergency_contact_name} ({formData.emergency_contact_phone})</strong></div>
                  <div><span className="text-[#64748B]">Allergies:</span> <strong className="text-[#0B1C30]">{formData.allergies || 'None specified'}</strong></div>
                </div>
              </div>

              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <span>
                  By creating an account, you consent to CareTrack securely handling your clinical records with HIPAA and GDPR standard encryption.
                </span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <Link to="/login" className="text-xs text-[#64748B] hover:text-[#0B1C30]">
                Already have an account? <span className="text-[#0F766E] font-semibold">Login</span>
              </Link>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary text-xs flex items-center gap-1.5 ml-auto shadow-md cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Patient Account</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
