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
- Реалізація у `mcdm/` пишеться лише після того, як зʼявився падаючий тест із числовим еталоном (red → green → refactor)
- Mock-и в тестах `mcdm/` – заборонені; тільки реальні числові приклади
- Заборонені методи: LSTM, генетичні алгоритми
- Заборонені UI-бібліотеки: jQuery, Bootstrap
- Коміти та коментарі англійською
- У коментарях, докстрингах і повідомленнях комітів заборонені епітети: «Robust», «Production-ready», «Comprehensive», «Elegant», емоджі, маркетинговий тон. Коментарі пояснюють «чому», а не «що»

## Робота через Claude Code

- Нетривіальні задачі у `mcdm/` або зміни архітектури – спочатку plan mode, погодити підхід, потім код
- Перед мержем – викликати скіл `engineering:code-review`
- Перед написанням нових тестів – `engineering:testing-strategy`
- Архітектурні рішення (вибір бібліотеки, формату даних, схеми БД) – оформити як ADR через `engineering:architecture` у `docs/adr/NNNN-назва.md`
- У відповіді про завершення задачі завжди вказувати: які тести запускалися та їх результат, чи проходить `ruff` і `mypy --strict mcdm/`, чи піднімається `uvicorn` / `vite`

## Тести та перевірка якості

```bash
cd app/backend
pytest mcdm/tests/ -v          # тести math-ядра (еталонні числа з літератури)
pytest tests/ -v               # integration tests API
ruff check .                   # лінтер (E, F, I, N, UP, ANN, B)
mypy mcdm/ --strict            # type checking math-ядра
```

Очікуваний стан до реалізації MCDM: 1 тест провалюється (`NotImplementedError`).

## Git workflow – обов'язково

**Перед будь-якою задачею з кодом** – перевір гілку і створи нову:

```bash
git checkout master && git pull
git checkout -b <тип>/<область>-<короткий-опис>
```

Шаблони назв гілок:
- `feat/mcdm-topsis-impl` – нова функціональність у math-ядрі
- `feat/frontend-map-component` – нова функціональність фронтенду
- `fix/backend-cors-config` – виправлення в бекенді
- `chore/infra-docker-healthcheck` – інфраструктура, CI, Docker

**Merge в master – лише після трьох умов:**
1. Всі тести проходять (`pytest`, ruff, mypy)
2. Зміни верифіковані (uvicorn / npm run dev)
3. Явний дозвіл користувача: «можна мерджити» або «merge»

Ніколи не мерджити мовчки. Ніколи не комітити в master напряму.

## Формат комітів (Conventional Commits + scope)

Монорепо – кожен коміт позначає область змін:

| Scope | Коли використовувати |
|---|---|
| `feat(mcdm)` | `app/backend/mcdm/` – математичне ядро |
| `feat(backend)` | `app/backend/` поза mcdm/ – API, DB, schemas |
| `feat(frontend)` | `app/frontend/` |
| `feat(infra)` | docker-compose, Dockerfile, CI, .env |
| `test(mcdm)` | тести math-ядра |
| `fix(...)` / `chore(...)` | аналогічно зі своїм scope |

Приклади:
```
feat(mcdm): реалізувати topsis() з векторною нормалізацією
test(mcdm): додати еталонний тест FAHP (Chang, 1996)
feat(frontend): компонент карти MapLibre з маркерами
fix(backend): виправити CORS для localhost:5173
chore(infra): додати healthcheck до docker-compose
```

## Технологічний стек

Backend: Python 3.11+, FastAPI, pydantic-settings, SQLAlchemy 2, GeoAlchemy2, asyncpg
Math: pymcdm, numpy, pandas, scipy
Frontend: React 18, TypeScript, Vite, MapLibre GL, Tailwind CSS, Zustand
БД: PostgreSQL 16 + PostGIS (Supabase у проді, Docker локально)
