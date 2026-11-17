import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pedido/$orderId')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Confirmação de Pedido</h1>
    </section>
  )
}
