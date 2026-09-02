import React, { useState, useEffect } from 'react';
import { integracionesApi } from '../../api/integraciones';
import {
  MapPin,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Layers,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import { cn } from '../../lib/utils';

export const MapasPagosConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mapas');
  const [loading, setLoading] = useState(true);
  const [savingMaps, setSavingMaps] = useState(false);
  const [savingPagos, setSavingPagos] = useState(false);
  const [mapsMsg, setMapsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pagosMsg, setPagosMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulario Mapas
  const [maptilerKey, setMaptilerKey] = useState('');
  const [maptilerActive, setMaptilerActive] = useState(true);
  const [mapboxKey, setMapboxKey] = useState('');
  const [mapboxActive, setMapboxActive] = useState(false);
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [googleMapsActive, setGoogleMapsActive] = useState(false);

  // Formulario Pasarelas
  const [stripeActive, setStripeActive] = useState(false);
  const [stripeMode, setStripeMode] = useState('test');
  const [stripePubKey, setStripePubKey] = useState('');
  const [stripeSecKey, setStripeSecKey] = useState('');
  const [stripeWebhook, setStripeWebhook] = useState('');

  const [paypalActive, setPaypalActive] = useState(false);
  const [paypalMode, setPaypalMode] = useState('sandbox');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalSecret, setPaypalSecret] = useState('');

  const [mercadopagoActive, setMercadopagoActive] = useState(false);
  const [mercadopagoMode, setMercadopagoMode] = useState('sandbox');
  const [mercadopagoPubKey, setMercadopagoPubKey] = useState('');
  const [mercadopagoToken, setMercadopagoToken] = useState('');

  // Toggles para ver / ocultar secretos
  const [showStripeSec, setShowStripeSec] = useState(false);
  const [showPaypalSec, setShowPaypalSec] = useState(false);
  const [showMpSec, setShowMpSec] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const cfg = await integracionesApi.getConfig();
      setMaptilerKey(cfg.maptiler_api_key || '');
      setMaptilerActive(cfg.maptiler_active ?? true);
      setMapboxKey(cfg.mapbox_api_key || '');
      setMapboxActive(cfg.mapbox_active);
      setGoogleMapsKey(cfg.google_maps_api_key || '');
      setGoogleMapsActive(cfg.google_maps_active);

      setStripeActive(cfg.stripe_active);
      setStripeMode(cfg.stripe_mode || 'test');
      setStripePubKey(cfg.stripe_publishable_key || '');
      setStripeSecKey(cfg.stripe_secret_key || '');
      setStripeWebhook(cfg.stripe_webhook_secret || '');

      setPaypalActive(cfg.paypal_active);
      setPaypalMode(cfg.paypal_mode || 'sandbox');
      setPaypalClientId(cfg.paypal_client_id || '');
      setPaypalSecret(cfg.paypal_client_secret || '');

      setMercadopagoActive(cfg.mercadopago_active);
      setMercadopagoMode(cfg.mercadopago_mode || 'sandbox');
      setMercadopagoPubKey(cfg.mercadopago_public_key || '');
      setMercadopagoToken(cfg.mercadopago_access_token || '');
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveMaps = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapsMsg(null);
    setSavingMaps(true);
    try {
      await integracionesApi.updateMaps({
        maptiler_api_key: maptilerKey.trim() || null,
        maptiler_active: maptilerActive,
        mapbox_api_key: mapboxKey.trim() || null,
        mapbox_active: mapboxActive,
        google_maps_api_key: googleMapsKey.trim() || null,
        google_maps_active: googleMapsActive,
      });
      setMapsMsg({ type: 'success', text: '¡Configuración de mapas guardada correctamente!' });
    } catch (err: any) {
      setMapsMsg({ type: 'error', text: err.response?.data?.detail || 'Error al guardar mapas.' });
    } finally {
      setSavingMaps(false);
    }
  };

  const handleSavePagos = async (e: React.FormEvent) => {
    e.preventDefault();
    setPagosMsg(null);
    setSavingPagos(true);
    try {
      await integracionesApi.updatePagos({
        stripe_active: stripeActive,
        stripe_mode: stripeMode,
        stripe_publishable_key: stripePubKey.trim() || null,
        stripe_secret_key: stripeSecKey.trim() || null,
        stripe_webhook_secret: stripeWebhook.trim() || null,
        paypal_active: paypalActive,
        paypal_mode: paypalMode,
        paypal_client_id: paypalClientId.trim() || null,
        paypal_client_secret: paypalSecret.trim() || null,
        mercadopago_active: mercadopagoActive,
        mercadopago_mode: mercadopagoMode,
        mercadopago_public_key: mercadopagoPubKey.trim() || null,
        mercadopago_access_token: mercadopagoToken.trim() || null,
      });
      setPagosMsg({ type: 'success', text: '¡Credenciales de pasarelas de pago actualizadas!' });
    } catch (err: any) {
      setPagosMsg({ type: 'error', text: err.response?.data?.detail || 'Error al guardar pasarelas.' });
    } finally {
      setSavingPagos(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ══ HEADER DE MÓDULO ════════════════════════════════════════════ */}
      <ModuleHeader
        title="Configuración de Mapas & Pasarelas de Pago"
        description="Administra tokens de API y credenciales de geolocalización y pagos para teleconsultas y cobros médicos."
        icon={<Layers className="size-6 text-white" />}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchConfig}
          disabled={loading}
          className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span>Recargar</span>
        </Button>
      </ModuleHeader>

      {/* ══ PESTAÑAS MAPAS VS PAGOS ═════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 p-1 rounded-xl w-full sm:w-auto h-auto flex flex-wrap gap-1 border justify-start">
          <TabsTrigger
            value="mapas"
            className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-semibold rounded-lg px-4 py-2 gap-1.5 transition-all cursor-pointer"
          >
            <MapPin className="size-3.5" />
            <span>Mapas & Geolocalización</span>
          </TabsTrigger>
          <TabsTrigger
            value="pagos"
            className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-semibold rounded-lg px-4 py-2 gap-1.5 transition-all cursor-pointer"
          >
            <CreditCard className="size-3.5" />
            <span>Pasarelas de Pago (Stripe, PayPal, MP)</span>
          </TabsTrigger>
        </TabsList>

        {/* ── 1. MAPAS & GEOLOCALIZACIÓN ──────────────────────────────── */}
        <TabsContent value="mapas" className="space-y-6 mt-4">
          {mapsMsg && (
            <div
              className={cn(
                "p-3.5 rounded-xl text-xs flex items-center gap-2.5 border shadow-xs animate-in fade-in",
                mapsMsg.type === 'success'
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold"
              )}
            >
              {mapsMsg.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
              <span>{mapsMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveMaps} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* MapTiler SDK */}
              <Card className="shadow-xs border border-teal-200/80 dark:border-teal-900/50 bg-teal-50/10">
                <CardHeader className="pb-3 border-b bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <MapPin className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                          <span>MapTiler SDK</span>
                          <span className="text-[10px] bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-semibold px-1.5 py-0.5 rounded">Recomendado</span>
                        </CardTitle>
                        <CardDescription className="text-xs">Mapas vectoriales ultrarrápidos y geolocalización</CardDescription>
                      </div>
                    </div>
                    <Switch checked={maptilerActive} onCheckedChange={setMaptilerActive} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">API Key de MapTiler</Label>
                    <Input
                      type="password"
                      value={maptilerKey}
                      onChange={(e) => setMaptilerKey(e.target.value)}
                      placeholder="get_your_own_..."
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Obtén tu API key gratuita desde <a href="https://cloud.maptiler.com" target="_blank" rel="noreferrer" className="text-teal-600 underline">cloud.maptiler.com</a>.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Google Maps API */}
              <Card className="shadow-xs border">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                        <Globe className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Google Maps API</CardTitle>
                        <CardDescription className="text-xs">Autocompletado de direcciones y mapas</CardDescription>
                      </div>
                    </div>
                    <Switch checked={googleMapsActive} onCheckedChange={setGoogleMapsActive} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">API Key de Google Maps</Label>
                    <Input
                      type="password"
                      value={googleMapsKey}
                      onChange={(e) => setGoogleMapsKey(e.target.value)}
                      placeholder="AIzaSyD..."
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Requiere las APIs Geocoding, Places y Maps JavaScript activadas en Google Cloud.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Mapbox GL */}
              <Card className="shadow-xs border">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <MapPin className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Mapbox GL</CardTitle>
                        <CardDescription className="text-xs">Mapas vectoriales y navegación GPS</CardDescription>
                      </div>
                    </div>
                    <Switch checked={mapboxActive} onCheckedChange={setMapboxActive} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Mapbox Access Token</Label>
                    <Input
                      type="password"
                      value={mapboxKey}
                      onChange={(e) => setMapboxKey(e.target.value)}
                      placeholder="pk.eyJ1..."
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Obtén tu token público desde tu cuenta de Mapbox Studio.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingMaps} className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-xs">
                {savingMaps ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="size-3.5" />}
                <span>Guardar Configuración de Mapas</span>
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ── 2. PASARELAS DE PAGO ─────────────────────────────────────── */}
        <TabsContent value="pagos" className="space-y-6 mt-4">
          {pagosMsg && (
            <div
              className={cn(
                "p-3.5 rounded-xl text-xs flex items-center gap-2.5 border shadow-xs animate-in fade-in",
                pagosMsg.type === 'success'
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold"
              )}
            >
              {pagosMsg.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
              <span>{pagosMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSavePagos} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stripe */}
              <Card className="shadow-xs border space-y-4">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-indigo-500" />
                      <CardTitle className="text-sm font-bold">Stripe Payments</CardTitle>
                    </div>
                    <Switch checked={stripeActive} onCheckedChange={setStripeActive} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Modo de Operación</Label>
                    <Select value={stripeMode} onValueChange={setStripeMode}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test / Pruebas</SelectItem>
                        <SelectItem value="live">Live / Producción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Publishable Key</Label>
                    <Input
                      value={stripePubKey}
                      onChange={(e) => setStripePubKey(e.target.value)}
                      placeholder="pk_test_..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Secret Key</Label>
                    <div className="relative">
                      <Input
                        type={showStripeSec ? "text" : "password"}
                        value={stripeSecKey}
                        onChange={(e) => setStripeSecKey(e.target.value)}
                        placeholder="sk_test_..."
                        className="h-8 text-xs font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStripeSec(!showStripeSec)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showStripeSec ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PayPal */}
              <Card className="shadow-xs border space-y-4">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-blue-500" />
                      <CardTitle className="text-sm font-bold">PayPal Checkout</CardTitle>
                    </div>
                    <Switch checked={paypalActive} onCheckedChange={setPaypalActive} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Modo</Label>
                    <Select value={paypalMode} onValueChange={setPaypalMode}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Client ID</Label>
                    <Input
                      value={paypalClientId}
                      onChange={(e) => setPaypalClientId(e.target.value)}
                      placeholder="AXo..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Secret Key</Label>
                    <div className="relative">
                      <Input
                        type={showPaypalSec ? "text" : "password"}
                        value={paypalSecret}
                        onChange={(e) => setPaypalSecret(e.target.value)}
                        placeholder="••••••••"
                        className="h-8 text-xs font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPaypalSec(!showPaypalSec)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPaypalSec ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mercado Pago */}
              <Card className="shadow-xs border space-y-4">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-teal-500" />
                      <CardTitle className="text-sm font-bold">Mercado Pago</CardTitle>
                    </div>
                    <Switch checked={mercadopagoActive} onCheckedChange={setMercadopagoActive} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Modo</Label>
                    <Select value={mercadopagoMode} onValueChange={setMercadopagoMode}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Public Key</Label>
                    <Input
                      value={mercadopagoPubKey}
                      onChange={(e) => setMercadopagoPubKey(e.target.value)}
                      placeholder="TEST-..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Access Token</Label>
                    <div className="relative">
                      <Input
                        type={showMpSec ? "text" : "password"}
                        value={mercadopagoToken}
                        onChange={(e) => setMercadopagoToken(e.target.value)}
                        placeholder="TEST-..."
                        className="h-8 text-xs font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMpSec(!showMpSec)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showMpSec ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingPagos} className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-xs">
                {savingPagos ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="size-3.5" />}
                <span>Guardar Pasarelas de Pago</span>
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
