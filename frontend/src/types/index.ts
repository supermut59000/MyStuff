export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'date'

export interface CustomFieldDefinition {
  key:      string
  label:    string
  type:     FieldType
  required: boolean
  options:  string[] | null
}

export interface Category {
  id:            number
  name:          string
  icon:          string
  description:   string | null
  custom_fields: CustomFieldDefinition[]
  has_quantity:  boolean
  item_count:    number
  total_value:   number
  created_at:    string
  updated_at:    string
}

export type Condition         = 'mint' | 'good' | 'fair' | 'poor'
export type ReadingStatus     = 'completed' | 'reading' | 'owned_unread' | 'plan_to_read'
export type WearStatus        = 'active' | 'stored' | 'to_sell' | 'to_donate'
export type DeploymentStatus  = 'in_use_pc' | 'in_use_server' | 'in_use_other' | 'storage' | 'to_sell' | 'broken'

export interface Item {
  id:                number
  category_id:       number
  name:              string
  description:       string | null
  condition:         Condition
  is_owned:          boolean
  quantity:          number
  value:             string | null
  custom_data:       Record<string, unknown>
  reading_status:    ReadingStatus | null
  wear_status:       WearStatus | null
  deployment_status: DeploymentStatus | null
  image_path:        string | null
  created_at:        string
  updated_at:        string
}

export interface ItemListResponse {
  items:    Item[]
  total:    number
  page:     number
  per_page: number
  pages:    number
}

export interface CategoryStat {
  category_id:    number
  name:           string
  icon:           string
  count:          number
  wishlist_count: number
  total_value:    number
}

export interface MangaSeries {
  serie:       string
  owned_tomes: number[]
  owned_count: number
}

export interface SearchResult {
  id:            number
  name:          string
  category_id:   number
  category_name: string
  category_icon: string
  condition:     string
  is_owned:      boolean
  value:         string | null
  image_path:    string | null
}

export interface DashboardStats {
  total_items:    number
  total_owned:    number
  total_wishlist: number
  total_value:    number
  by_category:    CategoryStat[]
}
