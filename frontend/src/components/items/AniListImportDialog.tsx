import { useState, useEffect } from 'react'
import { Search, ChevronLeft, BookOpen, Layers, List } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { searchAniListList, extractAuthor } from '@/lib/anilist'
import { uploadImage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useBulkCreateItems } from '@/hooks/use-items'
import { useDebounce } from '@/hooks/use-debounce'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AniListManga } from '@/lib/anilist'
import type { Category } from '@/types'

interface Props {
  open:     boolean
  onClose:  () => void
  category: Category
}

type Step = 'search' | 'configure'
type Mode = 'individual' | 'grouped'

const CONDITION_OPTIONS = [
  { value: 'mint',  label: 'Mint' },
  { value: 'good',  label: 'Good' },
  { value: 'fair',  label: 'Fair' },
  { value: 'poor',  label: 'Poor' },
]

const STATUS_OPTIONS = [
  { value: 'owned_unread', label: 'Non lu' },
  { value: 'reading',      label: 'En cours' },
  { value: 'completed',    label: 'Lu' },
]

const ANILIST_STATUS: Record<string, string> = {
  FINISHED:         'Terminé',
  RELEASING:        'En cours',
  NOT_YET_RELEASED: 'Pas encore sorti',
  CANCELLED:        'Annulé',
  HIATUS:           'En pause',
}

// Parse a range string like "1-5, 7, 9-11" into a sorted number array
function parseRange(input: string, max: number): number[] {
  const nums = new Set<number>()
  for (const part of input.split(',')) {
    const trimmed = part.trim()
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const from = parseInt(range[1])
      const to   = parseInt(range[2])
      for (let i = from; i <= to && i <= max; i++) nums.add(i)
    } else if (/^\d+$/.test(trimmed)) {
      const n = parseInt(trimmed)
      if (n >= 1 && n <= max) nums.add(n)
    }
  }
  return [...nums].sort((a, b) => a - b)
}

export function AniListImportDialog({ open, onClose, category }: Props) {
  const [step, setStep]             = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected]     = useState<AniListManga | null>(null)
  const [mode, setMode]             = useState<Mode>('individual')

  // Tome selection state
  const [selectedTomes, setSelectedTomes] = useState<Set<number>>(new Set())
  const [rangeInput, setRangeInput]       = useState('')
  const [useGrid, setUseGrid]             = useState(true)

  // Item config
  const [pricePerTome, setPricePerTome] = useState('')
  const [condition, setCondition]       = useState('good')
  const [readingStatus, setReadingStatus] = useState('owned_unread')

  const debouncedSearch = useDebounce(searchQuery, 400)
  const bulkCreate = useBulkCreateItems()

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['anilist-search', debouncedSearch],
    queryFn:  () => searchAniListList(debouncedSearch),
    enabled:  debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('search')
      setSearchQuery('')
      setSelected(null)
      setSelectedTomes(new Set())
      setRangeInput('')
      setPricePerTome('')
      setCondition('good')
      setReadingStatus('owned_unread')
      setMode('individual')
    }
  }, [open])

  // When a series is selected, pre-select all tomes if total is known
  const handleSelectSeries = (manga: AniListManga) => {
    setSelected(manga)
    const total = manga.volumes
    if (total && total <= 60) {
      setUseGrid(true)
      // Pre-select all tomes
      setSelectedTomes(new Set(Array.from({ length: total }, (_, i) => i + 1)))
      setRangeInput(`1-${total}`)
    } else {
      setUseGrid(false)
      setRangeInput(total ? `1-${total}` : '')
      setSelectedTomes(new Set())
    }
    setStep('configure')
  }

  const toggleTome = (n: number) => {
    setSelectedTomes((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const applyRange = () => {
    if (!selected) return
    const max = selected.volumes ?? 9999
    const parsed = parseRange(rangeInput, max)
    setSelectedTomes(new Set(parsed))
  }

  const tomeCount = selectedTomes.size
  const price     = parseFloat(pricePerTome) || 0
  const total     = price * tomeCount

  const hasSerieKey = category.custom_fields.some(
    (f) => f.key === 'serie' || f.key === 'series_name'
  )
  const serieKey  = category.custom_fields.find(
    (f) => f.key === 'serie' || f.key === 'series_name'
  )?.key ?? 'serie'
  const tomeKey   = category.custom_fields.find(
    (f) => f.key === 'tome' || f.key === 'volume_number'
  )?.key ?? 'tome'


  const auteurKey = category.custom_fields.find(
    (f) => f.key === 'auteur' || f.key === 'author'
  )?.key ?? null

  const serieName = selected
    ? (selected.title.english ?? selected.title.romaji)
    : ''

  const uploadCoverToItems = async (ids: number[], coverUrl: string) => {
    try {
      const res = await fetch(coverUrl)
      if (!res.ok) return
      const blob = await res.blob()
      const file = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' })
      await Promise.all(ids.map((id) => uploadImage(id, file)))
    } catch {
      // Non-blocking: cover upload failure should not fail the import
    }
  }

  const handleImport = async () => {
    if (!selected || tomeCount === 0) return

    const author = selected.staff?.edges?.length
      ? extractAuthor(selected.staff.edges)
      : ''

    const baseCustomData: Record<string, unknown> = {}
    if (hasSerieKey) baseCustomData[serieKey] = serieName
    if (auteurKey && author) baseCustomData[auteurKey] = author

    if (mode === 'individual') {
      const items = [...selectedTomes].sort((a, b) => a - b).map((tome) => ({
        category_id:    category.id,
        name:           `${serieName} - Tome ${tome}`,
        condition,
        is_owned:       true,
        quantity:       1,
        value:          price > 0 ? price : null,
        reading_status: readingStatus,
        wear_status:    null,
        deployment_status: null,
        custom_data: {
          ...baseCustomData,
          [tomeKey]: tome,
        },
      }))

      try {
        const result = await bulkCreate.mutateAsync(items)
        if (selected.coverImage?.large && result.ids?.length) {
          await uploadCoverToItems(result.ids, selected.coverImage.large)
        }
        toast.success(`${items.length} tomes créés !`)
        onClose()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erreur lors de la création')
      }
    } else {
      // Grouped: one item with quantity
      const items = [{
        category_id:    category.id,
        name:           serieName,
        condition,
        is_owned:       true,
        quantity:       tomeCount,
        value:          price > 0 ? price : null,
        reading_status: readingStatus,
        wear_status:    null,
        deployment_status: null,
        custom_data: { ...baseCustomData },
      }]

      try {
        const result = await bulkCreate.mutateAsync(items)
        if (selected.coverImage?.large && result.ids?.length) {
          await uploadCoverToItems(result.ids, selected.coverImage.large)
        }
        toast.success(`Série "${serieName}" créée (${tomeCount} tomes) !`)
        onClose()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erreur lors de la création')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'configure' && (
              <button onClick={() => setStep('search')} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {step === 'search' ? 'Importer une série' : 'Configurer l\'import'}
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: Search ── */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un manga (ex: Naruto, One Piece…)"
                className="pl-8"
              />
            </div>

            {isFetching && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}

            {!isFetching && debouncedSearch.length >= 2 && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Aucun résultat pour "{debouncedSearch}"
              </p>
            )}

            {!isFetching && results.length > 0 && (
              <div className="space-y-1.5">
                {results.map((manga) => (
                  <button
                    key={manga.id}
                    onClick={() => handleSelectSeries(manga)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                  >
                    {manga.coverImage?.medium ? (
                      <img src={manga.coverImage.medium} alt="" className="h-14 w-10 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="flex h-14 w-10 items-center justify-center rounded-md bg-muted shrink-0">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {manga.title.english ?? manga.title.romaji}
                      </p>
                      {manga.title.english && (
                        <p className="text-xs text-muted-foreground truncate">{manga.title.romaji}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ANILIST_STATUS[manga.status] ?? manga.status}
                        {manga.volumes ? ` · ${manga.volumes} tomes` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {debouncedSearch.length < 2 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Tapez au moins 2 caractères pour rechercher
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Configure ── */}
        {step === 'configure' && selected && (
          <div className="space-y-5">
            {/* Series info */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              {selected.coverImage?.medium && (
                <img src={selected.coverImage.medium} alt="" className="h-16 w-11 rounded-md object-cover shrink-0" />
              )}
              <div>
                <p className="font-semibold text-sm">{selected.title.english ?? selected.title.romaji}</p>
                <p className="text-xs text-muted-foreground">
                  {ANILIST_STATUS[selected.status] ?? selected.status}
                  {selected.volumes ? ` · ${selected.volumes} tomes au total` : ' · Nombre de tomes inconnu'}
                </p>
              </div>
            </div>

            {/* Mode toggle */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Type d'import</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('individual')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors',
                    mode === 'individual' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent'
                  )}
                >
                  <List className="h-5 w-5" />
                  <span className="font-medium">Tomes individuels</span>
                  <span className="text-xs text-muted-foreground text-center">
                    1 item par tome
                  </span>
                </button>
                <button
                  onClick={() => setMode('grouped')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors',
                    mode === 'grouped' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent'
                  )}
                >
                  <Layers className="h-5 w-5" />
                  <span className="font-medium">Série groupée</span>
                  <span className="text-xs text-muted-foreground text-center">
                    1 item avec quantité
                  </span>
                </button>
              </div>
            </div>

            {/* Tome selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Tomes possédés
                {tomeCount > 0 && <span className="ml-2 font-normal text-muted-foreground">({tomeCount} sélectionnés)</span>}
              </Label>

              {selected.volumes && selected.volumes <= 60 && useGrid ? (
                <>
                  {/* Visual grid */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Array.from({ length: selected.volumes }, (_, i) => i + 1).map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleTome(t)}
                        className={cn(
                          'h-7 w-7 rounded text-xs font-semibold transition-colors',
                          selectedTomes.has(t)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedTomes(new Set(Array.from({ length: selected.volumes! }, (_, i) => i + 1)))}>
                      Tout sélectionner
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTomes(new Set())}>
                      Tout désélectionner
                    </Button>
                  </div>
                </>
              ) : (
                /* Range input for large series or unknown total */
                <div className="flex gap-2">
                  <Input
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="ex: 1-10, 12, 15-20"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={applyRange}>Appliquer</Button>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Prix par tome (€)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={pricePerTome}
                  onChange={(e) => setPricePerTome(e.target.value)}
                  placeholder="7.50"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Total estimé
                </Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-semibold">
                  {total > 0
                    ? formatCurrency(total)
                    : '—'
                  }
                </div>
              </div>
            </div>

            {/* Condition + reading status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">État</Label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Statut lecture</Label>
                <select
                  value={readingStatus}
                  onChange={(e) => setReadingStatus(e.target.value)}
                  className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary + confirm */}
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              {mode === 'individual' ? (
                <p>Créera <strong>{tomeCount} item(s)</strong> individuels pour <strong>{serieName}</strong></p>
              ) : (
                <p>Créera <strong>1 item</strong> "{serieName}" avec une quantité de <strong>{tomeCount}</strong></p>
              )}
              {price > 0 && (
                <p className="text-muted-foreground">
                  Valeur totale : {formatCurrency(total)}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={tomeCount === 0 || bulkCreate.isPending}
              onClick={handleImport}
            >
              {bulkCreate.isPending
                ? 'Création en cours…'
                : mode === 'individual'
                  ? `Créer ${tomeCount} tome(s)`
                  : `Créer la série groupée`
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
