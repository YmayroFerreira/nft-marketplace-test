import { displayEth, type EthString } from './eth'

/**
 * "1.19" → "1.19 ETH". Amounts are decimal strings and are shown with every
 * significant decimal (no rounding), with at least 2 decimals: 0.016, 26.846.
 * The Figma uses a dot as decimal separator for prices.
 */
export function formatEth(value: EthString) {
  return `${displayEth(value)} ETH`
}

/** Same as formatEth; kept as a separate name for totals and fees */
export const formatEthTotal = formatEth

/** "0.02", "12.3" → "0,02 - 12,30 ETH" (the Figma filter uses the pt-BR format) */
export function formatEthRange(min: EthString, max: EthString) {
  const ptBr = (value: EthString) => displayEth(value).replace('.', ',')
  return `${ptBr(min)} - ${ptBr(max)} ETH`
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

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** "2026-09-12" → "12 de setembro" */
export function formatShortDate(isoDate: string) {
  return dateFormatter.format(new Date(isoDate))
}
