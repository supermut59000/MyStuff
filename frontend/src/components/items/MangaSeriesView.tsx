import { useQuery } from '@tanstack/react-query'
import { BookOpen, ExternalLink } from 'lucide-react'
import { useMangaSeries } from '@/hooks/use-items'
import { searchAniList } from '@/lib/anilist'
import type { MangaSeries } from '@/types'

interface Props {
  categoryId: number
}

function SeriesCard({ series }: { series: MangaSeries }) {
  const { data: anilist, isLoading } = useQuery({
    queryKey: ['anilist', series.serie],
    queryFn:  () => searchAniList(series.serie),
    staleTime: 24 * 60 * 60 * 1000, // 24h — rarely changes
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
            {anilist && (
              <a
                href={`https://anilist.co/manga/${anilist.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
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
              <span
                key={t}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold bg-destructive/10 text-destructive"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MangaSeriesView({ categoryId }: Props) {
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
        <SeriesCard key={s.serie} series={s} />
      ))}
    </div>
  )
}
