import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Entrar</h1>
    </section>
  )
}
