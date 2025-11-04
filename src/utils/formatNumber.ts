/**
 * Formatea números grandes con sufijos K (miles) y M (millones)
 * @param num - Número a formatear
 * @returns String formateado
 * @example
 * formatNumber(1250) // "1,250"
 * formatNumber(45000) // "45.0K"
 * formatNumber(1500000) // "1.5M"
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('es-CL');
}
