# MyStuff - Project Context

Personal inventory management app to track collections (manga, games, clothes, tech, etc.) with custom fields, images, and valuations.

## Stack

| Layer     | Tech                                                        |
|-----------|-------------------------------------------------------------|
| Backend   | FastAPI + SQLAlchemy 2.0 (sync pymysql) + Pydantic v2      |
| Database  | MariaDB 11.2                                                |
| Frontend  | React 19 + Vite 6 + Tailwind v4 + TanStack Query v5        |
| UI        | shadcn/ui (Radix primitives) + lucide-react icons           |
| Forms     | react-hook-form + zod                                       |
| Deploy    | Docker Compose + nginx (prod)                               |

## Running

```bash
docker compose up --build        # Dev: frontend :3056, backend :8056, MariaDB :3307
docker compose -f docker-compose.prod.yml up --build -d   # Prod
```

Frontend dev server (outside Docker): `cd frontend && bun dev` -> http://localhost:5173 (proxies API to :8056)

## Project Structure

```
backend/
  app/
    main.py               # FastAPI app, CORS, route registration, /health
    core/
      config.py           # Settings via pydantic-settings (.env.local)
      database.py         # SQLAlchemy engine + session
      logging.py          # Log setup
    models/
      category.py         # Category ORM (name, icon, custom_fields JSON, has_quantity, poster_layout)
      item.py             # Item ORM (name, condition enum, custom_data JSON, value, image_path, soft-delete via deleted_at)
    schemas/              # Pydantic request/response schemas
      category.py
      item.py
    services/             # Business logic layer
      category_service.py
      item_service.py
    api/
      deps.py             # Dependency injection (DB session, API key auth)
      routes/
        categories.py     # CRUD /api/categories
        items.py          # CRUD /api/items, image upload, bulk ops
        dashboard.py      # GET /api/dashboard (stats, totals)
        search.py         # GET /api/search (global search across items)
        manga.py          # GET /api/manga/series (manga-specific grouping)
        lookup.py         # GET /api/lookup/barcode (product lookup by UPC)
  migrations/
    001_init.sql          # Single consolidated migration
  tests/                  # pytest (categories + items)

frontend/
  src/
    App.tsx               # Root: ThemeProvider + QueryClient + layout shell (no router, state-based views)
    types/index.ts        # All TS types (Category, Item, DashboardStats, etc.)
    lib/
      api.ts              # Fetch wrapper with API key header, error handling
      csv.ts              # CSV export helper
      isbn.ts             # Google Books ISBN lookup
      anilist.ts          # AniList API integration
      barcode-lookup.ts   # UPC barcode product lookup
    hooks/
      use-categories.ts   # TanStack Query hooks for categories
      use-items.ts        # TanStack Query hooks for items
    components/
      layout/             # Header (menu, search, dark mode), Sidebar (categories nav)
      dashboard/          # Dashboard (stats cards, category grid)
      categories/         # CategoryCard, CategoryFormDialog (with custom field editor)
      items/              # ItemGrid, ItemCard, ItemFormDialog, ItemViewDialog, ItemFilters,
                          # BarcodeScanner, BulkActionBar, TrashView, PosterCard,
                          # MangaSeriesView, AniListImportDialog
      search/             # GlobalSearch (Cmd+K dialog)
      ui/                 # shadcn primitives (button, card, dialog, input, etc.)
```

## Key Architecture Decisions

- **No frontend router** - navigation is state-driven in App.tsx (selectedCategoryId, showWishlist, showTrash)
- **Flexible schema** - categories define `custom_fields` (JSON array of field definitions with type/key/label/required/options), items store values in `custom_data` (JSON object)
- **Soft delete** - items have `deleted_at` timestamp, TrashView shows soft-deleted items with restore
- **Category-specific status enums** - `reading_status`, `wear_status`, `deployment_status` are nullable columns on Item, used by specific categories (manga, clothes, tech)
- **Image handling** - uploaded to /app/uploads, resized to 1200x1200 max, served via StaticFiles (dev) or nginx (prod)
- **Auth** - optional API key via `X-API-Key` header, configured in .env

## Data Model (simplified)

**Category**: id, name, icon, description, custom_fields (JSON), has_quantity, poster_layout
**Item**: id, category_id (FK), name, description, condition (enum), is_owned, quantity, value, custom_data (JSON), image_path, reading_status, wear_status, deployment_status, lent_to, lent_at, read_up_to, deleted_at

## API Routes

All routes are prefixed with `/api`:
- `GET/POST /categories`, `GET/PUT/DELETE /categories/{id}`
- `GET/POST /items`, `GET/PUT/DELETE /items/{id}`, `POST /items/{id}/image`, `POST /items/bulk-delete`, `POST /items/bulk-move`
- `GET /dashboard`
- `GET /search?q=...`
- `GET /manga/series?category_id=...`
- `GET /lookup/barcode/{code}`

## Conventions

- Backend: Python 3.14, type hints everywhere, service layer pattern (routes -> services -> ORM)
- Frontend: TypeScript strict, functional components, TanStack Query for all server state, shadcn/ui components
- Styling: Tailwind v4 utility classes, dark mode via next-themes (class strategy)
- Package manager: bun (frontend)
