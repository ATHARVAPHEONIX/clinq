import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  FileText, 
  PlusCircle, 
  User, 
  Settings as SettingsIcon, 
  LogOut, 
  Bell, 
  Menu, 
  X, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Layout() {
  const { patient, user, logout, isSupabaseConfigured } = useAuth();
  const { showInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notifications = [
    { id: 1, title: 'Report Verified', text: 'Blood test report from Apollo Clinic has been verified.', time: '2h ago', unread: true },
    { id: 2, title: 'Upcoming Visit Reminder', text: 'Cardiology follow-up scheduled for 20 Sep 2026.', time: '1d ago', unread: false },
    { id: 3, title: 'Profile Updated', text: 'Emergency contact information was updated.', time: '3d ago', unread: false }
  ];

  const handleLogout = async () => {
    await logout();
    showInfo('You have been logged out securely.');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', label: 'Medical History', icon: History },
    { path: '/reports', label: 'My Reports', icon: FileText },
    { path: '/add-visit', label: 'Add Visit Report', icon: PlusCircle },
    { path: '/profile', label: 'My Profile', icon: User },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const patientName = patient?.full_name || 'Rahul Sharma';
  const patientMRN = patient?.patient_id_mrn || 'CTR-2026-001245';
  const patientEmail = patient?.email || user?.email || 'patient@example.com';
  const initials = patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen bg-[#FAF8FF] overflow-hidden text-[#0B1C30]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-[#E2E8F0] flex-col shrink-0 z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#E2E8F0]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-teal-900/10">
              CT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#0B1C30]">CareTrack</span>
                <span className="badge badge-teal text-[10px] uppercase font-bold tracking-wider">Patient</span>
              </div>
              <p className="text-xs text-[#64748B]">Clinical EMR Companion</p>
            </div>
          </div>
        </div>

        {/* Patient Quick Card in Sidebar */}
        <div className="px-4 py-3 m-4 rounded-xl bg-[#FAF8FF] border border-[#E2E8F0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-[#0B1C30] truncate">{patientName}</div>
            <div className="text-[11px] text-[#0F766E] font-mono tracking-tight font-medium">{patientMRN}</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Main Portal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#0F766E] text-white shadow-xs shadow-teal-900/10'
                      : 'text-[#64748B] hover:bg-slate-50 hover:text-[#0B1C30]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Upload CTA */}
        <div className="p-4 mx-4 mb-3 rounded-2xl bg-teal-50/60 border border-teal-100/80">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            <span className="text-xs font-semibold text-[#0F766E]">Need to upload reports?</span>
          </div>
          <p className="text-[11px] text-[#64748B] mb-3">
            Add your prescriptions and lab reports directly to your timeline.
          </p>
          <button
            onClick={() => navigate('/add-visit')}
            className="w-full btn btn-primary !min-h-[38px] !text-xs !py-1.5 font-semibold flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Add New Record
          </button>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between">
          <div className="text-[11px] text-[#94A3B8]">
            CareTrack EMR v2.4
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-18 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 z-20">
          {/* Mobile Menu Button & Mobile Title */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-[#64748B] hover:text-[#0B1C30] rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-[#0B1C30]">CareTrack</span>
              <span className="badge badge-teal text-[10px]">Patient</span>
            </div>
          </div>

          {/* Desktop Search / Status Indicator */}
          <div className="hidden lg:flex items-center gap-3">
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected to Supabase PostgreSQL & Auth</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Demo Sandbox Mode (Fully Interactive)</span>
              </div>
            )}
          </div>

          {/* Top Actions: Notification & Profile */}
          <div className="flex items-center gap-3">
            {/* Notification Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 hover:text-[#0B1C30] transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                    <h4 className="font-semibold text-sm text-[#0B1C30]">Notifications</h4>
                    <span className="text-xs text-[#0F766E] font-medium cursor-pointer hover:underline">
                      Mark all as read
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto py-1">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-3 px-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#0B1C30]">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-[#94A3B8] font-normal">{n.time}</span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Trigger */}
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 pl-2 py-1 pr-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-[#E2E8F0]"
            >
              <div className="w-9 h-9 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-[#0B1C30] leading-tight">{patientName}</div>
                <div className="text-[10px] text-[#64748B]">{patientMRN}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-16 lg:pb-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[80vw] bg-white h-full flex flex-col z-10 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-6 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-base">
                  CT
                </div>
                <div>
                  <div className="font-bold text-base">CareTrack</div>
                  <div className="text-xs text-[#64748B]">Patient Companion</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0B1C30]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full btn btn-secondary text-rose-600 !min-h-[44px] flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
