import { useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageTitleBarProps {
  title: string
  /** Where "back" goes when there is no previous page in the history (direct access) */
  fallback: '/' | '/carrinho'
  /** Desktop shows the title as a regular heading; otherwise it is only for screen readers */
  visibleOnDesktop?: boolean
}

/**
 * Page title (h1). Mobile frames show "‹ Title" centered; on desktop the
 * title is either a regular heading or kept only for screen readers.
 */
export function PageTitleBar({ title, fallback, visibleOnDesktop = false }: PageTitleBarProps) {
  return (
    // Desktop with a screen-reader-only title: "contents" so the wrapper adds no gap to the page layout
    <div
      className={cn(
        'relative flex min-h-[45px] items-center justify-center md:min-h-0',
        visibleOnDesktop ? 'md:block' : 'md:contents',
      )}
    >
      <BackButton fallback={fallback} className="absolute left-0 md:hidden" />
      <h1
        className={cn(
          'px-14 text-center text-xl font-bold text-foreground md:px-0',
          visibleOnDesktop ? 'md:text-left md:text-2xl' : 'md:sr-only',
        )}
      >
        {title}
      </h1>
    </div>
  )
}

export function BackButton({ fallback, className = '' }: { fallback: '/' | '/carrinho'; className?: string }) {
  const router = useRouter()
  const navigate = useNavigate()

  function goBack() {
    // Direct access (no history inside the app): go to a sensible page instead
    if (router.history.canGoBack()) router.history.back()
    else void navigate({ to: fallback })
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Voltar"
      className={cn(
        'grid size-[35px] place-items-center rounded-full bg-surface-dark text-text-accent hover:brightness-125',
        className,
      )}
    >
      <ChevronLeft className="size-5" aria-hidden />
    </button>
  )
}
