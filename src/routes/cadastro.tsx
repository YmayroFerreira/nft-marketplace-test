import { createFileRoute, redirect } from '@tanstack/react-router'

/** Sign up is a dialog over the home page; /cadastro is kept as a shortcut to it */
export const Route = createFileRoute('/cadastro')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { auth: 'criar-conta' }, replace: true })
  },
})
