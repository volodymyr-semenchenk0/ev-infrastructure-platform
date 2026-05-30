# СППР – Вибір локацій EV-зарядних станцій

Система підтримки прийняття рішень (СППР) для вибору оптимальних локацій
електрозарядних станцій у Києві. Методи: FAHP + TOPSIS + Monte Carlo.

Курсова робота, спеціальність 124 «Системний аналіз», ЧНУ, 2026.

## Швидкий старт

```bash
cp .env.example .env
docker compose up --build
```

| Сервіс | URL |
|--------|-----|
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |
| Frontend | http://localhost:5173 |
| PostgreSQL | localhost:5432 |

## Після клонування

```bash
make install          # pip + npm + pre-commit hooks
```

## Без Docker

```bash
make dev-backend   # uvicorn main:app --reload  →  :8000
make dev-frontend  # npm run dev                →  :5173
```

## Тести

```bash
make all           # lint + typecheck + pytest
make test          # pytest -v
make lint          # ruff check
make typecheck     # mypy mcdm/ --strict
```

## Структура проекту

```
app/
├── backend/
│   ├── mcdm/      # FAHP, TOPSIS, Monte Carlo (ізольований пакет)
│   ├── api/       # FastAPI роутери
│   ├── core/      # pydantic-settings, конфігурація
│   ├── db/        # SQLAlchemy + GeoAlchemy2, Alembic
│   ├── schemas/   # Pydantic DTO
│   └── services/  # бізнес-логіка
└── frontend/      # React 18 + Vite + MapLibre GL + Tailwind
docs/              # документація курсової роботи (Розділи 1–3)
```

## Claude Code Skills

Робочі скіли тепер постачаються плагінами Claude Code, а не `npx skills`.
Увімкнені плагіни зафіксовано в `.claude/settings.json` (`enabledPlugins` +
`extraKnownMarketplaces`, тож набір їде разом із репо):
`superpowers`, `frontend-design`, `code-review`, `code-simplifier`, `context7`,
`claude-md-management` (усі з marketplace `claude-plugins-official`). Встановлення —
через `/plugin` у самому Claude Code; вони лежать у глобальному кеші
`~/.claude/plugins/`, а не в репозиторії.

Проєктні скіли (`engineering-*`, `coursework-*`) — реальні каталоги в
`.claude/skills/` і зберігаються в git.
