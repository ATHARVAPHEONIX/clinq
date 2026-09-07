import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building2, 
  Stethoscope, 
  Pill, 
  FileText, 
  Download, 
  ExternalLink,
  ShieldCheck,
  Clock,
  Printer
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ReportViewerModal from '../components/ReportViewerModal';

export default function VisitDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patient } = useAuth();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const visits = await api.getMedicalHistory(patient?.id);
        const found = visits.find(v => String(v.id) === String(id)) || visits[0];
        setVisit(found);
      } catch (err) {
        console.error('Error fetching visit details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVisit();
  }, [id, patient?.id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#64748B]">
        Loading clinical visit details...
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <h3 className="font-bold text-lg mb-2">Visit record not found</h3>
        <p className="text-xs text-[#64748B] mb-4">The medical visit you are looking for does not exist or has been removed.</p>
        <Link to="/history" className="btn btn-primary text-xs">Return to History</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Medical History</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-secondary !min-h-[38px] !px-3.5 text-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* Main Visit Card */}
      <div className="card p-6 sm:p-8 space-y-6 shadow-md border border-[#E2E8F0]">
        {/* Visit Information Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="badge badge-teal text-xs font-bold">
                {visit.visit_date}
              </span>
              <span className="badge badge-gray text-xs">
                {visit.visit_type || 'Consultation'}
              </span>
              <span className="text-xs text-[#64748B] font-mono">
                Ref: #{visit.id}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0B1C30]">
              {visit.doctor_name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#64748B] mt-1">
              <span className="font-semibold text-[#0F766E]">{visit.specialization || 'Clinical Specialist'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {visit.hospital_name}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#FAF8FF] border border-[#E2E8F0] rounded-xl text-xs text-right sm:self-center">
            <div className="text-[10px] uppercase font-semibold text-[#64748B]">Patient MRN</div>
            <div className="font-mono font-bold text-[#0B1C30]">{patient?.patient_id_mrn || 'CTR-2026-001245'}</div>
          </div>
        </div>

        {/* Symptoms & Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Symptoms / Reason for Visit
            </h3>
            <p className="text-xs text-slate-900 font-medium leading-relaxed">
              {visit.symptoms || visit.reason || 'Routine follow up.'}
            </p>
          </div>

          <div className="p-4 bg-teal-50/60 border border-teal-100 rounded-xl space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
              Clinical Diagnosis
            </h3>
            <p className="text-xs text-slate-900 font-semibold leading-relaxed">
              {visit.diagnosis}
            </p>
          </div>
        </div>

        {/* Doctor Notes */}
        {visit.doctor_notes && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Doctor's Remarks & Clinical Notes
            </h3>
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl text-xs text-slate-800 leading-relaxed">
              {visit.doctor_notes}
            </div>
          </div>
        )}

        {/* Prescription Table */}
        {visit.prescription && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#0F766E]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1C30]">
                Prescribed Medications
              </h3>
            </div>

            {Array.isArray(visit.prescription) ? (
              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Dosage</th>
                      <th className="p-3">Frequency</th>
                      <th className="p-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visit.prescription.map((med, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-[#0B1C30]">{med.name}</td>
                        <td className="p-3 text-[#64748B]">{med.dosage}</td>
                        <td className="p-3 text-[#64748B]">{med.frequency}</td>
                        <td className="p-3 font-medium text-[#0F766E]">{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-xs font-medium text-slate-800">
                {visit.prescription}
              </div>
            )}

            {visit.prescription_notes && (
              <p className="text-[11px] text-[#64748B] italic">
                Note: {visit.prescription_notes}
              </p>
            )}
          </div>
        )}

        {/* Attached Medical Reports */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0F766E]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1C30]">
                Attached Medical Reports & Diagnostic Files ({visit.reports?.length || 0})
              </h3>
            </div>
          </div>

          {visit.reports && visit.reports.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visit.reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#0F766E] transition-all bg-white flex items-center justify-between group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-[#0B1C30] truncate">
                        {report.report_name || report.file_name}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {report.report_type} • {report.report_date}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => setSelectedReport({
                        ...report,
                        doctor_name: visit.doctor_name,
                        hospital_name: visit.hospital_name,
                        visit_date: visit.visit_date
                      })}
                      className="btn btn-secondary !min-h-[32px] !px-2.5 text-[11px] font-semibold"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#64748B] italic">No documents attached to this visit record.</p>
          )}
        </div>
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
