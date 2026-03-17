import { useState, useRef } from 'react'
import { Copy, Edit2, Trash2, Download, Upload, ImageOff, Share2, RotateCcw, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ItemFormDialog } from '@/components/items/ItemFormDialog'
import { useDeleteItem, useUploadItemImage, useDeleteItemImage, useUpdateItem } from '@/hooks/use-items'
import { exportItemsCSV } from '@/lib/csv'
import { getImageUrl } from '@/lib/api'
import type { Category, Item, ReadingStatus } from '@/types'
import { cn } from '@/lib/utils'

const CONDITION_STYLE: Record<string, string> = {
  mint: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  good: 'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300',
  fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  poor: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300',
}

const READING_STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: 'owned_unread', label: 'Non lu' },
  { value: 'reading',      label: 'En cours' },
  { value: 'completed',    label: 'Terminé' },
]

interface Props {
  item:     Item
  category: Category
  onClose:  () => void
}

export function ItemViewDialog({ item, category, onClose }: Props) {
  const [editOpen, setEditOpen]           = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const deleteItem  = useDeleteItem()
  const uploadImage = useUploadItemImage()
  const deleteImage = useDeleteItemImage()
  const updateItem  = useUpdateItem()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local lend state
  const [lentTo,    setLentTo]    = useState(item.lent_to)
  const [lentAt,    setLentAt]    = useState(item.lent_at)
  const [lendForm,  setLendForm]  = useState(false)
  const [lendName,  setLendName]  = useState('')
  const [lendDate,  setLendDate]  = useState(new Date().toISOString().split('T')[0])

  // Local reading status state
  const [readingStatus, setReadingStatus] = useState(item.reading_status)

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

  const handleExportCSV = () => exportItemsCSV([item], category)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadImage.mutateAsync({ id: item.id, file })
      toast.success('Image uploaded')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
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

  const handleLend = async () => {
    if (!lendName.trim()) return
    try {
      await updateItem.mutateAsync({ id: item.id, data: { lent_to: lendName.trim(), lent_at: lendDate || null } })
      setLentTo(lendName.trim())
      setLentAt(lendDate || null)
      setLendForm(false)
      setLendName('')
      toast.success(`Prêté à ${lendName.trim()}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const handleReturn = async () => {
    try {
      await updateItem.mutateAsync({ id: item.id, data: { lent_to: null, lent_at: null } })
      setLentTo(null)
      setLentAt(null)
      toast.success('Récupéré !')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const handleReadingStatus = async (value: ReadingStatus) => {
    const next = readingStatus === value ? null : value
    try {
      await updateItem.mutateAsync({ id: item.id, data: { reading_status: next } })
      setReadingStatus(next)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const customFields = category.custom_fields.filter(
    (f) => item.custom_data[f.key] !== undefined && item.custom_data[f.key] !== null,
  )

  if (editOpen) {
    return <ItemFormDialog open onClose={() => setEditOpen(false)} category={category} item={item} />
  }

  if (duplicateOpen) {
    return <ItemFormDialog open onClose={() => setDuplicateOpen(false)} category={category} item={item} duplicate />
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
            {lentTo && (
              <Badge variant="outline" className="border-orange-400 text-orange-500">
                <Share2 className="mr-1 h-3 w-3" />
                Prêté
              </Badge>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          {/* Quantity */}
          {category.has_quantity && (
            <Detail label="Quantité" value={String(item.quantity)} />
          )}

          {/* Value */}
          {item.value && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">Valeur :</span>
              <span className="text-lg font-bold">
                {parseFloat(item.value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )}

          {/* Reading status quick toggle */}
          {item.is_owned && (
            <div>
              <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                Progression
              </p>
              <div className="flex gap-1.5">
                {READING_STATUSES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleReadingStatus(value)}
                    className={cn(
                      'rounded px-2 py-1 text-xs font-medium transition-colors',
                      readingStatus === value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category-specific statuses */}
          {item.wear_status && (
            <Detail label="État" value={item.wear_status.replace(/_/g, ' ')} />
          )}
          {item.deployment_status && (
            <Detail label="Déploiement" value={item.deployment_status.replace(/_/g, ' ')} />
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

          {/* Lending section */}
          {item.is_owned && (
            <div className="border-t pt-3">
              {lentTo ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Prêté à <span className="text-orange-500">{lentTo}</span></p>
                    {lentAt && (
                      <p className="text-xs text-muted-foreground">
                        le {new Date(lentAt).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReturn}
                    disabled={updateItem.isPending}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Récupéré
                  </Button>
                </div>
              ) : lendForm ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Prêter à…</p>
                  <Input
                    placeholder="Nom de la personne"
                    value={lendName}
                    onChange={(e) => setLendName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLend()}
                    autoFocus
                  />
                  <Input
                    type="date"
                    value={lendDate}
                    onChange={(e) => setLendDate(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={handleLend} disabled={!lendName.trim() || updateItem.isPending}>
                      Confirmer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setLendForm(false); setLendName('') }}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setLendForm(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Prêter cet objet
                </button>
              )}
            </div>
          )}

          {/* Meta */}
          <p className="text-xs text-muted-foreground border-t pt-3">
            Ajouté le {new Date(item.created_at).toLocaleDateString('fr-FR')}
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
