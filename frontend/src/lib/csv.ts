import type { Item, Category } from '@/types'

const BOM = '\uFEFF'
const SEP = ';'

function escapeCSV(value: unknown): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportItemsCSV(items: Item[], category?: Category) {
  const date = new Date().toISOString().split('T')[0]
  const name = category ? category.name.replace(/\s+/g, '-') : 'all'
  const filename = `mystuff_${name}_${date}.csv`

  // Collect all custom field keys across items
  const customKeys = Array.from(
    new Set(items.flatMap((i) => Object.keys(i.custom_data ?? {})))
  )

  const headers = [
    'ID', 'Name', 'Category ID', 'Condition', 'Owned',
    'Value', 'Description', 'Created At',
    ...customKeys,
  ]

  const rows = items.map((item) =>
    [
      item.id,
      item.name,
      item.category_id,
      item.condition,
      item.is_owned ? 'yes' : 'no',
      item.value ?? '',
      item.description ?? '',
      item.created_at,
      ...customKeys.map((k) => item.custom_data?.[k] ?? ''),
    ].map(escapeCSV).join(SEP)
  )

  const csv = [headers.join(SEP), ...rows].join('\n')
  downloadCSV(csv, filename)
}
