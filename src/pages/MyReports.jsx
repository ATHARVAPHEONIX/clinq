import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  PlusCircle, 
  Upload, 
  Calendar, 
  HardDrive, 
  Building2,
  FolderOpen,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ReportViewerModal from '../components/ReportViewerModal';

export default function MyReports() {
  const { patient } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await api.getAllReports(patient?.id);
        setReports(data || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [patient?.id]);

  const reportTypes = ['All', 'Blood Test', 'ECG', 'X-Ray', 'MRI', 'CT Scan', 'Prescription', 'Lab Report', 'Other'];

  const filteredReports = reports
    .filter(rep => {
      const nameMatch = (rep.report_name || rep.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rep.doctor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rep.hospital_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const typeMatch = filterType === 'All' || rep.report_type === filterType;
      return nameMatch && typeMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.report_date || a.uploaded_at).getTime();
      const dateB = new Date(b.report_date || b.uploaded_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const formatFileSize = (bytes) => {
    if (!bytes) return '1.2 MB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDownload = (rep) => {
    const link = document.createElement('a');
    link.href = rep.file_url;
    link.download = rep.file_name || `${rep.report_name}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-teal text-xs">Document Repository</span>
            <span className="text-xs text-[#64748B]">Total: {reports.length} files</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1C30]">
            My Medical Reports & Documents
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            View, preview, and download all diagnostic files attached to your medical history.
          </p>
        </div>

        <button
          onClick={() => navigate('/add-visit')}
          className="btn btn-primary text-xs flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Report</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by report name, doctor or clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field !pl-10 !min-h-[42px] text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <Filter className="w-3.5 h-3.5" />
            <span>Type:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field !min-h-[42px] !w-auto text-xs py-1 px-3 bg-white"
          >
            {reportTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
            className="btn btn-secondary !min-h-[42px] !px-3 text-xs flex items-center gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-[#0B1C30] mb-1">No medical reports found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mb-6">
            {searchQuery 
              ? `No reports matching "${searchQuery}".`
              : 'Upload your medical reports and test results to keep your health data centralized.'}
          </p>
          <button
            onClick={() => navigate('/add-visit')}
            className="btn btn-primary text-xs flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload First Report</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="card hover:border-[#0F766E]/40 hover:shadow-md transition-all p-5 flex flex-col justify-between group space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="badge badge-teal text-[10px]">
                    {report.report_type || 'Report'}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#0B1C30] line-clamp-1 group-hover:text-[#0F766E] transition-colors">
                  {report.report_name || report.file_name}
                </h3>

                <div className="space-y-1.5 mt-3 text-xs text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Report Date: {report.report_date || '12 Aug 2026'}</span>
                  </div>
                  {report.doctor_name && (
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{report.doctor_name} • {report.hospital_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatFileSize(report.file_size)} • {report.mime_type || 'PDF'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setSelectedReport(report)}
                  className="flex-1 btn btn-secondary !min-h-[36px] !py-1 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleDownload(report)}
                  className="btn btn-secondary !min-h-[36px] !px-3 text-xs"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
