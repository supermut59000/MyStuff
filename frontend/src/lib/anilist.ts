export interface AniListManga {
  id:         number
  title:      { romaji: string; english: string | null; native: string }
  volumes:    number | null
  coverImage: { medium: string }
  status:     string  // FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED | HIATUS
}

const QUERY = `
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

export async function searchAniList(title: string): Promise<AniListManga | null> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ query: QUERY, variables: { search: title } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.Media ?? null
  } catch {
    return null
  }
}
