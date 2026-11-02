import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { integracionesApi } from '../../api/integraciones';
import { tasasApi, type TasasActualesResponse } from '../../api/tasas';
import type { BcvRateData, WhatsAppStatus, JitsiDiagnostic } from '../../types';
import {
  Settings2,
  Map,
  ShieldCheck,
  Save,
  MessageSquare,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Globe,
  CheckCircle2,
  Coins,
  ArrowRight,
  Video,
  Server,
  KeyRound,
  Eye,
  EyeOff,
  Activity,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { cn } from '../../lib/utils';
import { JitsiTestRoomModal } from '../../components/telemedicina/JitsiTestRoomModal';

export const IntegracionesHub: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [bcvData, setBcvData] = useState<BcvRateData | null>(null);
  const [ratesInfo, setRatesInfo] = useState<TasasActualesResponse | null>(null);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [refreshingBcv, setRefreshingBcv] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

  // Formulario Mapbox
  const [mapboxActive, setMapboxActive] = useState(false);
  const [mapboxApiKey, setMapboxApiKey] = useState('');
  const [savingMapbox, setSavingMapbox] = useState(false);

  // Formulario Google Maps
  const [googleMapsActive, setGoogleMapsActive] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [savingGoogleMaps, setSavingGoogleMaps] = useState(false);

  // Formulario PayPal
  const [paypalActive, setPaypalActive] = useState(false);
  const [paypalMode, setPaypalMode] = useState('sandbox');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [savingPaypal, setSavingPaypal] = useState(false);

  // Formulario Mercado Pago
  const [mercadopagoActive, setMercadopagoActive] = useState(false);
  const [mercadopagoMode, setMercadopagoMode] = useState('sandbox');
  const [mercadopagoPublicKey, setMercadopagoPublicKey] = useState('');
  const [mercadopagoAccessToken, setMercadopagoAccessToken] = useState('');
  const [savingMercadopago, setSavingMercadopago] = useState(false);

  // Formulario Stripe
  const [stripeActive, setStripeActive] = useState(false);
  const [stripeMode, setStripeMode] = useState('test');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [savingStripe, setSavingStripe] = useState(false);

  // Formulario Jitsi Meet — Motor Principal WorkSpace & Telemedicina
  const [jitsiActive, setJitsiActive] = useState(true);
  const [jitsiProvider, setJitsiProvider] = useState<'public' | 'self_hosted' | 'jaas'>('public');
  const [jitsiDomain, setJitsiDomain] = useState('meet.jit.si');
  const [jitsiAppId, setJitsiAppId] = useState('');
  const [jitsiJwtSecret, setJitsiJwtSecret] = useState('');
  const [jitsiKeyId, setJitsiKeyId] = useState('');
  const [jitsiRoomPrefix, setJitsiRoomPrefix] = useState('medisoft');
  const [jitsiLobbyEnabled, setJitsiLobbyEnabled] = useState(true);
  const [jitsiRecordingEnabled, setJitsiRecordingEnabled] = useState(false);
  const [jitsiE2eeEnabled, setJitsiE2eeEnabled] = useState(false);
  const [telemedicinaRequierePago, setTelemedicinaRequierePago] = useState(true);
  const [telemedicinaConsentimiento, setTelemedicinaConsentimiento] = useState('');
  const [showJitsiSecret, setShowJitsiSecret] = useState(false);
  const [savingJitsi, setSavingJitsi] = useState(false);
  const [diagnosingJitsi, setDiagnosingJitsi] = useState(false);
  const [generatingSecret, setGeneratingSecret] = useState(false);
  const [jitsiDiag, setJitsiDiag] = useState<JitsiDiagnostic | null>(null);
  const [jitsiTestModalOpen, setJitsiTestModalOpen] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [cfg, bcv, wa, liveRates] = await Promise.all([
        integracionesApi.getConfig(),
        integracionesApi.getBcvRate().catch(() => null),
        integracionesApi.getWhatsAppStatus().catch(() => null),
        tasasApi.getCurrentRates().catch(() => null),
      ]);

      setMapboxActive(cfg.mapbox_active);
      setMapboxApiKey(cfg.mapbox_api_key || '');

      setGoogleMapsActive(cfg.google_maps_active);
      setGoogleMapsApiKey(cfg.google_maps_api_key || '');

      setPaypalActive(cfg.paypal_active);
      setPaypalMode(cfg.paypal_mode || 'sandbox');
      setPaypalClientId(cfg.paypal_client_id || '');
      setPaypalClientSecret(cfg.paypal_client_secret || '');

      setMercadopagoActive(cfg.mercadopago_active);
      setMercadopagoMode(cfg.mercadopago_mode || 'sandbox');
      setMercadopagoPublicKey(cfg.mercadopago_public_key || '');
      setMercadopagoAccessToken(cfg.mercadopago_access_token || '');

      setStripeActive(cfg.stripe_active);
      setStripeMode(cfg.stripe_mode || 'test');
      setStripePublishableKey(cfg.stripe_publishable_key || '');
      setStripeSecretKey(cfg.stripe_secret_key || '');
      setStripeWebhookSecret(cfg.stripe_webhook_secret || '');

      setJitsiActive(cfg.jitsi_active ?? true);
      setJitsiProvider(cfg.jitsi_provider || 'public');
      setJitsiDomain(cfg.jitsi_domain || 'meet.jit.si');
      setJitsiAppId(cfg.jitsi_app_id || '');
      setJitsiJwtSecret(cfg.jitsi_jwt_secret || '');
      setJitsiKeyId(cfg.jitsi_key_id || '');
      setJitsiRoomPrefix(cfg.jitsi_room_prefix || 'medisoft');
      setJitsiLobbyEnabled(cfg.jitsi_lobby_enabled ?? true);
      setJitsiRecordingEnabled(Boolean(cfg.jitsi_recording_enabled));
      setJitsiE2eeEnabled(Boolean(cfg.jitsi_e2ee_enabled));
      setTelemedicinaRequierePago(cfg.telemedicina_requiere_pago ?? true);
      setTelemedicinaConsentimiento(cfg.telemedicina_consentimiento_texto || '');

      setBcvData(bcv);
      setWaStatus(wa);
      setRatesInfo(liveRates);
    } catch (err) {
      console.error('Error cargando integraciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const showNotification = (id: string, text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ id, text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleRefreshBcv = async () => {
    try {
      setRefreshingBcv(true);
      await tasasApi.syncRates();
      const current = await tasasApi.getCurrentRates();
      setRatesInfo(current);
      if (current.tasas?.USD?.tasa) {
        setBcvData({
          rate: current.tasas.USD.tasa,
          fuente: current.tasas.USD.fuente,
          fecha_actualizacion: current.tasas.USD.fecha_tasa || new Date().toISOString(),
          moneda_base: 'USD',
          moneda_destino: 'VES',
          exitoso: true
        });
      }
      showNotification('bcv', 'Tasas del BCV y Binance actualizadas exitosamente.');
    } catch (err) {
      showNotification('bcv', 'Error al sincronizar tasas.', 'error');
    } finally {
      setRefreshingBcv(false);
    }
  };

  const handleSaveMapbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMapbox(true);
    try {
      await integracionesApi.updateMaps({
        mapbox_active: mapboxActive,
        mapbox_api_key: mapboxApiKey.trim() || null,
        google_maps_active: googleMapsActive,
        google_maps_api_key: googleMapsApiKey.trim() || null,
      });
      showNotification('mapbox', 'Integración de Mapbox guardada correctamente.');
    } catch (err) {
      showNotification('mapbox', 'Error al guardar Mapbox.', 'error');
    } finally {
      setSavingMapbox(false);
    }
  };

  const handleSaveGoogleMaps = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoogleMaps(true);
    try {
      await integracionesApi.updateMaps({
        mapbox_active: mapboxActive,
        mapbox_api_key: mapboxApiKey.trim() || null,
        google_maps_active: googleMapsActive,
        google_maps_api_key: googleMapsApiKey.trim() || null,
      });
      showNotification('google_maps', 'Integración de Google Maps guardada correctamente.');
    } catch (err) {
      showNotification('google_maps', 'Error al guardar Google Maps.', 'error');
    } finally {
      setSavingGoogleMaps(false);
    }
  };

  const handleSavePaypal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaypal(true);
    try {
      await integracionesApi.updatePagos({
        paypal_active: paypalActive,
        paypal_mode: paypalMode,
        paypal_client_id: paypalClientId.trim() || null,
        paypal_client_secret: paypalClientSecret.trim() || null,
        mercadopago_active: mercadopagoActive,
        mercadopago_mode: mercadopagoMode,
        mercadopago_public_key: mercadopagoPublicKey.trim() || null,
        mercadopago_access_token: mercadopagoAccessToken.trim() || null,
        stripe_active: stripeActive,
        stripe_mode: stripeMode,
        stripe_publishable_key: stripePublishableKey.trim() || null,
        stripe_secret_key: stripeSecretKey.trim() || null,
        stripe_webhook_secret: stripeWebhookSecret.trim() || null,
      });
      showNotification('paypal', 'Configuración de PayPal actualizada correctamente.');
    } catch (err) {
      showNotification('paypal', 'Error al guardar PayPal.', 'error');
    } finally {
      setSavingPaypal(false);
    }
  };

  const handleSaveMercadoPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMercadopago(true);
    try {
      await integracionesApi.updatePagos({
        paypal_active: paypalActive,
        paypal_mode: paypalMode,
        paypal_client_id: paypalClientId.trim() || null,
        paypal_client_secret: paypalClientSecret.trim() || null,
        mercadopago_active: mercadopagoActive,
        mercadopago_mode: mercadopagoMode,
        mercadopago_public_key: mercadopagoPublicKey.trim() || null,
        mercadopago_access_token: mercadopagoAccessToken.trim() || null,
        stripe_active: stripeActive,
        stripe_mode: stripeMode,
        stripe_publishable_key: stripePublishableKey.trim() || null,
        stripe_secret_key: stripeSecretKey.trim() || null,
        stripe_webhook_secret: stripeWebhookSecret.trim() || null,
      });
      showNotification('mercadopago', 'Configuración de Mercado Pago guardada.');
    } catch (err) {
      showNotification('mercadopago', 'Error al guardar Mercado Pago.', 'error');
    } finally {
      setSavingMercadopago(false);
    }
  };

  const handleSaveStripe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStripe(true);
    try {
      await integracionesApi.updatePagos({
        paypal_active: paypalActive,
        paypal_mode: paypalMode,
        paypal_client_id: paypalClientId.trim() || null,
        paypal_client_secret: paypalClientSecret.trim() || null,
        mercadopago_active: mercadopagoActive,
        mercadopago_mode: mercadopagoMode,
        mercadopago_public_key: mercadopagoPublicKey.trim() || null,
        mercadopago_access_token: mercadopagoAccessToken.trim() || null,
        stripe_active: stripeActive,
        stripe_mode: stripeMode,
        stripe_publishable_key: stripePublishableKey.trim() || null,
        stripe_secret_key: stripeSecretKey.trim() || null,
        stripe_webhook_secret: stripeWebhookSecret.trim() || null,
      });
      showNotification('stripe', 'Configuración de Stripe guardada.');
    } catch (err) {
      showNotification('stripe', 'Error al guardar Stripe.', 'error');
    } finally {
      setSavingStripe(false);
    }
  };

  const handleJitsiProviderChange = (nextProvider: 'public' | 'self_hosted' | 'jaas') => {
    setJitsiProvider(nextProvider);
    setJitsiDiag(null);
    if (nextProvider === 'public' && (!jitsiDomain || jitsiDomain === '8x8.vc')) {
      setJitsiDomain('meet.jit.si');
    } else if (nextProvider === 'jaas') {
      setJitsiDomain('8x8.vc');
    } else if (nextProvider === 'self_hosted' && jitsiDomain === '8x8.vc') {
      setJitsiDomain('');
    }
  };

  const handleGenerateJitsiSecret = async () => {
    try {
      setGeneratingSecret(true);
      const generated = await integracionesApi.generateJitsiSecret();
      if (!jitsiAppId.trim()) {
        setJitsiAppId(generated.jitsi_app_id);
      }
      setJitsiJwtSecret(generated.jitsi_jwt_secret);
      setShowJitsiSecret(true);
      showNotification('jitsi', 'Credenciales JWT HS256 generadas. Recuerda guardar los cambios.');
    } catch {
      showNotification('jitsi', 'No se pudieron generar las credenciales JWT.', 'error');
    } finally {
      setGeneratingSecret(false);
    }
  };

  const handleDiagnoseJitsi = async () => {
    try {
      setDiagnosingJitsi(true);
      const diag = await integracionesApi.diagnoseJitsi();
      setJitsiDiag(diag);
      if (diag.healthy) {
        showNotification(
          'jitsi',
          `Servidor Jitsi verificado (${diag.latency_ms} ms) — ${diag.jwt_status_message}.`
        );
      } else {
        showNotification(
          'jitsi',
          diag.error || diag.jwt_status_message || 'Revisa los parámetros del nodo Jitsi.',
          'error'
        );
      }
    } catch {
      showNotification('jitsi', 'Fallo al diagnosticar el servidor Jitsi.', 'error');
    } finally {
      setDiagnosingJitsi(false);
    }
  };

  const handleSaveJitsi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJitsi(true);
    try {
      const updated = await integracionesApi.updateJitsi({
        jitsi_active: jitsiActive,
        jitsi_provider: jitsiProvider,
        jitsi_domain: jitsiDomain.trim() || (jitsiProvider === 'jaas' ? '8x8.vc' : 'meet.jit.si'),
        jitsi_app_id: jitsiAppId.trim() || null,
        jitsi_jwt_secret: jitsiJwtSecret.trim() || null,
        jitsi_key_id: jitsiKeyId.trim() || null,
        jitsi_room_prefix: jitsiRoomPrefix.trim() || 'medisoft',
        jitsi_lobby_enabled: jitsiLobbyEnabled,
        jitsi_recording_enabled: jitsiRecordingEnabled,
        jitsi_e2ee_enabled: jitsiE2eeEnabled,
        telemedicina_requiere_pago: telemedicinaRequierePago,
        telemedicina_consentimiento_texto: telemedicinaConsentimiento.trim() || null,
      });
      setJitsiDomain(updated.jitsi_domain || 'meet.jit.si');
      setJitsiRoomPrefix(updated.jitsi_room_prefix || 'medisoft');
      setJitsiDiag(null);
      showNotification('jitsi', 'Configuración de Jitsi WorkSpace & Telemedicina guardada correctamente.');
    } catch (err: any) {
      showNotification(
        'jitsi',
        err?.response?.data?.detail || 'Error al guardar la configuración de Jitsi WorkSpace.',
        'error'
      );
    } finally {
      setSavingJitsi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-muted-foreground">Cargando catálogo de integraciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ══ HEADER PRINCIPAL ════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <Settings2 className="h-8 w-8 text-indigo-600" />
            <span>Catálogo de Integraciones & Servicios</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configura MediSoft WorkSpace (Telemedicina Jitsi), motores de mapas geográficos, WhatsApp Business y pasarelas de pago.
          </p>
        </div>
      </div>

      {/* ══ GRID PRINCIPAL DE SERVICIOS (2 COLUMNAS) ═════════════════════ */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* ── 0. Jitsi Meet — Motor Principal MediSoft WorkSpace ───────── */}
        <Card className="shadow-xs border-t-4 border-t-teal-600 flex flex-col justify-between md:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                  <Video className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-bold">
                      Jitsi Meet — MediSoft WorkSpace (Telemedicina)
                    </CardTitle>
                    <Badge className="bg-teal-600 text-white font-bold text-[10px] gap-1">
                      <Sparkles className="size-3" />
                      Motor Principal
                    </Badge>
                    <BadgeStatus active={jitsiActive} />
                  </div>
                  <CardDescription className="text-xs">
                    Videoconsultas médicas 100% WebRTC en navegador sin descargas para el paciente, juntas médicas internas y autenticación segura por rol con JWT.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDiagnoseJitsi}
                  disabled={diagnosingJitsi}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Activity className={cn('size-3.5 text-teal-600', diagnosingJitsi && 'animate-pulse')} />
                  <span>{diagnosingJitsi ? 'Diagnosticando...' : 'Diagnosticar Nodo'}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setJitsiTestModalOpen(true)}
                  className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                >
                  <Video className="size-3.5" />
                  <span>Probar Cabina en Vivo</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSaveJitsi}>
            <CardContent className="space-y-4 text-xs">
              {feedback?.id === 'jitsi' && (
                <div
                  className={cn(
                    'p-2.5 rounded-lg font-semibold flex items-center gap-2 border',
                    feedback.type === 'error'
                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  )}
                >
                  {feedback.type === 'error' ? (
                    <AlertCircle className="size-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="size-4 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {jitsiDiag && (
                <div
                  className={cn(
                    'p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2',
                    jitsiDiag.healthy
                      ? 'bg-emerald-500/5 border-emerald-500/25'
                      : 'bg-amber-500/10 border-amber-500/30'
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          jitsiDiag.healthy ? 'bg-emerald-500' : 'bg-amber-500'
                        )}
                      />
                      <span>
                        {jitsiDiag.service_online
                          ? `External IFrame API disponible (${jitsiDiag.domain})`
                          : `Sin respuesta de ${jitsiDiag.domain}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {jitsiDiag.error || jitsiDiag.jwt_status_message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Latencia: {jitsiDiag.latency_ms} ms
                    </Badge>
                    <Badge
                      className={cn(
                        'text-[10px] font-bold',
                        jitsiDiag.healthy
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      )}
                    >
                      {jitsiDiag.healthy ? '100% Operativo' : 'Requiere Revisión'}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                {/* Columna Izquierda: Infraestructura & JWT */}
                <div className="space-y-3.5 p-4 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <Server className="size-4 text-teal-600" />
                      <div>
                        <p className="font-bold text-foreground text-xs">Infraestructura & Servidor WebRTC</p>
                        <p className="text-[10px] text-muted-foreground">
                          Elige entre el nodo rápido comunitario o un nodo dedicado con JWT.
                        </p>
                      </div>
                    </div>
                    <Switch checked={jitsiActive} onCheckedChange={setJitsiActive} />
                  </div>

                  {/* Selector de proveedor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'public' as const,
                        title: 'Comunitario',
                        desc: 'meet.jit.si (Pruebas)',
                      },
                      {
                        id: 'self_hosted' as const,
                        title: 'Nodo Propio + JWT',
                        desc: 'Docker / Producción',
                      },
                      {
                        id: 'jaas' as const,
                        title: '8x8 JaaS Cloud',
                        desc: 'Enterprise RS256',
                      },
                    ].map((opt) => {
                      const selected = jitsiProvider === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={!jitsiActive}
                          onClick={() => handleJitsiProviderChange(opt.id)}
                          className={cn(
                            'text-left p-2.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50',
                            selected
                              ? 'border-teal-600 bg-teal-500/10 ring-1 ring-teal-600/30'
                              : 'border-border bg-background hover:bg-muted/50'
                          )}
                        >
                          <div className="font-bold text-[11px] text-foreground">{opt.title}</div>
                          <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="jitsi_domain" className="text-xs font-semibold">
                        Dominio del Servidor Jitsi
                      </Label>
                      <Input
                        id="jitsi_domain"
                        type="text"
                        placeholder={jitsiProvider === 'self_hosted' ? 'meet.tudominio.com' : 'meet.jit.si'}
                        value={jitsiDomain}
                        onChange={(e) => setJitsiDomain(e.target.value)}
                        disabled={!jitsiActive}
                        className="font-mono text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="jitsi_room_prefix" className="text-xs font-semibold">
                        Prefijo de Sala
                      </Label>
                      <Input
                        id="jitsi_room_prefix"
                        type="text"
                        placeholder="medisoft"
                        value={jitsiRoomPrefix}
                        onChange={(e) => setJitsiRoomPrefix(e.target.value)}
                        disabled={!jitsiActive}
                        className="font-mono text-xs h-8"
                      />
                    </div>
                  </div>

                  {jitsiProvider === 'public' && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      <strong>Nota de Producción:</strong> <code className="font-mono">meet.jit.si</code> permite probar de inmediato sin claves, pero limita sesiones incrustadas (<code className="font-mono">iframe</code>) a 5 minutos. Para teleconsultas ilimitadas sin login externo, despliega tu nodo Docker Jitsi y activa <strong>Nodo Propio + JWT</strong>.
                    </div>
                  )}

                  {jitsiProvider === 'self_hosted' && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                          <KeyRound className="size-3.5" />
                          Autenticación Prosody Token (HS256)
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!jitsiActive || generatingSecret}
                          onClick={handleGenerateJitsiSecret}
                          className="h-7 px-2.5 text-[10px] gap-1 cursor-pointer"
                        >
                          <Sparkles className="size-3 text-teal-600" />
                          <span>{generatingSecret ? 'Generando...' : 'Generar Claves'}</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label htmlFor="jitsi_app_id" className="text-[11px]">
                            JWT App ID (<code className="font-mono">JWT_APP_ID</code>)
                          </Label>
                          <Input
                            id="jitsi_app_id"
                            type="text"
                            placeholder="medisoft_workspace"
                            value={jitsiAppId}
                            onChange={(e) => setJitsiAppId(e.target.value)}
                            disabled={!jitsiActive}
                            className="font-mono text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="jitsi_jwt_secret" className="text-[11px]">
                            JWT App Secret (<code className="font-mono">JWT_APP_SECRET</code>)
                          </Label>
                          <div className="relative">
                            <Input
                              id="jitsi_jwt_secret"
                              type={showJitsiSecret ? 'text' : 'password'}
                              placeholder="ms_jitsi_..."
                              value={jitsiJwtSecret}
                              onChange={(e) => setJitsiJwtSecret(e.target.value)}
                              disabled={!jitsiActive}
                              className="font-mono text-xs h-8 pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => setShowJitsiSecret((s) => !s)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {showJitsiSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {jitsiProvider === 'jaas' && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label htmlFor="jaas_app_id" className="text-[11px]">
                            App ID (vpaas-magic-cookie-...)
                          </Label>
                          <Input
                            id="jaas_app_id"
                            type="text"
                            placeholder="vpaas-magic-cookie-..."
                            value={jitsiAppId}
                            onChange={(e) => setJitsiAppId(e.target.value)}
                            disabled={!jitsiActive}
                            className="font-mono text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="jaas_key_id" className="text-[11px]">
                            API Key ID (<code className="font-mono">kid</code>)
                          </Label>
                          <Input
                            id="jaas_key_id"
                            type="text"
                            placeholder="vpaas-magic-cookie-.../ab12cd"
                            value={jitsiKeyId}
                            onChange={(e) => setJitsiKeyId(e.target.value)}
                            disabled={!jitsiActive}
                            className="font-mono text-xs h-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="jaas_private_key" className="text-[11px]">
                          Private Key RSA (Formato PEM)
                        </Label>
                        <Textarea
                          id="jaas_private_key"
                          rows={3}
                          placeholder="-----BEGIN PRIVATE KEY-----..."
                          value={jitsiJwtSecret}
                          onChange={(e) => setJitsiJwtSecret(e.target.value)}
                          disabled={!jitsiActive}
                          className="font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Reglas Clínicas de Telemedicina & WorkSpace */}
                <div className="space-y-3 p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <ShieldCheck className="size-4 text-teal-600" />
                      <div>
                        <p className="font-bold text-foreground text-xs">Políticas Asistenciales de Telemedicina</p>
                        <p className="text-[10px] text-muted-foreground">
                          Gobernanza de sala de espera virtual, validación de cobro y privacidad médica.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                      <div className="space-y-0.5 pr-3">
                        <Label className="text-xs font-semibold">Pre-Join & Sala de Espera (Lobby)</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Permite al paciente probar cámara y audio antes de ingresar al consultorio.
                        </p>
                      </div>
                      <Switch
                        checked={jitsiLobbyEnabled}
                        onCheckedChange={setJitsiLobbyEnabled}
                        disabled={!jitsiActive}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                      <div className="space-y-0.5 pr-3">
                        <Label className="text-xs font-semibold">Exigir Cita Pagada / Validada en Caja</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Restringe el pase del paciente si la teleconsulta figura con pago pendiente.
                        </p>
                      </div>
                      <Switch
                        checked={telemedicinaRequierePago}
                        onCheckedChange={setTelemedicinaRequierePago}
                        disabled={!jitsiActive}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                        <div className="space-y-0.5 pr-2">
                          <Label className="text-[11px] font-semibold">Grabación Médica</Label>
                          <p className="text-[10px] text-muted-foreground">Solo moderador</p>
                        </div>
                        <Switch
                          checked={jitsiRecordingEnabled}
                          onCheckedChange={setJitsiRecordingEnabled}
                          disabled={!jitsiActive}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                        <div className="space-y-0.5 pr-2">
                          <Label className="text-[11px] font-semibold">Cifrado E2EE</Label>
                          <p className="text-[10px] text-muted-foreground">Punto a punto</p>
                        </div>
                        <Switch
                          checked={jitsiE2eeEnabled}
                          onCheckedChange={setJitsiE2eeEnabled}
                          disabled={!jitsiActive}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <Label htmlFor="telemedicina_consentimiento" className="text-[11px] font-semibold">
                        Aviso de Consentimiento Informado (Portal de Teleconsulta)
                      </Label>
                      <Textarea
                        id="telemedicina_consentimiento"
                        rows={2}
                        placeholder="Ej. Al ingresar a la videoconsulta autorizo la atención médica a distancia conforme a las políticas de privacidad de la clínica..."
                        value={telemedicinaConsentimiento}
                        onChange={(e) => setTelemedicinaConsentimiento(e.target.value)}
                        disabled={!jitsiActive}
                        className="text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t bg-muted/20 px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-teal-600" />
                <span>
                  Sala ejemplo:{' '}
                  <code className="font-mono text-foreground">
                    https://{jitsiDomain || 'meet.jit.si'}/{jitsiRoomPrefix || 'medisoft'}-teleconsulta-demo
                  </code>
                </span>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={savingJitsi}
                className="gap-2 text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingJitsi ? 'Guardando WorkSpace...' : 'Guardar Configuración WorkSpace'}</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* ── 1. Leaflet.js / OpenStreetMap (Gratis & Activo) ──────────── */}
        <Card className="shadow-xs border-t-4 border-t-emerald-500 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Leaflet.js / OpenStreetMap</CardTitle>
                  <CardDescription className="text-xs">
                    Motor de mapas interactivos de código abierto. Gratuito y sin necesidad de API Key.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                Activo (Por Defecto)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted-foreground">
            <p>
              Leaflet.js está integrado y activado como el visor de mapas predeterminado para ubicar sedes, consultorios médicos y pacientes.
            </p>
            <div className="rounded-md bg-muted/40 p-3 border space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Características de Leaflet.js</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Proveedores de capas: OpenStreetMap & CartoDB (Modo Claro / Oscuro)</li>
                <li>Geocodificación inversa gratuita mediante Nominatim OSM</li>
                <li>Solicitudes ilimitadas y cero costos de API externos</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-between items-center">
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              100% Operativo
            </span>
            <Badge variant="outline" className="text-xs font-mono">
              OSM Layer v1.9
            </Badge>
          </CardFooter>
        </Card>

        {/* ── 2. Mapbox Maps ───────────────────────────────────────────── */}
        <Card className="shadow-xs border-t-4 border-t-indigo-600 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Mapbox Maps</CardTitle>
                  <CardDescription className="text-xs">
                    Geolocalización interactiva y mapas vectoriales de alto rendimiento.
                  </CardDescription>
                </div>
              </div>
              <BadgeStatus active={mapboxActive} />
            </div>
          </CardHeader>
          <form onSubmit={handleSaveMapbox}>
            <CardContent className="space-y-4 text-xs">
              {feedback?.id === 'mapbox' && (
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Habilitar Mapbox</Label>
                  <p className="text-[10px] text-muted-foreground">Alternar motor de mapas a Mapbox GL Vector.</p>
                </div>
                <Switch checked={mapboxActive} onCheckedChange={setMapboxActive} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mapbox_api_key" className="text-xs font-semibold">Mapbox Access Token</Label>
                <Input
                  id="mapbox_api_key"
                  type="password"
                  placeholder="pk.eyJ1..."
                  value={mapboxApiKey}
                  onChange={(e) => setMapboxApiKey(e.target.value)}
                  disabled={!mapboxActive}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span>Obtén tu token en</span>
                  <a
                    href="https://mapbox.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
                  >
                    mapbox.com <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
              <Button type="submit" disabled={savingMapbox || !mapboxActive} size="sm" className="gap-2 text-xs h-8 cursor-pointer">
                <Save className="h-3.5 w-3.5" />
                <span>{savingMapbox ? "Guardando..." : "Guardar Cambios"}</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* ── 3. Google Maps API ───────────────────────────────────────── */}
        <Card className="shadow-xs border-t-4 border-t-blue-600 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Google Maps API</CardTitle>
                  <CardDescription className="text-xs">
                    Geocodificación de alta precisión, autocompletado de direcciones y rutas.
                  </CardDescription>
                </div>
              </div>
              <BadgeStatus active={googleMapsActive} />
            </div>
          </CardHeader>
          <form onSubmit={handleSaveGoogleMaps}>
            <CardContent className="space-y-4 text-xs">
              {feedback?.id === 'google_maps' && (
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Habilitar Google Maps</Label>
                  <p className="text-[10px] text-muted-foreground">Habilitar Google Maps JS API y Places Autocomplete.</p>
                </div>
                <Switch checked={googleMapsActive} onCheckedChange={setGoogleMapsActive} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="google_maps_api_key" className="text-xs font-semibold">Google Maps API Key</Label>
                <Input
                  id="google_maps_api_key"
                  type="password"
                  placeholder="AIzaSy..."
                  value={googleMapsApiKey}
                  onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                  disabled={!googleMapsActive}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span>Obtén tu clave de API en</span>
                  <a
                    href="https://console.cloud.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-0.5 font-semibold"
                  >
                    console.cloud.google.com <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
              <Button type="submit" disabled={savingGoogleMaps || !googleMapsActive} size="sm" className="gap-2 text-xs h-8 cursor-pointer">
                <Save className="h-3.5 w-3.5" />
                <span>{savingGoogleMaps ? "Guardando..." : "Guardar Cambios"}</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* ── 4. WhatsApp Business API ─────────────────────────────────── */}
        <Card className="shadow-xs border-t-4 border-t-emerald-600 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">WhatsApp Business API</CardTitle>
                  <CardDescription className="text-xs">
                    Automatiza la mensajería a pacientes, recordatorios de citas y llamados de turnos.
                  </CardDescription>
                </div>
              </div>
              <BadgeWhatsAppStatus active={true} connected={Boolean(waStatus?.is_connected)} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 py-4 text-xs text-muted-foreground space-y-3">
            <p>
              Conecta tu línea institucional de WhatsApp mediante código QR en tiempo real. Gestiona difusión masiva, bitácora de envíos, políticas anti-baneo y plantillas clínicas dinámicas.
            </p>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <span className="font-semibold font-mono">Instancia: {waStatus?.instance_name || "empresa_1"}</span>
              <span className="text-[10px] font-bold">{waStatus?.is_connected ? "En Línea" : "Esperando QR"}</span>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
            <Button asChild variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 cursor-pointer">
              <Link to="/integraciones/whatsapp">
                <Settings2 className="h-4 w-4" />
                <span>Panel WhatsApp Completo</span>
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* ── 5. Monitor Oficial BCV & Binance USDT (Multidivisa) ─────── */}
        <Card className="shadow-xs border-t-4 border-t-emerald-600 flex flex-col justify-between md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Monitor de Tasas del Día (Dólar, Euro & Binance USDT)</CardTitle>
                  <CardDescription className="text-xs">
                    Conversión multimoneda en tiempo real para facturación médica, cobro de consultas e histórico inmutable.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshBcv}
                  disabled={refreshingBcv}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={cn("size-3.5", refreshingBcv && "animate-spin")} />
                  <span>Sincronizar en Vivo</span>
                </Button>
                <Button asChild size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  <Link to="/integraciones/tasas">
                    <span>Administrar Tasas & Histórico</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Dólar BCV */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold tracking-wider">Dólar Oficial (USD)</span>
                  <Badge className="bg-emerald-500 text-white text-[9px]">BCV Oficial</Badge>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  Bs. {ratesInfo?.tasas?.USD?.tasa ? ratesInfo.tasas.USD.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : (bcvData ? bcvData.rate.toFixed(2) : "Consultando...")}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{ratesInfo?.tasas?.USD?.fuente || "DolarAPI Oficial"}</p>
              </div>

              {/* Euro BCV */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold tracking-wider">Euro Oficial (EUR)</span>
                  <Badge className="bg-blue-600 text-white text-[9px]">BCV Euro</Badge>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  Bs. {ratesInfo?.tasas?.EUR?.tasa ? ratesInfo.tasas.EUR.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "926.55"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{ratesInfo?.tasas?.EUR?.fuente || "BCV Euro Oficial"}</p>
              </div>

              {/* Binance USDT */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold tracking-wider">Binance Tether (USDT)</span>
                  <Badge className="bg-amber-500 text-slate-950 font-bold text-[9px]">Binance P2P</Badge>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  Bs. {ratesInfo?.tasas?.USDT?.tasa ? ratesInfo.tasas.USDT.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "945.90"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{ratesInfo?.tasas?.USDT?.fuente || "Binance P2P / Mercado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══ SECCIÓN INFERIOR: PASARELAS DE PAGO (3 COLUMNAS) ═════════════ */}
      <div className="space-y-4 pt-6 border-t">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <CreditCard className="h-6 w-6 text-sky-600" />
            <span>Pasarelas de Pago Online (Cobro de Consultas & Citas)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configuración de pasarelas de pago online para recibir cobros por teleconsultas, abono de citas médicas y procedimientos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ── PayPal Integration ─────────────────────────────────────── */}
          <Card className="shadow-xs border-t-4 border-t-sky-500 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/20 text-sky-600 font-bold text-xs">
                    PP
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">PayPal</CardTitle>
                    <CardDescription className="text-xs">Pagos internacionales</CardDescription>
                  </div>
                </div>
                <BadgeStatus active={paypalActive} />
              </div>
            </CardHeader>
            <form onSubmit={handleSavePaypal}>
              <CardContent className="space-y-3 text-xs">
                {feedback?.id === 'paypal' && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30">
                  <Label className="text-xs font-semibold">Habilitar PayPal</Label>
                  <Switch checked={paypalActive} onCheckedChange={setPaypalActive} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Modo de Entorno</Label>
                  <Select value={paypalMode} onValueChange={setPaypalMode} disabled={!paypalActive}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar entorno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                      <SelectItem value="live">Live (Producción)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="paypal_client_id" className="text-xs">Client ID</Label>
                  <Input
                    id="paypal_client_id"
                    type="text"
                    placeholder="A..."
                    value={paypalClientId}
                    onChange={(e) => setPaypalClientId(e.target.value)}
                    disabled={!paypalActive}
                    className="font-mono text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="paypal_client_secret" className="text-xs">Client Secret</Label>
                  <Input
                    id="paypal_client_secret"
                    type="password"
                    placeholder="E..."
                    value={paypalClientSecret}
                    onChange={(e) => setPaypalClientSecret(e.target.value)}
                    disabled={!paypalActive}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-4 py-3 flex justify-end">
                <Button type="submit" size="sm" disabled={savingPaypal || !paypalActive} className="gap-2 text-xs h-8 cursor-pointer">
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingPaypal ? "Guardando..." : "Guardar PayPal"}</span>
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* ── Mercado Pago Integration ───────────────────────────────── */}
          <Card className="shadow-xs border-t-4 border-t-cyan-500 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 font-bold text-xs">
                    MP
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Mercado Pago</CardTitle>
                    <CardDescription className="text-xs">Cobros en Latinoamérica</CardDescription>
                  </div>
                </div>
                <BadgeStatus active={mercadopagoActive} />
              </div>
            </CardHeader>
            <form onSubmit={handleSaveMercadoPago}>
              <CardContent className="space-y-3 text-xs">
                {feedback?.id === 'mercadopago' && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30">
                  <Label className="text-xs font-semibold">Habilitar Mercado Pago</Label>
                  <Switch checked={mercadopagoActive} onCheckedChange={setMercadopagoActive} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Modo de Entorno</Label>
                  <Select value={mercadopagoMode} onValueChange={setMercadopagoMode} disabled={!mercadopagoActive}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar entorno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                      <SelectItem value="live">Live (Producción)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mercadopago_public_key" className="text-xs">Public Key</Label>
                  <Input
                    id="mercadopago_public_key"
                    type="text"
                    placeholder="APP_USR-..."
                    value={mercadopagoPublicKey}
                    onChange={(e) => setMercadopagoPublicKey(e.target.value)}
                    disabled={!mercadopagoActive}
                    className="font-mono text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mercadopago_access_token" className="text-xs">Access Token</Label>
                  <Input
                    id="mercadopago_access_token"
                    type="password"
                    placeholder="APP_USR-..."
                    value={mercadopagoAccessToken}
                    onChange={(e) => setMercadopagoAccessToken(e.target.value)}
                    disabled={!mercadopagoActive}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-4 py-3 flex justify-end">
                <Button type="submit" size="sm" disabled={savingMercadopago || !mercadopagoActive} className="gap-2 text-xs h-8 bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer">
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingMercadopago ? "Guardando..." : "Guardar Mercado Pago"}</span>
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* ── Stripe Integration ─────────────────────────────────────── */}
          <Card className="shadow-xs border-t-4 border-t-indigo-500 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 font-bold text-xs">
                    ST
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Stripe</CardTitle>
                    <CardDescription className="text-xs">Tarjetas globales</CardDescription>
                  </div>
                </div>
                <BadgeStatus active={stripeActive} />
              </div>
            </CardHeader>
            <form onSubmit={handleSaveStripe}>
              <CardContent className="space-y-3 text-xs">
                {feedback?.id === 'stripe' && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30">
                  <Label className="text-xs font-semibold">Habilitar Stripe</Label>
                  <Switch checked={stripeActive} onCheckedChange={setStripeActive} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Modo de Entorno</Label>
                  <Select value={stripeMode} onValueChange={setStripeMode} disabled={!stripeActive}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar entorno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test (Pruebas)</SelectItem>
                      <SelectItem value="live">Live (Producción)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="stripe_publishable_key" className="text-xs">Publishable Key</Label>
                  <Input
                    id="stripe_publishable_key"
                    type="text"
                    placeholder="pk_test_..."
                    value={stripePublishableKey}
                    onChange={(e) => setStripePublishableKey(e.target.value)}
                    disabled={!stripeActive}
                    className="font-mono text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="stripe_secret_key" className="text-xs">Secret Key</Label>
                  <Input
                    id="stripe_secret_key"
                    type="password"
                    placeholder="sk_test_..."
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    disabled={!stripeActive}
                    className="font-mono text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="stripe_webhook_secret" className="text-xs">Webhook Secret</Label>
                  <Input
                    id="stripe_webhook_secret"
                    type="password"
                    placeholder="whsec_..."
                    value={stripeWebhookSecret}
                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                    disabled={!stripeActive}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-4 py-3 flex justify-end">
                <Button type="submit" size="sm" disabled={savingStripe || !stripeActive} className="gap-2 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingStripe ? "Guardando..." : "Guardar Stripe"}</span>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Modal de Cabina en Vivo & Diagnóstico Jitsi WorkSpace */}
      <JitsiTestRoomModal
        open={jitsiTestModalOpen}
        onOpenChange={setJitsiTestModalOpen}
      />
    </div>
  );
};

function BadgeStatus({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className={active ? "bg-indigo-600 text-white font-bold text-[10px]" : "font-bold text-[10px] text-muted-foreground"}
    >
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

function BadgeWhatsAppStatus({ active, connected }: { active: boolean; connected: boolean }) {
  if (!active) {
    return (
      <Badge variant="secondary" className="font-bold text-[10px] text-muted-foreground">
        Inactivo
      </Badge>
    );
  }

  if (connected) {
    return (
      <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
        Conectado
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-500 text-white font-bold text-[10px]">
      Desconectado
    </Badge>
  );
}

export default IntegracionesHub;
