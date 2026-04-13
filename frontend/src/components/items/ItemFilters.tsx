import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

export interface Filters {
  search:            string
  condition:         string
  owned:             'all' | 'owned' | 'wishlist'
  sort:              string
  order:             'asc' | 'desc'
  reading_status:    string
  wear_status:       string
  deployment_status: string
}

interface ItemFiltersProps {
  filters:   Filters
  onChange:  (f: Filters) => void
  category?: Category | null
}

const OWNED_TABS: { value: Filters['owned']; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'owned',    label: 'Owned' },
  { value: 'wishlist', label: 'Wishlist' },
]

function getCategoryStatusType(category: Category | null | undefined): 'reading' | 'wear' | 'deployment' | null {
  if (!category?.features) return null
  if (category.features.includes('reading_status'))    return 'reading'
  if (category.features.includes('wear_status'))       return 'wear'
  if (category.features.includes('deployment_status')) return 'deployment'
  return null
}

export function ItemFilters({ filters, onChange, category }: ItemFiltersProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })

  const statusType = getCategoryStatusType(category)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-40">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Search…"
          className="pl-8"
        />
      </div>

      {/* Owned / Wishlist tabs */}
      <div className="flex rounded-md border">
        {OWNED_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => set('owned', tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md',
              filters.owned === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Condition */}
      <NativeSelect
        value={filters.condition}
        onChange={(e) => set('condition', e.target.value)}
        className="w-32"
      >
        <option value="">All conditions</option>
        <option value="mint">Mint</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
      </NativeSelect>

      {/* Reading status — Manga / Livres */}
      {statusType === 'reading' && (
        <NativeSelect
          value={filters.reading_status}
          onChange={(e) => set('reading_status', e.target.value)}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="owned_unread">Unread</option>
          <option value="reading">Reading</option>
          <option value="completed">Completed</option>
          <option value="plan_to_read">Plan to read</option>
        </NativeSelect>
      )}

      {/* Wear status — Vêtements */}
      {statusType === 'wear' && (
        <NativeSelect
          value={filters.wear_status}
          onChange={(e) => set('wear_status', e.target.value)}
          className="w-36"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="stored">Stored</option>
          <option value="to_sell">To sell</option>
          <option value="to_donate">To donate</option>
        </NativeSelect>
      )}

      {/* Deployment status — Tech */}
      {statusType === 'deployment' && (
        <NativeSelect
          value={filters.deployment_status}
          onChange={(e) => set('deployment_status', e.target.value)}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="in_use_pc">In use (PC)</option>
          <option value="in_use_server">In use (Server)</option>
          <option value="in_use_other">In use (Other)</option>
          <option value="storage">Storage</option>
          <option value="to_sell">To sell</option>
          <option value="broken">Broken</option>
        </NativeSelect>
      )}

      {/* Sort */}
      <NativeSelect
        value={`${filters.sort}_${filters.order}`}
        onChange={(e) => {
          const [s, o] = e.target.value.split('_')
          onChange({ ...filters, sort: s, order: o as 'asc' | 'desc' })
        }}
        className="w-36"
      >
        <option value="created_at_desc">Newest first</option>
        <option value="created_at_asc">Oldest first</option>
        <option value="name_asc">Name A → Z</option>
        <option value="name_desc">Name Z → A</option>
        <option value="value_desc">Value ↓</option>
        <option value="value_asc">Value ↑</option>
      </NativeSelect>
    </div>
  )
}
