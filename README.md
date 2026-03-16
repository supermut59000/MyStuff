# MyStuff

Personal inventory management app — track your collections (manga, games, clothes, tech, etc.) with custom fields, images, and valuations.

## Stack

- **Backend**: FastAPI + SQLAlchemy + MariaDB
- **Frontend**: React 19 + Vite + Tailwind v4 + TanStack Query
- **Deployment**: Docker Compose + nginx

## Features

- Multiple categories with custom fields per category
- Quantity tracking per category (optional)
- Image upload per item
- Barcode/ISBN scanner
- Wishlist
- Dashboard with total value per category
- PWA support
- Bulk operations (move, delete)

## Dev

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8056

## Prod

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Requires a `.env.prod` in `backend/` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and optionally `API_KEY`.
