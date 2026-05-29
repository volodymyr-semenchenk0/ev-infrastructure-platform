# `db/` — persistence layer

Логічна схема БД, ORM-моделі, Alembic-міграції та seed довідкових даних для EV-charging DSS. Відповідає підрозділу 2.2.2 курсової (8 таблиць у 3НФ з PostGIS-розширенням).

## Структура

```
db/
├── base.py                      # SQLAlchemy DeclarativeBase
├── session.py                   # async engine + AsyncSessionLocal + get_db()
├── models/
│   ├── __init__.py              # реекспорт усіх ORM-класів
│   ├── profile.py               # Profile, Criterion, PairwiseMatrixEntry
│   ├── location.py              # Location, ExistingStation (Geometry POINT 4326)
│   └── evaluation.py            # EvaluationRun, RankingItem, SensitivityRecord
├── migrations/
│   ├── env.py                   # Alembic env з фільтрами PostGIS-системних таблиць
│   └── versions/
│       └── 209b1504f634_initial_schema.py
├── seed.py                      # seed_reference_data(session) – 2 профілі / 9 критеріїв
└── seed_cli.py                  # python -m db.seed_cli
```

## Схема (відповідність специфікації 2.2.2)

| Таблиця | PK | Ключові поля | Індекси |
|---|---|---|---|
| `profiles` | id | code UNIQUE VARCHAR(16) | B-tree(code) |
| `criteria` | id | code UNIQUE VARCHAR(32), optimization_type CHECK IN ('max','min') | B-tree(code) |
| `pairwise_matrices` | (profile_id, criterion_i_id, criterion_j_id) | l, m, u NUMERIC(6,3) | B-tree(profile_id) |
| `locations` | id | name, address, district, geom GEOMETRY(POINT, 4326) | GiST(geom), B-tree(district) |
| `existing_stations` | id | power_kw NUMERIC(6,2), connector_type, geom | GiST(geom) |
| `evaluation_runs` | id | profile_id FK, created_at, status, weights_vector JSON | B-tree(profile_id) |
| `ranking_items` | (evaluation_id, location_id) | rank SMALLINT, closeness_coefficient, distances NUMERIC(8,6); CHECK rank≥1, C∈[0,1], S±≥0 | B-tree(evaluation_id) |
| `sensitivity_records` | evaluation_id (PK=FK, ON DELETE CASCADE) | iterations, perturbation, JSON-поля | – |

## Передумови

- Docker з образом `postgis/postgis:16-3.4`
- Python venv: `app/backend/.venv` (створюється через `make install`)
- Залежності: SQLAlchemy 2.0 (async), GeoAlchemy2 ≥0.15, asyncpg, alembic, psycopg2-binary (для Alembic sync API), testcontainers[postgres] (для тестів)

## Робочі сценарії

### Локальна розробка з docker compose

```bash
make db-up          # docker compose up -d db
make migrate        # alembic upgrade head
make seed           # python -m db.seed_cli → 2 профілі / 9 критеріїв

# Перевірка (локації додаються через API або окремий скрипт)
docker exec ev-charging-dss-db-1 psql -U postgres -d ev_charging \
  -c "SELECT count(*) FROM locations"
```

DATABASE_URL для роботи поза контейнером:

```bash
export DATABASE_URL='postgresql+asyncpg://postgres:postgres@localhost:5432/ev_charging'
```

### Створення нової міграції

```bash
# 1. Внести зміни в db/models/*.py
# 2. Згенерувати міграцію
DATABASE_URL='postgresql+asyncpg://postgres:postgres@localhost:5432/ev_charging' \
  app/backend/.venv/bin/alembic revision --autogenerate -m "short_description"

# 3. Перевірити згенерований файл у db/migrations/versions/
#    - GeoAlchemy2-колонки потребують import geoalchemy2 у файлі міграції
#    - GiST-індекси на geom створюються GeoAlchemy2 автоматично (spatial_index=True default)
# 4. Застосувати:
make migrate
```

### Тестування

```bash
make test           # pytest -v
```

Тести у `tests/` піднімають окремий PostGIS-контейнер через `testcontainers` (фікстура `db_session` у `conftest.py`). Це не використовує `docker compose db`, тож обидва середовища ізольовані. Перший запуск стягує `postgis/postgis:16-3.4` (~850 MB), наступні — миттєві (image кешується локально).

## Архітектурні рішення

1. **PostGIS-розширення створюється у міграції 0001**, а не у Docker init-script — це дозволяє тестам з testcontainers працювати без зовнішніх скриптів (фікстура виконує `CREATE EXTENSION IF NOT EXISTS postgis` перед `Base.metadata.create_all`).

2. **GiST-індекси на `geom`-колонках створює GeoAlchemy2 автоматично** через `spatial_index=True` (default для `Geometry`). Не дублюємо їх у `op.execute("CREATE INDEX ...")` — це призводить до `DuplicateTableError`. Назви індексів: `idx_locations_geom`, `idx_existing_stations_geom`.

3. **Alembic-фільтри у `env.py`** (`include_object` + `include_name`) блокують `drop_table` для системних PostGIS-таблиць (Tiger Geocoder, `spatial_ref_sys`, `topology`). Без цього `alembic revision --autogenerate` згенерує сотні `op.drop_table(...)` для геокодер-довідників, що поставляються з `postgis/postgis` Docker-образом.

4. **JSON для `weights_vector`, `stability_matrix`, `confidence_intervals`** замість нормалізованих таблиць — атомарне отримання повного результату одним SELECT (обґрунтовано у 2.2.2 §«семіструктуровані документи»). Тип `sa.JSON` (портативно), не PostgreSQL-only `JSONB`; підняти до JSONB можна окремою міграцією за потреби (повнотекстовий пошук, GIN-індекс).

5. **PostGIS extension не дроп-ається у `downgrade`** — інші БД у тому ж кластері можуть від неї залежати.

6. **Seed — окремо від міграцій**, у `db/seed.py` через INSERT … ON CONFLICT DO NOTHING. Це data migration vs schema migration: schema migrations відтворюються/відкочуються детерміновано, тоді як reference data може еволюціонувати незалежно (нові локації, оновлені одиниці критеріїв).

## Джерела даних seed

- **2 профілі** (Table 3.1 курсової): `municipal`, `investor`
- **9 критеріїв** (Table 3.3): Pop_dens, Traffic, Grid_cap, Dist_sub, Land_cost, Parking, Income, Green, Sat_dist
- **Локації** вносяться через API або окремий скрипт для конкретного аналізу в межах м. Київ
