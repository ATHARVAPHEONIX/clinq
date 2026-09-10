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
  MessageCircle, 
  RefreshCw, 
  CheckCircle2, 
  Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [authMethod, setAuthMethod] = useState('whatsapp'); // 'whatsapp' or 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Email Login Flow Sub-States: 'password' (default) or 'otp'
  const [emailMode, setEmailMode] = useState('password'); 
  const [emailStep, setEmailStep] = useState('email'); // 'email' (Step 1) or 'password' (Step 2)
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // OTP Verification View State
  const [otpStep, setOtpStep] = useState('input'); // 'input' or 'verify'
  const [otpType, setOtpType] = useState('whatsapp'); // 'whatsapp' or 'email'
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [activeOtp, setActiveOtp] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  const { 
    loginWithWhatsApp, 
    verifyWhatsAppOtp, 
    loginWithEmail, 
    verifyEmailOtp, 
    loginWithPassword 
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
    if (type === 'whatsapp') {
      const clean = val.replace(/\D/g, '');
      return `+91 ******${clean.slice(-4)}`;
    }
    const [name, domain] = val.split('@');
    if (!domain) return val;
    return `${name[0]}***@${domain}`;
  };

  // --- 1. WhatsApp OTP Request ---
  const handleWhatsAppSubmit = async (e) => {
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
      const res = await loginWithWhatsApp(phone);
      setActiveOtp(res.otp || '');
      setWhatsappUrl(res.whatsappUrl || '');
      showSuccess(res.message || 'OTP sent to your WhatsApp number.');
      setOtpType('whatsapp');
      setOtpStep('verify');
      setTimer(45);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      
      // Auto-open WhatsApp chat/app if URL generated
      if (res.whatsappUrl) {
        try {
          window.open(res.whatsappUrl, '_blank');
        } catch (e) {
          console.warn('Popup blocked:', e);
        }
      }

      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err) {
      const msg = err.message || "We couldn't send the OTP to WhatsApp. Please try again.";
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Email Password Step 1: Continue ---
  const handleEmailContinue = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      const msg = 'Please enter a valid email address.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    setEmailStep('password');
  };

  // --- 3. Email Password Step 2: Login ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!password) {
      const msg = 'Please enter your password.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword(cleanEmail, password);
      showSuccess('Logged in successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Incorrect email or password.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. Email OTP Request ---
  const handleEmailOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      const msg = 'Please enter a valid email address.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithEmail(cleanEmail);
      setActiveOtp(res.otp || '');
      showSuccess(res.message || 'OTP sent to your email address.');
      setOtpType('email');
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

  // --- OTP Verification Logic ---
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
      } else {
        await verifyEmailOtp(target, fullOtp);
      }
      showSuccess('Verification successful! Welcome to CareTrack.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Invalid OTP. Please check the OTP and try again.';
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
        const res = await loginWithWhatsApp(phone);
        setActiveOtp(res.otp || '');
        setWhatsappUrl(res.whatsappUrl || '');
        showSuccess(`New OTP generated for WhatsApp: ${res.otp || ''}`);
        if (res.whatsappUrl) {
          try {
            window.open(res.whatsappUrl, '_blank');
          } catch (e) {
            console.warn('Popup blocked:', e);
          }
        }
      } else {
        const res = await loginWithEmail(email);
        setActiveOtp(res.otp || '');
        showSuccess(`New verification code sent to ${maskTarget(email, 'email')}`);
      }
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
          {otpStep === 'verify' ? (otpType === 'whatsapp' ? 'Verify WhatsApp OTP' : 'Verify Email OTP') : 'Patient Login'}
        </h2>
        <p className="mt-1 text-center text-xs text-[#64748B]">
          {otpStep === 'verify' 
            ? `We sent a 6-digit verification code to ${maskTarget(otpType === 'email' ? email : phone, otpType)}`
            : 'Your personal healthcare record, securely in one place.'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card shadow-lg border border-[#E2E8F0] p-6 sm:p-8">

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
              {/* Segmented Method Toggle: WhatsApp vs Email */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('whatsapp');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    authMethod === 'whatsapp'
                      ? 'bg-white text-[#0F766E] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0B1C30]'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp Login</span>
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
                  <span>Email Login</span>
                </button>
              </div>

              {/* OPTION 1: WhatsApp OTP Login */}
              {authMethod === 'whatsapp' && (
                <form onSubmit={handleWhatsAppSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider mb-1.5">
                      WhatsApp Mobile Number
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
                        autoFocus
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#64748B] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#25D366] inline-block shrink-0" />
                      <span>Receive verification OTP code directly on your WhatsApp number.</span>
                    </p>
                  </div>

                  {/* Primary WhatsApp OTP Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-emerald-600/15 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
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
                </form>
              )}

              {/* OPTION 2: Email Login (Default: Email -> Password) */}
              {authMethod === 'email' && (
                <div className="space-y-4">
                  {emailMode === 'password' ? (
                    // Default Flow: Email + Password
                    emailStep === 'email' ? (
                      // Step 1: Enter Email
                      <form onSubmit={handleEmailContinue} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider mb-1.5">
                            Email Address
                          </label>
                          <input
                            type="email"
                            placeholder="Enter your email"
                            className="input-field"
                            value={email}
                            onChange={(e) => {
                              clearError();
                              setEmail(e.target.value);
                            }}
                            required
                            autoFocus
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full btn btn-primary font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        {/* Secondary Option: Login through OTP */}
                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setEmailMode('otp');
                            }}
                            className="text-xs text-[#0F766E] hover:underline font-medium cursor-pointer"
                          >
                            Login through OTP
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Step 2: Enter Password
                      <form onSubmit={handlePasswordLogin} className="space-y-4 animate-in fade-in">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider">
                              Email Address
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                clearError();
                                setEmailStep('email');
                              }}
                              className="text-xs text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Change</span>
                            </button>
                          </div>
                          <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0B1C30] font-medium">
                            {email}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider mb-1.5">
                            Password
                          </label>
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
                            autoFocus
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full btn btn-primary font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Login</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        {/* Secondary Option: Login through OTP */}
                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setEmailMode('otp');
                            }}
                            className="text-xs text-[#0F766E] hover:underline font-medium cursor-pointer"
                          >
                            Login through OTP
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    // Secondary Flow: Email OTP
                    <form onSubmit={handleEmailOtpSubmit} className="space-y-4 animate-in fade-in">
                      <div>
                        <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          className="input-field"
                          value={email}
                          onChange={(e) => {
                            clearError();
                            setEmail(e.target.value);
                          }}
                          required
                          autoFocus
                        />
                        <p className="mt-1 text-[11px] text-[#64748B]">
                          We will send a 6-digit verification code to your email.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn btn-primary font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Send Email OTP</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {/* Switch back to Password Login */}
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            clearError();
                            setEmailMode('password');
                          }}
                          className="text-xs text-[#0F766E] hover:underline font-medium cursor-pointer"
                        >
                          Login with password instead
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

          {/* STAGE 2: VERIFY 6-DIGIT OTP INLINE */}
          {otpStep === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
              {/* Context Summary Header */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between">
                <span>
                  Code sent to: <strong>{maskTarget(otpType === 'email' ? email : phone, otpType)}</strong>
                </span>
                <span className="badge badge-teal text-[10px] font-bold uppercase">
                  {otpType === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </span>
              </div>

              {/* Interactive WhatsApp Delivery Card */}
              {otpType === 'whatsapp' && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
                      <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                      <span>WhatsApp Verification</span>
                    </div>
                    {activeOtp && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900 text-[11px] font-mono font-bold tracking-wider">
                        {activeOtp}
                      </span>
                    )}
                  </div>
                  <p className="text-[#047857] text-[11px] leading-relaxed">
                    OTP code generated. You can open your WhatsApp chat to view the message or click Auto-Fill below.
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-bold rounded-lg text-center flex items-center justify-center gap-1.5 shadow-xs transition-all text-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-white" />
                        <span>Open WhatsApp</span>
                      </a>
                    )}
                    {activeOtp && (
                      <button
                        type="button"
                        onClick={() => {
                          const digits = activeOtp.split('');
                          setOtpDigits(digits);
                          showSuccess('OTP filled!');
                          inputRefs.current[5]?.focus();
                        }}
                        className="flex-1 py-2 px-3 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 font-bold rounded-lg text-center flex items-center justify-center gap-1.5 shadow-xs transition-all text-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Auto-Fill OTP</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Email Delivery Card */}
              {otpType === 'email' && activeOtp && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="text-teal-900 font-medium">OTP Code: </span>
                    <strong className="font-mono text-sm tracking-wider text-teal-950">{activeOtp}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = activeOtp.split('');
                      setOtpDigits(digits);
                      showSuccess('OTP filled!');
                      inputRefs.current[5]?.focus();
                    }}
                    className="py-1 px-3 bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold rounded-lg text-xs shadow-xs cursor-pointer"
                  >
                    Auto-Fill
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

              {/* If in Email OTP, option to switch back to Password */}
              {otpType === 'email' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('input');
                      setEmailMode('password');
                      setEmailStep('email');
                      setErrorMessage('');
                    }}
                    className="text-xs text-[#0F766E] hover:underline font-medium cursor-pointer"
                  >
                    Use password instead
                  </button>
                </div>
              )}
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
