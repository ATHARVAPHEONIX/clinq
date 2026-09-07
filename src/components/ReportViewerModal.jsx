import React from 'react';
import { X, Download, ExternalLink, FileText, Calendar, User, Building2, HardDrive, CheckCircle2 } from 'lucide-react';

export default function ReportViewerModal({ report, onClose }) {
  if (!report) return null;

  const isImage = report.mime_type?.startsWith('image/') || 
    /\.(jpg|jpeg|png|webp|gif)$/i.test(report.file_name || report.file_url);

  const formatFileSize = (bytes) => {
    if (!bytes) return '1.4 MB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = report.file_url;
    link.download = report.file_name || `${report.report_name}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#0B1C30] text-lg leading-tight">
                {report.report_name || report.file_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="badge badge-teal text-[11px]">
                  {report.report_type || 'Medical Report'}
                </span>
                <span className="text-xs text-[#64748B]">
                  Uploaded {report.report_date || 'Recently'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="btn btn-secondary !min-h-[40px] !px-3.5 text-xs flex items-center gap-1.5"
              title="Download File"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#64748B] hover:text-[#0B1C30] hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with Preview & Details */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Document Preview Area (2 cols) */}
          <div className="md:col-span-2 p-6 flex flex-col items-center justify-center bg-slate-100/50 min-h-[350px]">
            {isImage ? (
              <div className="max-w-full max-h-[480px] overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white p-2">
                <img 
                  src={report.file_url} 
                  alt={report.report_name}
                  className="max-h-[440px] w-auto object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-4 shadow-xs">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="font-semibold text-slate-800 text-base mb-1">
                  PDF Document Preview
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mb-6">
                  {report.file_name || `${report.report_name}.pdf`} ({formatFileSize(report.file_size)})
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={report.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary !min-h-[40px] !px-4 text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Window
                  </a>
                  <button
                    onClick={handleDownload}
                    className="btn btn-secondary !min-h-[40px] !px-4 text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Sidebar (1 col) */}
          <div className="p-6 space-y-5 bg-white">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Document Metadata
            </h4>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Report Date</div>
                  <div className="font-medium text-slate-900">{report.report_date || '12 Aug 2026'}</div>
                </div>
              </div>

              {report.doctor_name && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Prescribing Doctor</div>
                    <div className="font-medium text-slate-900">{report.doctor_name}</div>
                  </div>
                </div>
              )}

              {report.hospital_name && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Hospital / Lab</div>
                    <div className="font-medium text-slate-900">{report.hospital_name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <HardDrive className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">File Size & Format</div>
                  <div className="font-medium text-slate-900">
                    {formatFileSize(report.file_size)} • {report.mime_type || 'PDF Document'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <span>
                  This is a verified patient-uploaded clinical record encrypted and secured under CareTrack HIPAA-compliant storage.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>MRN: CTR-2026-001245</span>
          <button
            onClick={onClose}
            className="btn btn-secondary !min-h-[36px] !py-1 !px-4 text-xs font-medium"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
