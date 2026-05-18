# СППР – Вибір локацій EV-зарядних станцій, Київ

Курсова робота з дисципліни «Системний аналіз», спеціальність 124, магістратура ЧНУ.
Дедлайн – червень 2026. Математичний розділ (FAHP + TOPSIS + Monte Carlo) – 50/100 балів.

## Запуск локально

```bash
cp .env.example .env          # заповни SUPABASE_* якщо потрібно
docker compose up --build
```

- API: http://localhost:8000 (Swagger: http://localhost:8000/api/docs)
- Frontend: http://localhost:5173
- PostgreSQL + PostGIS: порт 5432

Без Docker:

```bash
# Backend
cd app/backend && pip install -e ".[dev]" && uvicorn main:app --reload

# Frontend
cd app/frontend && npm install && npm run dev
```

## Архітектура

```
app/
├── backend/
│   ├── mcdm/       # ❗ математичне ядро – ізольований пакет (FAHP, TOPSIS, MC)
│   ├── api/        # FastAPI роутери – лише оркестрація, не математика
│   ├── core/       # pydantic-settings, конфігурація
│   ├── db/         # SQLAlchemy + GeoAlchemy2, Alembic-міграції
│   ├── schemas/    # Pydantic DTO
│   └── services/   # бізнес-логіка
└── frontend/
    └── src/
        ├── features/   # MCDM-форма, карта MapLibre, результати
        └── types/      # TypeScript-дзеркало Pydantic-схем
```

## Правила розробки

- Математична логіка – ТІЛЬКИ в `app/backend/mcdm/`; API-шар лише оркеструє
- Кожна функція `mcdm/` мусить мати юніт-тест з еталонними числами з літератури
- Mock-и в тестах `mcdm/` – заборонені; тільки реальні числові приклади
- Заборонені методи: LSTM, генетичні алгоритми
- Заборонені UI-бібліотеки: jQuery, Bootstrap
- Тире в текстах – тільки «–» (en dash, U+2013), не «-» і не «—»
- Коміти та коментарі можуть бути українською

## Тести та перевірка якості

```bash
cd app/backend
pytest mcdm/tests/ -v          # тести math-ядра (еталонні числа з літератури)
pytest tests/ -v               # integration tests API
ruff check .                   # лінтер (E, F, I, N, UP, ANN, B)
mypy mcdm/ --strict            # type checking math-ядра
```

Очікуваний стан до реалізації MCDM: 1 тест провалюється (`NotImplementedError`).

## Технологічний стек

Backend: Python 3.11+, FastAPI, pydantic-settings, SQLAlchemy 2, GeoAlchemy2, asyncpg
Math: pymcdm, numpy, pandas, scipy
Frontend: React 18, TypeScript, Vite, MapLibre GL, Tailwind CSS, Zustand
БД: PostgreSQL 16 + PostGIS (Supabase у проді, Docker локально)
