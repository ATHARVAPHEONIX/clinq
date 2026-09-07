import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  PlusCircle, 
  FileText, 
  Calendar, 
  Stethoscope, 
  Building2, 
  ChevronRight, 
  ExternalLink,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ReportViewerModal from '../components/ReportViewerModal';

export default function MedicalHistory() {
  const { patient } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Newest first, 'asc' = Oldest first
  const [filterSpecialization, setFilterSpecialization] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await api.getMedicalHistory(patient?.id);
        setVisits(data || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [patient?.id]);

  // Unique specializations for filter dropdown
  const specializations = ['All', ...new Set(visits.map(v => v.specialization || 'General').filter(Boolean))];

  // Search & Filter & Sort Logic
  const filteredVisits = visits
    .filter(visit => {
      const matchesSearch = 
        (visit.doctor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.hospital_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.diagnosis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.symptoms || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSpec = filterSpecialization === 'All' || (visit.specialization || 'General') === filterSpecialization;
      return matchesSearch && matchesSpec;
    })
    .sort((a, b) => {
      const dateA = new Date(a.visit_date).getTime();
      const dateB = new Date(b.visit_date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-teal text-xs">Medical Records</span>
            <span className="text-xs text-[#64748B]">Sorted: Newest First</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1C30]">
            Complete Medical History
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Every clinical visit and doctor consultation in chronological timeline order.
          </p>
        </div>

        <button
          onClick={() => navigate('/add-visit')}
          className="btn btn-primary text-xs flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Visit Record</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor, clinic, diagnosis, or symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field !pl-10 !min-h-[42px] text-xs"
          />
        </div>

        {/* Filter by Specialization */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Specialty:</span>
          </div>
          <select
            value={filterSpecialization}
            onChange={(e) => setFilterSpecialization(e.target.value)}
            className="input-field !min-h-[42px] !w-auto text-xs py-1 px-3 bg-white"
          >
            {specializations.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
            className="btn btn-secondary !min-h-[42px] !px-3 text-xs flex items-center gap-1.5"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Timeline List */}
      {filteredVisits.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-[#0B1C30] mb-1">No medical visits found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mb-6">
            {searchQuery 
              ? `No visits matching "${searchQuery}". Try changing your search filters.`
              : 'Your doctor visits and prescriptions will appear here once you record your first visit.'}
          </p>
          <button
            onClick={() => navigate('/add-visit')}
            className="btn btn-primary text-xs flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add First Visit</span>
          </button>
        </div>
      ) : (
        <div className="relative border-l-2 border-[#E2E8F0] ml-4 sm:ml-6 space-y-8 pb-12 pt-2">
          {filteredVisits.map((visit, index) => (
            <div key={visit.id} className="relative pl-6 sm:pl-10 group">
              {/* Timeline Connector Dot */}
              <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-[#0F766E] border-4 border-[#FAF8FF] shadow-xs group-hover:scale-125 transition-transform" />

              {/* Date Header Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold uppercase tracking-wider mb-2.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{visit.visit_date}</span>
                {index === 0 && sortOrder === 'desc' && (
                  <span className="ml-1 px-1.5 py-0.2 bg-[#0F766E] text-white text-[9px] rounded-full">
                    Latest
                  </span>
                )}
              </div>

              {/* Visit Card */}
              <div className="card hover:border-[#0F766E]/40 hover:shadow-md transition-all p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-[#0B1C30] flex items-center gap-2">
                      <span>{visit.doctor_name}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
                      <span className="font-medium text-[#0F766E]">{visit.specialization || 'Consultation'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {visit.hospital_name}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/history/${visit.id}`}
                    className="btn btn-secondary !min-h-[36px] !px-3.5 text-xs font-semibold flex items-center gap-1.5 self-start"
                  >
                    <span>View Visit Details</span>
                    <ChevronRight className="w-4 h-4 text-[#64748B]" />
                  </Link>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold text-[#0B1C30] uppercase tracking-wider text-[10px] text-slate-400">
                      Reason for Visit
                    </span>
                    <p className="text-[#0B1C30] font-medium">{visit.reason}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-[#0B1C30] uppercase tracking-wider text-[10px] text-slate-400">
                      Diagnosis & Assessment
                    </span>
                    <p className="text-[#0B1C30] font-medium">{visit.diagnosis}</p>
                  </div>
                </div>

                {/* Prescription preview */}
                {visit.prescription && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Prescribed Medications
                    </span>
                    <div className="text-slate-800 font-medium">
                      {Array.isArray(visit.prescription) 
                        ? visit.prescription.map(m => m.name).join(', ')
                        : typeof visit.prescription === 'string'
                        ? visit.prescription
                        : 'Medications noted'}
                    </div>
                  </div>
                )}

                {/* Attached Reports */}
                {visit.reports && visit.reports.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Attached Reports & Documents ({visit.reports.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {visit.reports.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => setSelectedReport({
                            ...report,
                            doctor_name: visit.doctor_name,
                            hospital_name: visit.hospital_name,
                            visit_date: visit.visit_date
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-100 text-[#0F766E] text-xs font-semibold hover:bg-teal-100 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{report.report_name || report.file_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedReport && (
        <ReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
