import { useEffect } from 'react'

const SITE_NAME = 'Kurio'

/** Sets the document title and meta description of the current page */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | ${SITE_NAME}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}
