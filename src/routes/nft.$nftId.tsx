import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailsPage,
})

function NftDetailsPage() {
  return (
    <section className="container-page py-10">
      <h1 className="text-2xl font-bold">Detalhes do NFT</h1>
    </section>
  )
}
