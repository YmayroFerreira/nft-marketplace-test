import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
  /** Accessible name, e.g. "Quantidade de Emerald Ape #042" */
  label: string
  size?: 'sm' | 'md'
}

/** − 1 + control from the details and cart designs */
export function QuantityStepper({ value, min = 1, max, onChange, disabled, label, size = 'md' }: QuantityStepperProps) {
  const buttonClass = cn(
    'grid place-items-center rounded-full bg-primary font-bold text-primary-foreground transition-opacity hover:bg-primary/85 disabled:opacity-40',
    size === 'md' ? 'size-[30px] text-lg' : 'size-6 text-base',
  )
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <output aria-live="polite" className="min-w-6 text-center text-base text-foreground">
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  )
}
