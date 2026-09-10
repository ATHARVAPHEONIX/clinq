import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  Activity, 
  AlertCircle, 
  UserPlus, 
  Sparkles, 
  MessageCircle, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
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

  // OTP Verification Step State
  const [otpStep, setOtpStep] = useState('input'); // 'input' or 'verify'
  const [otpType, setOtpType] = useState('whatsapp'); // 'whatsapp', 'phone', 'email'
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  const { 
    loginWithPhone, 
    loginWithWhatsApp, 
    verifyPhoneOtp, 
    verifyWhatsAppOtp, 
    loginWithEmail, 
    verifyEmailOtp, 
    loginWithPassword, 
    isSupabaseConfigured 
  } = useAuth();

  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let interval = null;
    if (otpStep === 'verify' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [otpStep, timer]);

  const clearError = () => {
    if (errorMessage) setErrorMessage('');
  };

  const maskTarget = (val, type) => {
    if (!val) return '******';
    if (type === 'phone' || type === 'whatsapp') {
      const clean = val.replace(/\D/g, '');
      return `+91 ******${clean.slice(-4)}`;
    }
    const [name, domain] = val.split('@');
    if (!domain) return val;
    return `${name[0]}***@${domain}`;
  };

  const handlePhoneSubmit = async (e, isWhatsApp = true) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length !== 10) {
      const msg = 'Please enter a valid 10-digit mobile number.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      if (isWhatsApp) {
        await loginWithWhatsApp(phone);
        showSuccess(`Verification code sent to WhatsApp: +91 ${cleanDigits}`);
        setOtpType('whatsapp');
      } else {
        await loginWithPhone(phone);
        showSuccess(`OTP sent to +91 ${cleanDigits}`);
        setOtpType('phone');
      }
      setOtpStep('verify');
      setTimer(45);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err) {
      const msg = err.message || 'Failed to send OTP. Please try again.';
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
        setOtpType('email');
        setOtpStep('verify');
        setTimer(45);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed. Please check credentials.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    if (isNaN(value)) return;
    setErrorMessage('');
    const newOtp = [...otpDigits];
    newOtp[index] = value.slice(-1);
    setOtpDigits(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otpDigits];
    pastedData.forEach((char, i) => {
      if (!isNaN(char)) newOtp[i] = char;
    });
    setOtpDigits(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      const msg = 'Please enter all 6 digits of the OTP code.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      const target = otpType === 'email' ? email : phone;
      if (otpType === 'whatsapp') {
        await verifyWhatsAppOtp(target, fullOtp);
      } else if (otpType === 'phone') {
        await verifyPhoneOtp(target, fullOtp);
      } else {
        await verifyEmailOtp(target, fullOtp);
      }
      showSuccess('Verification successful! Welcome to CareTrack.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Invalid or expired OTP. Please try again.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage('');
    setLoading(true);
    try {
      if (otpType === 'whatsapp') {
        await loginWithWhatsApp(phone);
      } else if (otpType === 'phone') {
        await loginWithPhone(phone);
      } else {
        await loginWithEmail(email);
      }
      showSuccess(`New verification code sent to ${maskTarget(otpType === 'email' ? email : phone, otpType)}`);
      setTimer(45);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.message || 'Failed to resend OTP. Please try again.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Centered Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
          {otpStep === 'verify' ? 'Verify OTP Code' : 'Patient Login'}
        </h2>
        <p className="mt-1 text-center text-xs text-[#64748B]">
          {otpStep === 'verify' 
            ? `We sent a 6-digit code to ${maskTarget(otpType === 'email' ? email : phone, otpType)}`
            : 'Your personal healthcare record, securely in one place.'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card shadow-lg border border-[#E2E8F0] p-6 sm:p-8">
          
          {/* Demo Sandbox Indicator */}
          {!isSupabaseConfigured && (
            <div className="mb-6 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Demo Sandbox:</span> Mobile: <code className="font-mono font-bold text-[#0F766E]">9876543210</code> | OTP: <code className="font-mono font-bold text-[#0F766E]">123456</code>.
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

          {/* STAGE 1: INPUT CREDENTIALS */}
          {otpStep === 'input' && (
            <>
              {/* Segmented Method Toggle */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('phone');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    authMethod === 'phone'
                      ? 'bg-white text-[#0F766E] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0B1C30]'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Mobile / WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('email');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    authMethod === 'email'
                      ? 'bg-white text-[#0F766E] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0B1C30]'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Address</span>
                </button>
              </div>

              {/* Option A: Phone Number & WhatsApp Login */}
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
                      <span>Receive verification OTP code via WhatsApp or SMS.</span>
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
                    className="w-full btn btn-secondary text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Send OTP via SMS</span>
                  </button>
                </form>
              )}

              {/* Option B: Email Login (Default to Password) */}
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
                          className="text-xs text-[#0F766E] hover:underline cursor-pointer"
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
                        className="text-[#0F766E] font-medium hover:underline cursor-pointer"
                      >
                        Use password instead
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn btn-primary font-semibold shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
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
            </>
          )}

          {/* STAGE 2: VERIFY 6-DIGIT OTP INLINE */}
          {otpStep === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
              {/* WhatsApp Quick Link & OTP Helper Card */}
              {otpType === 'whatsapp' ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-950">WhatsApp Verification Code</div>
                        <div className="text-[11px] text-emerald-700 truncate">
                          Recipient: <strong>{maskTarget(phone, 'whatsapp')}</strong>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://api.whatsapp.com/send?phone=91${phone.replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent('*CareTrack Patient Portal*\nYour 6-digit WhatsApp verification code is: *123456*.\nValid for 10 minutes.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white text-[#25D366]" />
                      <span>Open WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Quick Auto-Fill Helper */}
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 text-[11px]">
                      Your OTP code: <strong className="font-mono text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded">123456</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpDigits(['1', '2', '3', '4', '5', '6']);
                        setErrorMessage('');
                        inputRefs.current[5]?.focus();
                      }}
                      className="text-xs font-bold text-[#0F766E] hover:underline cursor-pointer bg-white px-2 py-0.5 rounded-md border border-emerald-200"
                    >
                      ⚡ Auto-Fill Code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-900">
                  <span>Verification code sent to {maskTarget(otpType === 'email' ? email : phone, otpType)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpDigits(['1', '2', '3', '4', '5', '6']);
                      setErrorMessage('');
                    }}
                    className="font-bold text-[#0F766E] hover:underline"
                  >
                    Auto-Fill 123456
                  </button>
                </div>
              )}

              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider text-center mb-2.5">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-11 h-13 text-center text-xl font-bold rounded-xl border border-[#E2E8F0] focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 outline-none bg-white transition-all shadow-xs"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              {/* Resend & Back Controls */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('input');
                    setErrorMessage('');
                  }}
                  className="flex items-center gap-1 text-[#0F766E] hover:underline font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change {otpType === 'email' ? 'Email' : 'Number'}</span>
                </button>

                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-[#0F766E] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP</span>
                  </button>
                ) : (
                  <span className="text-[#64748B] font-mono">
                    Resend in 00:{timer < 10 ? `0${timer}` : timer}
                  </span>
                )}
              </div>

              {/* Verify & Enter Dashboard Button */}
              <button
                type="submit"
                disabled={loading || otpDigits.join('').length !== 6}
                className="w-full btn btn-primary font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Login to Dashboard</span>
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
