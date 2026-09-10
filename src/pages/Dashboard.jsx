import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  History, 
  PlusCircle, 
  FileText, 
  Calendar, 
  Building2, 
  Stethoscope, 
  ArrowRight, 
  ExternalLink, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Download,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ReportViewerModal from '../components/ReportViewerModal';
import AIClinicalOverviewModal from '../components/AIClinicalOverviewModal';

export default function Dashboard() {
  const { patient, user } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [visitList, reportList] = await Promise.all([
          api.getMedicalHistory(patient?.id),
          api.getAllReports(patient?.id)
        ]);
        setVisits(visitList || []);
        setReports(reportList || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [patient?.id]);

  const patientName = patient?.full_name || 'Rahul Sharma';
  const lastVisit = visits[0];
  const upcomingVisitDate = '20 Sep 2026';

  const quickActions = [
    { 
      path: '/profile', 
      label: 'My Profile', 
      desc: 'View and update your personal & emergency details.', 
      icon: User,
      color: 'bg-teal-50 text-[#0F766E] border-teal-100'
    },
    { 
      path: '/history', 
      label: 'Medical History', 
      desc: 'View your previous doctor visits & diagnoses chronologically.', 
      icon: History,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    },
    { 
      path: '/add-visit', 
      label: 'Add Visit Report', 
      desc: 'Log a recent doctor consultation & upload medical files.', 
      icon: PlusCircle,
      color: 'bg-amber-50 text-amber-700 border-amber-100'
    },
    { 
      path: '/reports', 
      label: 'My Reports', 
      desc: 'Access your lab tests, ECGs, MRIs & prescriptions.', 
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-100'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="card !p-8 bg-gradient-to-r from-white via-white to-teal-50/50 border border-[#E2E8F0] relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-teal text-xs font-semibold">CareTrack Portal</span>
            <span className="text-xs text-[#64748B]">MRN: {patient?.patient_id_mrn || 'CTR-2026-001245'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1C30]">
            Good Morning, {patientName.split(' ')[0]} 👋
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">
            Manage your personal healthcare records, doctor consultations, prescriptions, and lab reports securely in one unified timeline.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/add-visit')}
              className="btn btn-primary text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Visit Report</span>
            </button>
            <button
              onClick={() => setShowAIModal(true)}
              className="btn btn-secondary !border-teal-300 bg-teal-50/70 hover:bg-teal-100 text-[#0F766E] text-xs flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#0F766E] animate-pulse" />
              <span>AI Clinical Insights</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="btn btn-secondary text-xs flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>View Full Timeline</span>
            </button>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="hidden lg:block absolute -right-6 -bottom-10 w-64 h-64 bg-teal-100/40 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Health Summary Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#0B1C30]">Health Record Summary</h2>
          <span className="text-xs text-[#64748B]">Last updated today</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="card p-5 flex flex-col justify-between border-l-4 border-l-[#0F766E]">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Doctor Visits
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B1C30]">{visits.length || 3}</span>
              <span className="text-xs text-[#0F766E] font-medium">recorded</span>
            </div>
            <div className="mt-3 text-[11px] text-[#64748B] flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Chronologically sorted</span>
            </div>
          </div>

          <div className="card p-5 flex flex-col justify-between border-l-4 border-l-secondary">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Medical Reports
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B1C30]">{reports.length || 4}</span>
              <span className="text-xs text-secondary font-medium">files</span>
            </div>
            <div className="mt-3 text-[11px] text-[#64748B] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-secondary" />
              <span>Encrypted storage</span>
            </div>
          </div>

          <div className="card p-5 flex flex-col justify-between border-l-4 border-l-emerald-500">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Last Doctor Visit
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-[#0B1C30]">
                {lastVisit ? lastVisit.visit_date : '12 Aug 2026'}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-[#64748B] truncate flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{lastVisit?.doctor_name || 'Dr. Rahul Sharma'}</span>
            </div>
          </div>

          <div className="card p-5 flex flex-col justify-between border-l-4 border-l-amber-500">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Upcoming Follow-up
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-[#0B1C30]">{upcomingVisitDate}</span>
            </div>
            <div className="mt-3 text-[11px] text-amber-700 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Cardiology Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="text-base font-bold text-[#0B1C30] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <div
                key={i}
                onClick={() => navigate(action.path)}
                className="card cursor-pointer hover:border-[#0F766E] hover:shadow-md transition-all group p-5 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border transition-colors ${action.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-[#0B1C30] group-hover:text-[#0F766E] transition-colors flex items-center justify-between">
                    <span>{action.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{action.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Medical History Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1C30]">Recent Medical History</h2>
            <p className="text-xs text-[#64748B]">Showing latest recorded clinical consultations</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center gap-1"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          {visits.slice(0, 3).map((visit) => (
            <div
              key={visit.id}
              className="card hover:border-slate-300 transition-all p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge badge-teal text-[11px] font-semibold">
                    {visit.visit_date}
                  </span>
                  <span className="badge badge-gray text-[11px]">
                    {visit.specialization || 'Consultation'}
                  </span>
                  <span className="text-xs text-[#64748B]">
                    {visit.hospital_name}
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#0B1C30] flex items-center gap-2">
                  <span>{visit.doctor_name}</span>
                </h3>

                <div className="text-xs text-[#64748B] space-y-1">
                  <div>
                    <strong className="text-[#0B1C30]">Reason: </strong>
                    {visit.reason}
                  </div>
                  <div>
                    <strong className="text-[#0B1C30]">Diagnosis: </strong>
                    {visit.diagnosis}
                  </div>
                </div>

                {/* Attached Reports Pill preview */}
                {visit.reports && visit.reports.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2 items-center">
                    <span className="text-[11px] text-[#64748B] font-medium">Reports:</span>
                    {visit.reports.map((rep) => (
                      <button
                        key={rep.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport({ ...rep, doctor_name: visit.doctor_name, hospital_name: visit.hospital_name });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100 text-[#0F766E] text-[11px] font-medium hover:bg-teal-100 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{rep.report_name || rep.file_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col items-end gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <span className="text-xs text-[#64748B] hidden sm:block">
                  {visit.reports?.length || 0} document{visit.reports?.length === 1 ? '' : 's'}
                </span>
                <Link
                  to={`/history/${visit.id}`}
                  className="btn btn-secondary !min-h-[38px] !px-4 text-xs font-semibold w-full sm:w-auto flex items-center justify-center gap-1.5"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {/* AI Clinical Overview Modal */}
      <AIClinicalOverviewModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        patient={patient}
        visits={visits}
        reports={reports}
      />
    </div>
  );
}
