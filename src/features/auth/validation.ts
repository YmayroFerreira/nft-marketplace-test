const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8

export interface SignInValues {
  email: string
  password: string
}

export interface SignUpValues {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>

function validateEmail(email: string) {
  if (!email.trim()) return 'Informe seu e-mail.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Informe um e-mail válido.'
  return undefined
}

export function validateSignIn(values: SignInValues): FieldErrors<SignInValues> {
  return {
    email: validateEmail(values.email),
    password: values.password ? undefined : 'Informe sua senha.',
  }
}

export function validateSignUp(values: SignUpValues): FieldErrors<SignUpValues> {
  return {
    username:
      values.username.trim().length >= 3 ? undefined : 'O nome de usuário precisa ter ao menos 3 caracteres.',
    email: validateEmail(values.email),
    password:
      values.password.length >= MIN_PASSWORD_LENGTH
        ? undefined
        : `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    confirmPassword:
      values.confirmPassword === values.password ? undefined : 'As senhas não coincidem.',
  }
}

export function hasErrors<T>(errors: FieldErrors<T>) {
  return Object.values(errors).some(Boolean)
}
