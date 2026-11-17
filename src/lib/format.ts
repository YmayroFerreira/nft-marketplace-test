const ethFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1.19 → "1.19 ETH" (the Figma uses a dot as decimal separator for prices) */
export function formatEth(value: number) {
  return `${ethFormatter.format(value)} ETH`
}

const ethTotalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
})

/** Totals and fees keep up to 3 decimals, as in the cart design (0.016, 26.846) */
export function formatEthTotal(value: number) {
  return `${ethTotalFormatter.format(value)} ETH`
}

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** ISO date → "29 de jul. de 2026" */
export function formatDate(isoDate: string) {
  return fullDateFormatter.format(new Date(isoDate))
}

/** 0xA91F…E82C */
export function shortHash(value: string, start = 6, end = 4) {
  return value.length > start + end ? `${value.slice(0, start)}…${value.slice(-end)}` : value
}

const rangeFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 0.02, 12.3 → "0,02 - 12,30 ETH" (the Figma filter uses the pt-BR format) */
export function formatEthRange(min: number, max: number) {
  return `${rangeFormatter.format(min)} - ${rangeFormatter.format(max)} ETH`
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** "2026-09-12" → "12 de setembro" */
export function formatShortDate(isoDate: string) {
  return dateFormatter.format(new Date(isoDate))
}
