import { http, HttpResponse } from 'msw'
import type { ExplorerTransaction } from '@/types/account'
import { getDb } from '../db'
import { API, apiError, simulateNetwork } from '../http-utils'

const CONTRACT_ADDRESS = '0x7A42c0Fe5b1D9E3a6C8f2B4d0E1a3C5b7D9f19E8'

export const explorerHandlers = [
  /**
   * Simulated block explorer. Public, like a real explorer: it shows only
   * on-chain data (no buyer name or e-mail).
   */
  http.get(`${API}/explorer/tx/:hash`, async ({ params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const hash = String(params.hash).toLowerCase()
    const order = Object.values(getDb().orders).find((o) => o.transactionHash?.toLowerCase() === hash)
    if (!order || order.status !== 'confirmed' || !order.transactionHash) {
      return apiError(404, 'not_found', 'Transação não encontrada.')
    }

    // Deterministic block number derived from the hash
    const blockNumber = 19_000_000 + (Number.parseInt(hash.slice(2, 9), 16) % 1_000_000)
    const body: ExplorerTransaction = {
      hash: order.transactionHash,
      status: 'success',
      network: order.network,
      blockNumber,
      timestamp: order.updatedAt,
      from: order.wallet.address,
      to: CONTRACT_ADDRESS,
      value: order.total,
      fee: order.networkFee,
      transfers: order.items.map((item) => ({
        name: item.name,
        tokenId: item.tokenId,
        editionLabel: item.editionLabel,
        quantity: item.quantity,
      })),
    }
    return HttpResponse.json(body)
  }),
]
