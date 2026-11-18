import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { favoritesApi, ordersApi, profileApi, walletsApi } from '@/api/endpoints'
import type { CreateOrderRequest, Favorites, Order, UpdateWalletRequest } from '@/types/account'
import { useAuth } from '../auth/auth-context'
import { accountKeys } from './keys'

/** Id of the signed-in user, or a placeholder for disabled queries */
function useUserId() {
  const { user } = useAuth()
  return { userId: user?.id ?? 'anonymous', enabled: user !== null }
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Algo deu errado. Tente novamente.'
}

// Cart hooks live in features/cart/useCart.ts (visitor and signed-in cart)

// ---------- Favorites ----------

export function useFavorites() {
  const { userId, enabled } = useUserId()
  return useQuery({ queryKey: accountKeys.favorites(userId), queryFn: favoritesApi.list, enabled })
}

/**
 * Optimistic toggle: the heart changes immediately and is rolled back if the
 * request fails (see the `favorites-fail` mock scenario).
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { userId } = useUserId()
  const key = accountKeys.favorites(userId)

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (old) => {
        const ids = old?.nftIds ?? []
        return {
          nftIds: favorite ? [...new Set([...ids, nftId])] : ids.filter((id) => id !== nftId),
          items: favorite ? (old?.items ?? []) : (old?.items ?? []).filter((item) => item.id !== nftId),
        }
      })
      return { previous }
    },
    onError: (error, _variables, context) => {
      // setQueryData(undefined) is a no-op, so when the list had not loaded yet
      // the rollback restores an empty list; the refetch then brings the real one
      queryClient.setQueryData<Favorites>(key, context?.previous ?? { nftIds: [], items: [] })
      void queryClient.invalidateQueries({ queryKey: key })
      toast.error(`${errorMessage(error)} A alteração foi desfeita.`)
    },
    onSuccess: (favorites) => queryClient.setQueryData(key, favorites),
  })
}

// ---------- Wallets ----------

export function useWallets() {
  const { userId, enabled } = useUserId()
  return useQuery({ queryKey: accountKeys.wallets(userId), queryFn: walletsApi.list, enabled })
}

export function useWalletMutations() {
  const queryClient = useQueryClient()
  const { userId } = useUserId()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: accountKeys.wallets(userId) })
  const onError = (error: Error) => {
    // Field errors are shown in the form; other errors as a toast
    if (!(error instanceof ApiError && error.fields)) toast.error(errorMessage(error))
  }
  return {
    create: useMutation({ mutationFn: walletsApi.create, onSuccess: invalidate, onError }),
    update: useMutation({
      mutationFn: ({ id, ...changes }: { id: string } & UpdateWalletRequest) => walletsApi.update(id, changes),
      onSuccess: invalidate,
      onError,
    }),
    setPrimary: useMutation({
      mutationFn: (id: string) => walletsApi.update(id, { isPrimary: true }),
      onSuccess: invalidate,
      onError,
    }),
    remove: useMutation({ mutationFn: walletsApi.remove, onSuccess: invalidate, onError }),
  }
}

// ---------- Profile ----------

export function useProfile() {
  const { userId, enabled } = useUserId()
  return useQuery({ queryKey: accountKeys.profile(userId), queryFn: profileApi.get, enabled })
}

export function useProfileMutations() {
  const queryClient = useQueryClient()
  const { userId } = useUserId()
  return {
    update: useMutation({
      mutationFn: profileApi.update,
      onSuccess: (profile) => {
        queryClient.setQueryData(accountKeys.profile(userId), profile)
        void queryClient.invalidateQueries({ queryKey: ['session'] })
        toast.success('Perfil atualizado.')
      },
    }),
    changePassword: useMutation({
      mutationFn: profileApi.changePassword,
      onSuccess: () => toast.success('Senha alterada.'),
    }),
  }
}

// ---------- Orders ----------

export function useOrder(orderId: string) {
  const { userId, enabled } = useUserId()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: accountKeys.order(userId, orderId),
    queryFn: () => ordersApi.get(orderId),
    enabled,
    // Fallback if the socket is down: poll while the order is still in progress
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' || status === 'processing' ? 5000 : false
    },
  })

  // Whichever path delivered the final status (socket or polling), refresh the
  // cart: a failed order puts the items back
  const status = query.data?.status
  useEffect(() => {
    if (status === 'confirmed' || status === 'failed') {
      void queryClient.invalidateQueries({ queryKey: accountKeys.cart(userId) })
    }
  }, [status, queryClient, userId])

  return query
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { userId } = useUserId()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateOrderRequest; idempotencyKey: string }) =>
      ordersApi.create(body, idempotencyKey),
    // The cart is not touched when the order is created; purchased copies leave
    // it on confirmation (the order page refreshes the cart then)
    onSuccess: (order: Order) => queryClient.setQueryData(accountKeys.order(userId, order.id), order),
    onError: (error) => {
      // Values changed: the cart shown elsewhere must be refreshed too
      if (error instanceof ApiError && error.code === 'quote_changed') {
        void queryClient.invalidateQueries({ queryKey: accountKeys.cart(userId) })
      }
    },
  })
}
