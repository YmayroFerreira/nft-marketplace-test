import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Perfil do Colecionador</h1>
    </section>
  )
}
