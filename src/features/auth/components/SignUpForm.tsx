import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { AuthField } from './AuthField'
import { focusFirstInvalid } from './focus-first-invalid'
import { hasErrors, validateSignUp, type FieldErrors, type SignUpValues } from '../validation'

interface SignUpFormProps {
  onSubmit: (values: SignUpValues) => void
  isSubmitting?: boolean
  /** Field errors returned by the API */
  serverErrors?: Record<string, string>
}

const EMPTY: SignUpValues = { username: '', email: '', password: '', confirmPassword: '' }

export function SignUpForm({ onSubmit, isSubmitting = false, serverErrors }: SignUpFormProps) {
  const [values, setValues] = useState<SignUpValues>(EMPTY)
  const [clientErrors, setErrors] = useState<FieldErrors<SignUpValues>>({})
  // Client errors win; fields that passed client validation can still show server errors
  const errors = {
    ...serverErrors,
    ...Object.fromEntries(Object.entries(clientErrors).filter(([, message]) => message)),
  } as FieldErrors<SignUpValues>

  function update(field: keyof SignUpValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateSignUp(values)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      focusFirstInvalid(event.currentTarget)
      return
    }
    onSubmit(values)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col px-6 pt-6 sm:px-20">
      <div className="flex flex-col gap-3">
        <AuthField
          label="Nome de usuário"
          autoComplete="username"
          placeholder="Nome de usuário"
          value={values.username}
          error={errors.username}
          onChange={(e) => update('username', e.target.value)}
        />
        <AuthField
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          value={values.email}
          error={errors.email}
          onChange={(e) => update('email', e.target.value)}
        />
        <AuthField
          label="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="Senha"
          value={values.password}
          error={errors.password}
          onChange={(e) => update('password', e.target.value)}
        />
        <AuthField
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="mt-6 h-[45px] rounded-[5px] text-base font-bold max-md:mt-8 max-md:h-[60px] max-md:rounded-xl max-md:text-lg">
        {isSubmitting ? (
          'Criando conta…'
        ) : (
          <>
            {/* Label from each frame: "Criar perfil" (mobile), "Criar conta" (desktop) */}
            <span className="md:hidden">Criar perfil</span>
            <span className="hidden md:inline">Criar conta</span>
          </>
        )}
      </Button>
    </form>
  )
}
