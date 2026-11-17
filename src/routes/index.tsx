import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Início</h1>
    </section>
  )
}
