import type { WalletProvider } from '@/types/account'
import type { Network } from '@/types/catalog'

export const WALLET_PROVIDERS: { id: WalletProvider; label: string; letter: string }[] = [
  { id: 'metamask', label: 'MetaMask', letter: 'M' },
  { id: 'walletconnect', label: 'WalletConnect', letter: 'W' },
  { id: 'coinbase', label: 'Coinbase Wallet', letter: 'C' },
]

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export function walletProviderLabel(provider: WalletProvider) {
  return WALLET_PROVIDERS.find((p) => p.id === provider)?.label ?? provider
}
