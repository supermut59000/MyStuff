import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, uploadImage } from '@/lib/api'
import type { Item, ItemListResponse, DashboardStats } from '@/types'

export interface ItemFilters {
  page?:        number
  per_page?:    number
  category_id?: number | null
  is_owned?:    boolean | null
  condition?:   string | null
  search?:      string
  sort?:        string
  order?:       'asc' | 'desc'
}

function buildQuery(filters: ItemFilters): string {
  const params = new URLSearchParams()
  if (filters.page)        params.set('page',        String(filters.page))
  if (filters.per_page)    params.set('per_page',    String(filters.per_page))
  if (filters.category_id != null) params.set('category_id', String(filters.category_id))
  if (filters.is_owned != null)    params.set('is_owned',    String(filters.is_owned))
  if (filters.condition)   params.set('condition',   filters.condition)
  if (filters.search)      params.set('search',      filters.search)
  if (filters.sort)        params.set('sort',        filters.sort)
  if (filters.order)       params.set('order',       filters.order)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useItems(filters: ItemFilters = {}) {
  return useQuery({
    queryKey: ['items', filters],
    queryFn: () => api.get<ItemListResponse>(`/api/items/${buildQuery(filters)}`),
    staleTime: 30_000,
  })
}

export function useItem(id: number | null) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: () => api.get<Item>(`/api/items/${id}`),
    enabled: id !== null,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
    staleTime: 30_000,
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Item, 'id' | 'created_at' | 'updated_at'>) =>
      api.post<Item>('/api/items/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Item> }) =>
      api.put<Item>(`/api/items/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['item', variables.id] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUploadItemImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadImage(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['item'] })
    },
  })
}

export function useDeleteItemImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<Item>(`/api/items/${id}/image`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['item'] })
    },
  })
}

export function useBulkDeleteItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => api.post('/api/items/bulk-delete', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useBulkMoveItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, category_id }: { ids: number[]; category_id: number }) =>
      api.post('/api/items/bulk-move', { ids, category_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
