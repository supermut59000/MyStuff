import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
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

export default function App() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [showWishlist, setShowWishlist]             = useState(false)
  const [showTrash, setShowTrash]                   = useState(false)
  const [sidebarOpen, setSidebarOpen]               = useState(false)
  const [searchOpen, setSearchOpen]                 = useState(false)

  // Category form dialog
  const [categoryFormOpen, setCategoryFormOpen]     = useState(false)
  const [editingCategory, setEditingCategory]       = useState<Category | null>(null)

  const openCreateCategory = () => { setEditingCategory(null); setCategoryFormOpen(true) }
  const openEditCategory   = (cat: Category) => { setEditingCategory(cat); setCategoryFormOpen(true) }

  const handleSelectCategory = (id: number) => {
    setSelectedCategoryId(id)
    setShowWishlist(false)
    setShowTrash(false)
  }
  const handleSelectDashboard = () => {
    setSelectedCategoryId(null)
    setShowWishlist(false)
    setShowTrash(false)
  }
  const handleSelectWishlist = () => {
    setSelectedCategoryId(null)
    setShowWishlist(true)
    setShowTrash(false)
  }
  const handleSelectTrash = () => {
    setSelectedCategoryId(null)
    setShowWishlist(false)
    setShowTrash(true)
  }

  const handleSearchResult = (result: SearchResult) => {
    handleSelectCategory(result.category_id)
  }

  const showDashboard = selectedCategoryId === null && !showWishlist && !showTrash

  return (
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="mystuff-theme">
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen bg-background">
          <Sidebar
            selectedCategoryId={selectedCategoryId}
            showWishlist={showWishlist}
            showTrash={showTrash}
            mobileOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onSelectCategory={handleSelectCategory}
            onSelectDashboard={handleSelectDashboard}
            onSelectWishlist={handleSelectWishlist}
            onSelectTrash={handleSelectTrash}
            onNewCategory={openCreateCategory}
            onEditCategory={openEditCategory}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header
              onMenuToggle={() => setSidebarOpen(o => !o)}
              onSearchOpen={() => setSearchOpen(true)}
            />
            <main className="flex-1 overflow-y-auto">
              {showDashboard ? (
                <Dashboard onSelectCategory={handleSelectCategory} />
              ) : showTrash ? (
                <TrashView onBack={handleSelectDashboard} />
              ) : (
                <ItemGrid
                  categoryId={selectedCategoryId}
                  wishlistOnly={showWishlist}
                  onBack={handleSelectDashboard}
                />
              )}
            </main>
          </div>
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
      </QueryClientProvider>
    </ThemeProvider>
  )
}
