import React, { createContext, useContext, useMemo } from 'react';
import type { Pais } from '../types';
import { useAuth } from './AuthContext';

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
  
  // Funciones de formateo regionalizado
  formatMoney: (amount: number | string | null | undefined, customSymbol?: string) => string;
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

  const paisNombre = paisActivo.nombre || 'Venezuela';
  const codigoIso2 = paisActivo.codigo_iso2 || 'VE';
  const codigoIso3 = paisActivo.codigo_iso3 || 'VEN';
  const codigoTelefonico = paisActivo.codigo_telefonico || '+58';
  const moneda = paisActivo.moneda_principal || 'VES';
  const simboloMoneda = paisActivo.simbolo_moneda || (moneda === 'VES' ? 'Bs.' : '$');
  const idioma = paisActivo.idioma_principal || 'es';
  const zonaHoraria = paisActivo.zona_horaria || 'America/Caracas';
  const formatoFecha = paisActivo.formato_fecha || 'dd/mm/yyyy';
  const impuestoPredeterminado = paisActivo.impuesto_predeterminado ?? 16.0;
  const separadorMiles = paisActivo.separador_miles || '.';
  const separadorDecimales = paisActivo.separador_decimales || ',';
  const decimalesMoneda = paisActivo.decimales_moneda ?? 2;
  const bandera = getCountryFlagEmoji(codigoIso2);

  // 1. Formateo de Moneda Regional
  const formatMoney = (amount: number | string | null | undefined, customSymbol?: string): string => {
    if (amount === null || amount === undefined || amount === '') return `${customSymbol || simboloMoneda} 0${separadorDecimales}00`;

    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
    if (isNaN(num)) return `${customSymbol || simboloMoneda} 0${separadorDecimales}00`;

    const symbol = customSymbol || simboloMoneda;
    const parts = num.toFixed(decimalesMoneda).split('.');
    let intPart = parts[0];
    const decPart = parts[1] || '';

    // Aplicar separador de miles
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);

    const formattedAmount = decPart ? `${intPart}${separadorDecimales}${decPart}` : intPart;

    // En Venezuela se acostumbra "1.250,00 Bs.", en México/USA "$1,250.00", en Europa "1.250,00 €"
    if (moneda === 'VES') {
      return `${formattedAmount} ${symbol}`;
    }
    if (moneda === 'EUR') {
      return `${formattedAmount} ${symbol}`;
    }
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
        formatMoney,
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
