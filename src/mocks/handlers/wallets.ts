import { http, HttpResponse } from 'msw'
import type { CreateWalletRequest, UpdateWalletRequest, Wallet, WalletProvider } from '@/types/account'
import type { Network } from '@/types/catalog'
import { commit, getDb, nextId } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'

const PROVIDERS: WalletProvider[] = ['metamask', 'walletconnect', 'coinbase']
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
const ENS_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i

function walletsOf(userId: string) {
  return (getDb().wallets[userId] ??= [])
}

function setPrimary(wallets: Wallet[], id: string) {
  for (const wallet of wallets) wallet.isPrimary = wallet.id === id
}

export const walletsHandlers = [
  http.get(`${API}/wallets`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    return HttpResponse.json(walletsOf(auth.user.id))
  }),

  http.post(`${API}/wallets`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const body = await readJson<CreateWalletRequest>(request)
    const label = body?.label?.trim() ?? ''
    const address = body?.address?.trim() ?? ''
    const ensName = body?.ensName?.trim() || null

    const fields: Record<string, string> = {}
    if (!label) fields.label = 'Informe um apelido para a carteira.'
    if (!PROVIDERS.includes(body?.provider as WalletProvider)) fields.provider = 'Selecione uma carteira.'
    if (!NETWORKS.includes(body?.network as Network)) fields.network = 'Selecione uma rede.'
    if (!ADDRESS_PATTERN.test(address)) fields.address = 'Informe um endereço 0x válido (40 caracteres hexadecimais).'
    if (ensName && !ENS_PATTERN.test(ensName)) fields.ensName = 'O nome ENS precisa terminar em .eth.'
    if (Object.keys(fields).length) return apiError(422, 'validation_error', 'Confira os campos.', fields)

    const wallets = walletsOf(auth.user.id)
    if (wallets.some((w) => w.address.toLowerCase() === address.toLowerCase())) {
      return apiError(409, 'wallet_exists', 'Esta carteira já foi adicionada.', {
        address: 'Esta carteira já foi adicionada.',
      })
    }

    const wallet: Wallet = {
      id: nextId('wallet'),
      label,
      provider: body!.provider as WalletProvider,
      network: body!.network as Network,
      address,
      ensName,
      // The first wallet is always the primary one
      isPrimary: wallets.length === 0 || Boolean(body?.isPrimary),
      createdAt: new Date().toISOString(),
    }
    wallets.push(wallet)
    if (wallet.isPrimary) setPrimary(wallets, wallet.id)
    commit()
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.patch(`${API}/wallets/:id`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const wallets = walletsOf(auth.user.id)
    const wallet = wallets.find((w) => w.id === String(params.id))
    if (!wallet) return apiError(404, 'not_found', 'Carteira não encontrada.')

    const body = await readJson<UpdateWalletRequest>(request)
    if (body?.label !== undefined) {
      const label = body.label.trim()
      if (!label) return apiError(422, 'validation_error', 'Confira os campos.', { label: 'Informe um apelido.' })
      wallet.label = label
    }
    if (body?.ensName !== undefined) {
      const ensName = body.ensName?.trim() || null
      if (ensName && !ENS_PATTERN.test(ensName)) {
        return apiError(422, 'validation_error', 'Confira os campos.', { ensName: 'O nome ENS precisa terminar em .eth.' })
      }
      wallet.ensName = ensName
    }
    if (body?.isPrimary) setPrimary(wallets, wallet.id)
    commit()
    return HttpResponse.json(wallet)
  }),

  http.delete(`${API}/wallets/:id`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const db = getDb()
    const wallets = walletsOf(auth.user.id)
    const removed = wallets.find((w) => w.id === String(params.id))
    if (!removed) return apiError(404, 'not_found', 'Carteira não encontrada.')

    db.wallets[auth.user.id] = wallets.filter((w) => w.id !== removed.id)
    // Removing the primary wallet promotes the next one
    const remaining = db.wallets[auth.user.id]
    if (removed.isPrimary && remaining[0]) setPrimary(remaining, remaining[0].id)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),
]
