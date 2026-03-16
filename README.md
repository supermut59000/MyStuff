# MyStuff

Personal inventory management app — track your collections (manga, games, clothes, tech, etc.) with custom fields, images, and valuations.

## Stack

- **Backend**: FastAPI + SQLAlchemy + MariaDB
- **Frontend**: React 19 + Vite + Tailwind v4 + TanStack Query
- **Deployment**: Docker Compose + nginx

## Features

### Custom categories & fields
Each category has its own set of custom fields. A "Manga" category can have fields like series, tome number, and author, while "Tech" can have brand, model, and deployment status. You define the fields, types (text, number, boolean, select, date), and whether they're required.

### ISBN / Barcode scanner
When adding a manga or book, you can scan the barcode with your phone camera. The app hits the Google Books API to auto-fill the title, author, publisher, and release year. Requires HTTPS (browsers block camera access on plain HTTP).

### Quantity tracking
Categories can opt-in to quantity tracking. Useful for clothes ("4 of this t-shirt") but disabled for manga where each volume is unique. The dashboard and per-category totals account for quantity when computing values.

### Image upload
Each item can have a photo. Images are resized to max 1200×1200 and stored on disk (not in the DB). In production they're served via nginx and persisted in a Docker volume.

### Dashboard & value tracking
The dashboard shows total items, wishlist count, and total estimated value across all owned items. Each collection card also shows its own total value so you can see at a glance what each category is worth.

### Wishlist
Mark any item as "not owned yet" to track things you want to buy. The dashboard shows your wishlist count separately from your owned inventory.

### Bulk operations
Select multiple items and move them to another category or delete them all at once.

### PWA
The app installs as a PWA on mobile (Add to Home Screen). A service worker caches assets for offline use.

---

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

Create `backend/.env.prod` based on the example below:

```env
# Database (external MariaDB)
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=mystuff_user
DB_PASSWORD=supersecretpassword
DB_NAME=mystuff

# API key for backend auth — leave empty to disable auth
API_KEY=
```

> **Note**: `.env.prod` is git-ignored. Never commit real credentials.
