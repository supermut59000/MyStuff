import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { ItemGrid } from '@/components/items/ItemGrid'
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog'
import type { Category } from '@/types'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [showWishlist, setShowWishlist]             = useState(false)
  const [sidebarOpen, setSidebarOpen]               = useState(false)

  // Category form dialog
  const [categoryFormOpen, setCategoryFormOpen]     = useState(false)
  const [editingCategory, setEditingCategory]       = useState<Category | null>(null)

  const openCreateCategory = () => { setEditingCategory(null); setCategoryFormOpen(true) }
  const openEditCategory   = (cat: Category) => { setEditingCategory(cat); setCategoryFormOpen(true) }

  const handleSelectCategory = (id: number) => {
    setSelectedCategoryId(id)
    setShowWishlist(false)
  }
  const handleSelectDashboard = () => {
    setSelectedCategoryId(null)
    setShowWishlist(false)
  }
  const handleSelectWishlist = () => {
    setSelectedCategoryId(null)
    setShowWishlist(true)
  }

  const showDashboard = selectedCategoryId === null && !showWishlist

  return (
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="mystuff-theme">
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen bg-background">
          <Sidebar
            selectedCategoryId={selectedCategoryId}
            showWishlist={showWishlist}
            mobileOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onSelectCategory={handleSelectCategory}
            onSelectDashboard={handleSelectDashboard}
            onSelectWishlist={handleSelectWishlist}
            onNewCategory={openCreateCategory}
            onEditCategory={openEditCategory}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
            <main className="flex-1 overflow-y-auto">
              {showDashboard ? (
                <Dashboard onSelectCategory={handleSelectCategory} />
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

        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
