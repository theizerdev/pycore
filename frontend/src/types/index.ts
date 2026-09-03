export interface Empresa {
  id: number;
  nombre: string;
  identificacion_fiscal?: string | null;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais_id?: number | null;
  pais_telefono_id?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  maptiler_api_key?: string | null;
  maptiler_active?: boolean;
  pais?: Pais | null;
  pais_telefono?: Pais | null;
  logo_url?: string | null;
  logo_mini_url?: string | null;
  logo_mini_dark_url?: string | null;
  logo?: string | null;
  plan_id?: number | null;
  plan_vencimiento?: string | null;
  plan_estado?: string | null;
  plan?: Plan | null;
  activo: boolean;
  banco_nombre?: string | null;
  banco_tipo_cuenta?: string | null;
  banco_numero_cuenta?: string | null;
  banco_titular?: string | null;
  banco_doc_identidad?: string | null;
  pagomovil_banco?: string | null;
  pagomovil_telefono?: string | null;
  pagomovil_doc_identidad?: string | null;
  sucursales?: Sucursal[];
  created_at: string;
  updated_at: string;
}

export interface MetodosPagoMaster {
  banco_nombre?: string | null;
  banco_tipo_cuenta?: string | null;
  banco_numero_cuenta?: string | null;
  banco_titular?: string | null;
  banco_doc_identidad?: string | null;
  pagomovil_banco?: string | null;
  pagomovil_telefono?: string | null;
  pagomovil_doc_identidad?: string | null;
}

export interface Plan {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  precio_mensual: number;
  precio_anual: number;
  precio_regular_mensual?: number;
  precio_promocional_mensual?: number;
  tiene_promocion?: boolean;
  badge_promocion?: string | null;
  orden?: number;
  sucursales_incluidas?: number;
  precio_sucursal_extra_mensual?: number;
  max_usuarios: number;
  max_sucursales: number;
  max_mensajes_whatsapp: number;
  modulos_permitidos?: string[];
  destacado: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SuscripcionMetricas {
  usuarios_usados: number;
  max_usuarios: number;
  usuarios_porcentaje: number;
  sucursales_usadas: number;
  max_sucursales: number;
  sucursales_porcentaje: number;
  mensajes_whatsapp_mes: number;
  max_mensajes_whatsapp: number;
  whatsapp_porcentaje: number;
}

export interface SuscripcionEmpresa {
  empresa_id: number;
  empresa_nombre: string;
  plan_activo?: Plan | null;
  plan_estado: string;
  fecha_inicio?: string | null;
  plan_vencimiento?: string | null;
  metricas: SuscripcionMetricas;
  modulos_permitidos: string[];
  metodos_pago_master?: MetodosPagoMaster | null;
  tasa_bcv_eur?: number | null;
}

export interface Pais {
  id: number;
  nombre: string;
  codigo_iso2: string;
  codigo_iso3: string;
  codigo_telefonico?: string | null;
  moneda_principal?: string | null;
  idioma_principal?: string | null;
  continente?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  zona_horaria?: string | null;
  formato_fecha?: string | null;
  formato_moneda?: string | null;
  impuesto_predeterminado?: number | null;
  separador_miles?: string | null;
  separador_decimales?: string | null;
  decimales_moneda?: number | null;
  activo: boolean;
  simbolo_moneda?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sucursal {
  id: number;
  empresa_id: number;
  pais_id?: number | null;
  pais_telefono_id?: number | null;
  pais?: Pais | null;
  pais_telefono?: Pais | null;
  nombre: string;
  codigo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permiso {
  id: number;
  sector: string;
  modulo: string;
  accion: string;
  slug: string;
  descripcion?: string | null;
  created_at: string;
}

export interface PermisosPorModulo {
  modulo: string;
  permisos: Permiso[];
}

export interface SectorPermisos {
  sector: string;
  titulo: string;
  descripcion?: string | null;
  modulos: PermisosPorModulo[];
}

export interface Rol {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  es_sistema: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
  permisos: Permiso[];
}

export interface UsuarioSucursalItem {
  sucursal: Sucursal;
}

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  pais_telefono_id?: number | null;
  pais_telefono?: Pais | null;
  avatar_url?: string | null;
  activo: boolean;
  es_superadmin: boolean;
  empresa_id?: number | null;
  sucursal_defecto_id?: number | null;
  rol_id: number;
  whatsapp_verified?: boolean;
  whatsapp_otp_code?: string | null;
  ultimo_acceso?: string | null;
  created_at: string;
  updated_at: string;
  rol?: Rol | null;
  empresa?: Empresa | null;
  sucursal_defecto?: Sucursal | null;
  sucursales_asignadas: UsuarioSucursalItem[];
}

export interface AuditoriaLog {
  id: number;
  usuario_id?: number | null;
  empresa_id?: number | null;
  accion: string;
  modulo: string;
  ip?: string | null;
  user_agent?: string | null;
  detalles?: Record<string, any> | null;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: Usuario;
  permisos: string[];
  sucursal_activa_id?: number | null;
  requires_whatsapp_verification?: boolean;
  debug_otp_code?: string | null;
}

// ── INTEGRACIONES & SERVICIOS ──────────────────────────────────────────
export interface IntegracionesConfig {
  maptiler_api_key?: string | null;
  maptiler_active: boolean;
  mapbox_api_key?: string | null;
  mapbox_active: boolean;
  google_maps_api_key?: string | null;
  google_maps_active: boolean;

  whatsapp_active: boolean;
  whatsapp_api_url?: string | null;
  whatsapp_api_key?: string | null;
  whatsapp_instance?: string | null;
  whatsapp_connected: boolean;
  whatsapp_phone?: string | null;
  whatsapp_status?: string | null;
  whatsapp_rate_limit?: number | null;
  whatsapp_warmup_mode?: boolean | null;
  whatsapp_working_hours_enabled?: boolean | null;
  whatsapp_working_hours_start?: string | null;
  whatsapp_working_hours_end?: string | null;
  whatsapp_proxy_url?: string | null;

  paypal_active: boolean;
  paypal_mode: 'sandbox' | 'live';
  paypal_client_id?: string | null;
  paypal_client_secret?: string | null;

  stripe_active: boolean;
  stripe_mode: 'test' | 'live';
  stripe_publishable_key?: string | null;
  stripe_secret_key?: string | null;
  stripe_webhook_secret?: string | null;

  mercadopago_active: boolean;
  mercadopago_mode: 'sandbox' | 'live';
  mercadopago_public_key?: string | null;
  mercadopago_access_token?: string | null;

  bcv_rate_cached?: number | null;
  bcv_rate_updated_at?: string | null;
}

export interface BcvRateData {
  rate: number;
  fuente: string;
  fecha_actualizacion: string;
  moneda_base: string;
  moneda_destino: string;
  exitoso: boolean;
}

export interface WhatsAppStatus {
  is_connected: boolean;
  connection_state: 'CONNECTED' | 'QR_READY' | 'CONNECTING' | 'DISCONNECTED';
  qr_code?: string | null;
  qr_data_url?: string | null;
  instance_name: string;
  phone_number?: string | null;
  last_sync?: string | null;
}

export interface WhatsAppTemplate {
  id: number;
  empresa_id: number;
  nombre: string;
  categoria: string;
  contenido: string;
  variables?: string[] | null;
  activo: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface WhatsAppMessage {
  id: number;
  empresa_id: number;
  recipient_phone: string;
  recipient_name?: string | null;
  message_content: string;
  variables?: Record<string, any> | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'inbound' | 'outbound';
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

// ── CLÍNICA / GESTIÓN ASISTENCIAL ──────────────────────────────────────
export interface Especialidad {
  id: number;
  empresa_id: number;
  sucursal_id?: number | null;
  nombre: string;
  codigo?: string | null;
  descripcion?: string | null;
  color?: string | null;
  icono?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  sucursal?: {
    id: number;
    nombre: string;
    codigo?: string | null;
  } | null;
}

export interface EspecialidadCreateInput {
  nombre: string;
  codigo?: string | null;
  descripcion?: string | null;
  color?: string | null;
  icono?: string | null;
  activo?: boolean;
  sucursal_id?: number | null;
  empresa_id?: number | null;
}

export interface EspecialidadUpdateInput {
  nombre?: string;
  codigo?: string | null;
  descripcion?: string | null;
  color?: string | null;
  icono?: string | null;
  activo?: boolean;
  sucursal_id?: number | null;
}

// ── PLANTILLAS CLÍNICAS DINÁMICAS (PRECONSULTA, CONSULTA Y MÉDICOS) ────
export type TipoCampoClinico =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'
  | 'scale_1_10'
  | 'calculated';

export interface CampoClinico {
  key: string;
  label: string;
  tipo: TipoCampoClinico;
  placeholder?: string | null;
  requerido?: boolean;
  unidad?: string | null;
  opciones?: string[];
  min_val?: number | null;
  max_val?: number | null;
  grid_cols?: number; // 12 (completo), 6 (medio), 4 (tercio), 3 (cuarto)
  es_medico?: boolean;
  medico_nombre?: string | null;
}

export interface SeccionClinica {
  id: string;
  titulo: string;
  descripcion?: string | null;
  icono?: string | null;
  campos: CampoClinico[];
}

export interface EspecialidadPlantilla {
  id: number;
  empresa_id: number;
  especialidad_id: number;
  version: number;
  activo: boolean;
  esquema_preconsulta: SeccionClinica[];
  esquema_consulta: SeccionClinica[];
  widgets_activos: string[];
  created_at: string;
  updated_at: string;
}

export interface EspecialidadPlantillaSaveInput {
  esquema_preconsulta: SeccionClinica[];
  esquema_consulta: SeccionClinica[];
  widgets_activos?: string[];
}

export interface EspecialidadPlantillaMedico {
  id?: number | null;
  empresa_id: number;
  especialidad_id: number;
  usuario_id: number;
  campos_preconsulta: CampoClinico[];
  campos_consulta: CampoClinico[];
  campos_ocultos: string[];
  activo: boolean;
}

export interface PlantillaMedicoSaveInput {
  campos_preconsulta: CampoClinico[];
  campos_consulta: CampoClinico[];
  campos_ocultos?: string[];
}

export interface PlantillaEfectiva {
  especialidad_id: number;
  especialidad_nombre: string;
  especialidad_color?: string | null;
  especialidad_icono?: string | null;
  tiene_plantilla_base: boolean;
  widgets_activos: string[];
  preconsulta_secciones: SeccionClinica[];
  consulta_secciones: SeccionClinica[];
  total_campos_preconsulta: number;
  total_campos_consulta: number;
  total_campos_medico: number;
}

// ── MÉDICOS Y ESPECIALISTAS ──────────────────────────────────────────
export interface SubespecialidadItem {
  id?: string;
  nombre: string;
  nivel_experiencia: string;
  anos_servicio: number;
  certificado_folio?: string | null;
}

export interface Medico {
  id: number;
  empresa_id: number;
  usuario_id?: number | null;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  documento_identidad: string;
  email: string;
  pais_telefono_id?: number | null;
  telefono?: string | null;
  licencia_medica?: string | null;
  especialidad_id: number;
  subespecialidades: SubespecialidadItem[];
  color: string;
  sucursal_defecto_id?: number | null;
  sucursales_ids: number[];
  biografia?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;

  // Enriquecidos
  especialidad_nombre?: string | null;
  especialidad_codigo?: string | null;
  especialidad_color?: string | null;
  especialidad_icono?: string | null;
  pais_nombre?: string | null;
  pais_codigo_iso2?: string | null;
  pais_codigo_telefonico?: string | null;
  sucursal_nombre?: string | null;
  usuario_activo?: boolean | null;
}

export interface MedicoCreateInput {
  nombres: string;
  apellidos: string;
  tipo_documento?: string;
  documento_identidad: string;
  email: string;
  pais_telefono_id?: number | null;
  telefono?: string | null;
  licencia_medica?: string | null;
  especialidad_id: number;
  subespecialidades?: SubespecialidadItem[];
  color?: string;
  sucursal_defecto_id?: number | null;
  sucursales_ids?: number[];
  biografia?: string | null;
  activo?: boolean;
  crear_usuario?: boolean;
  password?: string | null;
  rol_id?: number | null;
  empresa_id?: number | null;
}

export interface MedicoUpdateInput {
  nombres?: string;
  apellidos?: string;
  tipo_documento?: string;
  documento_identidad?: string;
  email?: string;
  pais_telefono_id?: number | null;
  telefono?: string | null;
  licencia_medica?: string | null;
  especialidad_id?: number;
  subespecialidades?: SubespecialidadItem[];
  color?: string;
  sucursal_defecto_id?: number | null;
  sucursales_ids?: number[];
  biografia?: string | null;
  activo?: boolean;
  password?: string | null;
}

export interface EnviarBienvenidaInput {
  telefono?: string | null;
  password_temporal?: string | null;
  mensaje_personalizado?: string | null;
  canal?: 'whatsapp' | 'email' | 'ambos';
}

export interface EnviarBienvenidaResponse {
  success: boolean;
  mensaje_enviado: string;
  canal_utilizado: string;
  destinatario: string;
  whatsapp_direct_url?: string | null;
  password_actualizada: boolean;
  usuario_creado: boolean;
  detalle?: string | null;
}

