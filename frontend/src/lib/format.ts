const LOCALE = 'fr-FR'
const CURRENCY = 'EUR'

export function formatCurrency(value: number | string, maximumFractionDigits = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return ''
  return num.toLocaleString(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits })
}

export function formatCurrencyCompact(value: number | string): string {
  return formatCurrency(value, 0)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(LOCALE)
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}
