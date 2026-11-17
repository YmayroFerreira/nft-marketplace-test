import { WALLET_PROVIDERS } from '@/lib/wallets'
import type { WalletProvider } from '@/types/account'

/** Round letter mark for each wallet provider ("Wallet mark M" in the design) */
export function WalletMark({ provider }: { provider: WalletProvider }) {
  const mark = WALLET_PROVIDERS.find((p) => p.id === provider) ?? WALLET_PROVIDERS[0]
  return (
    <span
      role="img"
      aria-label={mark.label}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground"
    >
      {mark.letter}
    </span>
  )
}
