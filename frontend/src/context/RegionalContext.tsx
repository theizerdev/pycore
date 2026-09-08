import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import type { Pais } from '../types';
import { useAuth } from './AuthContext';
import { tasasApi } from '../api/tasas';

// Mapeo de código ISO a Emoji de Bandera
export const getCountryFlagEmoji = (iso2?: string | null): string => {
  if (!iso2 || iso2.length !== 2) return '🌐';
  const codePoints = iso2
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Fallback por defecto si no hay país asociado
const DEFAULT_REGIONAL_CONFIG: Partial<Pais> = {
  nombre: 'Venezuela',
  codigo_iso2: 'VE',
  codigo_iso3: 'VEN',
  codigo_telefonico: '+58',
  moneda_principal: 'VES',
  simbolo_moneda: 'Bs.',
  idioma_principal: 'es',
  zona_horaria: 'America/Caracas',
  formato_fecha: 'dd/mm/yyyy',
  formato_moneda: '1.234,56',
  impuesto_predeterminado: 16.0,
  separador_miles: '.',
  separador_decimales: ',',
  decimales_moneda: 2,
  activo: true,
};

export interface RegionalContextType {
  pais: Pais | null;
  paisNombre: string;
  codigoIso2: string;
  codigoIso3: string;
  codigoTelefonico: string;
  moneda: string;
  simboloMoneda: string;
  idioma: string;
  zonaHoraria: string;
  formatoFecha: string;
  impuestoPredeterminado: number;
  separadorMiles: string;
  separadorDecimales: string;
  decimalesMoneda: number;
  bandera: string;

  // Tasa Oficial BCV & Moneda de Empresa
  tasaBcv: number;
  tasaBcvFecha: string | null;
  tasaBcvFuente: string;
  monedaEmpresa: string;
  refreshBcvRate: () => Promise<void>;
  
  // Funciones de formateo regionalizado
  formatMoney: (amount: number | string | null | undefined, customSymbol?: string) => string;
  formatMoneyDual: (amount: number | string | null | undefined) => {
    primary: string;
    secondary: string;
    fullText: string;
    rate: number;
  };
  formatDate: (date: string | Date | null | undefined, style?: 'short' | 'medium' | 'long' | 'datetime' | 'time') => string;
  formatNumber: (value: number | string | null | undefined, decimals?: number) => string;
  formatTax: (subtotal: number) => {
    impuesto: number;
    total: number;
    porcentaje: number;
    formattedImpuesto: string;
    formattedTotal: string;
  };
  formatPhone: (rawPhone: string | null | undefined) => string;
}

const RegionalContext = createContext<RegionalContextType | undefined>(undefined);

export const RegionalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, sucursalActiva } = useAuth();

  // Resolución en cascada del país activo para el usuario autenticado:
  // 1. País de la sucursal activa
  // 2. País de la sucursal por defecto del usuario
  // 3. País de la empresa a la que pertenece el usuario
  // 4. País del teléfono del usuario
  // 5. Configuración por defecto
  const paisActivo: Pais = useMemo(() => {
    const candidate =
      sucursalActiva?.pais ||
      user?.sucursal_defecto?.pais ||
      user?.empresa?.pais ||
      user?.pais_telefono ||
      null;

    if (candidate) {
      return {
        ...candidate,
        simbolo_moneda: candidate.simbolo_moneda || (candidate.moneda_principal === 'VES' ? 'Bs.' : '$'),
      };
    }

    return DEFAULT_REGIONAL_CONFIG as Pais;
  }, [user, sucursalActiva]);

  // Moneda configurada explícitamente en la Empresa (Prioridad: Empresa > País)
  const monedaEmpresa = useMemo(() => {
    return user?.empresa?.moneda_principal || 'USD';
  }, [user?.empresa?.moneda_principal]);

  const paisNombre = paisActivo.nombre || 'Venezuela';
  const codigoIso2 = paisActivo.codigo_iso2 || 'VE';
  const codigoIso3 = paisActivo.codigo_iso3 || 'VEN';
  const codigoTelefonico = paisActivo.codigo_telefonico || '+58';

  // Si la empresa tiene 'USD' o 'VES', se adopta directamente esa moneda
  const moneda = monedaEmpresa || paisActivo.moneda_principal || 'USD';
  const simboloMoneda = moneda === 'VES' ? 'Bs.' : '$';

  const idioma = paisActivo.idioma_principal || 'es';
  const zonaHoraria = paisActivo.zona_horaria || 'America/Caracas';
  const formatoFecha = paisActivo.formato_fecha || 'dd/mm/yyyy';
  const impuestoPredeterminado = paisActivo.impuesto_predeterminado ?? 16.0;
  const separadorMiles = paisActivo.separador_miles || '.';
  const separadorDecimales = paisActivo.separador_decimales || ',';
  const decimalesMoneda = paisActivo.decimales_moneda ?? 2;
  const bandera = getCountryFlagEmoji(codigoIso2);

  // ── ESTADO TASA OFICIAL BCV ──────────────────────────────────────────
  const [tasaBcv, setTasaBcv] = useState<number>(814.69);
  const [tasaBcvFecha, setTasaBcvFecha] = useState<string | null>(null);
  const [tasaBcvFuente, setTasaBcvFuente] = useState<string>('BCV Oficial');

  const refreshBcvRate = useCallback(async () => {
    try {
      const res = await tasasApi.getCurrentRates();
      if (res.tasas?.USD?.tasa) {
        setTasaBcv(res.tasas.USD.tasa);
        setTasaBcvFecha(res.tasas.USD.fecha_tasa || res.sincronizado_at || null);
        if (res.tasas.USD.fuente) {
          setTasaBcvFuente(res.tasas.USD.fuente);
        }
      }
    } catch (err) {
      console.warn('No se pudo sincronizar la tasa BCV:', err);
    }
  }, []);

  useEffect(() => {
    refreshBcvRate();
  }, [refreshBcvRate]);

  // 1. Formateo de Moneda Principal
  const formatMoney = (amount: number | string | null | undefined, customSymbol?: string): string => {
    if (amount === null || amount === undefined || amount === '') {
      return `${customSymbol || simboloMoneda} 0${separadorDecimales}00`;
    }

    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
    if (isNaN(num)) return `${customSymbol || simboloMoneda} 0${separadorDecimales}00`;

    const symbol = customSymbol || simboloMoneda;
    const parts = num.toFixed(decimalesMoneda).split('.');
    let intPart = parts[0];
    const decPart = parts[1] || '';

    // Aplicar separador de miles
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);

    const formattedAmount = decPart ? `${intPart}${separadorDecimales}${decPart}` : intPart;

    if (moneda === 'VES') {
      return `Bs. ${formattedAmount}`;
    }
    if (moneda === 'EUR') {
      return `${formattedAmount} €`;
    }
    // Dólar por defecto: "$ 100.00"
    return `${symbol} ${formattedAmount}`;
  };

  // 2. Formateo de Números Genéricos
  const formatNumber = (value: number | string | null | undefined, decimals = decimalesMoneda): string => {
    if (value === null || value === undefined || value === '') return '0';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';

    const parts = num.toFixed(decimals).split('.');
    let intPart = parts[0];
    const decPart = parts[1] || '';

    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);
    return decPart ? `${intPart}${separadorDecimales}${decPart}` : intPart;
  };

  // 3. Formateo de Fechas según Zona Horaria y Formato del País
  const formatDate = (
    date: string | Date | null | undefined,
    style: 'short' | 'medium' | 'long' | 'datetime' | 'time' = 'short'
  ): string => {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    try {
      if (style === 'time') {
        return new Intl.DateTimeFormat(`${idioma}-${codigoIso2}`, {
          timeZone: zonaHoraria,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(d);
      }

      if (style === 'datetime') {
        return new Intl.DateTimeFormat(`${idioma}-${codigoIso2}`, {
          timeZone: zonaHoraria,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(d);
      }

      if (style === 'long') {
        return new Intl.DateTimeFormat(`${idioma}-${codigoIso2}`, {
          timeZone: zonaHoraria,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(d);
      }

      if (style === 'medium') {
        return new Intl.DateTimeFormat(`${idioma}-${codigoIso2}`, {
          timeZone: zonaHoraria,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(d);
      }

      // Short por defecto
      return new Intl.DateTimeFormat(`${idioma}-${codigoIso2}`, {
        timeZone: zonaHoraria,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  };

  // 4. Cálculo de Impuestos por País
  const formatTax = (subtotal: number) => {
    const impuesto = (subtotal * impuestoPredeterminado) / 100;
    const total = subtotal + impuesto;
    return {
      impuesto,
      total,
      porcentaje: impuestoPredeterminado,
      formattedImpuesto: formatMoney(impuesto),
      formattedTotal: formatMoney(total),
    };
  };

  // 5. Formateo de Teléfono con Prefijo Nacional
  const formatPhone = (rawPhone: string | null | undefined): string => {
    if (!rawPhone) return '-';
    const clean = rawPhone.trim();
    if (clean.startsWith('+')) return clean;
    return `${codigoTelefonico} ${clean}`;
  };

  // 6. Formateo Dual (Moneda Principal con Equivalencia en Moneda Secundaria a Tasa BCV)
  const formatMoneyDual = (amount: number | string | null | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : (amount || 0);
    const validNum = isNaN(num) ? 0 : num;

    if (moneda === 'USD') {
      const primary = formatMoney(validNum);
      const secondaryNum = validNum * tasaBcv;
      const secondary = `Bs. ${formatNumber(secondaryNum, 2)}`;
      return {
        primary,
        secondary,
        fullText: `${primary} (≈ ${secondary})`,
        rate: tasaBcv,
      };
    } else {
      const primary = formatMoney(validNum);
      const secondaryNum = tasaBcv > 0 ? validNum / tasaBcv : 0;
      const secondary = `$ ${formatNumber(secondaryNum, 2)}`;
      return {
        primary,
        secondary,
        fullText: `${primary} (≈ ${secondary})`,
        rate: tasaBcv,
      };
    }
  };

  return (
    <RegionalContext.Provider
      value={{
        pais: paisActivo,
        paisNombre,
        codigoIso2,
        codigoIso3,
        codigoTelefonico,
        moneda,
        simboloMoneda,
        idioma,
        zonaHoraria,
        formatoFecha,
        impuestoPredeterminado,
        separadorMiles,
        separadorDecimales,
        decimalesMoneda,
        bandera,
        tasaBcv,
        tasaBcvFecha,
        tasaBcvFuente,
        monedaEmpresa,
        refreshBcvRate,
        formatMoney,
        formatMoneyDual,
        formatDate,
        formatNumber,
        formatTax,
        formatPhone,
      }}
    >
      {children}
    </RegionalContext.Provider>
  );
};

export const useRegional = () => {
  const context = useContext(RegionalContext);
  if (!context) {
    throw new Error('useRegional debe usarse dentro de un RegionalProvider');
  }
  return context;
};
