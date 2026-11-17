import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  hint?: string
  /** Text shown inside the field on the right, e.g. ".eth" */
  suffix?: ReactNode
}

/** Labelled input with an accessible error message, for the account forms */
export function FormField({ label, error, hint, suffix, required, className, ...inputProps }: FormFieldProps) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
        {required && (
          <span aria-hidden className="text-text-accent">
            {' '}*
          </span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-[5px] border border-border bg-transparent px-3 text-sm text-foreground placeholder:text-brand-secondary',
            'focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive',
            suffix && 'pr-12',
          )}
          {...inputProps}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-text-secondary">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
