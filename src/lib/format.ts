const ethFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1.19 → "1.19 ETH" (the Figma uses a dot as decimal separator for prices) */
export function formatEth(value: number) {
  return `${ethFormatter.format(value)} ETH`
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
