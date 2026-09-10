import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Mail, Lock, ShieldCheck, ArrowRight, Activity, AlertCircle, UserPlus, Sparkles, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(true); // Default to Email + Password
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { loginWithPhone, loginWithWhatsApp, loginWithEmail, loginWithPassword, isSupabaseConfigured } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const clearError = () => {
    if (errorMessage) setErrorMessage('');
  };

  const handlePhoneSubmit = async (e, isWhatsApp = false) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    if (!phone || phone.length < 10) {
      const msg = 'Please enter a valid 10-digit mobile number.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      if (isWhatsApp) {
        await loginWithWhatsApp(phone);
        showSuccess(`Verification code sent to your WhatsApp: +91 ${phone}`);
        navigate('/verify-otp', { state: { type: 'whatsapp', target: phone } });
      } else {
        await loginWithPhone(phone);
        showSuccess(`OTP sent to +91 ${phone}`);
        navigate('/verify-otp', { state: { type: 'phone', target: phone } });
      }
    } catch (err) {
      const msg = err.message || 'Failed to authenticate. Please try again.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !email.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      if (usePassword) {
        if (!password) {
          const msg = 'Please enter your account password.';
          setErrorMessage(msg);
          showError(msg);
          setLoading(false);
          return;
        }
        await loginWithPassword(email, password);
        showSuccess('Logged in successfully!');
        navigate('/dashboard');
      } else {
        await loginWithEmail(email);
        showSuccess(`Verification code sent to ${email}`);
        navigate('/verify-otp', { state: { type: 'email', target: email } });
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed. Please check credentials.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Centered Auth Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-teal-900/10">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1C30]">CareTrack</h1>
            <span className="text-xs font-semibold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
              Patient Portal
            </span>
          </div>
        </div>

        <h2 className="text-center text-xl font-bold text-[#0B1C30]">
          Patient Login
        </h2>
        <p className="mt-1 text-center text-xs text-[#64748B]">
          Your personal healthcare record, securely in one place.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card shadow-lg border border-[#E2E8F0] p-6 sm:p-8">
          {/* Supabase / Demo Indicator */}
          {!isSupabaseConfigured && (
            <div className="mb-6 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Demo Sandbox:</span> Seeded Demo Patient: <code className="font-mono font-bold text-[#0F766E]">9876543210</code> / <code className="font-mono font-bold text-[#0F766E]">123456</code>.
              </div>
            </div>
          )}

          {/* Inline Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium leading-relaxed">{errorMessage}</p>
                {errorMessage.toLowerCase().includes('register') && (
                  <Link
                    to="/register"
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-[11px] shadow-xs transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register New Patient Account</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Segmented Method Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setErrorMessage('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                authMethod === 'phone'
                  ? 'bg-white text-[#0F766E] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1C30]'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Mobile Number</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setErrorMessage('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                authMethod === 'email'
                  ? 'bg-white text-[#0F766E] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1C30]'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email Address</span>
            </button>
          </div>

          {/* Option A: Phone / WhatsApp Login */}
          {authMethod === 'phone' && (
            <form onSubmit={(e) => handlePhoneSubmit(e, true)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider mb-1.5">
                  Mobile Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="w-20 shrink-0">
                    <select className="input-field bg-slate-50 font-medium text-xs text-center">
                      <option>+91</option>
                      <option>+1</option>
                      <option>+44</option>
                      <option>+971</option>
                    </select>
                  </div>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    className="input-field flex-1 text-sm font-medium"
                    value={phone}
                    onChange={(e) => {
                      clearError();
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    }}
                    required
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#64748B] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span>Receive instant verification OTP code on WhatsApp or SMS.</span>
                </p>
              </div>

              {/* Primary WhatsApp OTP Button */}
              <button
                type="button"
                onClick={(e) => handlePhoneSubmit(e, true)}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-emerald-600/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
                    <span>Send OTP via WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Alternate SMS OTP Button */}
              <button
                type="button"
                onClick={(e) => handlePhoneSubmit(e, false)}
                disabled={loading}
                className="w-full btn btn-secondary text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Send OTP via SMS</span>
              </button>
            </form>
          )}

          {/* Option B: Email Login */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => {
                    clearError();
                    setEmail(e.target.value);
                  }}
                  required
                />
              </div>

              {usePassword ? (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setUsePassword(false);
                      }}
                      className="text-xs text-[#0F766E] hover:underline"
                    >
                      Login with OTP instead
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="input-field"
                    value={password}
                    onChange={(e) => {
                      clearError();
                      setPassword(e.target.value);
                    }}
                    required
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">We will send a verification code.</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setUsePassword(true);
                    }}
                    className="text-[#0F766E] font-medium hover:underline"
                  >
                    Use password instead
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary font-semibold shadow-xs flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{usePassword ? 'Login with Email' : 'Send Email OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Registration Footer Link */}
          <div className="mt-6 pt-6 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
            <span>New patient to CareTrack? </span>
            <Link to="/register" className="font-semibold text-[#0F766E] hover:underline">
              Create Patient Account
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#64748B]">
          <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
          <span>256-bit encrypted healthcare portal</span>
        </div>
      </div>
    </div>
  );
}
