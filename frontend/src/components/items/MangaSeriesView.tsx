import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, ExternalLink, Plus, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMangaSeries, useBulkCreateItems } from '@/hooks/use-items'
import { searchAniList, extractAuthor } from '@/lib/anilist'
import { uploadImage } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AniListManga } from '@/lib/anilist'
import type { MangaSeries } from '@/types'
import type { Category } from '@/types'

interface Props {
  categoryId: number
  category:   Category
}

// ── Manage dialog ────────────────────────────────────────────────────────────

interface ManageProps {
  open:      boolean
  onClose:   () => void
  series:    MangaSeries
  anilist:   AniListManga | null | undefined
  category:  Category
}

function ManageSeriesDialog({ open, onClose, series, anilist, category }: ManageProps) {
  const bulkCreate = useBulkCreateItems()

  const total = anilist?.volumes ?? null
  const missing: number[] = total
    ? Array.from({ length: total }, (_, i) => i + 1).filter(
        (t) => !series.owned_tomes.includes(t)
      )
    : []

  const [extraInput, setExtraInput] = useState('')
  const [toAdd, setToAdd] = useState<Set<number>>(new Set())

  const toggleTome = (n: number) => {
    setToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(n)) { next.delete(n) } else { next.add(n) }
      return next
    })
  }

  const addExtra = () => {
    const nums = extraInput.split(',').flatMap((p) => {
      const m = p.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
      if (!m) return []
      const from = parseInt(m[1])
      const to   = m[2] ? parseInt(m[2]) : from
      return Array.from({ length: to - from + 1 }, (_, i) => from + i)
    }).filter((n) => n >= 1 && !series.owned_tomes.includes(n))
    setToAdd((prev) => new Set([...prev, ...nums]))
    setExtraInput('')
  }

  const serieKey  = category.custom_fields.find((f) => f.key === 'serie' || f.key === 'series_name')?.key ?? 'serie'
  const tomeKey   = category.custom_fields.find((f) => f.key === 'tome' || f.key === 'volume_number')?.key ?? 'tome'
  const auteurKey = category.custom_fields.find((f) => f.key === 'auteur' || f.key === 'author')?.key ?? null

  const handleSave = async () => {
    if (toAdd.size === 0) { onClose(); return }

    const author = anilist?.staff?.edges?.length ? extractAuthor(anilist.staff.edges) : ''
    const baseCustom: Record<string, unknown> = { [serieKey]: series.serie }
    if (auteurKey && author) baseCustom[auteurKey] = author

    const items = [...toAdd].sort((a, b) => a - b).map((tome) => ({
      category_id:       category.id,
      name:              `${series.serie} - Tome ${tome}`,
      condition:         'good',
      is_owned:          true,
      quantity:          1,
      value:             null,
      reading_status:    'owned_unread',
      wear_status:       null,
      deployment_status: null,
      custom_data:       { ...baseCustom, [tomeKey]: tome },
    }))

    try {
      const result = await bulkCreate.mutateAsync(items)
      // Upload cover to newly created items
      if (anilist?.coverImage?.large && result.ids?.length) {
        try {
          const res = await fetch(anilist.coverImage.large)
          if (res.ok) {
            const blob = await res.blob()
            const file = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' })
            await Promise.all(result.ids.map((id) => uploadImage(id, file)))
          }
        } catch { /* non-blocking */ }
      }
      toast.success(`${toAdd.size} tome(s) ajouté(s) !`)
      setToAdd(new Set())
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const allToAdd = [...toAdd].sort((a, b) => a - b)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            {series.serie}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Owned summary */}
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Possédés ({series.owned_count}{total ? ` / ${total}` : ''})
            </p>
            <div className="flex flex-wrap gap-1">
              {series.owned_tomes.map((t) => (
                <span
                  key={t}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold bg-primary/10 text-primary"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Missing tomes to add */}
          {missing.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                Ajouter des tomes manquants
                <span className="ml-1 font-normal text-muted-foreground">
                  (cliquez pour sélectionner)
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTome(t)}
                    className={cn(
                      'h-7 w-7 rounded text-xs font-semibold transition-colors',
                      toAdd.has(t)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extra tomes input (beyond total or unknown series) */}
          <div>
            <p className="text-sm font-medium mb-2">
              {missing.length === 0 ? 'Ajouter des tomes' : 'Autres tomes'}
              <span className="ml-1 font-normal text-muted-foreground text-xs">(ex: 13, 15-17)</span>
            </p>
            <div className="flex gap-2">
              <Input
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExtra()}
                placeholder="13, 15-17…"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addExtra} disabled={!extraInput.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tomes to be created */}
          {allToAdd.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium mb-2">
                À créer ({allToAdd.length} tome{allToAdd.length > 1 ? 's' : ''})
              </p>
              <div className="flex flex-wrap gap-1">
                {allToAdd.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTome(t)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title="Cliquer pour retirer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={toAdd.size === 0 || bulkCreate.isPending}
            onClick={handleSave}
          >
            {bulkCreate.isPending
              ? 'Création…'
              : toAdd.size === 0
                ? 'Aucun tome à ajouter'
                : `Ajouter ${toAdd.size} tome${toAdd.size > 1 ? 's' : ''}`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Series card ───────────────────────────────────────────────────────────────

function SeriesCard({ series, category }: { series: MangaSeries; category: Category }) {
  const [manageOpen, setManageOpen] = useState(false)

  const { data: anilist, isLoading } = useQuery({
    queryKey: ['anilist', series.serie],
    queryFn:  () => searchAniList(series.serie),
    staleTime: 24 * 60 * 60 * 1000,
  })

  const total    = anilist?.volumes ?? null
  const pct      = total ? Math.round((series.owned_count / total) * 100) : null
  const missing  = total
    ? Array.from({ length: total }, (_, i) => i + 1).filter(
        (t) => !series.owned_tomes.includes(t)
      )
    : []

  const statusLabel: Record<string, string> = {
    FINISHED:         'Terminé',
    RELEASING:        'En cours',
    NOT_YET_RELEASED: 'Pas encore sorti',
    CANCELLED:        'Annulé',
    HIATUS:           'En pause',
  }

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex gap-3 p-4">
          {/* Cover */}
          <div className="shrink-0">
            {isLoading ? (
              <div className="h-24 w-16 animate-pulse rounded-md bg-muted" />
            ) : anilist?.coverImage?.medium ? (
              <img
                src={anilist.coverImage.medium}
                alt={series.serie}
                className="h-24 w-16 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-24 w-16 items-center justify-center rounded-md bg-muted">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight">{series.serie}</h3>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setManageOpen(true)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Gérer la série"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {anilist && (
                  <a
                    href={`https://anilist.co/manga/${anilist.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {anilist && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {statusLabel[anilist.status] ?? anilist.status}
              </p>
            )}

            {/* Progress bar */}
            <div className="mt-2">
              {total ? (
                <>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      {series.owned_count} / {total} tomes
                    </span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {series.owned_count} tome{series.owned_count !== 1 ? 's' : ''} possédé{series.owned_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Owned tomes */}
        <div className="border-t px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Possédés</p>
          <div className="flex flex-wrap gap-1">
            {series.owned_tomes.map((t) => (
              <span
                key={t}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold bg-primary/10 text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Missing tomes */}
        {missing.length > 0 && (
          <div className="border-t px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Manquants ({missing.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {missing.map((t) => (
                <button
                  key={t}
                  onClick={() => setManageOpen(true)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  title={`Ajouter le tome ${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add tome button when series is complete or no total known */}
        {missing.length === 0 && (
          <div className="border-t px-4 py-2">
            <button
              onClick={() => setManageOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" />
              Ajouter un tome
            </button>
          </div>
        )}
      </div>

      <ManageSeriesDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        series={series}
        anilist={anilist}
        category={category}
      />
    </>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function MangaSeriesView({ categoryId, category }: Props) {
  const { data: series = [], isLoading } = useMangaSeries(categoryId)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (series.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p className="font-medium">Aucune série trouvée</p>
        <p className="text-sm mt-1">Ajoutez des mangas avec un champ "Série" pour les voir ici.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {series.map((s) => (
        <SeriesCard key={s.serie} series={s} category={category} />
      ))}
    </div>
  )
}
