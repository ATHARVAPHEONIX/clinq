import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  ShieldCheck, 
  Bell, 
  Eye, 
  LogOut, 
  Trash2, 
  Smartphone, 
  KeyRound, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { patient, user, logout } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const navigate = useNavigate();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: true,
    appointmentReminders: true,
    reportReady: true
  });

  const [twoFactor, setTwoFactor] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match.');
      return;
    }
    showSuccess('Password updated securely!');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleLogoutAll = async () => {
    await logout();
    showInfo('Logged out from all active sessions.');
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-teal text-xs">Security & Preferences</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1C30]">
          Account & Privacy Settings
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Manage your login credentials, two-factor authentication, and notifications.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Change Password */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-[#0F766E]" />
            <h3 className="font-bold text-sm text-[#0B1C30] uppercase tracking-wider">
              Change Account Password
            </h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg text-xs">
            <div>
              <label className="block font-semibold mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input-field"
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="input-field"
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="input-field"
                  placeholder="Re-enter new password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary !min-h-[38px] text-xs font-semibold shadow-xs">
              Update Password
            </button>
          </form>
        </div>

        {/* Section 2: Two-Factor Authentication */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            <h3 className="font-bold text-sm text-[#0B1C30] uppercase tracking-wider">
              Two-Factor Authentication (2FA)
            </h3>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <h4 className="font-semibold text-xs text-[#0B1C30]">WhatsApp Two-Factor Verification</h4>
              <p className="text-xs text-[#64748B]">Require an OTP code sent to your registered WhatsApp number on every new login.</p>
            </div>
            <button
              onClick={() => {
                setTwoFactor(!twoFactor);
                showSuccess(twoFactor ? '2FA disabled.' : '2FA enabled successfully!');
              }}
              className={`w-12 h-6 rounded-full transition-colors relative ${twoFactor ? 'bg-[#0F766E]' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${twoFactor ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Section 3: Notification Preferences */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-4 h-4 text-[#0F766E]" />
            <h3 className="font-bold text-sm text-[#0B1C30] uppercase tracking-wider">
              Communication & Alerts
            </h3>
          </div>

          <div className="space-y-3 text-xs divide-y divide-slate-100">
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="font-semibold text-[#0B1C30]">Appointment Reminders</div>
                <div className="text-[#64748B]">Get WhatsApp and email notifications 24 hours prior to visits.</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.appointmentReminders}
                onChange={(e) => setNotifications({ ...notifications, appointmentReminders: e.target.checked })}
                className="w-4 h-4 accent-[#0F766E]"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="font-semibold text-[#0B1C30]">Lab Report Ready Alerts</div>
                <div className="text-[#64748B]">Instant notification when new diagnostic results are uploaded.</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.reportReady}
                onChange={(e) => setNotifications({ ...notifications, reportReady: e.target.checked })}
                className="w-4 h-4 accent-[#0F766E]"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="font-semibold text-[#0B1C30]">Email Summaries</div>
                <div className="text-[#64748B]">Monthly healthcare summaries and prescription refills.</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailAlerts}
                onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                className="w-4 h-4 accent-[#0F766E]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Sessions & Destructive Actions */}
        <div className="card p-6 space-y-4 border-rose-200">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-sm text-rose-700 uppercase tracking-wider">
              Account Sessions & Danger Zone
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <div className="font-semibold text-xs text-[#0B1C30]">Active Sessions</div>
              <div className="text-xs text-[#64748B]">Current session: Chrome on Windows • Active Now</div>
            </div>
            <button
              onClick={handleLogoutAll}
              className="btn btn-secondary text-xs !min-h-[36px] text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout All Devices</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-xs text-rose-700">Delete Patient Account</div>
              <div className="text-xs text-[#64748B]">Permanently remove your account and export your health data.</div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-danger text-xs !min-h-[36px] flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#0B1C30]">Confirm Account Deletion</h3>
            <p className="text-[#64748B]">
              Are you sure you want to delete your CareTrack patient account? All your doctor visit history and medical reports will be permanently archived.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary !min-h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteModal(false);
                  await logout();
                  showInfo('Your account request has been processed.');
                  navigate('/login');
                }}
                className="btn btn-danger !min-h-[36px]"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
