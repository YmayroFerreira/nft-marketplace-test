import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastro')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Cadastro</h1>
    </section>
  )
}
