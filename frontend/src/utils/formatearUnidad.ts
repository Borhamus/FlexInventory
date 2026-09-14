const SIMBOLOS_MONEDA = ['$', '€', '£', '¥', '₡', '₩', '₱', '₪', '₫', '₴', '₦', '₲', '฿', '₸'];

const CODIGOS_MONEDA = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD',
  'ARS', 'BRL', 'CLP', 'MXN', 'UYU', 'PEN', 'COP', 'BOB', 'PYG', 'VES',
]);

function esSimboloMoneda(unidad: string): boolean {
  return SIMBOLOS_MONEDA.some((s) => unidad.includes(s));
}

function esCodigoMoneda(unidad: string): boolean {
  return /^[A-Za-z]{2,4}$/.test(unidad) && CODIGOS_MONEDA.has(unidad.toUpperCase());
}

export function formatearValorConUnidad(valor: unknown, unidad?: string): string {
  const texto = String(valor);
  const u = (unidad ?? '').trim();
  if (!u) return texto;
  // Símbolo de moneda: pegado al número ($100, €100).
  if (esSimboloMoneda(u)) return `${u}${texto}`;
  // Código de moneda (USD, EUR…): prefijo con espacio (USD 100).
  if (esCodigoMoneda(u)) return `${u} ${texto}`;
  // Unidad de medida (kg, m, L…): sufijo con espacio (100 kg).
  return `${texto} ${u}`;
}
