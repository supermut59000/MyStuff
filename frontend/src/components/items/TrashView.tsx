import { Trash2, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTrashItems, useRestoreItem, usePermanentDeleteItem, useEmptyTrash } from '@/hooks/use-items'
import { useCategories } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/lib/api'
import type { Item } from '@/types'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function itemImageUrl(item: Item): string | null {
  if (!item.image_path) return null
  return getImageUrl(item.image_path)
}

export function TrashView({ onBack }: { onBack: () => void }) {
  const { data: items = [], isLoading } = useTrashItems()
  const { data: categories = [] } = useCategories()
  const restore = useRestoreItem()
  const permanentDelete = usePermanentDeleteItem()
  const emptyTrash = useEmptyTrash()

  const categoryName = (id: number) => {
    const cat = categories.find((c) => c.id === id)
    return cat ? `${cat.icon} ${cat.name}` : `#${id}`
  }

  const handleRestore = async (item: Item) => {
    try {
      await restore.mutateAsync(item.id)
      toast.success(`"${item.name}" restored`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Restore failed')
    }
  }

  const handlePermanentDelete = async (item: Item) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return
    try {
      await permanentDelete.mutateAsync(item.id)
      toast.success(`"${item.name}" permanently deleted`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const handleEmptyTrash = async () => {
    if (!confirm(`Permanently delete all ${items.length} item(s) in trash? This cannot be undone.`)) return
    try {
      const result = await emptyTrash.mutateAsync()
      toast.success(`${result.deleted} item(s) permanently deleted`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to empty trash')
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <span className="sr-only">Back</span>
          ←
        </Button>
        <Trash2 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold flex-1">Trash</h2>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        )}
        {items.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEmptyTrash}
            disabled={emptyTrash.isPending}
          >
            Empty trash
          </Button>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <Trash2 className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="font-medium">Trash is empty</p>
          <p className="text-sm mt-1">Deleted items will appear here</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {/* List */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const thumb = itemImageUrl(item)
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
              >
                {/* Thumbnail */}
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {thumb ? (
                    <img src={thumb} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                      ?
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryName(item.category_id)}
                    {item.deleted_at && (
                      <span className="ml-2">· deleted {formatDate(item.deleted_at)}</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Restore"
                    onClick={() => handleRestore(item)}
                    disabled={restore.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete permanently"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handlePermanentDelete(item)}
                    disabled={permanentDelete.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
