import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { toast } from 'sonner';
import {
  HeartPulse,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  KeyRound,
  MessageSquare,
  Zap
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(8).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [debugOtpCode, setDebugOtpCode] = useState<string | null>(null);

  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpVerifiedMsg, setOtpVerifiedMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpCode = otpDigits.join('');

  // Verificación interactiva del código OTP con el Backend
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const targetCode = codeToVerify || otpCode;
    if (targetCode.length !== 8) {
      setError('El código OTP debe tener exactamente 8 dígitos.');
      return;
    }
    setError(null);
    setIsVerifyingOtp(true);

    try {
      const res = await authApi.verifyOtp({
        email: email.trim(),
        otp_code: targetCode
      });
      setIsOtpVerified(true);
      setOtpVerifiedMsg(res.mensaje);
      toast.success(res.mensaje);
    } catch (err: any) {
      setIsOtpVerified(false);
      setOtpVerifiedMsg(null);
      setError(err.response?.data?.detail || 'El código OTP ingresado no existe o ha expirado.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handlers OTP 8 Celdas
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setIsOtpVerified(false);
    setError(null);

    if (digit && index < 7) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Si completó los 8 dígitos, auto-verificar con el backend
    const currentCode = newDigits.join('');
    if (currentCode.length === 8) {
      handleVerifyOtp(currentCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 8);
    if (pasted) {
      const newDigits = Array(8).fill('');
      pasted.split('').forEach((char, idx) => {
        newDigits[idx] = char;
      });
      setOtpDigits(newDigits);
      setIsOtpVerified(false);
      setError(null);
      if (pasted.length === 8) {
        otpInputRefs.current[7]?.focus();
        handleVerifyOtp(pasted);
      } else {
        otpInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const handleAutoFillOtp = () => {
    if (debugOtpCode && debugOtpCode.length === 8) {
      const newDigits = debugOtpCode.split('');
      setOtpDigits(newDigits);
      toast.info('Código OTP autocompletado en las casillas.');
      handleVerifyOtp(debugOtpCode);
    }
  };

  // Paso 1: Enviar OTP por WhatsApp
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico registrado.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setStep('otp');
      if (res.debug_otp_code) {
        setDebugOtpCode(res.debug_otp_code);
      }
      toast.success(res.mensaje);
    } catch (err: any) {
      console.error('Error al solicitar recuperación OTP:', err);
      const serverDetail = err.response?.data?.detail;
      if (serverDetail) {
        setError(serverDetail);
      } else if (err.message) {
        setError(`Error de comunicación con el servidor: ${err.message}`);
      } else {
        setError('Ocurrió un error al procesar la solicitud. Por favor verifica tu correo e intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Restablecer Contraseña con OTP de 8 dígitos
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.length !== 8) {
      setError('El código OTP debe tener exactamente 8 dígitos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.resetPasswordOTP({
        email: email.trim(),
        otp_code: otpCode,
        new_password: newPassword
      });
      toast.success(res.mensaje);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al restablecer la contraseña. Verifica el código OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      
      {/* ── 1. PANEL IZQUIERDO: FORMULARIO FORGOT PASSWORD ───────────────── */}
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        
        {/* Top Header Logo Marca */}
        <div className="flex justify-between items-center w-full">
          <Link to="/" className="flex items-center hover:opacity-90 transition">
            <img
              src="/medisoft_logo_light.png"
              alt="MEDISOFT SUITE"
              className="h-12 md:h-14 w-auto object-contain dark:hidden transition-transform hover:scale-105 duration-200"
            />
            <img
              src="/medisoft_logo_dark.png"
              alt="MEDISOFT SUITE"
              className="h-12 md:h-14 w-auto object-contain hidden dark:block transition-transform hover:scale-105 duration-200"
            />
          </Link>

          <Badge variant="outline" className="text-xs font-mono border-primary/30 bg-primary/5 text-primary hidden sm:inline-flex px-3 py-1 font-semibold">
            Recuperación por WhatsApp
          </Badge>
        </div>

        {/* Center Container */}
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-md space-y-6">

            {/* Banner de Errores */}
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-3 animate-in fade-in zoom-in-95">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <ArrowLeft className="size-4" />
                <span>Volver al Login</span>
              </Link>

              <div className="flex flex-col space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                  <KeyRound className="size-6 text-emerald-500" />
                  <span>Recuperar Contraseña</span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  {step === 'email'
                    ? 'Ingresa tu correo electrónico registrado y te enviaremos un código OTP de 8 dígitos a tu WhatsApp.'
                    : `Ingresa el código OTP de 8 dígitos enviado a tu WhatsApp para restablecer la contraseña de ${email}.`}
                </p>
              </div>

              {/* ── PASO 1: Ingreso de Correo Electrónico ────────────────── */}
              {step === 'email' && (
                <form onSubmit={handleSendOtpSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="forgot-email" className="text-xs font-semibold">Correo Electrónico Registrado *</Label>
                    <div className="relative">
                      <Mail className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="forgot-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@pycore.com"
                        className="pl-9 h-10 text-xs"
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md gap-2 rounded-xl"
                  >
                    {isLoading ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="size-4" />
                        <span>Enviar Código OTP por WhatsApp</span>
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* ── PASO 2: Código OTP de 8 Dígitos + Nueva Contraseña ───── */}
              {step === 'otp' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-5">

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
                      Código OTP de 8 Dígitos *
                    </Label>

                    <div className="flex justify-center items-center gap-1.5 sm:gap-2">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <input
                          key={idx}
                          id={`forgot-otp-digit-${idx}`}
                          ref={(el) => { otpInputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={otpDigits[idx]}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                          onPaste={handleDigitPaste}
                          className="size-9 sm:size-11 rounded-xl border border-input bg-muted/30 text-center text-lg sm:text-xl font-mono font-black tracking-tighter focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-background focus:outline-hidden transition shadow-xs"
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Estado de Verificación OTP con el Backend */}
                  {isVerifyingOtp && (
                    <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-pulse">
                      <div className="size-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Validando código OTP con el servidor...</span>
                    </div>
                  )}

                  {isOtpVerified && otpVerifiedMsg && (
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-xs">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{otpVerifiedMsg}</span>
                    </div>
                  )}

                  {!isOtpVerified && !isVerifyingOtp && (
                    <Button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={otpCode.length !== 8}
                      variant="outline"
                      className="w-full h-10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold text-xs cursor-pointer rounded-xl"
                    >
                      <ShieldCheck className="size-4 mr-1 text-emerald-600" />
                      <span>Verificar Código OTP (8 Dígitos)</span>
                    </Button>
                  )}

                  {/* Formulario de Nueva Contraseña (Habilitado tras verificar el OTP) */}
                  {isOtpVerified && (
                    <div className="space-y-4 pt-2 border-t border-border animate-fade-in">
                      <div className="grid gap-2">
                        <Label htmlFor="new-pass" className="text-xs font-semibold">Nueva Contraseña *</Label>
                        <div className="relative">
                          <Lock className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                          <Input
                            id="new-pass"
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="pl-9 pr-9 h-10 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="new-pass-confirm" className="text-xs font-semibold">Confirmar Nueva Contraseña *</Label>
                        <div className="relative">
                          <Lock className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                          <Input
                            id="new-pass-confirm"
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={newPasswordConfirm}
                            onChange={(e) => setNewPasswordConfirm(e.target.value)}
                            placeholder="Repita la nueva contraseña"
                            className="pl-9 pr-9 h-10 text-xs"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading || otpCode.length !== 8}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-lg shadow-emerald-600/20 rounded-xl"
                      >
                        {isLoading ? (
                          <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck className="size-4 mr-1" />
                            <span>Restablecer Contraseña</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </div>

          </div>
        </div>

        {/* Footer Bajo Formulario Móvil */}
        <div className="text-center text-xs text-muted-foreground">
          PyCore SaaS & Multi-Tenant © 2026. Todos los derechos reservados.
        </div>
      </div>

      {/* ── 2. PANEL DERECHO: BRAND HERO COVER ───────────────────────────── */}
      <div className="relative hidden bg-muted lg:block overflow-hidden border-l border-border">
        {/* Capa de Fondo Gradient & Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
        
        {/* Contenido Visual Shadcn Block 02 */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img
              src="/medisoft_logo_dark.png"
              alt="MEDISOFT SUITE"
              className="h-14 md:h-16 w-auto object-contain transition-transform hover:scale-105 duration-200 drop-shadow-md"
            />
          </div>

          {/* Testimonial Quote */}
          <div className="space-y-6 max-w-lg my-auto backdrop-blur-xl bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Sparkles key={i} className="size-4 fill-amber-400" />
              ))}
            </div>

            <blockquote className="text-lg font-medium leading-relaxed text-slate-200">
              “La recuperación segura nos garantiza que los administradores de nuestras sedes puedan restablecer sus accesos instantáneamente sin depender del soporte técnico.”
            </blockquote>

            <div className="flex items-center gap-4 pt-2">
              <div className="size-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-sm">
                PC
              </div>
              <div>
                <p className="text-sm font-bold text-white">Sistemas & Seguridad</p>
                <p className="text-xs text-slate-400">PyCore Cloud Platform</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Verificación WhatsApp OTP Activa</span>
            <span className="font-mono">SaaS Cloud Security</span>
          </div>
        </div>
      </div>

    </div>
  );
};

