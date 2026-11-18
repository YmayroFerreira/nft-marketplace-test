/**
 * Exact ETH arithmetic. Amounts travel as decimal strings ("1.19") and are
 * converted to wei (bigint, 18 decimals) for any calculation, so there is no
 * floating point rounding anywhere. Shared by the app and the mock API.
 */

export type EthString = string

const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthString(value: unknown): value is EthString {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

/** "1.19" → 1190000000000000000n */
export function toWei(value: EthString): bigint {
  if (!isEthString(value)) throw new Error(`Invalid ETH amount: ${value}`)
  const [integer, fraction = ''] = value.split('.')
  return BigInt(integer) * SCALE + BigInt(fraction.padEnd(DECIMALS, '0'))
}

/** 1190000000000000000n → "1.19" (canonical form, no trailing zeros) */
export function fromWei(wei: bigint): EthString {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const integer = abs / SCALE
  const fraction = (abs % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`
}

/** Rounds half-up to `decimals` places */
export function roundWei(wei: bigint, decimals: number): bigint {
  const step = 10n ** BigInt(DECIMALS - decimals)
  const remainder = wei % step
  const down = wei - remainder
  return remainder * 2n >= step ? down + step : down
}

export function addEth(...values: EthString[]): EthString {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

export function subEth(a: EthString, b: EthString): EthString {
  return fromWei(toWei(a) - toWei(b))
}

/** Amount × integer quantity */
export function mulEth(value: EthString, quantity: number): EthString {
  if (!Number.isInteger(quantity)) throw new Error('Quantities must be integers')
  return fromWei(toWei(value) * BigInt(quantity))
}

/** Amount × numerator / denominator, rounded to `decimals` places */
export function scaleEth(value: EthString, numerator: number, denominator: number, decimals = 4): EthString {
  const scaled = (toWei(value) * BigInt(numerator)) / BigInt(denominator)
  return fromWei(roundWei(scaled, decimals))
}

export function compareEth(a: EthString, b: EthString): number {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

export function minEth(a: EthString, b: EthString): EthString {
  return compareEth(a, b) <= 0 ? a : b
}

export function maxEth(a: EthString, b: EthString): EthString {
  return compareEth(a, b) >= 0 ? a : b
}

/**
 * Display form: keeps every significant decimal (no rounding) and at least
 * `minDecimals`, e.g. "1.19", "0.016", "26.846", "2" → "2.00".
 */
export function displayEth(value: EthString, minDecimals = 2): string {
  const [integer, fraction = ''] = fromWei(toWei(value)).split('.')
  return `${integer}.${fraction.padEnd(minDecimals, '0')}`
}
