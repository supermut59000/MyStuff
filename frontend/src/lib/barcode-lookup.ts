import { api } from './api'

export interface UPCResult {
  title: string
  description: string | null
  brand: string | null
  image_url: string | null
  upc: string
  funko_serie: string | null
  funko_numero: number | null
  funko_character: string | null
  funko_exclusive: boolean
}

export async function lookupUPC(code: string): Promise<UPCResult | null> {
  try {
    return await api.get<UPCResult>(`/api/lookup/upc/${code}`)
  } catch {
    return null
  }
}
