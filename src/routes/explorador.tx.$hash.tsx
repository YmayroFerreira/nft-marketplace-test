import { usePageMeta } from '@/lib/usePageMeta'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ErrorState } from '@/components/common/ErrorState'
import { ApiError } from '@/api/client'
import { explorerApi } from '@/api/endpoints'
import { formatDate, formatEth, shortHash } from '@/lib/format'
import { NETWORK_LABELS } from '@/lib/wallets'
import type { ExplorerTransaction } from '@/types/account'

export const Route = createFileRoute('/explorador/tx/$hash')({
  component: ExplorerPage,
})

/**
 * Simulated block explorer. The challenge asks for simulated transaction
 * references and explorer links: this page plays the role of Etherscan and
 * says clearly that it is a demo.
 */
function ExplorerPage() {
  usePageMeta('Explorador simulado', 'Detalhes simulados de uma transação na Kurio.')
  const { hash } = Route.useParams()
  const tx = useQuery({ queryKey: ['explorer', hash], queryFn: () => explorerApi.transaction(hash) })

  return (
    <div className="container-page mt-6 flex flex-col gap-6 md:mt-10">
      <p role="note" className="rounded-md border border-primary bg-primary/10 p-3 text-sm text-foreground">
        <strong>Explorador simulado.</strong> Ambiente de demonstração: esta transação não existe em uma blockchain real.
      </p>
      <h1 className="text-2xl font-bold text-foreground">Detalhes da transação</h1>

      {tx.isPending ? (
        <div className="skeleton-shimmer h-72 rounded-lg" aria-busy aria-label="Carregando transação" />
      ) : tx.isError ? (
        <ErrorState
          message={tx.error instanceof ApiError && tx.error.status === 404 ? 'Transação não encontrada.' : tx.error.message}
          onRetry={tx.error instanceof ApiError && tx.error.status === 404 ? undefined : () => void tx.refetch()}
        />
      ) : (
        <TransactionDetails tx={tx.data} />
      )}

      <Link to="/" className="w-fit text-sm text-text-accent hover:underline">
        Voltar ao marketplace
      </Link>
    </div>
  )
}

function TransactionDetails({ tx }: { tx: ExplorerTransaction }) {
  const rows: [string, ReactNode][] = [
    ['Hash', <span key="hash" className="break-all">{tx.hash}</span>],
    ['Status', <span key="status" className="text-[#46a358]">Sucesso</span>],
    ['Rede', NETWORK_LABELS[tx.network]],
    ['Bloco', tx.blockNumber.toLocaleString('pt-BR')],
    ['Data', formatDate(tx.timestamp)],
    ['De', <span key="from" title={tx.from}>{shortHash(tx.from, 10, 8)}</span>],
    ['Para (contrato)', <span key="to" title={tx.to}>{shortHash(tx.to, 10, 8)}</span>],
    ['Valor', formatEth(tx.value)],
    ['Taxa de rede', formatEth(tx.fee)],
  ]

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-surface-card p-6">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_minmax(0,1fr)]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="transfers-title" className="flex flex-col gap-3 border-t border-border pt-4">
        <h2 id="transfers-title" className="text-base font-bold text-foreground">
          Transferências de token
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-foreground">
          {tx.transfers.map((t) => (
            <li key={`${t.tokenId}-${t.editionLabel}`}>
              {t.name} · ID {t.tokenId} · Edição {t.editionLabel} · {t.quantity}{' '}
              {t.quantity === 1 ? 'cópia' : 'cópias'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
