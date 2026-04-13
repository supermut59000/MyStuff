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
| Routing   | react-router-dom v7                                         |
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
      category.py         # Category ORM (name, icon, custom_fields JSON, features JSON, has_quantity, poster_layout)
      item.py             # Item ORM (name, condition enum, custom_data JSON, value, image_path, soft-delete via deleted_at)
    schemas/              # Pydantic request/response schemas
      category.py         # Includes CategoryFeature literal type
      item.py
    services/             # Business logic layer
      category_service.py
      item_service.py     # Uses settings for upload dir, image size, etc.
    api/
      deps.py             # Dependency injection (DB session, API key auth)
      routes/
        categories.py     # CRUD /api/categories
        items.py          # CRUD /api/items, image upload, bulk ops, SSRF-protected image-from-url
        dashboard.py      # GET /api/dashboard (stats, totals)
        search.py         # GET /api/search (global search across items)
        manga.py          # GET /api/manga/series (series grouping)
        lookup.py         # GET /api/lookup/barcode (product lookup by UPC)
  migrations/
    001_init.sql          # Single consolidated migration (includes features column)
    002_add_features.sql  # Migration for existing DBs: adds features column + populates presets
  tests/                  # pytest (categories + items)

frontend/
  src/
    App.tsx               # Root: ThemeProvider + QueryClient + BrowserRouter + ErrorBoundary
    types/index.ts        # All TS types (Category with features, Item, DashboardStats, etc.)
    lib/
      api.ts              # Fetch wrapper with API key header, error handling
      format.ts           # Centralized formatCurrency, formatDate (single locale source)
      csv.ts              # CSV export helper
      isbn.ts             # Google Books ISBN lookup
      anilist.ts          # AniList API integration
      barcode-lookup.ts   # UPC barcode product lookup
    hooks/
      use-categories.ts   # TanStack Query hooks for categories
      use-items.ts        # TanStack Query hooks for items
    components/
      ErrorBoundary.tsx   # React error boundary with retry button
      layout/             # Header (menu, search, dark mode), Sidebar (react-router nav)
      dashboard/          # Dashboard (stats cards, category grid)
      categories/         # CategoryCard, CategoryFormDialog (with features toggles + custom field editor)
      items/              # ItemGrid, ItemCard, ItemFormDialog (feature-driven), ItemViewDialog, ItemFilters,
                          # BarcodeScanner, BulkActionBar, TrashView, PosterCard,
                          # MangaSeriesView, AniListImportDialog
      search/             # GlobalSearch (Cmd+K dialog)
      ui/                 # shadcn primitives (button, card, dialog, input, etc.)
```

## Routes (Frontend)

| Path                  | View                |
|-----------------------|---------------------|
| `/`                   | Dashboard           |
| `/category/:id`       | ItemGrid for category |
| `/wishlist`           | ItemGrid (wishlist) |
| `/trash`              | TrashView           |

## Key Architecture Decisions

- **React Router** - URL-based navigation (`/category/3`, `/wishlist`, `/trash`), supports deep linking and back button
- **Feature flags on Category** - `features` JSON array (e.g. `["reading_status", "barcode_isbn", "series_grouping"]`) drives what the UI shows. No hardcoded category name checks anywhere in the frontend
- **Flexible schema** - categories define `custom_fields` (JSON array of field definitions with type/key/label/required/options), items store values in `custom_data` (JSON object)
- **Soft delete** - items have `deleted_at` timestamp, TrashView shows soft-deleted items with restore
- **Category-specific status enums** - `reading_status`, `wear_status`, `deployment_status` are nullable columns on Item. Which ones appear is controlled by the category's `features` array
- **Image handling** - uploaded to `settings.UPLOAD_DIR`, resized to `settings.IMAGE_MAX_DIMENSION`, served via StaticFiles (dev) or nginx (prod)
- **SSRF protection** - `image-from-url` endpoint validates URLs against private/internal IP ranges
- **Centralized formatting** - all currency/date formatting goes through `lib/format.ts` (single locale config)
- **Error boundaries** - React ErrorBoundary wraps main content to prevent white screens on component crashes
- **Auth** - optional API key via `X-API-Key` header, configured in .env

## Category Features

Available features that can be toggled per category:

| Feature              | What it enables                                         |
|----------------------|---------------------------------------------------------|
| `reading_status`     | Reading progress field (plan, reading, completed)       |
| `wear_status`        | Clothing status field (active, stored, to sell/donate)  |
| `deployment_status`  | Device status field (in use, storage, broken)           |
| `barcode_isbn`       | ISBN barcode scanning (vs UPC for other categories)     |
| `series_grouping`    | Series view with volume tracking                        |
| `anilist_import`     | Import manga metadata from AniList                      |

## Data Model (simplified)

**Category**: id, name, icon, description, custom_fields (JSON), features (JSON), has_quantity, poster_layout
**Item**: id, category_id (FK), name, description, condition (enum), is_owned, quantity, value, custom_data (JSON), image_path, reading_status, wear_status, deployment_status, lent_to, lent_at, read_up_to, deleted_at

## API Routes

All routes are prefixed with `/api`:
- `GET/POST /categories`, `GET/PUT/DELETE /categories/{id}`
- `GET/POST /items`, `GET/PUT/DELETE /items/{id}`, `POST /items/{id}/image`, `POST /items/{id}/image-from-url`, `POST /items/bulk-delete`, `POST /items/bulk-move`
- `GET /dashboard/stats`
- `GET /search?q=...`
- `GET /manga/series?category_id=...`
- `GET /lookup/upc/{code}`

## Config (backend)

Key settings in `core/config.py` (all configurable via env):
- `UPLOAD_DIR` — image storage path (default `/app/uploads`)
- `MAX_UPLOAD_SIZE_MB` — max upload size (default 5)
- `IMAGE_MAX_DIMENSION` — resize max dimension (default 1200)
- `IMAGE_QUALITY` — JPEG quality (default 85)
- `HTTP_TIMEOUT` — external API timeout in seconds (default 15)

## Conventions

- Backend: Python 3.14, type hints everywhere, service layer pattern (routes -> services -> ORM)
- Frontend: TypeScript strict, functional components, TanStack Query for all server state, shadcn/ui components
- Styling: Tailwind v4 utility classes, dark mode via next-themes (class strategy)
- Package manager: bun (frontend)
- Formatting: centralized in `lib/format.ts` — never use hardcoded locale strings in components
- Features: driven by `category.features` array — never check `category.name` for behavior
