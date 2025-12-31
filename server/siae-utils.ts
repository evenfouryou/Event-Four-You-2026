/**
 * SIAE Utilities - Funzioni condivise per la generazione di report SIAE
 * Conforme a Allegato B e C - Provvedimento Agenzia delle Entrate 04/03/2008
 */

// ==================== XML Character Escaping ====================

/**
 * Escape caratteri speciali XML per conformità UTF-8
 * Gestisce anche caratteri accentati italiani (à, è, é, ì, ò, ù)
 */
export function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ==================== Date/Time Formatting ====================

/**
 * Formatta data in formato SIAE compatto AAAAMMGG
 * Conforme a Allegato B - Provvedimento 04/03/2008
 * Es: 20241228 per 28 dicembre 2024
 */
export function formatSiaeDateCompact(date: Date | string | null): string {
  if (!date) return '00000000';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '00000000';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Formatta ora in formato SIAE compatto HHMMSS
 * Conforme a Allegato B - OraGenerazioneRiepilogo
 * Es: 143015 per 14:30:15
 */
export function formatSiaeTimeCompact(date: Date | string | null): string {
  if (!date) return '000000';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '000000';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

/**
 * Formatta ora in formato SIAE HHMM (per OraEvento)
 * Conforme a Allegato B - OraEvento
 * Es: 1430 per 14:30
 */
export function formatSiaeTimeHHMM(date: Date | string | null): string {
  if (!date) return '0000';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '0000';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

/**
 * Formatta data in formato SIAE YYYY-MM-DD (legacy)
 */
export function formatSiaeDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Formatta datetime in formato SIAE YYYY-MM-DDTHH:MM:SS (legacy)
 */
export function formatSiaeDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().replace('.000Z', '');
}

// ==================== Amount Conversion ====================

/**
 * Converte importo da euro a centesimi (intero)
 * SIAE richiede importi in centesimi senza decimali
 */
export function toCentesimi(euroAmount: number | string): number {
  const euro = typeof euroAmount === 'string' ? parseFloat(euroAmount) : euroAmount;
  return Math.round((euro || 0) * 100);
}

// ==================== Code Normalization ====================

/**
 * Normalizza TipoTitolo per conformità SIAE
 * Valori validi: R1 (intero), R2 (ridotto), O1 (omaggio), ABB (abbonamento)
 */
export function normalizeSiaeTipoTitolo(rawCode: string | null | undefined, isComplimentary?: boolean): string {
  if (isComplimentary) return 'O1';
  if (!rawCode) return 'R1';
  
  const code = rawCode.toUpperCase().trim();
  
  switch (code) {
    case 'R1':
    case 'INTERO':
    case 'FULL':
    case 'STANDARD':
    case 'NORMAL':
      return 'R1';
    
    case 'R2':
    case 'RIDOTTO':
    case 'REDUCED':
    case 'DISCOUNT':
      return 'R2';
    
    case 'O1':
    case 'OMAGGIO':
    case 'FREE':
    case 'COMPLIMENTARY':
    case 'GRATIS':
      return 'O1';
    
    case 'ABB':
    case 'ABBONAMENTO':
    case 'SUBSCRIPTION':
      return 'ABB';
    
    default:
      return 'R1';
  }
}

/**
 * Normalizza CodiceOrdine (settore) per conformità SIAE
 * Valori validi: A0, A1, B1, ecc. (formato lettera + numero)
 */
export function normalizeSiaeCodiceOrdine(rawCode: string | null | undefined): string {
  if (!rawCode) return 'A0';
  
  const code = rawCode.toUpperCase().trim();
  
  if (/^[A-Z][0-9]$/.test(code)) {
    return code;
  }
  
  if (/^[A-Z]+$/.test(code)) {
    return code.charAt(0) + '0';
  }
  
  if (/^[0-9]+$/.test(code)) {
    return 'A' + code.charAt(0);
  }
  
  return 'A0';
}

// ==================== File Naming ====================

/**
 * Genera nome file conforme Allegato C SIAE
 * - RMG_AAAA_MM_GG_###.xsi per RiepilogoGiornaliero
 * - RPM_AAAA_MM_###.xsi per RiepilogoMensile
 * - RCA_AAAA_MM_GG_###.xsi per RiepilogoControlloAccessi
 */
export function generateSiaeFileName(
  reportType: 'giornaliero' | 'mensile' | 'rca',
  date: Date,
  progressivo: number,
  isSigned: boolean = false
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  const extension = isSigned ? '.xsi.p7m' : '.xsi';
  
  switch (reportType) {
    case 'mensile':
      return `RPM_${year}_${month}_${prog}${extension}`;
    case 'rca':
      return `RCA_${year}_${month}_${day}_${prog}${extension}`;
    case 'giornaliero':
    default:
      return `RMG_${year}_${month}_${day}_${prog}${extension}`;
  }
}

// ==================== SIAE Configuration ====================

export const SIAE_SYSTEM_CODE_DEFAULT = 'EVENT4U1';
