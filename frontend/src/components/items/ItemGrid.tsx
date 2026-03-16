import { useState } from 'react'
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, CheckSquare, BookOpen, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { useItems, useBulkDeleteItems, useBulkMoveItems } from '@/hooks/use-items'
import { useCategories } from '@/hooks/use-categories'
import { useDebounce } from '@/hooks/use-debounce'
import { Button } from '@/components/ui/button'
import { ItemCard } from '@/components/items/ItemCard'
import { PosterCard } from '@/components/items/PosterCard'
import { ItemFilters, type Filters } from '@/components/items/ItemFilters'
import { ItemFormDialog } from '@/components/items/ItemFormDialog'
import { ItemViewDialog } from '@/components/items/ItemViewDialog'
import { BulkActionBar } from '@/components/items/BulkActionBar'
import { MangaSeriesView } from '@/components/items/MangaSeriesView'
import { AniListImportDialog } from '@/components/items/AniListImportDialog'
import type { Item } from '@/types'

function hasSerieTome(fields: { key: string }[]): boolean {
  const keys = fields.map((f) => f.key)
  return (keys.includes('serie') || keys.includes('series_name')) &&
         (keys.includes('tome')  || keys.includes('volume_number'))
}

interface ItemGridProps {
  categoryId:   number | null
  wishlistOnly: boolean
  onBack:       () => void
}

const DEFAULT_FILTERS: Filters = {
  search: '', condition: '', owned: 'all', sort: 'created_at', order: 'desc',
}

export function ItemGrid({ categoryId, wishlistOnly, onBack }: ItemGridProps) {
  const { data: categories = [] } = useCategories()
  const category = categories.find((c) => c.id === categoryId) ?? null

  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    owned: wishlistOnly ? 'wishlist' : 'all',
  })
  const [page, setPage] = useState(1)
  const [viewingItem, setViewingItem] = useState<Item | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [seriesView, setSeriesView]     = useState(false)
  const [importOpen, setImportOpen]     = useState(false)

  const showSeriesToggle = !wishlistOnly && category !== null && hasSerieTome(category.custom_fields)

  const debouncedSearch = useDebounce(filters.search)

  const queryFilters = {
    page,
    per_page: 20,
    category_id:  categoryId ?? undefined,
    is_owned:     filters.owned === 'all' ? undefined : filters.owned === 'owned',
    condition:    filters.condition || undefined,
    search:       debouncedSearch || undefined,
    sort:         filters.sort,
    order:        filters.order,
  }

  const { data, isLoading } = useItems(queryFilters)
  const bulkDelete = useBulkDeleteItems()
  const bulkMove = useBulkMoveItems()

  const handleFilterChange = (f: Filters) => {
    setFilters(f)
    setPage(1)
  }

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  const toggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} item(s)? This cannot be undone.`)) return
    try {
      await bulkDelete.mutateAsync([...selectedIds])
      toast.success(`Deleted ${selectedIds.size} item(s)`)
      clearSelection()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const handleBulkMove = async (targetCategoryId: number) => {
    try {
      await bulkMove.mutateAsync({ ids: [...selectedIds], category_id: targetCategoryId })
      toast.success(`Moved ${selectedIds.size} item(s)`)
      clearSelection()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Move failed')
    }
  }

  const title = wishlistOnly
    ? '❤️ Wishlist'
    : category
      ? `${category.icon} ${category.name}`
      : 'All items'

  return (
    <div className="p-6 space-y-4">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold flex-1">{title}</h2>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total} items</span>
        )}
        {category && (
          <>
            {showSeriesToggle && (
              <Button
                variant={seriesView ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setSeriesView((v) => !v)}
              >
                {seriesView
                  ? <><LayoutGrid className="mr-1.5 h-4 w-4" />Items</>
                  : <><BookOpen className="mr-1.5 h-4 w-4" />Séries</>
                }
              </Button>
            )}
            {!seriesView && (
              <Button
                variant={selectMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={toggleSelectMode}
              >
                <CheckSquare className="mr-1.5 h-4 w-4" />
                Select
              </Button>
            )}
            {showSeriesToggle && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                Import série
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add item
            </Button>
          </>
        )}
      </div>

      {/* Series view */}
      {seriesView && category && (
        <MangaSeriesView categoryId={category.id} category={category} />
      )}

      {/* Filters */}
      {!seriesView && <ItemFilters filters={filters} onChange={handleFilterChange} />}

      {/* Bulk action bar */}
      {!seriesView && selectMode && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          categories={categories}
          currentCategoryId={categoryId}
          onDelete={handleBulkDelete}
          onMove={handleBulkMove}
          onClear={clearSelection}
        />
      )}

      {/* Grid */}
      {!seriesView && isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!seriesView && !isLoading && data?.items.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <p className="font-medium">No items found</p>
          {category && (
            <Button variant="link" className="mt-2" onClick={() => setCreateOpen(true)}>
              Add the first item →
            </Button>
          )}
        </div>
      )}

      {!seriesView && !isLoading && data && data.items.length > 0 && (
        category?.poster_layout ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {data.items.map((item) => (
              <div key={item.id} className="relative">
                {selectMode && selectedIds.has(item.id) && (
                  <div className="absolute inset-0 z-10 rounded-lg ring-2 ring-primary pointer-events-none" />
                )}
                <PosterCard
                  item={item}
                  onClick={() => {
                    if (selectMode) toggleItem(item.id)
                    else setViewingItem(item)
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.items.map((item) => (
              <div key={item.id} className="relative">
                {selectMode && selectedIds.has(item.id) && (
                  <div className="absolute inset-0 z-10 rounded-xl ring-2 ring-primary pointer-events-none" />
                )}
                <ItemCard
                  item={item}
                  onClick={() => {
                    if (selectMode) toggleItem(item.id)
                    else setViewingItem(item)
                  }}
                />
              </div>
            ))}
          </div>
        )
      )}

      {/* Pagination */}
      {!seriesView && data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {data.pages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      {category && createOpen && (
        <ItemFormDialog
          open
          onClose={() => setCreateOpen(false)}
          category={category}
        />
      )}

      {viewingItem && category && (
        <ItemViewDialog
          item={viewingItem}
          category={category}
          onClose={() => setViewingItem(null)}
        />
      )}

      {importOpen && category && (
        <AniListImportDialog
          open
          onClose={() => setImportOpen(false)}
          category={category}
        />
      )}
    </div>
  )
}
