import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect } from '@/components/ui/native-select'
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories'
import type { Category, CategoryFeature, FieldType } from '@/types'

const AVAILABLE_FEATURES: { value: CategoryFeature; label: string; hint: string }[] = [
  { value: 'reading_status',    label: 'Reading status',     hint: 'Track reading progress (plan, reading, completed)' },
  { value: 'wear_status',       label: 'Wear status',        hint: 'Track clothing usage (active, stored, to sell/donate)' },
  { value: 'deployment_status', label: 'Deployment status',  hint: 'Track device status (in use, storage, broken)' },
  { value: 'barcode_isbn',      label: 'ISBN barcode scan',  hint: 'Scan barcodes to auto-fill book/manga info via ISBN' },
  { value: 'series_grouping',   label: 'Series grouping',    hint: 'Group items by series with volume tracking' },
  { value: 'anilist_import',    label: 'AniList import',     hint: 'Import manga series metadata from AniList' },
]

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',    label: 'Text' },
  { value: 'number',  label: 'Number' },
  { value: 'boolean', label: 'Boolean (checkbox)' },
  { value: 'select',  label: 'Select (dropdown)' },
  { value: 'date',    label: 'Date' },
]

const customFieldSchema = z.object({
  key:      z.string().min(1, 'Key required'),
  label:    z.string().min(1, 'Label required'),
  type:     z.enum(['text', 'number', 'boolean', 'select', 'date']),
  required: z.boolean(),
  options:  z.string(), // comma-separated, only for select
})

const FEATURE_VALUES = ['reading_status', 'wear_status', 'deployment_status', 'barcode_isbn', 'series_grouping', 'anilist_import'] as const

const formSchema = z.object({
  name:          z.string().min(1, 'Name is required'),
  icon:          z.string().min(1, 'Icon is required'),
  description:   z.string().optional(),
  features:     z.array(z.enum(FEATURE_VALUES)),
  has_quantity:  z.boolean(),
  poster_layout: z.boolean(),
  custom_fields: z.array(customFieldSchema),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open:       boolean
  onClose:    () => void
  category?:  Category | null  // null = create mode
}

export function CategoryFormDialog({ open, onClose, category }: Props) {
  const isEdit = !!category
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        name:          '',
        icon:          '📦',
        description:   '',
        features:     [],
        has_quantity:  false,
        poster_layout: false,
        custom_fields: [],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'custom_fields' })
  const watchedFields = watch('custom_fields')

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name:         category.name,
          icon:         category.icon,
          description:  category.description ?? '',
          features:     category.features ?? [],
          has_quantity:  category.has_quantity,
          poster_layout: category.poster_layout,
          custom_fields: category.custom_fields.map((f) => ({
            key:      f.key,
            label:    f.label,
            type:     f.type,
            required: f.required,
            options:  f.options ? f.options.join(', ') : '',
          })),
        })
      } else {
        reset({ name: '', icon: '📦', description: '', features: [], has_quantity: false, poster_layout: false, custom_fields: [] })
      }
    }
  }, [open, category, reset])

  const onSubmit = async (data: FormValues) => {
    const custom_fields = data.custom_fields.map((f) => ({
      key:      f.key,
      label:    f.label,
      type:     f.type,
      required: f.required,
      options:  f.type === 'select'
        ? f.options.split(',').map((o) => o.trim()).filter(Boolean)
        : null,
    }))

    try {
      if (isEdit) {
        await updateCategory.mutateAsync({
          id:   category!.id,
          data: { name: data.name, icon: data.icon, description: data.description || null, features: data.features, has_quantity: data.has_quantity, poster_layout: data.poster_layout, custom_fields },
        })
        toast.success('Category updated')
      } else {
        await createCategory.mutateAsync({
          name: data.name, icon: data.icon, description: data.description || null, features: data.features, has_quantity: data.has_quantity, poster_layout: data.poster_layout, custom_fields,
        })
        toast.success('Category created')
      }
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name + Icon row */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} placeholder="Manga" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="w-24 space-y-1">
              <Label htmlFor="icon">Icon</Label>
              <Input id="icon" {...register('icon')} placeholder="📦" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={2} placeholder="Optional description" />
          </div>

          {/* Quantity toggle */}
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="has_quantity"
              render={({ field: { value, onChange } }) => (
                <Checkbox id="has-quantity" checked={value} onCheckedChange={onChange} />
              )}
            />
            <Label htmlFor="has-quantity">Track quantity (e.g. multiple copies of the same item)</Label>
          </div>

          {/* Poster layout toggle */}
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="poster_layout"
              render={({ field: { value, onChange } }) => (
                <Checkbox id="poster-layout" checked={value} onCheckedChange={onChange} />
              )}
            />
            <Label htmlFor="poster-layout">Poster layout (vertical cover images — ideal for manga, movies, games)</Label>
          </div>

          {/* Features toggles */}
          <div className="space-y-2">
            <Label>Features</Label>
            <div className="space-y-2 rounded-md border p-3">
              {AVAILABLE_FEATURES.map((feat) => (
                <Controller
                  key={feat.value}
                  control={control}
                  name="features"
                  render={({ field: { value, onChange } }) => (
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`feat-${feat.value}`}
                        checked={value.includes(feat.value)}
                        onCheckedChange={(checked) => {
                          onChange(
                            checked
                              ? [...value, feat.value]
                              : value.filter((v: string) => v !== feat.value)
                          )
                        }}
                      />
                      <div>
                        <Label htmlFor={`feat-${feat.value}`} className="text-sm font-medium">{feat.label}</Label>
                        <p className="text-xs text-muted-foreground">{feat.hint}</p>
                      </div>
                    </div>
                  )}
                />
              ))}
            </div>
          </div>

          {/* Custom fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ key: '', label: '', type: 'text', required: false, options: '' })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add field
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No custom fields yet. Click "Add field" to define fields for items in this category.</p>
            )}

            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Key (no spaces)</Label>
                      <Input
                        {...register(`custom_fields.${i}.key`)}
                        placeholder="serie"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Label (displayed)</Label>
                      <Input
                        {...register(`custom_fields.${i}.label`)}
                        placeholder="Série"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <NativeSelect {...register(`custom_fields.${i}.type`)} className="h-8 text-xs">
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="flex flex-col items-center justify-end gap-1 pb-0.5">
                      <Label className="text-xs text-muted-foreground">Req.</Label>
                      <Controller
                        control={control}
                        name={`custom_fields.${i}.required`}
                        render={({ field: { value, onChange } }) => (
                          <Checkbox checked={value} onCheckedChange={onChange} />
                        )}
                      />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Options for select type */}
                  {watchedFields[i]?.type === 'select' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Options (comma-separated)</Label>
                      <Input
                        {...register(`custom_fields.${i}.options`)}
                        placeholder="oui, non, peut-être"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
