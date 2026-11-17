import googleLogo from '@/assets/icons/google-logo.svg'
import facebookLogo from '@/assets/icons/facebook-logo.svg'

const PROVIDERS = [
  { id: 'google', label: 'Continuar com Google', icon: googleLogo },
  { id: 'facebook', label: 'Continuar com Facebook', icon: facebookLogo },
] as const

export type SocialProvider = (typeof PROVIDERS)[number]['id']

interface SocialSignInProps {
  onSelect: (provider: SocialProvider) => void
  disabled?: boolean
}

export function SocialSignIn({ onSelect, disabled }: SocialSignInProps) {
  return (
    <div className="flex flex-col gap-3 pt-6">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-caption leading-4 text-foreground">Ou continue com</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <ul className="flex flex-col gap-3 px-6 sm:px-20">
        {PROVIDERS.map((provider) => (
          <li key={provider.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(provider.id)}
              className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-border text-caption leading-4 font-medium text-text-secondary transition-colors hover:bg-accent disabled:opacity-50"
            >
              <img src={provider.icon} alt="" width={20} height={20} />
              {provider.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
