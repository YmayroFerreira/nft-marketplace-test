import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/carteiras')({
  component: WalletsPage,
})

function WalletsPage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Carteiras</h1>
    </section>
  )
}
