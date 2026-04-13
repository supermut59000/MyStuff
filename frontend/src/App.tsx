import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { ItemGrid } from '@/components/items/ItemGrid'
import { TrashView } from '@/components/items/TrashView'
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import type { Category, SearchResult } from '@/types'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function AppLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen]               = useState(false)
  const [searchOpen, setSearchOpen]                 = useState(false)
  const [categoryFormOpen, setCategoryFormOpen]     = useState(false)
  const [editingCategory, setEditingCategory]       = useState<Category | null>(null)

  const openCreateCategory = () => { setEditingCategory(null); setCategoryFormOpen(true) }
  const openEditCategory   = (cat: Category) => { setEditingCategory(cat); setCategoryFormOpen(true) }

  const handleSearchResult = (result: SearchResult) => {
    navigate(`/category/${result.category_id}`)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewCategory={openCreateCategory}
        onEditCategory={openEditCategory}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(o => !o)}
          onSearchOpen={() => setSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/category/:categoryId" element={<CategoryRoute />} />
              <Route path="/wishlist" element={<ItemGrid categoryId={null} wishlistOnly />} />
              <Route path="/trash" element={<TrashView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      <CategoryFormDialog
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        category={editingCategory}
      />

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectResult={handleSearchResult}
      />

      <Toaster />
    </div>
  )
}

function CategoryRoute() {
  const { categoryId } = useParams()
  const id = categoryId ? parseInt(categoryId, 10) : null
  if (id === null || isNaN(id)) return <Navigate to="/" replace />
  return <ItemGrid categoryId={id} wishlistOnly={false} />
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="mystuff-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
