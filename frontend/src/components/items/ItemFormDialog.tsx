import { useEffect, useState, lazy, Suspense } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ScanLine } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect } from '@/components/ui/native-select'
import { useCreateItem, useUpdateItem, useImageFromUrl } from '@/hooks/use-items'
import { lookupISBN } from '@/lib/isbn'
import { lookupUPC } from '@/lib/barcode-lookup'
import type { Category, CustomFieldDefinition, Item } from '@/types'

const BarcodeScanner = lazy(() =>
  import('@/components/items/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner }))
)

const formSchema = z.object({
  name:              z.string().min(1, 'Name is required'),
  description:       z.string().optional(),
  condition:         z.enum(['mint', 'good', 'fair', 'poor']),
  is_owned:          z.boolean(),
  quantity:          z.number().int().min(1),
  value:             z.string().optional(),
  reading_status:    z.string().optional(),
  wear_status:       z.string().optional(),
  deployment_status: z.string().optional(),
  custom_data:       z.record(z.string(), z.unknown()).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open:        boolean
  onClose:     () => void
  category:    Category
  item?:       Item | null   // null = create
  duplicate?:  boolean       // true = create pre-filled copy
}

export function ItemFormDialog({ open, onClose, category, item, duplicate }: Props) {
  const isEdit = !!item && !duplicate
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const imageFromUrl = useImageFromUrl()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        name: '', description: '', condition: 'good', is_owned: true,
        quantity: 1,
        value: '', reading_status: '', wear_status: '', deployment_status: '',
        custom_data: {},
      },
    })

  useEffect(() => {
    if (open) {
      setPendingImageUrl(null)
      if (item) {
        reset({
          name:              item.name,
          description:       item.description ?? '',
          condition:         item.condition,
          is_owned:          item.is_owned,
          quantity:          item.quantity,
          value:             item.value ?? '',
          reading_status:    item.reading_status ?? '',
          wear_status:       item.wear_status ?? '',
          deployment_status: item.deployment_status ?? '',
          custom_data:       (item.custom_data as Record<string, unknown>) ?? {},
        })
      } else {
        reset({
          name: '', description: '', condition: 'good', is_owned: true,
          quantity: 1,
          value: '', reading_status: '', wear_status: '', deployment_status: '',
          custom_data: {},
        })
      }
    }
  }, [open, item, reset])

  const onSubmit = async (data: FormValues) => {
    const payload = {
      name:              data.name,
      description:       data.description || null,
      condition:         data.condition,
      is_owned:          data.is_owned,
      quantity:          data.quantity,
      value:             data.value ? data.value : null,
      reading_status:    (data.reading_status || null) as Item['reading_status'],
      wear_status:       (data.wear_status || null) as Item['wear_status'],
      deployment_status: (data.deployment_status || null) as Item['deployment_status'],
      custom_data:       data.custom_data ?? {},
      image_path:        null as string | null,
    }

    try {
      if (isEdit) {
        await updateItem.mutateAsync({ id: item!.id, data: payload })
        toast.success('Item updated')
      } else {
        const created = await createItem.mutateAsync({ ...payload, category_id: category.id })
        toast.success('Item added')
        if (pendingImageUrl && created?.id) {
          imageFromUrl.mutate(
            { id: created.id, url: pendingImageUrl },
            { onSuccess: () => toast.success('Image auto-downloaded from scan') },
          )
        }
      }
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  const isMangaOrBooks = ['Manga', 'Livres'].includes(category.name)
  const isVetements   = category.name === 'Vêtements'
  const isTech        = category.name === 'Tech'
  const isFunko       = category.name === 'Pop Funko'

  const handleBarcodeDetected = async (code: string) => {
    if (isMangaOrBooks) {
      // ISBN lookup for books/manga
      const info = await lookupISBN(code)
      if (!info) {
        toast.error(`No book found for ISBN: ${code}`)
        return
      }

      const isManga = category.name === 'Manga'
      setValue('name', isManga && info.serie ? info.serie : info.title)

      const extra: Record<string, unknown> = { ...watch('custom_data') }
      if (info.authors)   extra.auteur  = info.authors
      if (info.publisher) extra.editeur = info.publisher
      if (isManga) {
        if (info.serie)        extra.serie = info.serie
        if (info.tome != null) extra.tome  = info.tome
      } else {
        extra.isbn = code
      }
      setValue('custom_data', extra)

      const label = isManga && info.tome != null
        ? `${info.serie} T${String(info.tome).padStart(2, '0')}`
        : info.title
      toast.success(`Found: ${label}${info.authors ? ` — ${info.authors}` : ''}`)
    } else {
      // UPC lookup for everything else (Funko Pop, Tech, Jeux Vidéo, etc.)
      const info = await lookupUPC(code)
      if (!info) {
        toast.error(`No product found for barcode: ${code}`)
        return
      }

      // Store image URL for auto-download after item creation
      if (info.image_url) setPendingImageUrl(info.image_url)

      if (isFunko) {
        setValue('name', info.funko_character || info.title)
        const extra: Record<string, unknown> = { ...watch('custom_data') }
        if (info.funko_serie)   extra.serie    = info.funko_serie
        if (info.funko_numero)  extra.numero   = info.funko_numero
        if (info.funko_exclusive) extra.exclusive = true
        setValue('custom_data', extra)
        toast.success(
          `Found: ${info.funko_character || info.title}` +
          `${info.funko_serie ? ` (${info.funko_serie})` : ''}` +
          `${info.funko_numero ? ` #${info.funko_numero}` : ''}`
        )
      } else {
        // Generic UPC: populate name and description
        setValue('name', info.title)
        if (info.description) setValue('description', info.description)
        toast.success(`Found: ${info.title}`)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `Edit "${item!.name}"`
              : duplicate
              ? `Duplicate "${item!.name}"`
              : `New ${category.icon} ${category.name}`}
          </DialogTitle>
        </DialogHeader>

        <Suspense fallback={null}>
          <BarcodeScanner
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onDetected={handleBarcodeDetected}
          />
        </Suspense>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="item-name">Name *</Label>
            <div className="flex gap-2">
              <Input id="item-name" {...register('name')} placeholder="Item name" className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setScannerOpen(true)}
                title={isMangaOrBooks ? 'Scan ISBN' : 'Scan barcode / UPC'}
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea id="item-desc" {...register('description')} rows={2} placeholder="Optional description" />
          </div>

          {/* Condition + Value row */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label>Condition</Label>
              <NativeSelect {...register('condition')}>
                <option value="mint">Mint</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </NativeSelect>
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="item-value">Value (€)</Label>
              <Input id="item-value" type="number" step="0.01" min="0" {...register('value')} placeholder="0.00" />
            </div>
          </div>

          {/* Quantity — only for categories that track it */}
          {category.has_quantity && (
            <div className="space-y-1">
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                min="1"
                step="1"
                {...register('quantity', { valueAsNumber: true })}
              />
            </div>
          )}

          {/* Is owned */}
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="is_owned"
              render={({ field: { value, onChange } }) => (
                <Checkbox id="is-owned" checked={value} onCheckedChange={onChange} />
              )}
            />
            <Label htmlFor="is-owned">I own this item (uncheck for wishlist)</Label>
          </div>

          {/* Category-specific status fields */}
          {isMangaOrBooks && (
            <div className="space-y-1">
              <Label>Reading status</Label>
              <NativeSelect {...register('reading_status')}>
                <option value="">— none —</option>
                <option value="plan_to_read">Plan to read</option>
                <option value="reading">Reading</option>
                <option value="owned_unread">Owned, unread</option>
                <option value="completed">Completed</option>
              </NativeSelect>
            </div>
          )}
          {isVetements && (
            <div className="space-y-1">
              <Label>Wear status</Label>
              <NativeSelect {...register('wear_status')}>
                <option value="">— none —</option>
                <option value="active">Active</option>
                <option value="stored">Stored</option>
                <option value="to_sell">To sell</option>
                <option value="to_donate">To donate</option>
              </NativeSelect>
            </div>
          )}
          {isTech && (
            <div className="space-y-1">
              <Label>Deployment status</Label>
              <NativeSelect {...register('deployment_status')}>
                <option value="">— none —</option>
                <option value="in_use_pc">In use (PC)</option>
                <option value="in_use_server">In use (Server)</option>
                <option value="in_use_other">In use (Other)</option>
                <option value="storage">Storage</option>
                <option value="to_sell">To sell</option>
                <option value="broken">Broken</option>
              </NativeSelect>
            </div>
          )}

          {/* Dynamic custom fields */}
          {category.custom_fields.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category.name} fields
              </p>
              {category.custom_fields.map((field) => (
                <CustomField
                  key={field.key}
                  field={field}
                  control={control}
                  register={register}
                  watch={watch}
                  setValue={setValue}
                />
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── dynamic field renderer ─────────────────────────────────────────────────

function CustomField({
  field,
  control,
  register,
}: {
  field:    CustomFieldDefinition
  control:  ReturnType<typeof useForm<FormValues>>['control']
  register: ReturnType<typeof useForm<FormValues>>['register']
  watch:    ReturnType<typeof useForm<FormValues>>['watch']
  setValue: ReturnType<typeof useForm<FormValues>>['setValue']
}) {
  const name = `custom_data.${field.key}` as const
  const labelText = `${field.label}${field.required ? ' *' : ''}`

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={name as Parameters<typeof control['register']>[0]}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              id={name}
              checked={!!value}
              onCheckedChange={onChange}
            />
          )}
        />
        <Label htmlFor={name}>{labelText}</Label>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-1">
        <Label htmlFor={name}>{labelText}</Label>
        <NativeSelect id={name} {...register(name as Parameters<typeof register>[0])}>
          <option value="">— select —</option>
          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </NativeSelect>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{labelText}</Label>
      <Input
        id={name}
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? 'any' : undefined}
        {...register(name as Parameters<typeof register>[0], {
          ...(field.type === 'number' ? { valueAsNumber: true } : {}),
        })}
        placeholder={field.label}
      />
    </div>
  )
}
