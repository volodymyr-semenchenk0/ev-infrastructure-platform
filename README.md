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

## Без Docker

```bash
# Backend
cd app/backend
pip install -e ".[dev]"
uvicorn main:app --reload

# Frontend
cd app/frontend
npm install
npm run dev
```

## Тести

```bash
cd app/backend
pytest -v               # 1 fail очікуваний – mcdm/topsis.py не реалізовано
ruff check .            # лінтер
mypy mcdm/ --strict     # type check math-ядра
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

## Engineering Skills для Claude Code

Офіційні Anthropic engineering skills (архітектура, code review, тестування тощо)
встановлюються через Claude Code після їх виходу у публічний реєстр.
Плейсхолдери розміщено в `.claude/skills/`.
