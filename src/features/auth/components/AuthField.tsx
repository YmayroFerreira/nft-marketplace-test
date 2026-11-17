import { useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import eyeHideIcon from '@/assets/icons/eye-hide.svg'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** Accessible label; the design only shows the placeholder, so it is visually hidden */
  label: string
  error?: string
}

export function AuthField({ label, error, type = 'text', className, ...inputProps }: AuthFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const isPassword = type === 'password'
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-10 w-full rounded-[5px] border border-border bg-transparent px-4 text-sm text-foreground placeholder:text-brand-secondary',
            'focus-visible:border-primary focus-visible:outline-none',
            'aria-invalid:border-destructive',
            isPassword && 'pr-12',
            className,
          )}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={showPassword}
            aria-controls={id}
            className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded"
          >
            <img
              src={eyeHideIcon}
              alt=""
              width={19}
              height={15}
              className={cn('transition-opacity', showPassword && 'opacity-50')}
            />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
