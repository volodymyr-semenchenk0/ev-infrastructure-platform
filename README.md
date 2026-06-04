# EV Infrastructure Platform

Decision support system for selecting optimal EV charging station locations.
Uses FAHP + TOPSIS + Monte Carlo simulation on top of geospatial data.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Python 3.11+ (for local development without Docker)
- Node.js 20+ (for local development without Docker)

## Getting started

### With Docker

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |
| Frontend | http://localhost:5173 |
| PostgreSQL + PostGIS | localhost:5432 |

### Without Docker

```bash
make install        # create venv, install deps, set up pre-commit hooks
make db-up          # start PostgreSQL + PostGIS in Docker
make migrate        # run Alembic migrations
make seed           # load reference data
make dev-backend    # uvicorn with hot reload → :8000
make dev-frontend   # Vite dev server → :5173
```

## Development

| Command | Description |
|---------|-------------|
| `make dev-backend` | Backend with hot reload |
| `make dev-frontend` | Frontend with HMR |
| `make migrate` | Apply pending Alembic migrations |
| `make seed` | Seed reference data (criteria, profiles) |

## Testing

```bash
make all              # lint + typecheck + all tests (backend and frontend)
make test             # pytest -v
make lint             # ruff check
make typecheck        # mypy --strict on mcdm/, schemas/, services/, api/
make frontend-test    # vitest
make frontend-e2e     # Playwright end-to-end tests
```

## Project structure

```
app/
├── backend/
│   ├── mcdm/        # math core — FAHP, TOPSIS, Monte Carlo (isolated package)
│   ├── api/         # FastAPI routers (orchestration only, no math)
│   ├── core/        # pydantic-settings, app config
│   ├── db/          # SQLAlchemy 2 async + GeoAlchemy2, Alembic migrations
│   ├── schemas/     # Pydantic DTOs
│   ├── services/    # business logic
│   └── tests/       # API integration tests (httpx)
└── frontend/
    └── src/
        ├── features/    # domain features (map, results, AHP matrix, export)
        ├── components/  # shared UI components
        ├── store/       # Zustand stores
        ├── pages/       # routes
        └── lib/         # axios, react-query, utilities
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, GeoAlchemy2, asyncpg, Alembic |
| Math | numpy, pandas, scipy, pymcdm |
| Frontend | React 18, TypeScript 5, Vite, MapLibre GL, Zustand, TanStack Query |
| Database | PostgreSQL 16 + PostGIS |
| Tooling | ruff, mypy, pytest, vitest, Playwright, pre-commit |
