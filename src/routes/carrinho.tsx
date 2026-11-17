import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Carrinho</h1>
    </section>
  )
}
