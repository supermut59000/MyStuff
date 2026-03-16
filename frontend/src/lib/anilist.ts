export interface AniListManga {
  id:         number
  title:      { romaji: string; english: string | null; native: string }
  volumes:    number | null
  coverImage: { medium: string }
  status:     string  // FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED | HIATUS
}

const SINGLE_QUERY = `
  query ($search: String) {
    Media(search: $search, type: MANGA, format: MANGA) {
      id
      title { romaji english native }
      volumes
      coverImage { medium }
      status
    }
  }
`

const LIST_QUERY = `
  query ($search: String) {
    Page(perPage: 8) {
      media(search: $search, type: MANGA, format: MANGA) {
        id
        title { romaji english native }
        volumes
        coverImage { medium }
        status
      }
    }
  }
`

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ query, variables }),
    })
    if (!res.ok) return null
    return (await res.json()).data ?? null
  } catch {
    return null
  }
}

/** Returns the single best match for a title (used by series tracker cards) */
export async function searchAniList(title: string): Promise<AniListManga | null> {
  const data = await gql<{ Media: AniListManga }>(SINGLE_QUERY, { search: title })
  return data?.Media ?? null
}

/** Returns up to 8 matches for a search term (used by the import dialog) */
export async function searchAniListList(title: string): Promise<AniListManga[]> {
  const data = await gql<{ Page: { media: AniListManga[] } }>(LIST_QUERY, { search: title })
  return data?.Page?.media ?? []
}
