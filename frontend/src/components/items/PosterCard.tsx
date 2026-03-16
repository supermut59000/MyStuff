import { Heart, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getImageUrl } from '@/lib/api'
import type { Item } from '@/types'

const CONDITION_DOT: Record<string, string> = {
  mint: 'bg-green-400',
  good: 'bg-blue-400',
  fair: 'bg-yellow-400',
  poor: 'bg-red-400',
}

interface PosterCardProps {
  item:    Item
  onClick: () => void
}

export function PosterCard({ item, onClick }: PosterCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
    >
      {/* Cover image */}
      {item.image_path ? (
        <img
          src={getImageUrl(item.image_path)}
          alt={item.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Package className="h-8 w-8 opacity-20" />
        </div>
      )}

      {/* Bottom gradient + title */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-8">
        <p className="line-clamp-2 text-left text-[11px] font-medium leading-tight text-white">
          {item.quantity > 1 && (
            <span className="mr-0.5 font-semibold text-white/70">×{item.quantity} </span>
          )}
          {item.name}
        </p>
      </div>

      {/* Wishlist heart */}
      {!item.is_owned && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/40 p-0.5">
          <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
        </span>
      )}

      {/* Condition dot */}
      <span
        className={cn(
          'absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-1 ring-black/20',
          CONDITION_DOT[item.condition] ?? 'bg-muted-foreground',
        )}
      />
    </button>
  )
}
