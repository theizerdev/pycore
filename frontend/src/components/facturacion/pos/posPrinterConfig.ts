export interface PosPrinterConfig {
  paperSize: '80mm' | '58mm';
  autoPrintOnSale: boolean;
  headerMsg: string;
  footerMsg: string;
}

export const POS_PRINTER_CONFIG_KEY = 'medisoft_pos_printer_config_v1';

export const DEFAULT_POS_PRINTER_CONFIG: PosPrinterConfig = {
  paperSize: '80mm',
  autoPrintOnSale: false,
  headerMsg: '',
  footerMsg: '¡GRACIAS POR CONFIAR EN NUESTRA ATENCIÓN DE SALUD!',
};

export function loadPosPrinterConfig(): PosPrinterConfig {
  try {
    const raw = localStorage.getItem(POS_PRINTER_CONFIG_KEY);
    if (!raw) return DEFAULT_POS_PRINTER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      paperSize: parsed.paperSize === '58mm' ? '58mm' : '80mm',
      autoPrintOnSale: Boolean(parsed.autoPrintOnSale),
      headerMsg: typeof parsed.headerMsg === 'string' ? parsed.headerMsg : '',
      footerMsg:
        typeof parsed.footerMsg === 'string' && parsed.footerMsg.trim()
          ? parsed.footerMsg
          : DEFAULT_POS_PRINTER_CONFIG.footerMsg,
    };
  } catch {
    return DEFAULT_POS_PRINTER_CONFIG;
  }
}

export function savePosPrinterConfig(config: PosPrinterConfig): void {
  try {
    localStorage.setItem(POS_PRINTER_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Formatea cualquier monto estrictamente en Bolívares (Bs.)
 * Cumplimiento legal estricto: cero símbolos de divisas extranjeras en comprobantes.
 */
export function formatTicketBs(amount: number): string {
  const safeVal = Number.isFinite(amount) ? amount : 0;
  return `Bs. ${safeVal.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

