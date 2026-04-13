import { useNavigate } from 'react-router-dom'
import { Package, Heart, TrendingUp, Share2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboardStats, useLentItems, useUpdateItem } from '@/hooks/use-items'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'

export function Dashboard() {
  const navigate = useNavigate()
  const onSelectCategory = (id: number) => navigate(`/category/${id}`)
  const { data: stats, isLoading } = useDashboardStats()
  const { data: lentItems = [] }   = useLentItems()
  const updateItem = useUpdateItem()

  const handleReturn = async (id: number, name: string) => {
    try {
      await updateItem.mutateAsync({ id, data: { lent_to: null, lent_at: null } })
      toast.success(`"${name}" récupéré !`)
    } catch {
      toast.error('Erreur')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-6 space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total_items}</p>
            <p className="text-xs text-muted-foreground">{stats.total_owned} owned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total_wishlist}</p>
            <p className="text-xs text-muted-foreground">items to acquire</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.total_value)}
            </p>
            <p className="text-xs text-muted-foreground">owned items only</p>
          </CardContent>
        </Card>
      </div>

      {/* Lent items */}
      {lentItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Share2 className="h-4 w-4 text-orange-500" />
            Prêts en cours
            <span className="text-sm font-normal text-muted-foreground">({lentItems.length})</span>
          </h2>
          <div className="space-y-2">
            {lentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Prêté à <span className="text-orange-500 font-medium">{item.lent_to}</span>
                    {item.lent_at && ` · le ${formatDate(item.lent_at)}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReturn(item.id, item.name)}
                  disabled={updateItem.isPending}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Récupéré
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Collections</h2>
        {stats.by_category.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">No categories yet</p>
            <p className="text-sm mt-1">Create a category in the sidebar to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {stats.by_category.map((stat) => (
              <CategoryCard
                key={stat.category_id}
                stat={stat}
                onSelectCategory={onSelectCategory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
