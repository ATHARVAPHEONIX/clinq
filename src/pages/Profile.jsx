import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  HeartHandshake, 
  FileHeart, 
  Edit3, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Save,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export default function Profile() {
  const { patient, refreshProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: patient?.full_name || '',
    phone: patient?.phone || '',
    date_of_birth: patient?.date_of_birth || '',
    gender: patient?.gender || 'Male',
    blood_group: patient?.blood_group || 'O+',
    address: patient?.address || '',
    city: patient?.city || '',
    state: patient?.state || '',
    pincode: patient?.pincode || '',
    emergency_contact_name: patient?.emergency_contact_name || '',
    emergency_contact_relation: patient?.emergency_contact_relation || '',
    emergency_contact_phone: patient?.emergency_contact_phone || '',
    allergies: patient?.allergies || '',
    medical_conditions: patient?.medical_conditions || '',
    medications: patient?.medications || '',
    surgeries: patient?.surgeries || ''
  });

  useEffect(() => {
    if (patient) {
      setEditForm({
        full_name: patient.full_name || '',
        phone: patient.phone || '',
        date_of_birth: patient.date_of_birth || '',
        gender: patient.gender || 'Male',
        blood_group: patient.blood_group || 'O+',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        pincode: patient.pincode || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_relation: patient.emergency_contact_relation || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',
        allergies: patient.allergies || '',
        medical_conditions: patient.medical_conditions || '',
        medications: patient.medications || '',
        surgeries: patient.surgeries || ''
      });
    }
  }, [patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updatePatientProfile(patient?.id, editForm);
      await refreshProfile();
      showSuccess('Profile information updated successfully!');
      setIsEditing(false);
    } catch (err) {
      showError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const patientName = patient?.full_name || editForm.full_name || 'Patient';
  const initials = patientName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'PT';

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Profile Header Card */}
      <div className="card !p-8 bg-gradient-to-r from-white via-white to-teal-50/40 border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-teal-900/10">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#0B1C30]">{patientName}</h1>
              <span className="badge badge-teal text-xs font-semibold">Active Patient</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
              <span className="font-mono font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                MRN: {patient?.patient_id_mrn || 'N/A'}
              </span>
              {patient?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {patient.email}
                </span>
              )}
              {patient?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {patient.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="btn btn-primary text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Main Details Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-[#0F766E]" />
            <h3 className="font-bold text-sm text-[#0B1C30] uppercase tracking-wider">
              Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Date of Birth</span>
              <span className="font-semibold text-slate-800">{patient?.date_of_birth || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Gender</span>
              <span className="font-semibold text-slate-800">{patient?.gender || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Blood Group</span>
              <span className="badge badge-teal font-bold">{patient?.blood_group || 'O+'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Primary Language</span>
              <span className="font-semibold text-slate-800">English</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-[#0F766E]" />
            <h3 className="font-bold text-sm text-[#0B1C30] uppercase tracking-wider">
              Contact & Address
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Residential Address</span>
              <span className="font-semibold text-slate-800">{patient?.address || 'Not specified'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-400 block mb-0.5">City</span>
                <span className="font-semibold text-slate-800">{patient?.city || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">State</span>
                <span className="font-semibold text-slate-800">{patient?.state || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Pincode</span>
                <span className="font-semibold text-slate-800">{patient?.pincode || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <HeartHandshake className="w-4 h-4 text-[#0F766E]" />
            <h3 className="font-bold text-sm text-[#0B1C30] uppercase tracking-wider">
              Emergency Contact
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-slate-400 block mb-0.5">Primary Contact</span>
                <span className="font-bold text-slate-800">{patient?.emergency_contact_name || 'Not provided'}</span>
              </div>
              {patient?.emergency_contact_relation && (
                <span className="badge badge-gray">{patient.emergency_contact_relation}</span>
              )}
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Phone Number</span>
              <span className="font-mono font-semibold text-[#0F766E]">
                {patient?.emergency_contact_phone || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Medical Baseline */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileHeart className="w-4 h-4 text-[#0F766E]" />
            <h3 className="font-bold text-sm text-[#0B1C30] uppercase tracking-wider">
              Medical Baseline & Allergies
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Known Allergies</span>
              <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                {patient?.allergies || 'No known allergies'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Existing Conditions</span>
              <span className="font-semibold text-slate-800">{patient?.medical_conditions || 'None reported'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Ongoing Medications</span>
              <span className="font-semibold text-slate-800">{patient?.medications || 'None reported'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-[#0B1C30] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0F766E]" />
                <span>Edit Patient Profile</span>
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Full Legal Name</label>
                  <input type="text" name="full_name" value={editForm.full_name} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={editForm.phone} onChange={handleChange} className="input-field" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={editForm.date_of_birth} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Gender</label>
                  <select name="gender" value={editForm.gender} onChange={handleChange} className="input-field bg-white">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Blood Group</label>
                  <select name="blood_group" value={editForm.blood_group} onChange={handleChange} className="input-field bg-white">
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
                <label className="block font-semibold mb-1">Street Address</label>
                <input type="text" name="address" value={editForm.address} onChange={handleChange} className="input-field" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">City</label>
                  <input type="text" name="city" value={editForm.city} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">State</label>
                  <input type="text" name="state" value={editForm.state} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Pincode</label>
                  <input type="text" name="pincode" value={editForm.pincode} onChange={handleChange} className="input-field" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2">Emergency Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Contact Name</label>
                    <input type="text" name="emergency_contact_name" value={editForm.emergency_contact_name} onChange={handleChange} className="input-field" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Relationship</label>
                    <input type="text" name="emergency_contact_relation" value={editForm.emergency_contact_relation} onChange={handleChange} className="input-field" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Emergency Phone</label>
                    <input type="tel" name="emergency_contact_phone" value={editForm.emergency_contact_phone} onChange={handleChange} className="input-field" />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2">Medical Baseline</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">Allergies</label>
                    <input type="text" name="allergies" value={editForm.allergies} onChange={handleChange} className="input-field" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Medical Conditions</label>
                    <input type="text" name="medical_conditions" value={editForm.medical_conditions} onChange={handleChange} className="input-field" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary !min-h-[38px] text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary !min-h-[38px] text-xs flex items-center gap-1.5 shadow-xs cursor-pointer">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
