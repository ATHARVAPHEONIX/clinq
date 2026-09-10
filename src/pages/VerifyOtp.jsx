import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, UserPlus, MessageCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { type = 'whatsapp', target = '' } = location.state || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeOtp, setActiveOtp] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const inputRefs = useRef([]);
  const { verifyWhatsAppOtp, verifyEmailOtp, loginWithWhatsApp, loginWithEmail } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    // Check if active OTP exists in storage
    try {
      if (type === 'whatsapp') {
        const cleanDigits = target.replace(/\D/g, '').slice(-10);
        const stored = JSON.parse(localStorage.getItem(`caretrack_wa_otp_${cleanDigits}`)) || JSON.parse(localStorage.getItem('caretrack_active_wa_otp'));
        if (stored?.otp) {
          setActiveOtp(stored.otp);
          const msg = `*CareTrack Patient Portal Verification*\n\nYour 6-digit WhatsApp OTP is: *${stored.otp}*\n\n(Valid for 10 minutes)`;
          setWhatsappUrl(`https://api.whatsapp.com/send?phone=91${cleanDigits}&text=${encodeURIComponent(msg)}`);
        }
      } else {
        const cleanEmail = target.trim().toLowerCase();
        const stored = JSON.parse(localStorage.getItem(`caretrack_email_otp_${cleanEmail}`));
        if (stored?.otp) {
          setActiveOtp(stored.otp);
        }
      }
    } catch (e) {}
  }, [type, target]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const maskTarget = (val, targetType) => {
    if (!val) return '******';
    if (targetType === 'whatsapp') {
      const clean = val.replace(/\D/g, '');
      return `+91 ******${clean.slice(-4)}`;
    }
    const [name, domain] = val.split('@');
    if (!domain) return val;
    return `${name[0]}***@${domain}`;
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    setErrorMessage('');
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      if (!isNaN(char)) newOtp[i] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      const msg = 'Please enter all 6 digits of the OTP code.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      if (type === 'whatsapp') {
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

  const handleResend = async () => {
    if (!canResend) return;
    setErrorMessage('');
    setLoading(true);
    try {
      if (type === 'whatsapp') {
        const res = await loginWithWhatsApp(target);
        setActiveOtp(res.otp || '');
        setWhatsappUrl(res.whatsappUrl || '');
        if (res.whatsappUrl) {
          try { window.open(res.whatsappUrl, '_blank'); } catch(e){}
        }
      } else {
        const res = await loginWithEmail(target);
        setActiveOtp(res.otp || '');
      }
      showSuccess(`New OTP sent to ${maskTarget(target, type)}`);
      setTimer(45);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.message || 'Failed to resend OTP. Please try again.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isWhatsApp = type === 'whatsapp';

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md ${
            isWhatsApp ? 'bg-[#25D366] text-white shadow-emerald-600/15' : 'bg-[#0F766E] text-white shadow-teal-900/10'
          }`}>
            {isWhatsApp ? <MessageCircle className="w-7 h-7 fill-white" /> : <Mail className="w-7 h-7" />}
          </div>
        </div>
        <h2 className="text-center text-xl font-bold text-[#0B1C30]">
          {isWhatsApp ? 'Verify WhatsApp OTP' : 'Verify Email Address'}
        </h2>
        <p className="mt-1 text-center text-xs text-[#64748B]">
          We&apos;ve sent a 6-digit verification code to {isWhatsApp ? 'your WhatsApp account' : 'your email'}:{' '}
          <span className="font-semibold text-[#0B1C30]">{maskTarget(target, type)}</span>
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
                    <span>Go to Registration</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* WhatsApp Interactive Delivery Card */}
            {isWhatsApp && (
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
                  OTP generated for WhatsApp. You can open your WhatsApp chat or click Auto-Fill below.
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
                        setOtp(digits);
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
            {!isWhatsApp && activeOtp && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-teal-900 font-medium">OTP Code: </span>
                  <strong className="font-mono text-sm tracking-wider text-teal-950">{activeOtp}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = activeOtp.split('');
                    setOtp(digits);
                    showSuccess('OTP filled!');
                    inputRefs.current[5]?.focus();
                  }}
                  className="py-1 px-3 bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  Auto-Fill
                </button>
              </div>
            )}

            {/* 6 Digit OTP Inputs */}
            <div>
              <label className="block text-xs font-semibold text-[#0B1C30] uppercase tracking-wider text-center mb-3">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border border-[#E2E8F0] focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 outline-none bg-white transition-all shadow-xs"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Timer & Resend */}
            <div className="flex items-center justify-between text-xs">
              <Link to="/login" className="flex items-center gap-1 text-[#0F766E] hover:underline font-medium">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change {type === 'whatsapp' ? 'Number' : 'Email'}</span>
              </Link>

              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
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

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full btn btn-primary font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Go to Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
