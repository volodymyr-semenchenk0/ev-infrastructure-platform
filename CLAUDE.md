# СППР – Вибір локацій EV-зарядних станцій, Київ

Курсова робота з дисципліни «Системний аналіз», спеціальність 124, магістратура ЧНУ.
Дедлайн – червень 2026. Математичний розділ (FAHP + TOPSIS + Monte Carlo) – 50/100 балів.

## Запуск локально

Через `make` (рекомендовано):

```bash
make install          # pip + npm + pre-commit
make dev-backend      # uvicorn :8000
make dev-frontend     # vite :5173
make all              # lint + typecheck + pytest
```

Через Docker:

```bash
cp .env.example .env          # заповни SUPABASE_* якщо потрібно
docker compose up --build
```

- API: http://localhost:8000 (Swagger: http://localhost:8000/api/docs)
- Frontend: http://localhost:5173
- PostgreSQL + PostGIS: порт 5432

## Архітектура проєкту

```
app/
├── backend/
│   ├── mcdm/       # ❗ математичне ядро – ізольований пакет (FAHP, TOPSIS, MC)
│   │   └── tests/  # юніт-тести з еталонними числами з літератури
│   ├── api/        # FastAPI роутери – лише оркестрація, не математика
│   ├── core/       # pydantic-settings, конфігурація
│   ├── db/         # SQLAlchemy 2 async + GeoAlchemy2, Alembic-міграції
│   ├── schemas/    # Pydantic DTO
│   ├── services/   # бізнес-логіка (оркестрація mcdm + db)
│   ├── tests/      # integration tests API (httpx + TestClient)
│   ├── main.py     # точка входу FastAPI
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── features/   # MCDM-форма, карта MapLibre, результати
│       ├── components/ # переюзовні UI-компоненти
│       ├── pages/      # маршрути
│       ├── lib/        # axios, react-query, утиліти
│       ├── types/      # TypeScript-дзеркало Pydantic-схем
│       └── App.tsx
└── shared/         # майбутні спільні артефакти (поки порожньо)

docs/
├── chapter1/       # текст курсової: огляд предметної області
├── chapter2/       # математичний розділ (FAHP + TOPSIS + MC)
├── chapter3/       # опис реалізації СППР
├── appendices/     # додатки А–Ї
├── adr/            # Architecture Decision Records (NNNN-title.md)
├── sources/        # EV Charging.bib + супровідні джерела
├── вступ.md
├── висновки.md
├── zmist_kursovoi.md
├── СТРУКТУРА_КУРСОВОЇ.md            # обов'язково при роботі над текстом
└── ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md   # формат, тире, кутові лапки, лімити обсягу
```

## Правила розробки (код)

- Математична логіка – ТІЛЬКИ в `app/backend/mcdm/`; API-шар лише оркеструє
- `mcdm/` не імпортує `app.api`, `app.services`, `app.db`. Дозволено: numpy, pandas, scipy, pymcdm, typing, stdlib
- Кожна публічна функція `mcdm/` мусить мати юніт-тест з еталонними числами з літератури (BibTeX-ключ із `docs/sources/EV Charging.bib`)
- Реалізація у `mcdm/` пишеться лише після того, як зʼявився падаючий тест із числовим еталоном (red → green → refactor)
- Mock-и в тестах `mcdm/` – заборонені; тільки реальні числові приклади
- Monte Carlo та інші стохастичні методи – через `np.random.default_rng(seed)`, без глобального `np.random`
- Заборонені методи: LSTM, генетичні алгоритми
- Заборонені UI-бібліотеки: jQuery, Bootstrap
- Коміти та коментарі англійською
- У коментарях, докстрингах і повідомленнях комітів заборонені епітети: «Robust», «Production-ready», «Comprehensive», «Elegant», емоджі, маркетинговий тон. Коментарі пояснюють «чому», а не «що»

## Правила роботи з текстом курсової

- Це **курсова**, не магістерська дипломна (МДР). Дотримуватись лімітів обсягу підрозділів і структури з `docs/СТРУКТУРА_КУРСОВОЇ.md`
- Форматування – виключно за `docs/ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md`
- Тире – тільки `–` (U+2013); ніколи `—` чи `-` як тире
- Лапки – «кутові»: `«»`
- У таблицях бінарні характеристики позначати словами «Так»/«Ні», а не «+»/«–»; риску «–» лишати лише для відсутніх значень
- Примітки до таблиць не використовувати; потрібні пояснення подавати в описовому тексті до або після таблиці
- Кожен підрозділ (1.1, 1.2, …, 3.2) починається з нової сторінки
- Малюнки у тексті – плейсхолдер `![alt](images/...)` + підпис «Рис. X.Y.», SVG/PNG генерувати окремою сесією
- Розділ 2: PlantUML-код діаграм зберігається ВИКЛЮЧНО у `docs/chapter2/images/sources/*.puml`; у тексті `.md` блоків ```plantuml немає – лише плейсхолдер, підпис «Рис. 2.X.» і HTML-коментар-посилання `<!-- PlantUML-джерело: images/sources/fig_2_X_назва.puml -->`. Правки діаграм вносити у `.puml`-файл
- Усі цитування – через BibTeX-ключі з `docs/sources/EV Charging.bib`; нові джерела додавати туди ж

## Робота через Claude Code

- Нетривіальні задачі у `mcdm/` або зміни архітектури – спочатку plan mode, погодити підхід, потім код
- Локальні скіли в `.claude/skills/engineering-*` – викликати без префікса плагіна:
  - **`engineering-code-review`** – перед мержем у `master`
  - **`engineering-testing-strategy`** – перед написанням нових тестів (особливо у `mcdm/`)
  - **`engineering-architecture`** – для ADR у `docs/adr/NNNN-назва.md`
  - **`engineering-debug`** – для діагностики (типові баги math-ядра, PostGIS, CORS вже в скілі)
  - **`engineering-documentation`** – для README, docstrings у `mcdm/`, OpenAPI описів; **не** для тексту курсової
  - **`engineering-system-design`** – перед новою фічею (API endpoint, нова таблиця БД, мапа)
- У відповіді про завершення задачі завжди вказувати: які тести запускалися та їх результат, чи проходить `ruff` і `mypy --strict mcdm/`, чи піднімається `uvicorn` / `vite`

## Доступні агенти проекту (`.claude/agents/`)

Кастомні subagent-и з ізольованим контекстом — викликати через Agent-tool з `subagent_type: "<name>"` коли задача чітко відповідає скоупу. На відміну від скілів, агенти отримують власний контекст і обмежений набір інструментів — корисно для повторюваних спеціалізованих задач без захаращення основного контексту.

| Агент | Коли викликати | Tools |
|---|---|---|
| **`mcdm-verifier`** | Перед мержем будь-яких змін у `app/backend/mcdm/`, після нової функції; «перевір mcdm», «verify topsis», «звір з master.md». Знає еталонні C* і p_i(k) | Read, Bash, Grep, Glob (без Edit) |
| **`coursework-editor`** | Робота з текстом курсової у `docs/chapter*/`, `build/master.md`; «відредагуй розділ», «перевір форматування», «забери епітети» | Read, Edit, Write, Grep, Glob, Bash |
| **`devops`** | Docker, docker-compose, Alembic, Vercel/Railway/Supabase, healthchecks; «налаштувати docker», «deploy», «CI failing», «PostGIS migration» | Read, Edit, Write, Bash, Grep, Glob |
| **`frontend`** | Розробка React+TS у `app/frontend/`; «додати компонент», «MapLibre», «AHPMatrix», «Tailwind», «Zustand» | Read, Edit, Write, Bash, Grep, Glob |
| **`tester`** | Створення pytest/vitest, TDD у `mcdm/`, integration tests API; «написати тести», «test plan», «перед реалізацією функції» | Read, Write, Edit, Bash, Grep, Glob |
| **`debugger`** | Систематична діагностика (Reproduce → Isolate → Diagnose → Fix) з каталогом типових багів проекту: TOPSIS NaN, CR не сходиться, SRID mismatch, CORS, Vite HMR | Read, Bash, Grep, Glob, Edit |

Правила вибору агент vs скіл:
- **Скіл `engineering-code-review`** — швидкий чек-лист у поточному контексті
- **Агент `mcdm-verifier`** — повна верифікація з запуском тестів і звіркою з еталонними числами (ізольований контекст)
- **Скіл `engineering-debug`** — інструкція для діагностики у поточному контексті
- **Агент `debugger`** — глибока діагностика з власним контекстом, коли проблема не очевидна
- **Агент `coursework-editor`** — для будь-якої роботи з текстом курсової (замість прямого редагування)

## Тести та перевірка якості

```bash
# Універсально через Makefile
make test              # pytest -v
make lint              # ruff check
make typecheck         # mypy mcdm/ --strict
make all               # lint + typecheck + test

# Або напряму
cd app/backend
pytest mcdm/tests/ -v                       # тести math-ядра
pytest tests/ -v                            # integration tests API
pytest --cov=mcdm --cov-branch              # покриття math-ядра
ruff check .                                # лінтер (E, F, I, N, UP, ANN, B)
mypy mcdm/ --strict                         # type checking math-ядра
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
- `docs/chapter2-fahp` – зміни у тексті курсової
- `docs(adr)/0001-mcdm-methods` – нові ADR

**Merge в master – лише після трьох умов:**
1. Всі тести проходять (`make all` зелений)
2. Зміни верифіковані (uvicorn / vite піднімаються, API відповідає)
3. Явний дозвіл користувача: «можна мерджити» або «merge»

Ніколи не мерджити мовчки. Ніколи не комітити в master напряму.

## Формат комітів (Conventional Commits + scope)

Монорепо – кожен коміт позначає область змін:

| Scope | Коли використовувати |
|---|---|
| `feat(mcdm)` | `app/backend/mcdm/` – математичне ядро |
| `feat(backend)` | `app/backend/` поза mcdm/ – API, DB, schemas, services |
| `feat(frontend)` | `app/frontend/` |
| `feat(infra)` | docker-compose, Dockerfile, Makefile, CI, .env |
| `test(mcdm)` | тести math-ядра |
| `docs(chapter1/2/3)` | текст курсової |
| `docs(adr)` | Architecture Decision Records |
| `fix(...)` / `chore(...)` | аналогічно зі своїм scope |

Приклади:

```
feat(mcdm): implement topsis with vector normalization
test(mcdm): add reference test for fahp from Chang 1996
feat(frontend): MapLibre map component with markers
fix(backend): CORS for localhost:5173
chore(infra): healthcheck for docker-compose
docs(adr): ADR-0002 use pymcdm vs custom implementation
docs(chapter2): підрозділ 2.3.1 – формулювання задачі TOPSIS
```

## Технологічний стек

Backend: Python 3.11+, FastAPI, pydantic-settings, SQLAlchemy 2 (async), GeoAlchemy2, asyncpg, Alembic
Math: pymcdm 1.1+, numpy 1.26+, pandas 2.2+, scipy 1.13+
Frontend: React 18, TypeScript 5, Vite 5, MapLibre GL 4, react-map-gl, Tailwind CSS, Zustand, TanStack Query, axios, react-router-dom
БД: PostgreSQL 16 + PostGIS (Supabase у проді, Docker локально)
Tooling: ruff, mypy --strict, pytest + pytest-asyncio, httpx, pre-commit, ESLint, Prettier

## Поточний стан проєкту (станом на 2026-05-19)

- `mcdm/`: 4 модулі (fahp.py, topsis.py, monte_carlo.py, normalize.py) реалізовано, 11 юніт-тестів зелені
- `db/`: 8 ORM-моделей (Profile, Criterion, PairwiseMatrixEntry, Location, ExistingStation, EvaluationRun, RankingItem, SensitivityRecord), Alembic-міграція 0001 з PostGIS, seed для 2/10/12. Деталі — `app/backend/db/README.md`
- `api/`, `schemas/`, `services/`: порожні (тільки `__init__.py`); наступні етапи roadmap
- Тести: 26 passed (11 mcdm + 11 db_models + 4 seed); інтеграційні через testcontainers PostGIS
- `frontend/`: скелет (App, pages, features, components, lib, types)
- Текст курсової: chapter1 (1.1.1–1.1.5, 1.2.1–1.2.7, 1.3), chapter2 (2.1–2.3), chapter3 (3.1–3.2), вступ, висновки, Додаток Ж
- ADR: каталог `docs/adr/` ще не створено; перший ADR – через `engineering-architecture`
