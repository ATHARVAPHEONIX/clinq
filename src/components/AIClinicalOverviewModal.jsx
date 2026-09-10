import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Pill, 
  Activity, 
  Heart, 
  Calendar, 
  TrendingUp, 
  Copy, 
  Printer, 
  Stethoscope,
  Info,
  ChevronRight
} from 'lucide-react';
import { aiService } from '../services/aiService';

export default function AIClinicalOverviewModal({ 
  isOpen, 
  onClose, 
  patient, 
  visits = [], 
  reports = [], 
  pendingVisit = null, 
  pendingReports = [] 
}) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && patient) {
      setLoading(true);
      aiService.generateClinicalOverview({
        patient,
        visits,
        reports,
        pendingVisit,
        pendingReports
      }).then(data => {
        setOverview(data);
        setLoading(false);
      }).catch(err => {
        console.error('AI Overview generation error:', err);
        setLoading(false);
      });
    }
  }, [isOpen, patient, visits.length, reports.length]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!overview) return;
    const textToCopy = "CareTrack AI Clinical Overview for " + overview.patientName + " (MRN: " + overview.patientMRN + ")\n" +
      "Generated: " + new Date(overview.generatedAt).toLocaleDateString() + "\n" +
      "Health Score: " + overview.healthScore + "/100 | Risk: " + overview.riskLevel + "\n\n" +
      "SUMMARY:\n" + overview.summary + "\n\n" +
      "KEY RECOMMENDATIONS:\n" + overview.recommendations.map(r => "- " + r.title + ": " + r.desc).join('\n') + "\n\n" +
      "SAFETY ALERTS:\n" + (overview.safetyAlerts.length > 0 ? overview.safetyAlerts.map(a => "! " + a.type + " (" + a.severity + "): " + a.reason).join('\n') : 'No adverse contraindications detected.');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0F766E] to-[#115E59] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-teal-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">CareTrack AI Clinical Intelligence</h3>
                <span className="bg-teal-400/20 text-teal-100 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-teal-300/30">
                  Database Synthesis
                </span>
              </div>
              <p className="text-[11px] text-teal-100">
                Isolated clinical analysis derived strictly from {patient?.full_name || 'Patient'}&apos;s medical database records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy Summary to Clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center animate-spin">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#0B1C30]">Synthesizing Patient Clinical Intelligence...</h4>
              <p className="text-xs text-[#64748B] max-w-sm">
                Evaluating {visits.length} doctor visits, {reports.length} diagnostic reports, and checking medication contraindications.
              </p>
            </div>
          ) : overview ? (
            <>
              {/* Patient Banner & Metric Badges */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#0B1C30]">{overview.patientName}</h4>
                    <span className="badge badge-teal text-[11px]">{overview.patientMRN}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B] flex-wrap">
                    <span>Blood: <strong className="text-[#0B1C30]">{patient?.blood_group || 'O+'}</strong></span>
                    <span>•</span>
                    <span>Gender: <strong className="text-[#0B1C30]">{patient?.gender || 'Male'}</strong></span>
                    <span>•</span>
                    <span>Allergies: <strong className="text-rose-700">{patient?.allergies || 'None'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Health Index</div>
                    <div className="text-xl font-bold text-[#0F766E]">{overview.healthScore}/100</div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                    overview.riskLevel.includes('Attention')
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : overview.riskLevel.includes('Moderate')
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <Activity className="w-3.5 h-3.5" />
                    <span>{overview.riskLevel}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'summary'
                      ? 'text-[#0F766E] border-b-2 border-[#0F766E]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Executive Summary</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'reports'
                      ? 'text-[#0F766E] border-b-2 border-[#0F766E]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Diagnostic Findings ({overview.reportsAnalyzedCount})</span>
                </button>

                <button
                  onClick={() => setActiveTab('safety')}
                  className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'safety'
                      ? 'text-[#0F766E] border-b-2 border-[#0F766E]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Pill className="w-4 h-4" />
                  <span>Medication Safety ({overview.safetyAlerts.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'recommendations'
                      ? 'text-[#0F766E] border-b-2 border-[#0F766E]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Care Plan</span>
                </button>
              </div>

              {/* Tab 1: Executive Summary */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl text-xs text-[#0B1C30] leading-relaxed">
                    <p className="font-medium">{overview.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Consultations</div>
                      <div className="text-xl font-bold text-[#0B1C30] mt-1">{overview.visitsAnalyzedCount}</div>
                      <div className="text-[10px] text-teal-700 mt-0.5">Chronologically analyzed</div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Lab Reports</div>
                      <div className="text-xl font-bold text-[#0B1C30] mt-1">{overview.reportsAnalyzedCount}</div>
                      <div className="text-[10px] text-teal-700 mt-0.5">Diagnostics indexed</div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Prescriptions</div>
                      <div className="text-xl font-bold text-[#0B1C30] mt-1">{overview.activeMedicationsCount}</div>
                      <div className="text-[10px] text-teal-700 mt-0.5">Checked for safety</div>
                    </div>
                  </div>

                  {overview.recentDiagnoses.length > 0 && (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <h5 className="font-bold text-xs text-[#0B1C30] uppercase tracking-wider">
                        Documented Clinical Diagnoses
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {overview.recentDiagnoses.map((diag, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold">
                            {diag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Diagnostic Findings */}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {overview.reportFindings.map((finding, idx) => (
                    <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#0F766E]" />
                          <h5 className="font-bold text-xs text-[#0B1C30]">{finding.category}</h5>
                        </div>
                        <span className="badge badge-teal text-[10px]">{finding.status}</span>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {finding.summary}
                      </p>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {finding.keyMetrics.map((m, mIdx) => (
                          <div key={mIdx} className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-lg">
                            <span className="font-medium text-[#0B1C30]">{m.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{m.notes}</span>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded text-[10px]">
                                {m.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Medication Safety */}
              {activeTab === 'safety' && (
                <div className="space-y-4">
                  {overview.safetyAlerts.length > 0 ? (
                    overview.safetyAlerts.map((alert, idx) => (
                      <div key={idx} className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{alert.type} — Severity: {alert.severity}</span>
                        </div>
                        <p className="text-xs text-rose-800">{alert.reason}</p>
                        <div className="text-[11px] text-rose-700 font-medium">Medication: {alert.medication}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <h5 className="font-bold text-xs text-emerald-900">No Medication Contraindications Detected</h5>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Prescribed medicines were cross-referenced against recorded allergies ({patient?.allergies || 'None'}) and chronic morbidities.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Care Plan Recommendations */}
              {activeTab === 'recommendations' && (
                <div className="space-y-3">
                  {overview.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                      <h5 className="font-bold text-xs text-[#0B1C30] flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-[#0F766E]" />
                        <span>{rec.title}</span>
                      </h5>
                      <p className="text-xs text-[#64748B] pl-5 leading-relaxed">
                        {rec.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Unable to generate clinical overview. Please ensure patient data is available.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Strict patient data isolation active</span>
          </div>

          <button
            onClick={onClose}
            className="btn btn-primary !py-1.5 !px-4 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
