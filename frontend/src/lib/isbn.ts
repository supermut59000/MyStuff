export interface BookInfo {
  title:     string
  serie:     string
  tome:      number | null
  authors:   string
  publisher: string
  year:      string
  isbn:      string
}

/** Extract serie name and tome number from a manga/book title string.
 *  Handles patterns like:
 *   "Naruto, Vol. 1" | "One Piece T01" | "Dragon Ball - Tome 3"
 *   "Demon Slayer (Vol. 4)" | "Berserk Tome 05"
 */
function parseSerieTome(title: string, subtitle?: string): { serie: string; tome: number | null } {
  // subtitle can be "Vol. 3" / "Tome 1" / "T03" on its own
  if (subtitle) {
    const m = subtitle.match(/(?:vol(?:ume)?\.?\s*|tome\s*|t\.?\s*)(\d+)/i)
    if (m) return { serie: title.trim(), tome: parseInt(m[1]) }
  }

  const patterns = [
    // "Serie, Vol. N" or "Serie, Tome N"
    /^(.+?)[,\s]+(?:vol(?:ume)?\.?\s*|tome\s*)(\d+)$/i,
    // "Serie - Vol. N" or "Serie – Tome N"
    /^(.+?)\s+[-–]\s+(?:vol(?:ume)?\.?\s*|tome\s*)(\d+)$/i,
    // "Serie (Vol. N)" or "Serie (Tome N)"
    /^(.+?)\s+\((?:vol(?:ume)?\.?\s*|tome\s*)(\d+)\)/i,
    // "Serie T01" — short French format
    /^(.+?)\s+[Tt](\d{1,3})$/,
    // "Serie 01" — bare number at end
    /^(.+?)\s+(\d{1,3})$/,
  ]

  for (const re of patterns) {
    const m = title.match(re)
    if (m) return { serie: m[1].trim(), tome: parseInt(m[2]) }
  }

  return { serie: title.trim(), tome: null }
}

async function lookupGoogleBooks(isbn: string): Promise<BookInfo | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  )
  const data = await res.json()
  const info = data.items?.[0]?.volumeInfo
  if (!info) return null

  // Build full title: "Title - Subtitle" when subtitle adds meaning
  const fullTitle = info.subtitle
    ? `${info.title} - ${info.subtitle}`.replace(/\.\s*$/, '').trim()
    : (info.title ?? '')
  const { serie, tome } = parseSerieTome(fullTitle, info.subtitle)

  return {
    title:     fullTitle,
    serie,
    tome,
    authors:   info.authors?.join(', ') ?? '',
    publisher: info.publisher ?? '',
    year:      info.publishedDate?.slice(0, 4) ?? '',
    isbn,
  }
}

async function lookupOpenLibrary(isbn: string): Promise<BookInfo | null> {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  )
  const data = await res.json()
  const book = data[`ISBN:${isbn}`]
  if (!book) return null

  const rawTitle = book.title ?? ''
  const { serie, tome } = parseSerieTome(rawTitle)

  return {
    title:     rawTitle,
    serie,
    tome,
    authors:   book.authors?.map((a: { name: string }) => a.name).join(', ') ?? '',
    publisher: book.publishers?.[0]?.name ?? '',
    year:      book.publish_date ?? '',
    isbn,
  }
}

export async function lookupISBN(isbn: string): Promise<BookInfo | null> {
  try {
    const result = await lookupGoogleBooks(isbn)
    if (result) return result
  } catch {
    // fall through to Open Library
  }
  try {
    return await lookupOpenLibrary(isbn)
  } catch {
    return null
  }
}
