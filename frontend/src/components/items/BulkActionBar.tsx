import { Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import type { Category } from '@/types'

interface Props {
  selectedCount: number
  categories: Category[]
  currentCategoryId: number | null
  onDelete: () => void
  onMove: (categoryId: number) => void
  onClear: () => void
}

export function BulkActionBar({ selectedCount, categories, currentCategoryId, onDelete, onMove, onClear }: Props) {
  if (selectedCount === 0) return null
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <NativeSelect
          className="h-8 text-xs w-44"
          onChange={(e) => { if (e.target.value) onMove(Number(e.target.value)) }}
          defaultValue=""
        >
          <option value="" disabled>Move to…</option>
          {categories
            .filter((c) => c.id !== currentCategoryId)
            .map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
        </NativeSelect>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
