# СППР – Вибір локацій EV-зарядних станцій, Київ

Курсова робота з дисципліни «Системний аналіз», спеціальність 124, магістратура ЧНУ.
Дедлайн – червень 2026. Математичний апарат (FAHP + TOPSIS + Монте-Карло) – підрозділ 1.2 Розділу 1, 50/100 балів.

## Запуск локально

Через `make` (рекомендовано):

```bash
make install          # pip + npm + pre-commit
make install-skills   # локальні скіли (.claude/skills) через npx skills
make dev-backend      # uvicorn :8000
make dev-frontend     # vite :5173
make db-up            # PostgreSQL + PostGIS у Docker
make migrate          # Alembic upgrade head
make seed             # довідкові дані (профілі, критерії, матриця)
make all              # lint + typecheck + test (бекенд і фронтенд)
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
│   ├── mcdm/       # ❗ математичне ядро – ізольований пакет (FAHP, TOPSIS, Монте-Карло, нормалізація)
│   │   └── tests/  # юніт-тести з еталонними числами з літератури
│   ├── api/        # FastAPI роутери – лише оркестрація, не математика
│   ├── core/       # pydantic-settings, конфігурація
│   ├── db/         # SQLAlchemy 2 async + GeoAlchemy2: models/ (ORM), migrations/ (Alembic), seed, defaults, session
│   ├── schemas/    # Pydantic DTO
│   ├── services/   # бізнес-логіка (оркестрація mcdm + db)
│   ├── tests/      # integration tests API (httpx + TestClient)
│   ├── main.py     # точка входу FastAPI
│   └── pyproject.toml
└── frontend/       # React + TS + Vite
    └── src/
        ├── features/   # фічі за доменом (форма, карта, результати, порівняння, чутливість, експорт, workbench)
        ├── components/ # переюзовні UI (layout, ui)
        ├── store/      # Zustand-стори
        ├── pages/      # маршрути
        ├── lib/        # axios, react-query, утиліти
        └── types/      # TypeScript-дзеркало Pydantic-схем

docs/
├── chapter1/       # теоретичний аналіз проблеми + математичний апарат (FAHP, TOPSIS, MC) у 1.2
├── chapter2/       # проектування системи (структура, БД, алгоритми); діаграми – images/sources/*.puml
├── appendices/     # додатки
├── sources/        # EV Charging.bib + супровідні джерела (files/)
├── plans/          # робочі плани рефакторингів
├── вступ.md
├── СТРУКТУРА_КУРСОВОЇ.md            # обов'язково при роботі над текстом
├── ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md   # формат, тире, кутові лапки, лімити обсягу
├── ІНСТРУКЦІЇ_ДІАГРАМ.md            # правила діаграм Розділу 2
└── DEPLOYMENT.md                   # розгортання
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
- Уся типографіка й оформлення (шрифт, поля, таблиці, рисунки, формули, списки, цитування, додатки) – **виключно** за `docs/ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md`; перед роботою з текстом застосовувати скіл `coursework-formatting`, що маршрутизує до потрібного підрозділу вимог. Конкретні правила тут не дублюються, щоб не протухали окремо від джерела
- Типографічні guardrail-и, які порушуються найчастіше: тире – тільки `–` (U+2013), ніколи `—` чи `-`; лапки – «кутові»
- У таблицях бінарні характеристики позначати словами «Так»/«Ні», а не «+»/«–»
- Примітки до таблиць не використовувати; потрібні пояснення подавати в описовому тексті до або після таблиці
- Кожен підрозділ (1.1, 1.2, …, 3.2) починається з нової сторінки
- Стик «заголовок підрозділу → заголовок першого пункту» допускається; вступний абзац між ними не є обов'язковим
- Канонічна назва задачі системи – «вибір локацій зарядних станцій»; уживати послідовно. «Розміщення зарядних станцій» допустиме лише як назва предметної задачі в тексті, не як назва системи
- Прив'язка заголовків і підписів до теми: назва розділу (`#`) та підрозділи 1.1, 1.2, 2.1, 2.3 (`##`) – повна «...вибору локацій зарядних станцій»; пункти (`###`) про власний артефакт системи – короткий маркер «...системи»; пункти про сталий метод (FAHP, TOPSIS, Монте-Карло) – назва методу без прив'язки. Підписи рисунків/таблиць: власні артефакти – повна назва, сталі методи – без прив'язки
- Метод FAHP: при першій згадці – «Fuzzy AHP (FAHP)», далі скрізь – «FAHP»
- Малюнки у тексті – плейсхолдер `![alt](images/...)` + підпис «Рис. X.Y.», SVG/PNG генерувати окремою сесією
- Розділ 2: PlantUML-код діаграм зберігається ВИКЛЮЧНО у `docs/chapter2/images/sources/*.puml`; у тексті `.md` блоків ```plantuml немає – лише плейсхолдер, підпис «Рис. 2.X.» і HTML-коментар-посилання `<!-- PlantUML-джерело: images/sources/fig_2_X_назва.puml -->`. Правки діаграм вносити у `.puml`-файл
- Усі цитування – через BibTeX-ключі з `docs/sources/EV Charging.bib`; нові джерела додавати туди ж
- Менше «:» і «;» у тексті роботи – формулювати природніше; де потрібен чіткий перелік – маркерований або нумерований список

## Робота через Claude Code

- Нетривіальні задачі у `mcdm/` або зміни архітектури – спочатку plan mode, погодити підхід, потім код
- Інструкції агентів і скілів посилаються на джерело істини (тест, `docs/sources/EV Charging.bib`, текст Розділу 3), а не дублюють у собі числа, bib-ключі чи номери рядків – будь-яка скопійована величина протухає й нікого не сповіщає
- Локальні скіли в `.claude/skills/engineering-*` – викликати без префікса плагіна:
  - **`engineering-code-review`** – перед мержем у `master`
  - **`engineering-testing-strategy`** – перед написанням нових тестів (особливо у `mcdm/`)
  - **`engineering-architecture`** – для ADR у `docs/adr/NNNN-назва.md`
  - **`engineering-debug`** – для діагностики (типові баги math-ядра, PostGIS, CORS вже в скілі)
  - **`engineering-documentation`** – для README, docstrings у `mcdm/`, OpenAPI описів; **не** для тексту курсової
  - **`engineering-system-design`** – перед новою фічею (API endpoint, нова таблиця БД, мапа)
- Скіли тексту курсової в `.claude/skills/`: **`coursework-formatting`** (форматування за вимогами) і **`coursework-docx-build`** (збірка `.docx`)
- Інші встановлені скіли (`make install-skills`): робочий процес (`brainstorming`, `test-driven-development`, `systematic-debugging`, `executing-plans`, `verification-before-completion`, `finishing-a-development-branch`, `dispatching-parallel-agents`) і фронтенд (`frontend-design`, `webapp-testing`)
- У відповіді про завершення задачі завжди вказувати: які тести запускалися та їх результат, чи проходить `ruff` і `mypy --strict mcdm/`, чи піднімається `uvicorn` / `vite`

## Доступні агенти проекту (`.claude/agents/`)

Кастомні subagent-и з ізольованим контекстом — викликати через Agent-tool з `subagent_type: "<name>"` коли задача чітко відповідає скоупу. На відміну від скілів, агенти отримують власний контекст і обмежений набір інструментів — корисно для повторюваних спеціалізованих задач без захаращення основного контексту.

| Агент | Коли викликати | Tools |
|---|---|---|
| **`mcdm-verifier`** | Перед мержем будь-яких змін у `app/backend/mcdm/`, після нової функції; «перевір mcdm», «verify topsis», «verify fahp». Верифікує прогоном тестів і перевіркою математичних інваріантів | Read, Bash, Grep, Glob (без Edit) |
| **`coursework-editor`** | Робота з текстом курсової у `docs/chapter*/`; «відредагуй розділ», «перевір форматування», «забери епітети» | Read, Edit, Write, Grep, Glob, Bash |
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
make test              # pytest -v (бекенд)
make lint              # ruff check
make typecheck         # mypy mcdm/ --strict
make all               # lint + typecheck + test (бекенд і фронтенд)

# Фронтенд
make frontend-test     # vitest
make frontend-lint     # ESLint
make frontend-typecheck # tsc
make frontend-e2e      # Playwright e2e

# Або напряму
cd app/backend
pytest mcdm/tests/ -v                       # тести math-ядра
pytest tests/ -v                            # integration tests API
pytest --cov=mcdm --cov-branch              # покриття math-ядра
ruff check .                                # лінтер (E, F, I, N, UP, ANN, B)
mypy mcdm/ --strict                         # type checking math-ядра
```

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
test(mcdm): add reference test for fahp from Buckley 1985
feat(frontend): MapLibre map component with markers
fix(backend): CORS for localhost:5173
chore(infra): healthcheck for docker-compose
docs(adr): ADR-0002 use pymcdm vs custom implementation
docs(chapter2): підрозділ 2.3.2 – алгоритм TOPSIS
```

## Технологічний стек

Backend: Python 3.11+, FastAPI, pydantic-settings, SQLAlchemy 2 (async), GeoAlchemy2, asyncpg, Alembic
Math: pymcdm 1.1+, numpy 1.26+, pandas 2.2+, scipy 1.13+
Frontend: React 18, TypeScript 5, Vite 5, MapLibre GL 4, react-map-gl, Tailwind CSS, Zustand, TanStack Query, axios, react-router-dom
БД: PostgreSQL 16 + PostGIS (Supabase у проді, Docker локально)
Tooling: ruff, mypy --strict, pytest + pytest-asyncio, httpx, pre-commit, ESLint, Prettier

## Орієнтація в проєкті (де що шукати)

- Математика – формули й алгоритми FAHP, TOPSIS, чутливості та Монте-Карло в `app/backend/mcdm/`; еталонні числові тести – `app/backend/mcdm/tests/`. FAHP реалізовано методом Buckley (геометричне середнє + центроїд)
- Оркестрація – `app/backend/api` (роутери), `services` (бізнес-логіка), `schemas` (DTO); жодної математики поза `mcdm/`
- Дані – `app/backend/db`: ORM-моделі в `db/models/`, міграції в `db/migrations/`, довідкові дані – `db/seed.py` + `db/defaults.py`; опис логічної схеми – `db/README.md`
- Веб-інтерфейс – `app/frontend/src/` (фічі, Zustand-стори, UI-компоненти, e2e-тести)
- Текст курсової – `docs/chapter1` (теоретичний аналіз + математичний апарат у 1.2), `docs/chapter2` (проектування системи); Розділ 3 (експеримент) ще не створено
- Структура й вимоги до тексту – `docs/СТРУКТУРА_КУРСОВОЇ.md` і `docs/ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md` (звірятися обов'язково при роботі з текстом)
- Діаграми Розділу 2 – правила оформлення і промпти в `docs/ІНСТРУКЦІЇ_ДІАГРАМ.md`; PlantUML-джерела в `docs/chapter2/images/sources/*.puml`
- ADR – каталог `docs/adr/` (наприклад `0002-chang-to-buckley-fahp.md`); нові ADR – через `engineering-architecture`
- При зміні структури проєкту чи будь-яких змінах, що зачіпають описане в `CLAUDE.md` (дерево каталогів, скіли, агенти, команди, орієнтири), у тій самій задачі оновлювати й `CLAUDE.md`, щоб він не розходився з реальним станом
