import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { contentApi } from '@/api/endpoints'
import facebookIcon from '@/assets/icons/facebook.svg'
import instagramIcon from '@/assets/icons/instagram.svg'
import twitterIcon from '@/assets/icons/twitter.svg'
import linkedinIcon from '@/assets/icons/linkedin.svg'
import youtubeIcon from '@/assets/icons/youtube.svg'

const FEATURES = [
  {
    initial: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    initial: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    initial: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

interface FooterLink {
  label: string
  /** Links without a page yet are rendered as plain text */
  to?: '/perfil' | '/carteiras' | '/favoritos'
}

const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/perfil' },
      { label: 'Minha coleção' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse', to: '/favoritos' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança', to: '/carteiras' },
      { label: 'Política do mercado' },
      { label: 'Denunciar item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital' },
      { label: 'Fotografia' },
      { label: 'Música' },
      { label: 'Arte 3D' },
      { label: 'Utilidade' },
    ],
  },
]

const SOCIALS = [
  { label: 'Facebook', icon: facebookIcon, href: 'https://facebook.com' },
  { label: 'Instagram', icon: instagramIcon, href: 'https://instagram.com' },
  { label: 'X (Twitter)', icon: twitterIcon, href: 'https://x.com' },
  { label: 'LinkedIn', icon: linkedinIcon, href: 'https://linkedin.com' },
  { label: 'YouTube', icon: youtubeIcon, href: 'https://youtube.com' },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const subscribe = useMutation({
    mutationFn: contentApi.subscribeNewsletter,
    onSuccess: () => {
      setEmail('')
      toast.success('Inscrição confirmada! Você vai receber os próximos lançamentos.')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Não foi possível inscrever.'),
  })

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    subscribe.mutate(email)
  }

  return (
    <footer className="container-page mt-16 md:mt-24">
      {/* Features + newsletter */}
      <div className="grid gap-8 bg-surface-card p-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-0">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col gap-3 lg:border-r lg:border-primary lg:px-4"
          >
            <span
              aria-hidden
              className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
            >
              {feature.initial}
            </span>
            <h2 className="text-[17px] leading-4 font-bold text-foreground">{feature.title}</h2>
            <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">
              {feature.text}
            </p>
          </div>
        ))}

        <div className="flex flex-col gap-3 lg:px-4">
          <h2 id="newsletter-title" className="text-lg leading-5 font-bold text-foreground">
            Antecipe-se ao próximo lançamento
          </h2>
          <form
            onSubmit={handleNewsletterSubmit}
            aria-labelledby="newsletter-title"
            className="mt-1 flex h-10 overflow-hidden rounded-[6px] bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="digite seu e-mail..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-brand-secondary focus-visible:-outline-offset-2"
            />
            <button
              type="submit"
              disabled={subscribe.isPending}
              className="w-[85px] bg-primary text-lg font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60"
            >
              {subscribe.isPending ? '…' : 'Enviar'}
            </button>
          </form>
          <p className="text-caption text-text-secondary">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
        </div>
      </div>

      {/* Brand band */}
      <div className="grid gap-4 bg-surface-dark px-8 py-6 text-sm leading-[22px] text-foreground sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:items-center lg:gap-[92px]">
        <span className="font-bold tracking-[0.1em]">KURIO</span>
        <p className="max-w-[230px]">Feito para colecionadores, criadores e cultura</p>
        <a href="mailto:contato@email.com" className="hover:text-text-accent">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="hover:text-text-accent">
          +55 11 4002 8922
        </a>
      </div>

      {/* Link columns */}
      <div className="grid gap-10 bg-surface-card p-8 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[124px]">
        {LINK_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2">
            <h2 className="text-lg leading-4 font-bold text-foreground">{column.title}</h2>
            <ul className="text-sm leading-[30px] text-foreground">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className="hover:text-text-accent">
                      {link.label}
                    </Link>
                  ) : (
                    <span>{link.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h2 className="text-lg leading-4 font-bold text-foreground">Redes sociais</h2>
            <ul className="flex gap-2.5">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="block rounded-[5px] transition-opacity hover:opacity-80"
                  >
                    <img src={social.icon} alt="" width={30} height={30} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg leading-4 font-bold text-foreground">Carteiras compatíveis</h2>
            <p className="flex h-[26px] items-center justify-center rounded-[6px] border border-border-soft bg-surface-dark px-2 text-[9px] font-bold tracking-[0.01em] whitespace-pre text-text-accent">
              {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
            </p>
          </div>
        </div>
      </div>

      <p className="py-1.5 text-center text-sm leading-[30px] text-foreground">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}
