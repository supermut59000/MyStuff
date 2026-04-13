import { Heart, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getImageUrl } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { Item } from '@/types'

const CONDITION_STYLE: Record<string, string> = {
  mint: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  good: 'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300',
  fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  poor: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300',
}

interface ItemCardProps {
  item:    Item
  onClick: () => void
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Wishlist indicator */}
      {!item.is_owned && (
        <span className="absolute right-3 top-3 text-rose-400">
          <Heart className="h-4 w-4 fill-current" />
        </span>
      )}

      {/* Lent indicator */}
      {item.lent_to && (
        <span className="absolute left-3 top-3 text-orange-400" title={`Prêté à ${item.lent_to}`}>
          <Share2 className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Thumbnail */}
      {item.image_path && (
        <img
          src={getImageUrl(item.image_path)}
          alt={item.name}
          className="h-24 w-full rounded-lg object-cover"
        />
      )}

      {/* Name + quantity */}
      <p className="line-clamp-2 text-sm font-medium leading-snug pr-5">
        {item.quantity > 1 && (
          <span className="mr-1 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary align-middle">
            ×{item.quantity}
          </span>
        )}
        {item.name}
      </p>

      {/* Condition badge */}
      <span
        className={cn(
          'inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
          CONDITION_STYLE[item.condition],
        )}
      >
        {item.condition}
      </span>

      {/* Value */}
      {item.value && (
        <p className="mt-auto text-sm font-semibold text-muted-foreground">
          {formatCurrency(item.value)}
        </p>
      )}
    </button>
  )
}
