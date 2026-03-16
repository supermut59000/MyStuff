import type { CategoryStat } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CategoryCardProps {
  stat:           CategoryStat
  onSelectCategory: (id: number) => void
}

export function CategoryCard({ stat, onSelectCategory }: CategoryCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelectCategory(stat.category_id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-3xl">{stat.icon}</span>
          {stat.wishlist_count > 0 && (
            <Badge variant="outline" className="text-xs">
              {stat.wishlist_count} wished
            </Badge>
          )}
        </div>
        <CardTitle className="text-base">{stat.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{stat.count}</p>
        <p className="text-xs text-muted-foreground">
          {stat.count === 1 ? 'item' : 'items'}
        </p>
        {stat.total_value > 0 && (
          <p className="mt-1 text-sm font-medium text-foreground">
            {stat.total_value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
