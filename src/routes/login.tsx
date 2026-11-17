import { createFileRoute, redirect } from '@tanstack/react-router'

/** Sign in is a dialog over the home page; /login is kept as a shortcut to it */
export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { auth: 'entrar' }, replace: true })
  },
})
