import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Stethoscope, 
  FileText, 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Building2, 
  Plus, 
  Pill, 
  HardDrive, 
  Info,
  Sparkles,
  Activity,
  ShieldCheck,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { aiService } from '../services/aiService';
import AIClinicalOverviewModal from '../components/AIClinicalOverviewModal';

export default function AddVisit() {
  const navigate = useNavigate();
  const { patient } = useAuth();
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  const [visitForm, setVisitForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    doctor_name: '',
    specialization: 'Cardiology',
    hospital_name: '',
    visit_type: 'Consultation',
    reason: '',
    symptoms: '',
    diagnosis: '',
    doctor_notes: '',
    treatment: '',
    prescription_notes: ''
  });

  const [medications, setMedications] = useState([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);

  const [uploadedReports, setUploadedReports] = useState([]);

  const generateInlineAIInsight = async () => {
    if (!patient) return;
    setAnalyzingAI(true);
    try {
      const [pastVisits, pastReports] = await Promise.all([
        api.getMedicalHistory(patient.id),
        api.getAllReports(patient.id)
      ]);
      const res = await aiService.generateClinicalOverview({
        patient,
        visits: pastVisits || [],
        reports: pastReports || [],
        pendingVisit: { ...visitForm, prescription: medications.filter(m => m.name) },
        pendingReports: uploadedReports
      });
      setAiInsight(res);
      showSuccess('AI Clinical Overview updated for this patient.');
    } catch (err) {
      console.warn('AI Clinical analysis error:', err);
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVisitForm(prev => ({ ...prev, [name]: value }));
  };

  const handleMedicationChange = (index, field, value) => {
    const list = [...medications];
    list[index][field] = value;
    setMedications(list);
  };

  const addMedicationRow = () => {
    setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedicationRow = (index) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const newReport = {
        id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        report_name: file.name.replace(/\.[^/.]+$/, ""),
        report_type: 'Blood Test',
        report_date: visitForm.visit_date,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
        file_url: URL.createObjectURL(file),
        rawFile: file
      };
      setUploadedReports(prev => [...prev, newReport]);
    });
  };

  const removeReport = (id) => {
    setUploadedReports(prev => prev.filter(r => r.id !== id));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!visitForm.doctor_name.trim() || !visitForm.hospital_name.trim()) {
        showError('Please enter doctor name and clinic/hospital name.');
        return false;
      }
      if (!visitForm.reason.trim()) {
        showError('Please provide a reason for the consultation.');
        return false;
      }
    } else if (step === 2) {
      if (!visitForm.diagnosis.trim()) {
        showError('Please enter the clinical diagnosis or assessment.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      // 1. Prepare prescriptions
      const activeMeds = medications.filter(m => m.name.trim());

      // 2. Save visit record
      const newVisit = await api.addMedicalVisit(patient?.id, {
        ...visitForm,
        prescription: activeMeds.length > 0 ? activeMeds : null,
        reports: uploadedReports
      });

      // 3. Upload reports to Supabase Storage if configured
      if (uploadedReports.length > 0) {
        for (const rep of uploadedReports) {
          if (rep.rawFile) {
            await api.uploadReport(patient?.id, rep.rawFile, {
              visit_id: newVisit.id,
              report_name: rep.report_name,
              report_type: rep.report_type,
              report_date: rep.report_date
            });
          }
        }
      }

      showSuccess('Visit record and reports added successfully!');
      navigate('/history');
    } catch (err) {
      showError(err.message || 'Failed to save visit record.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Doctor & Clinic' },
    { num: 2, label: 'Clinical Notes' },
    { num: 3, label: 'Upload Reports' },
    { num: 4, label: 'Review & Submit' }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-teal text-xs">Patient Entry</span>
            <span className="text-xs text-[#64748B]">Step {step} of 4</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1C30]">
            Add Doctor Visit & Upload Reports
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Keep your health timeline up-to-date with your latest consultation records.
          </p>
        </div>

        <Link to="/history" className="btn btn-secondary text-xs">
          Cancel
        </Link>
      </div>

      {/* Progress Pills */}
      <div className="card !p-4 shadow-xs border border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-[#0F766E] text-white'
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

      {/* Main Form Card */}
      <div className="card shadow-lg border border-[#E2E8F0] p-6 sm:p-8">
        {/* STEP 1: DOCTOR & CLINIC */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2 pb-3 border-b border-slate-100">
              <Stethoscope className="w-5 h-5 text-[#0F766E]" />
              <span>Step 1 — Doctor & Clinic Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Visit Date *</label>
                <input
                  type="date"
                  name="visit_date"
                  value={visitForm.visit_date}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Visit Type</label>
                <select
                  name="visit_type"
                  value={visitForm.visit_type}
                  onChange={handleInputChange}
                  className="input-field bg-white"
                >
                  <option>Consultation</option>
                  <option>Follow-up</option>
                  <option>Emergency</option>
                  <option>Diagnostic</option>
                  <option>Surgery</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Doctor Name *</label>
                <input
                  type="text"
                  name="doctor_name"
                  value={visitForm.doctor_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. Rahul Sharma"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Specialization</label>
                <select
                  name="specialization"
                  value={visitForm.specialization}
                  onChange={handleInputChange}
                  className="input-field bg-white"
                >
                  <option>Cardiology</option>
                  <option>General Physician</option>
                  <option>Orthopedics</option>
                  <option>Dermatology</option>
                  <option>Neurology</option>
                  <option>Pediatrics</option>
                  <option>ENT</option>
                  <option>Dentistry</option>
                  <option>Gynecology</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Hospital / Clinic Name *</label>
              <input
                type="text"
                name="hospital_name"
                value={visitForm.hospital_name}
                onChange={handleInputChange}
                placeholder="e.g. Apollo Clinic, Bandra"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Reason for Visit *</label>
              <input
                type="text"
                name="reason"
                value={visitForm.reason}
                onChange={handleInputChange}
                placeholder="e.g. Routine cardiac checkup & BP monitoring"
                className="input-field"
                required
              />
            </div>
          </div>
        )}

        {/* STEP 2: CLINICAL NOTES & PRESCRIPTIONS */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-[#0F766E]" />
              <span>Step 2 — Medical Notes & Prescriptions</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Symptoms Experienced</label>
              <textarea
                name="symptoms"
                value={visitForm.symptoms}
                onChange={handleInputChange}
                placeholder="Describe your symptoms (e.g. Mild headache, chest tightness...)"
                className="input-field !min-h-[70px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Doctor's Diagnosis / Assessment *</label>
              <input
                type="text"
                name="diagnosis"
                value={visitForm.diagnosis}
                onChange={handleInputChange}
                placeholder="e.g. Stage 1 Essential Hypertension"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1C30] mb-1">Doctor's Advice & Treatment Plan</label>
              <textarea
                name="treatment"
                value={visitForm.treatment}
                onChange={handleInputChange}
                placeholder="e.g. Low sodium diet, 30 min daily brisk walk..."
                className="input-field !min-h-[70px]"
              />
            </div>

            {/* Prescriptions Sub-section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#0F766E]" />
                  <span className="text-xs font-bold text-[#0B1C30] uppercase tracking-wider">
                    Prescribed Medicines
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addMedicationRow}
                  className="btn btn-secondary !min-h-[32px] !px-3 text-xs flex items-center gap-1 text-[#0F766E]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>

              {medications.map((med, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl relative">
                  <input
                    type="text"
                    placeholder="Medicine Name"
                    value={med.name}
                    onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                    className="input-field !min-h-[38px] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 500mg)"
                    value={med.dosage}
                    onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                    className="input-field !min-h-[38px] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Frequency (e.g. Once daily)"
                    value={med.frequency}
                    onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                    className="input-field !min-h-[38px] text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Duration (e.g. 5 days)"
                      value={med.duration}
                      onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                      className="input-field !min-h-[38px] text-xs"
                    />
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicationRow(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: UPLOAD REPORTS */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2 pb-3 border-b border-slate-100">
              <Upload className="w-5 h-5 text-[#0F766E]" />
              <span>Step 3 — Upload Medical Reports & Diagnostic Files</span>
            </h3>

            {/* Drag and Drop Zone */}
            <div className="border-2 border-dashed border-[#0F766E]/30 bg-teal-50/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-[#0F766E] relative">
              <div className="w-14 h-14 rounded-2xl bg-teal-100/60 text-[#0F766E] flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-sm text-[#0B1C30] mb-1">
                Drag and drop your medical files here
              </h4>
              <p className="text-xs text-[#64748B] max-w-sm mb-4">
                Supported formats: PDF, JPEG, PNG, DOCX (Max 25MB per file)
              </p>

              <label className="btn btn-primary text-xs cursor-pointer shadow-xs">
                <span>Browse Files from Device</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedReports.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[#0B1C30] uppercase tracking-wider">
                  Attached Reports ({uploadedReports.length})
                </h4>

                <div className="space-y-2">
                  {uploadedReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <input
                            type="text"
                            value={report.report_name}
                            onChange={(e) => {
                              const list = uploadedReports.map(r => r.id === report.id ? { ...r, report_name: e.target.value } : r);
                              setUploadedReports(list);
                            }}
                            className="text-xs font-bold text-[#0B1C30] border-b border-transparent focus:border-[#0F766E] outline-none"
                          />
                          <div className="text-[11px] text-[#64748B]">
                            {(report.file_size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={report.report_type}
                          onChange={(e) => {
                            const list = uploadedReports.map(r => r.id === report.id ? { ...r, report_type: e.target.value } : r);
                            setUploadedReports(list);
                          }}
                          className="input-field !min-h-[32px] !py-1 text-xs bg-white w-auto"
                        >
                          <option>Blood Test</option>
                          <option>ECG</option>
                          <option>X-Ray</option>
                          <option>MRI</option>
                          <option>CT Scan</option>
                          <option>Prescription</option>
                          <option>Lab Report</option>
                          <option>Other</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeReport(report.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Clinical Overview & Analysis Widget in Step 3 */}
            <div className="p-4 bg-gradient-to-r from-teal-50/90 via-white to-emerald-50/80 border border-teal-200 rounded-2xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5 text-teal-200" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#0B1C30] flex items-center gap-2">
                      <span>AI Clinical Overview & Health Synthesis</span>
                      <span className="badge badge-teal text-[10px]">Database Analysis</span>
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Analyzes {patient?.full_name || 'Patient'}&apos;s medical history, prescriptions, and attached diagnostic reports.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={generateInlineAIInsight}
                    disabled={analyzingAI}
                    className="btn btn-primary !py-1.5 !px-3 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {analyzingAI ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{aiInsight ? 'Refresh AI Insights' : 'Generate AI Overview'}</span>
                  </button>

                  {aiInsight && (
                    <button
                      type="button"
                      onClick={() => setShowAIModal(true)}
                      className="btn btn-secondary !py-1.5 !px-2.5 text-xs font-semibold text-[#0F766E]"
                    >
                      <span>Full View</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline AI Insight Card */}
              {aiInsight && (
                <div className="pt-3 border-t border-teal-200/60 space-y-2.5 animate-in fade-in">
                  <div className="p-3 bg-white rounded-xl border border-teal-100 text-xs text-[#0B1C30] shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[#0F766E] flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Clinical Intelligence Summary:</span>
                      </span>
                      <span className="text-[10px] text-slate-400">MRN: {aiInsight.patientMRN}</span>
                    </div>
                    <p className="leading-relaxed">{aiInsight.summary}</p>
                  </div>

                  {aiInsight.safetyAlerts.length > 0 && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-rose-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Medication Safety / Allergy Alert ({aiInsight.safetyAlerts.length})</span>
                      </div>
                      {aiInsight.safetyAlerts.map((a, i) => (
                        <div key={i} className="text-rose-700 text-[11px] pl-5">{a.reason}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-[#0B1C30] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#0F766E]" />
                <span>Step 4 — Review & Confirm Visit Record</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAIModal(true)}
                className="btn btn-secondary !border-teal-300 bg-teal-50/70 text-[#0F766E] text-xs flex items-center gap-1.5 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>AI Clinical Overview</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-5 text-xs space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-[#64748B]">Date:</span> <strong className="text-[#0B1C30]">{visitForm.visit_date}</strong></div>
                <div><span className="text-[#64748B]">Type:</span> <strong className="text-[#0B1C30]">{visitForm.visit_type}</strong></div>
                <div><span className="text-[#64748B]">Doctor:</span> <strong className="text-[#0B1C30]">{visitForm.doctor_name}</strong></div>
                <div><span className="text-[#64748B]">Specialty:</span> <strong className="text-[#0B1C30]">{visitForm.specialization}</strong></div>
                <div className="col-span-2"><span className="text-[#64748B]">Hospital:</span> <strong className="text-[#0B1C30]">{visitForm.hospital_name}</strong></div>
                <div className="col-span-2"><span className="text-[#64748B]">Diagnosis:</span> <strong className="text-[#0B1C30]">{visitForm.diagnosis}</strong></div>
              </div>

              {uploadedReports.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[#64748B] block mb-1 font-medium">Attached Reports ({uploadedReports.length}):</span>
                  <div className="flex flex-wrap gap-2">
                    {uploadedReports.map(r => (
                      <span key={r.id} className="badge badge-teal text-xs">
                        {r.report_name} ({r.report_type})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiInsight && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[#0F766E] block mb-1 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Clinical Assessment:</span>
                  </span>
                  <p className="text-slate-700">{aiInsight.summary}</p>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <span>
                This consultation entry and attached diagnostic files will be stored in your encrypted medical timeline.
              </span>
            </div>
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep()) setStep(s => s + 1);
              }}
              className="btn btn-primary text-xs flex items-center gap-1.5 ml-auto"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary text-xs flex items-center gap-1.5 ml-auto shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Visit & Reports</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI Clinical Overview Modal */}
      <AIClinicalOverviewModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        patient={patient}
        visits={[]}
        reports={[]}
        pendingVisit={{ ...visitForm, prescription: medications.filter(m => m.name) }}
        pendingReports={uploadedReports}
      />
    </div>
  );
}
