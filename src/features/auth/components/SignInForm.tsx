import { useState, type FormEvent, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { AuthField } from './AuthField'
import { focusFirstInvalid } from './focus-first-invalid'
import { hasErrors, validateSignIn, type FieldErrors, type SignInValues } from '../validation'

interface SignInFormProps {
  onSubmit: (values: SignInValues) => void
  onForgotPassword: (email: string) => void
  isSubmitting?: boolean
  /** Field errors returned by the API */
  serverErrors?: Record<string, string>
}

export function SignInForm({ onSubmit, onForgotPassword, isSubmitting = false, serverErrors }: SignInFormProps) {
  const [values, setValues] = useState<SignInValues>({ email: '', password: '' })
  const [clientErrors, setErrors] = useState<FieldErrors<SignInValues>>({})
  // Client errors win; fields that passed client validation can still show server errors
  const errors = {
    ...serverErrors,
    ...Object.fromEntries(Object.entries(clientErrors).filter(([, message]) => message)),
  } as FieldErrors<SignInValues>

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateSignIn(values)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      focusFirstInvalid(event.currentTarget)
      return
    }
    onSubmit(values)
  }

  /** Sends the reset link to the e-mail typed in the form */
  function handleForgotPassword(event: MouseEvent<HTMLButtonElement>) {
    const emailError = validateSignIn(values).email
    if (emailError) {
      setErrors({ email: 'Digite seu e-mail acima para receber o link de redefinição.' })
      focusFirstInvalid(event.currentTarget.form!)
      return
    }
    setErrors({})
    onForgotPassword(values.email.trim())
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col px-6 pt-6 sm:px-20">
      <div className="flex flex-col gap-3">
        <AuthField
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          value={values.email}
          error={errors.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        />
        <AuthField
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          value={values.password}
          error={errors.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        />
        <button
          type="button"
          onClick={handleForgotPassword}
          className="self-end text-sm leading-4 text-text-accent hover:underline"
        >
          Esqueceu a senha?
        </button>
      </div>
      <Button type="submit" disabled={isSubmitting} className="mt-6 h-[45px] rounded-[5px] text-base font-bold">
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
