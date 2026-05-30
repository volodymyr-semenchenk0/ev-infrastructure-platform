---
name: engineering-debug
description: Structured debugging for the EV-charging DSS project. Trigger with an error message, stack trace, "test passes locally but not in CI", "TOPSIS returns NaN", "FAHP weights don't sum to 1", "CORS error", "PostGIS SRID mismatch", or when behavior diverges from expected and the cause isn't obvious.
argument-hint: "<error message, stack trace, or problem description>"
---

# /engineering-debug

Структуроване налагодження для проєкту СППР. Цінність цього скіла — **проєктний каталог типових багів** цього стеку (нижче). Загальна методологія **Reproduce → Isolate → Diagnose → Fix** — у симлінк-скілі `systematic-debugging` (зовнішній; не редагувати); тут лише проєктна дельта до неї:

– **Isolate за шарами:** `mcdm/` → `api/`/`services/` → `schemas/` → `db/` (PostGIS) → `frontend/`. Якщо юніт-тести `mcdm/` валяться — проблема нижча за стек, не лізти у вищі шари, спершу зелене math-ядро.
– **Контекст:** гілка, останній коміт, версії залежностей (`pip freeze | grep pymcdm`, `npm list maplibre-gl`); чи відтворюється на свіжому стані (`docker compose down -v && up --build`).
– **Diagnose:** для math-багів — покрокове виконання (`pytest -x --pdb`); для PostGIS — та сама геометрія у `psql` через `ST_AsText(geom)`.
– **Fix:** баг у `mcdm/` — спершу регресійний тест із реальним числом, що ловить саме цей дефект, потім фікс.

## Каталог типових багів проєкту

### A. Математичне ядро `mcdm/`

#### A1. TOPSIS повертає NaN

**Симптом:** `score` у відповіді API – `null` або `NaN`.
**Найімовірніша причина:** ділення на 0 у векторній нормалізації, коли стовпець містить тільки нулі або одне ненульове значення з протилежним знаком.
**Діагностика:**
```python
norms = np.linalg.norm(matrix, axis=0)
print(np.where(norms == 0)[0])  # індекси стовпців-винуватців
```
**Фікс:** додати перевірку у `mcdm/normalize.py` – якщо `norm == 0`, raise `ValueError("Column N has zero norm")`. Це краще ніж тихо повертати NaN.

#### A2. FAHP ваги не сумують до 1

**Симптом:** `weights.sum() = 0.9876` замість `1.0`.
**Найімовірніша причина:** забуто фінальну нормалізацію ваг у `fahp.py` (після центроїдної дефазифікації Buckley вектор треба поділити на свою суму).
**Діагностика:** звірити нормалізацію в кінці `fahp.py` — чи стоїть `weights / weights.sum()`.
**Фікс:** додати нормалізацію + тест `assert abs(weights.sum() - 1.0) < 1e-9`.

#### A3. CR (consistency ratio) від'ємний або > 1

**Симптом:** Warning «CR is out of expected range».
**Найімовірніша причина:** Для маленької матриці (n=2) RI = 0 – ділення на 0. Або неправильна таблиця Random Index.
**Фікс:** Saaty 1977 RI: n=1→0, n=2→0, n=3→0.58, n=4→0.90, n=5→1.12, n=6→1.24, n=7→1.32, n=8→1.41, n=9→1.45, n=10→1.49. Для n≤2 CR не визначений – повертати `None` або 0.

#### A4. Monte Carlo дає різні результати при тому самому seed

**Симптом:** Два запуски `monte_carlo(seed=42)` дають різні відповіді.
**Найімовірніша причина:** Десь у коді використано глобальний `np.random` (`np.random.rand()`) замість `rng.random()`.
**Діагностика:**
```bash
grep -rn "np.random\." app/backend/mcdm/ | grep -v "default_rng\|Generator"
```
**Фікс:** замінити всі глобальні виклики на `rng = np.random.default_rng(seed); rng.random(...)`.

#### A5. Тест проходить локально, падає у CI

**Найімовірніші причини:** різні версії numpy / pymcdm, різна локалізація (кома vs крапка), плаваюча точка на різних платформах.
**Фікс:**
– У тестах – `np.testing.assert_allclose(..., atol=1e-4)` замість `==`.
– Зафіксувати версії у `pyproject.toml` (`numpy>=1.26,<2.0`).

### B. PostGIS / Geo

#### B1. SRID mismatch

**Симптом:** `ERROR: Operation on mixed SRID geometries`.
**Найімовірніша причина:** одна геометрія у `EPSG:4326` (WGS84, градуси), інша – у `EPSG:3857` (Web Mercator, метри).
**Фікс:**
– Зберігати все у `EPSG:4326`.
– Для розрахунків відстаней у метрах – `ST_DWithin(geom::geography, ...)` або `ST_Transform(geom, 3857)`.
– У GeoAlchemy2 явно вказувати SRID: `Geometry("POINT", srid=4326)`.

#### B2. ST_DWithin повертає не те, що очікувалось

**Симптом:** Точка за 100 м від іншої не знаходиться при радіусі 200.
**Причина:** `ST_DWithin(geom, geom, 200)` для `geometry` рахує у одиницях SRID (для 4326 – градуси, не метри!).
**Фікс:** `ST_DWithin(geom::geography, geom::geography, 200)` – тоді 200 метрів. Або `ST_Transform → 3857`.

### C. API / FastAPI

#### C1. CORS error

**Симптом:** Browser console: «Access to fetch ... has been blocked by CORS policy».
**Фікс:** `app/backend/main.py` – `CORSMiddleware` з `allow_origins=["http://localhost:5173"]`. Перевірити що `.env` містить правильний `CORS_ORIGINS`.

#### C2. Pydantic schema ≠ TypeScript type

**Симптом:** Поле є у відповіді API, але TypeScript не бачить.
**Фікс:** Після кожної зміни `app/backend/schemas/*.py` синхронізувати `app/frontend/src/types/*.ts` вручну. (Автогенерація через `openapi-typescript` – опціонально, додати ADR.)

#### C3. 422 Unprocessable Entity без зрозумілого повідомлення

**Фікс:** Подивитись `response.json()["detail"]` – там список помилок по полях.

### D. Frontend

#### D1. MapLibre не показує маркери

– Перевірити що `mapStyle` завантажується (Network tab).
– Перевірити SRID точок – MapLibre очікує `[lng, lat]` у `EPSG:4326`, не `[lat, lng]`.
– `<Source>` має правильний `type="geojson"`.

#### D2. Zustand store оновлюється, але компонент не перерендериться

**Причина:** селектор повертає новий обʼєкт щоразу. `useStore((s) => ({ x: s.x }))` створює новий обʼєкт кожний рендер.
**Фікс:** `useStore((s) => s.x)` для одного поля, або `useShallow` з `zustand/shallow`.

## Формат звіту

```markdown
## Debug Report: <короткий опис>

### Reproduction
- Очікувано: …
- Реально: …
- Кроки: …

### Hypothesis chain
1. … (відкинуто, бо …)
2. … (відкинуто, бо …)
3. … (підтверджено: <доказ>)

### Root cause
<пояснення>

### Fix
<код / конфіг>

### Prevention
- Тест: `app/backend/mcdm/tests/test_<…>.py::test_<…>`
- Або інваріант у коді: assert/raise
```

## Поради

1. **Не міняти 5 речей одночасно.** Одна гіпотеза – одна зміна.
2. **Для math-багів – `pytest -x --pdb`** і покрокове виконання.
3. **Для PostGIS – `psql` напряму** з `ST_AsText` для геометрії.
4. **Для CI-багів – локально відтворити Docker-середовище**: `docker compose run --rm api pytest`.
