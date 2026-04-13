import { useNavigate, useLocation } from 'react-router-dom'
import { Heart, LayoutDashboard, Plus, Settings, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/use-categories'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Category } from '@/types'

interface SidebarProps {
  mobileOpen:         boolean
  onClose:            () => void
  onNewCategory:      () => void
  onEditCategory:     (cat: Category) => void
}

export function Sidebar({
  mobileOpen,
  onClose,
  onNewCategory,
  onEditCategory,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: categories = [], isLoading } = useCategories()

  const isDashboard = location.pathname === '/'
  const isWishlist  = location.pathname === '/wishlist'
  const isTrash     = location.pathname === '/trash'
  const activeCategoryId = location.pathname.startsWith('/category/')
    ? parseInt(location.pathname.split('/')[2], 10)
    : null

  const nav = (path: string) => { navigate(path); onClose() }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'flex h-screen w-56 flex-col border-r bg-sidebar-background shrink-0',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Dashboard link */}
        <div className="p-3">
          <button
            onClick={() => nav('/')}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isDashboard
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
        </div>

        <Separator />

        {/* Category list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </span>
            <button
              onClick={onNewCategory}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              title="New category"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoading && (
            <div className="space-y-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          )}

          <nav className="space-y-0.5">
            {categories.map((cat) => (
              <div key={cat.id} className="group flex items-center">
                <button
                  onClick={() => nav(`/category/${cat.id}`)}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors min-w-0',
                    activeCategoryId === cat.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <span className="text-base leading-none shrink-0">{cat.icon}</span>
                  <span className="flex-1 truncate text-left">{cat.name}</span>
                  {cat.item_count > 0 && (
                    <Badge variant="secondary" className="ml-auto h-5 min-w-[1.25rem] px-1 text-[10px]">
                      {cat.item_count}
                    </Badge>
                  )}
                </button>
                {/* Edit button — appears on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); onEditCategory(cat) }}
                  className="mr-1 hidden rounded p-1 text-muted-foreground hover:text-foreground group-hover:flex"
                  title={`Edit ${cat.name}`}
                >
                  <Settings className="h-3 w-3" />
                </button>
              </div>
            ))}
          </nav>
        </div>

        <Separator />

        {/* Wishlist + Trash */}
        <div className="p-3 space-y-0.5">
          <button
            onClick={() => nav('/wishlist')}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isWishlist
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Heart className="h-4 w-4" />
            Wishlist
          </button>
          <button
            onClick={() => nav('/trash')}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isTrash
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </button>
        </div>
      </aside>
    </>
  )
}
