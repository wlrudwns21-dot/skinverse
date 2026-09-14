import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadCatalog, SEED_CATALOG, type Catalog } from './remote'

/**
 * The catalogue, shared by the storefront and the console.
 *
 * It starts from the seed in `src/data` so the first paint is instant and an
 * unreachable database degrades to a stale shop rather than a blank one, then
 * swaps in the live rows. `refresh()` lets the console re-read after an edit.
 */
interface CatalogValue extends Catalog {
  loading: boolean
  refresh: () => Promise<void>
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(SEED_CATALOG)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await loadCatalog()
    setCatalog(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadCatalog().then((next) => {
      if (cancelled) return
      setCatalog(next)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <CatalogContext.Provider value={{ ...catalog, loading, refresh }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalog must be used inside <CatalogProvider>')
  return value
}
