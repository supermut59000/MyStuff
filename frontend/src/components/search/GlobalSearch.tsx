import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useGlobalSearch } from '@/hooks/use-items'
import { useDebounce } from '@/hooks/use-debounce'
import { getImageUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/types'

interface Props {
  open:             boolean
  onClose:          () => void
  onSelectResult:   (result: SearchResult) => void
}

export function GlobalSearch({ open, onClose, onSelectResult }: Props) {
  const [query, setQuery] = useState('')
  const debouncedQuery    = useDebounce(query, 300)
  const inputRef          = useRef<HTMLInputElement>(null)
  const { data: results = [], isFetching } = useGlobalSearch(debouncedQuery)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        open ? onClose() : undefined
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-background shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all categories…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border px-1.5 text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isFetching && query.length >= 2 && (
            <div className="space-y-2 p-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {!isFetching && debouncedQuery.length >= 2 && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results for "{debouncedQuery}"
            </p>
          )}

          {!isFetching && results.length > 0 && (
            <ul className="p-2">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => { onSelectResult(result); onClose() }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
                      'hover:bg-accent hover:text-accent-foreground transition-colors'
                    )}
                  >
                    {result.image_path ? (
                      <img
                        src={getImageUrl(result.image_path)}
                        alt=""
                        className="h-9 w-9 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
                        {result.category_icon}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{result.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.category_icon} {result.category_name}
                        {!result.is_owned && (
                          <span className="ml-2 text-rose-400">· Wishlist</span>
                        )}
                      </p>
                    </div>
                    {result.value && (
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {parseFloat(result.value).toLocaleString('fr-FR', {
                          style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                        })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.length < 2 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      </div>
    </>
  )
}
