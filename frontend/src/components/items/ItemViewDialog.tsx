import { useState, useRef } from 'react'
import { Copy, Edit2, Trash2, Download, Upload, ImageOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ItemFormDialog } from '@/components/items/ItemFormDialog'
import { useDeleteItem, useUploadItemImage, useDeleteItemImage } from '@/hooks/use-items'
import { exportItemsCSV } from '@/lib/csv'
import { getImageUrl } from '@/lib/api'
import type { Category, Item } from '@/types'
import { cn } from '@/lib/utils'

const CONDITION_STYLE: Record<string, string> = {
  mint: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  good: 'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300',
  fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  poor: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300',
}

interface Props {
  item:     Item
  category: Category
  onClose:  () => void
}

export function ItemViewDialog({ item, category, onClose }: Props) {
  const [editOpen, setEditOpen]           = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const deleteItem = useDeleteItem()
  const uploadImage = useUploadItemImage()
  const deleteImage = useDeleteItemImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      await deleteItem.mutateAsync(item.id)
      toast.success('Item deleted')
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const handleExportCSV = () => {
    exportItemsCSV([item], category)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadImage.mutateAsync({ id: item.id, file })
      toast.success('Image uploaded')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const handleDeleteImage = async () => {
    try {
      await deleteImage.mutateAsync(item.id)
      toast.success('Image removed')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const customFields = category.custom_fields.filter(
    (f) => item.custom_data[f.key] !== undefined && item.custom_data[f.key] !== null,
  )

  if (editOpen) {
    return (
      <ItemFormDialog
        open
        onClose={() => setEditOpen(false)}
        category={category}
        item={item}
      />
    )
  }

  if (duplicateOpen) {
    return (
      <ItemFormDialog
        open
        onClose={() => setDuplicateOpen(false)}
        category={category}
        item={item}
        duplicate
      />
    )
  }

  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          {item.image_path && (
            <img
              src={getImageUrl(item.image_path)}
              alt={item.name}
              className="w-full rounded-lg object-cover max-h-48"
            />
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <span className={cn('inline-flex rounded px-2 py-0.5 text-xs font-semibold uppercase', CONDITION_STYLE[item.condition])}>
              {item.condition}
            </span>
            {item.is_owned
              ? <Badge variant="secondary">Owned</Badge>
              : <Badge variant="outline" className="border-rose-400 text-rose-500">Wishlist</Badge>
            }
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          {/* Quantity */}
          {category.has_quantity && (
            <Detail label="Quantity" value={String(item.quantity)} />
          )}

          {/* Value */}
          {item.value && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">Value:</span>
              <span className="text-lg font-bold">
                {parseFloat(item.value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )}

          {/* Category-specific statuses */}
          {item.reading_status && (
            <Detail label="Reading status" value={item.reading_status.replace(/_/g, ' ')} />
          )}
          {item.wear_status && (
            <Detail label="Wear status" value={item.wear_status.replace(/_/g, ' ')} />
          )}
          {item.deployment_status && (
            <Detail label="Deployment" value={item.deployment_status.replace(/_/g, ' ')} />
          )}

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              {customFields.map((f) => (
                <Detail
                  key={f.key}
                  label={f.label}
                  value={String(item.custom_data[f.key] ?? '')}
                />
              ))}
            </div>
          )}

          {/* Meta */}
          <p className="text-xs text-muted-foreground border-t pt-3">
            Added {new Date(item.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 flex-wrap">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditOpen(true)}>
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setDuplicateOpen(true)}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadImage.isPending}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Photo
          </Button>
          {item.image_path && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteImage}
              disabled={deleteImage.isPending}
            >
              <ImageOff className="mr-1.5 h-3.5 w-3.5" />
              Del photo
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  )
}
