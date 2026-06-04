# EV Infrastructure Platform

Decision support system for selecting optimal EV charging station locations.
Methods: FAHP + TOPSIS + Monte Carlo simulation.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|--------|-----|
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |
| Frontend | http://localhost:5173 |
| PostgreSQL | localhost:5432 |

## Without Docker

```bash
make install          # pip + npm + pre-commit hooks
make dev-backend      # uvicorn main:app --reload  →  :8000
make dev-frontend     # npm run dev                →  :5173
```

## Tests

```bash
make all           # lint + typecheck + pytest
make test          # pytest -v
make lint          # ruff check
make typecheck     # mypy mcdm/ --strict
```

## Project structure

```
app/
├── backend/
│   ├── mcdm/      # FAHP, TOPSIS, Monte Carlo (isolated math core)
│   ├── api/       # FastAPI routers
│   ├── core/      # pydantic-settings, configuration
│   ├── db/        # SQLAlchemy + GeoAlchemy2, Alembic migrations
│   ├── schemas/   # Pydantic DTOs
│   └── services/  # business logic
└── frontend/      # React 18 + Vite + MapLibre GL + Tailwind CSS
```

## Stack

Backend: Python 3.11, FastAPI, SQLAlchemy 2, GeoAlchemy2, asyncpg, Alembic
Math: numpy, pandas, scipy, pymcdm
Frontend: React 18, TypeScript 5, Vite, MapLibre GL, Zustand, TanStack Query
DB: PostgreSQL 16 + PostGIS
