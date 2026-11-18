import { useCallback, useSyncExternalStore } from 'react'

/** Tailwind `md` and `lg` breakpoints */
export const MD_UP = '(min-width: 48rem)'
export const LG_UP = '(min-width: 64rem)'

/** Lets a component render only the layout on screen, instead of hiding the other one with CSS */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
