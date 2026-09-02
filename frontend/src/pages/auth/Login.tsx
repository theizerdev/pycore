import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi, type RegisterPublicData } from '../../api/auth';
import { toast } from 'sonner';
import {
  HeartPulse,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  User,
  Phone,
  Globe,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  MessageSquare,
  BadgePercent,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

type AuthView = 'login' | 'register' | 'forgot' | 'verify-whatsapp';

interface LoginProps {
  initialView?: AuthView;
}

export const Login: React.FC<LoginProps> = ({ initialView }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determinar vista inicial por prop o por ruta (/register, /verify-whatsapp)
  const defaultView: AuthView = initialView || (
    location.pathname === '/register' ? 'register' :
    location.pathname === '/verify-whatsapp' ? 'verify-whatsapp' : 'login'
  );
  const [currentView, setCurrentView] = useState<AuthView>(defaultView);

  useEffect(() => {
    if (location.pathname === '/register') {
      setCurrentView('register');
    } else if (location.pathname === '/verify-whatsapp') {
      setCurrentView('verify-whatsapp');
    }
  }, [location.pathname]);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Register State (Réplica 1:1 FixSale POS + Shadcn UI)
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regNombreComercial, setRegNombreComercial] = useState('');
  const [regCompanyDocument, setRegCompanyDocument] = useState('');
  const [regRepresentanteLegal, setRegRepresentanteLegal] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPaisId, setRegPaisId] = useState<number>(2); // 2: Venezuela, 1: México, 3: Colombia
  const [regCompanyPhone, setRegCompanyPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirmation, setRegPasswordConfirmation] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);

  // Forgot Password WhatsApp OTP State (Paso 1: Email, Paso 2: OTP + Nueva Contraseña)
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(Array(8).fill(''));
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotNewPasswordConfirm, setForgotNewPasswordConfirm] = useState('');
  const [forgotShowNewPassword, setForgotShowNewPassword] = useState(false);
  const [forgotDebugOtpCode, setForgotDebugOtpCode] = useState<string | null>(null);

  // WhatsApp OTP Verification State (8 Celdas Individuales Interactivas)
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(8).fill(''));
  const [pendingOtpPhone, setPendingOtpPhone] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState<string | null>(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const { login, logout } = useAuth();
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const forgotOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpCode = otpDigits.join('');
  const forgotOtpCode = forgotOtpDigits.join('');

  // Handlers OTP 8 Celdas (Verificación Cuenta)
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 7) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
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
      if (pasted.length === 8) {
        digitInputRefs.current[7]?.focus();
      } else {
        digitInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const handleAutoFillOtp = () => {
    if (debugOtpCode && debugOtpCode.length === 8) {
      const newDigits = debugOtpCode.split('');
      setOtpDigits(newDigits);
      toast.info('Código OTP autocompletado en los campos.');
    }
  };

  // Handlers OTP 8 Celdas (Recuperación Contraseña)
  const handleForgotDigitChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...forgotOtpDigits];
    newDigits[index] = digit;
    setForgotOtpDigits(newDigits);

    if (digit && index < 7) {
      forgotOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[index] && index > 0) {
      forgotOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 8);
    if (pasted) {
      const newDigits = Array(8).fill('');
      pasted.split('').forEach((char, idx) => {
        newDigits[idx] = char;
      });
      setForgotOtpDigits(newDigits);
      if (pasted.length === 8) {
        forgotOtpInputRefs.current[7]?.focus();
      } else {
        forgotOtpInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const handleAutoFillForgotOtp = () => {
    if (forgotDebugOtpCode && forgotDebugOtpCode.length === 8) {
      const newDigits = forgotDebugOtpCode.split('');
      setForgotOtpDigits(newDigits);
      toast.info('Código OTP de recuperación autocompletado.');
    }
  };

  // Submit Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await authApi.login({ email, password });
      login(data);

      if (data.requires_whatsapp_verification) {
        setPendingOtpPhone(data.user.telefono || '');
        setDebugOtpCode(data.debug_otp_code || null);
        setCurrentView('verify-whatsapp');
        toast.info('Se requiere verificación de código OTP de WhatsApp para ingresar.');
      } else {
        toast.success(`Bienvenido de nuevo, ${data.user.nombre}`);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regPasswordConfirmation) {
      setError('La confirmación de la contraseña no coincide.');
      return;
    }

    if (regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const regData: RegisterPublicData = {
        company_name: regCompanyName,
        nombre_comercial: regNombreComercial || undefined,
        company_document: regCompanyDocument || undefined,
        representante_legal: regRepresentanteLegal,
        email: regEmail,
        password: regPassword,
        telefono: regCompanyPhone || undefined,
        company_phone: regCompanyPhone || undefined,
        pais_id: regPaisId,
        pais_telefono_id: regPaisId
      };

      const data = await authApi.registerPublic(regData);
      login(data);

      // Redirigir a Verificación de WhatsApp en lugar de ir directo al dashboard (Réplica FixSale POS)
      setPendingOtpPhone(regCompanyPhone || data.user.telefono || '');
      setDebugOtpCode(data.debug_otp_code || null);
      setCurrentView('verify-whatsapp');
      toast.success('¡Registro exitoso! Por favor verifica tu código OTP de WhatsApp para activar tu acceso.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al completar el registro. Por favor verifica tus datos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.length !== 8) {
      setError('Por favor ingresa los 8 dígitos del código OTP.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.verifyWhatsAppOTP(otpCode);
      const profile = await authApi.getProfile();
      const currentToken = localStorage.getItem('pycore_token') || '';
      login({ access_token: currentToken, user: profile.user, permisos: profile.permisos });
      toast.success(res.mensaje);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Código de verificación incorrecto o no coincide.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsResendingOtp(true);

    try {
      const res = await authApi.resendWhatsAppOTP();
      toast.success(res.mensaje);
      if (res.debug_otp_code) {
        setDebugOtpCode(res.debug_otp_code);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo reenviar el código OTP.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Solicitar OTP por WhatsApp para Olvido de Contraseña
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setForgotStep('otp');
      if (res.debug_otp_code) {
        setForgotDebugOtpCode(res.debug_otp_code);
      }
      toast.success(res.mensaje);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No existe ninguna cuenta registrada con este correo electrónico.');
    } finally {
      setIsLoading(false);
    }
  };

  // Restablecer Contraseña con OTP de WhatsApp
  const handleResetPasswordOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (forgotOtpCode.length !== 8) {
      setError('El código OTP debe tener exactamente 8 dígitos.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (forgotNewPassword !== forgotNewPasswordConfirm) {
      setError('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.resetPasswordOTP({
        email: forgotEmail,
        otp_code: forgotOtpCode,
        new_password: forgotNewPassword
      });
      toast.success(res.mensaje);
      setForgotStep('email');
      setForgotOtpDigits(Array(8).fill(''));
      setForgotNewPassword('');
      setForgotNewPasswordConfirm('');
      setCurrentView('login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al restablecer contraseña. Verifica el código OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      
      {/* ── 1. PANEL IZQUIERDO: FORMULARIO SHADCN UI (BLOCK LOGIN-02) ──────── */}
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        
        {/* Top Header Logo Marca */}
        <div className="flex justify-between items-center w-full">
          <Link to="/" className="flex items-center hover:opacity-90 transition">
            <img
              src="/medisoft_logo_light.jpg"
              alt="MEDISOFT SUITE"
              className="h-9 w-auto object-contain dark:hidden"
            />
            <img
              src="/medisoft_logo_dark.jpg"
              alt="MEDISOFT SUITE"
              className="h-9 w-auto object-contain hidden dark:block"
            />
          </Link>

          <Badge variant="outline" className="text-[11px] font-mono border-border bg-muted/50 text-muted-foreground hidden sm:inline-flex">
            v2.5 Hospital Enterprise
          </Badge>
        </div>

        {/* Form Card Container (Shadcn Block 02 Center Slot) */}
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-md space-y-6">

            {/* Banner de Errores */}
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-3 animate-in fade-in zoom-in-95">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                VISTA 1: LOGIN (SHADCN BLOCK 2)
               ───────────────────────────────────────────────────────── */}
            {currentView === 'login' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col space-y-2 text-center md:text-left">
                  <h1 className="text-2xl font-black tracking-tight text-foreground">
                    Iniciar Sesión
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ingresa tus credenciales para acceder a la gestión de tu clínica
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="login-email" className="text-xs font-semibold">Correo Electrónico *</Label>
                    <div className="relative">
                      <Mail className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@pycore.com"
                        className="pl-9 h-10 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-xs font-semibold">Contraseña *</Label>
                        <Link
                          to="/forgot-password"
                          className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                    </div>
                    <div className="relative">
                      <Lock className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-9 h-10 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-input bg-background text-primary focus:ring-primary size-4"
                      />
                      <span>Recordar correo en este dispositivo</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 font-bold text-xs shadow-md cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Ingresar al Sistema</span>
                        <ArrowRight className="size-4 ml-1" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Acceso a Registro */}
                <div className="text-center text-xs text-muted-foreground pt-2">
                  ¿No tienes una cuenta de empresa?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCurrentView('register');
                    }}
                    className="text-primary hover:underline font-bold cursor-pointer"
                  >
                    Crear una cuenta (7 Días Gratis)
                  </button>
                </div>

                {/* Credenciales Demo Rápida */}
                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                    Acceso Rápido Demo (1 Clic):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDemoLogin('admin@pycore.com', 'Admin1234*')}
                      className="text-xs font-semibold h-9 border-dashed hover:border-primary cursor-pointer"
                    >
                      Superadmin
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDemoLogin('admin@plataforma.com', 'Admin1234*')}
                      className="text-xs font-semibold h-9 border-dashed hover:border-primary cursor-pointer"
                    >
                      Admin Clínica
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                VISTA 2: REGISTER (SHADCN BLOCK 2 - RÉPLICA FIXSALE POS 1:1)
               ───────────────────────────────────────────────────────── */}
            {currentView === 'register' && (
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCurrentView('login');
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <ArrowLeft className="size-4" />
                    <span>Volver al Login</span>
                  </button>
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                    7 Días Gratis $0.00
                  </Badge>
                </div>

                <div className="flex flex-col space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    <Building2 className="size-6 text-primary" />
                    <span>Crear una cuenta</span>
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Ingrese sus datos para comenzar con su prueba gratis de 7 días
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* 1. Nombre de la Empresa / Razón Social */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="company_name" className="text-xs font-semibold">Nombre de la Empresa / Razón Social *</Label>
                    <Input
                      id="company_name"
                      type="text"
                      required
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      placeholder="Ej: Restaurante y Café Bajo el Reloj C.A."
                      className="h-10 text-xs"
                    />
                  </div>

                  {/* 2. Nombre Comercial / Marca */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="nombre_comercial" className="text-xs font-semibold">Nombre Comercial / Marca (Opcional)</Label>
                    <Input
                      id="nombre_comercial"
                      type="text"
                      value={regNombreComercial}
                      onChange={(e) => setRegNombreComercial(e.target.value)}
                      placeholder="Ej: Bajo el Reloj"
                      className="h-10 text-xs"
                    />
                  </div>

                  {/* 3. Representante Legal */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="representante_legal" className="text-xs font-semibold">Representante Legal (Nombre Completo) *</Label>
                    <Input
                      id="representante_legal"
                      type="text"
                      required
                      value={regRepresentanteLegal}
                      onChange={(e) => setRegRepresentanteLegal(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="h-10 text-xs"
                    />
                  </div>

                  {/* 4. Correo Electrónico & País */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="reg-email" className="text-xs font-semibold">Correo Electrónico *</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="contacto@empresa.com"
                        className="h-10 text-xs"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="reg-pais" className="text-xs font-semibold">País *</Label>
                      <select
                        id="reg-pais"
                        value={regPaisId}
                        onChange={(e) => setRegPaisId(Number(e.target.value))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                      >
                        <option value={2}>🇻🇪 Venezuela (+58)</option>
                        <option value={1}>🇲🇽 México (+52)</option>
                        <option value={3}>🇨🇴 Colombia (+57)</option>
                        <option value={4}>🇺🇸 Estados Unidos (+1)</option>
                        <option value={6}>🇦🇷 Argentina (+54)</option>
                        <option value={5}>🇪🇸 España (+34)</option>
                      </select>
                    </div>
                  </div>

                  {/* 5. Teléfono de Contacto */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="company_phone" className="text-xs font-semibold">Teléfono de Contacto</Label>
                    <Input
                      id="company_phone"
                      type="tel"
                      value={regCompanyPhone}
                      onChange={(e) => setRegCompanyPhone(e.target.value)}
                      placeholder="Ej: 4121234567"
                      className="h-10 text-xs"
                    />
                  </div>

                  {/* 6. Contraseña & Confirmación */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="reg-pass" className="text-xs font-semibold">Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="reg-pass"
                          type={regShowPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Contraseña"
                          className="h-10 pr-9 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowPassword(!regShowPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition cursor-pointer"
                        >
                          {regShowPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="reg-confirm" className="text-xs font-semibold">Confirmar Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="reg-confirm"
                          type={regShowConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPasswordConfirmation}
                          onChange={(e) => setRegPasswordConfirmation(e.target.value)}
                          placeholder="Repita la contraseña"
                          className="h-10 pr-9 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowConfirmPassword(!regShowConfirmPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition cursor-pointer"
                        >
                          {regShowConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Banner FixSale POS Official Text */}
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Al registrarse obtendrá <strong>7 días de prueba totalmente gratis</strong> con perfil de <strong>Administrador</strong> y acceso completo a <strong>todos los módulos del sistema</strong>.</span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 font-bold text-xs shadow-md cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Completar Registro</span>
                    )}
                  </Button>
                </form>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  ¿Ya tiene una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCurrentView('login');
                    }}
                    className="text-primary hover:underline font-bold cursor-pointer"
                  >
                    Iniciar sesión
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                VISTA 3: VERIFY WHATSAPP OTP (ULTRAMODERNO SHADCN UI)
               ───────────────────────────────────────────────────────── */}
            {currentView === 'verify-whatsapp' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCurrentView('login');
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <ArrowLeft className="size-4" />
                    <span>Volver al Login</span>
                  </button>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] flex items-center gap-1 font-mono">
                    <ShieldCheck className="size-3" />
                    Verificación OTP
                  </Badge>
                </div>

                {/* Header Icon WhatsApp */}
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="size-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/10 mb-1">
                    <MessageSquare className="size-8 font-black animate-pulse" />
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-foreground">
                    Verificación de WhatsApp
                  </h1>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Hemos enviado un código OTP de 8 dígitos al número:{' '}
                    <span className="font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                      {pendingOtpPhone || 'registrado'}
                    </span>
                  </p>
                </div>

                {/* Formulario 8 Celdas Individuales Interactivas OTP */}
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
                      Ingresa el Código de 8 Dígitos *
                    </Label>

                    <div className="flex justify-center items-center gap-1.5 sm:gap-2">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <input
                          key={idx}
                          id={`otp-digit-${idx}`}
                          ref={(el) => { digitInputRefs.current[idx] = el; }}
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

                  <Button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 8}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black gap-2 text-xs shadow-lg shadow-emerald-600/20 cursor-pointer rounded-xl"
                  >
                    {isLoading ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="size-4" />
                        <span>Verificar y Activar Cuenta</span>
                      </>
                    )}
                  </Button>
                </form>

                {/* Acciones Secundarias */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isResendingOtp}
                    onClick={handleResendOtp}
                    className="w-full sm:flex-1 gap-1.5 font-bold text-xs h-9 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30 rounded-xl cursor-pointer"
                  >
                    {isResendingOtp ? <div className="size-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="size-3.5" />}
                    <span>Reenviar Código por WhatsApp</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout();
                      setCurrentView('login');
                    }}
                    className="w-full sm:w-auto gap-1 font-semibold text-xs h-9 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    <span>Cerrar Sesión</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                VISTA 4: FORGOT PASSWORD WHATSAPP OTP (PASO 1 & PASO 2)
               ───────────────────────────────────────────────────────── */}
            {currentView === 'forgot' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setForgotStep('email');
                    setCurrentView('login');
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  <span>Volver al Login</span>
                </button>

                <div className="flex flex-col space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    <KeyRound className="size-6 text-emerald-500" />
                    <span>Recuperar Contraseña</span>
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {forgotStep === 'email'
                      ? 'Ingresa tu correo electrónico y te enviaremos un código OTP de 8 dígitos a tu WhatsApp.'
                      : `Ingresa el código OTP enviado a tu WhatsApp para restablecer la contraseña de ${forgotEmail}.`}
                  </p>
                </div>

                {/* PASO 1: Ingreso de Correo Registrado */}
                {forgotStep === 'email' && (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="forgot-email" className="text-xs font-semibold">Correo Electrónico Registrado *</Label>
                      <div className="relative">
                        <Mail className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                        <Input
                          id="forgot-email"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="tu-correo@pycore.com"
                          className="pl-9 h-10 text-xs"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-10 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md gap-1.5"
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

                {/* PASO 2: Ingreso de Código OTP 8 dígitos y Nueva Contraseña */}
                {forgotStep === 'otp' && (
                  <form onSubmit={handleResetPasswordOtpSubmit} className="space-y-5">
                    {/* Banner Modo Prueba OTP */}
                    {forgotDebugOtpCode && (
                      <div className="p-3 bg-amber-500/10 text-amber-300 rounded-xl border border-amber-500/20 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="size-4 text-amber-400 shrink-0" />
                          <span className="font-mono font-bold">
                            OTP Pruebas: <strong className="text-amber-200 tracking-wider font-extrabold">{forgotDebugOtpCode}</strong>
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAutoFillForgotOtp}
                          className="h-7 text-xs font-bold text-amber-300 hover:text-amber-100 border border-amber-500/30 px-2 cursor-pointer"
                        >
                          Auto-rellenar
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
                        Código OTP de 8 Dígitos *
                      </Label>

                      <div className="flex justify-center items-center gap-1.5 sm:gap-2">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <input
                            key={idx}
                            id={`forgot-otp-digit-${idx}`}
                            ref={(el) => { forgotOtpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={forgotOtpDigits[idx]}
                            onChange={(e) => handleForgotDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleForgotDigitKeyDown(idx, e)}
                            onPaste={handleForgotDigitPaste}
                            className="size-9 sm:size-11 rounded-xl border border-input bg-muted/30 text-center text-lg sm:text-xl font-mono font-black tracking-tighter focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-background focus:outline-hidden transition shadow-xs"
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="forgot-new-pass" className="text-xs font-semibold">Nueva Contraseña *</Label>
                      <div className="relative">
                        <Lock className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                        <Input
                          id="forgot-new-pass"
                          type={forgotShowNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="Nueva contraseña (mínimo 6 caracteres)"
                          className="pl-9 pr-9 h-10 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setForgotShowNewPassword(!forgotShowNewPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition cursor-pointer"
                        >
                          {forgotShowNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="forgot-new-pass-confirm" className="text-xs font-semibold">Confirmar Nueva Contraseña *</Label>
                      <div className="relative">
                        <Lock className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                        <Input
                          id="forgot-new-pass-confirm"
                          type={forgotShowNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={forgotNewPasswordConfirm}
                          onChange={(e) => setForgotNewPasswordConfirm(e.target.value)}
                          placeholder="Confirme su nueva contraseña"
                          className="pl-9 pr-9 h-10 text-xs"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || forgotOtpCode.length !== 8}
                      className="w-full h-10 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md"
                    >
                      {isLoading ? (
                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Restablecer Contraseña</span>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Footer Bajo Formulario Móvil */}
        <div className="text-center text-xs text-muted-foreground">
          PyCore SaaS & Multi-Tenant © 2026. Todos los derechos reservados.
        </div>
      </div>

      {/* ── 2. PANEL DERECHO: BRAND HERO COVER (SHADCN BLOCK 2 RIGHT SLOT) ── */}
      <div className="relative hidden bg-muted lg:block overflow-hidden border-l border-border">
        {/* Capa de Fondo Gradient & Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
        
        {/* Contenido Visual Shadcn Block 02 */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img
              src="/medisoft_logo_dark.jpg"
              alt="MEDISOFT SUITE"
              className="h-10 w-auto object-contain rounded-lg shadow-lg"
            />
          </div>

          {/* Testimonial Quote / Hero Message (Shadcn UI Block 02 Signature) */}
          <div className="space-y-6 max-w-lg my-auto backdrop-blur-xl bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Sparkles key={i} className="size-4 fill-amber-400" />
              ))}
            </div>

            <blockquote className="text-lg font-medium leading-relaxed text-slate-200">
              “PyCore nos ha permitido centralizar múltiples sedes, gestionar roles y permisos con total granularidad y controlar la facturación multi-moneda sin margen de error.”
            </blockquote>

            <div className="flex items-center gap-4 pt-2">
              <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-sm">
                PC
              </div>
              <div>
                <p className="text-sm font-bold text-white">Carlos Mendoza</p>
                <p className="text-xs text-slate-400">Director General • Corporación Global</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Seguridad Bancaria & Aislamiento Tenant</span>
            <span className="font-mono">SaaS Cloud Ready</span>
          </div>
        </div>
      </div>

    </div>
  );
};
