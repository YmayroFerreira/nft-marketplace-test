import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-lg bg-surface-card px-6 py-14 text-center">
      <p className="text-base text-foreground">{message}</p>
      {onRetry && (
        <Button size="brand-sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
