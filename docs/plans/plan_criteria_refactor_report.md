# Звіт виконання: рефакторинг складу критеріїв (10 → 9)

- **Дата:** 2026-05-29
- **План-джерело:** `docs/plans/plan_criteria_refactor.yaml`
- **Гілка / коміти:** `refactor/criteria-set-9` → `cdfe04a` (refactor) → `453d8d8` (merge у `master`); гілку видалено після мержу
- **Математичне ядро `app/backend/mcdm/`:** не змінювалося

---

## 1. Що зроблено

### 1.1. Склад критеріїв (код і дані)

10 критеріїв → **9**:

| Дія | Критерій | Причина |
|---|---|---|
| Прибрано | `Env_qual` (Екологічна привабливість) | Дублює об'єктивний `Green` (частка зелених зон) |
| Прибрано | `Revenue` (Потенційна рентабельність) | Композит від Traffic + Income + Land_cost → подвійний облік, порушення незалежності переваг |
| Додано | `Sat_dist` (Відстань до найближчої наявної станції) | Критерій насиченості: km, optimization=max, scale=ratio, синтетичний діапазон [0.2, 5.0] |

Підсумковий перелік (порядок за `id`): `Pop_dens, Traffic, Grid_cap, Dist_sub, Land_cost, Parking, Income, Green, Sat_dist`.

### 1.2. Вектори пріоритетів (обидва профілі)

`PAIRWISE_PRIORITIES` у `db/defaults.py` замінено на нові n=9 вектори. Узгодженість перевірено через виробничий шлях (`build_default_pairwise_matrix` + `fahp._consistency_ratio`):

- municipal: **CR = 0.0200**
- investor: **CR = 0.0267**

Обидва ≤ 0.10. Метод агрегації ваг (Чанг) **не** змінювався.

### 1.3. Змінені файли (13)

- `app/backend/db/seed.py` – `CRITERIA`, `CRITERION_RANGES`
- `app/backend/db/defaults.py` – `PAIRWISE_PRIORITIES`, докстрінг матриці
- `app/backend/db/README.md` – перелік і кількість критеріїв
- 9 тест-файлів – `test_seed`, `test_services`, `test_defaults`, `test_api_routes`, `test_api_locations`, `test_api_profiles`, `test_api_evaluations`, `test_api_comparison_export`, `conftest`
- `app/frontend/src/features/workbench/sections/useLoadProfileDefault.ts` – фолбек `?? 10` → `?? 9`

### 1.4. Перевірка (на момент мержу)

| Перевірка | Результат |
|---|---|
| pytest (backend, testcontainers) | 104 passed, 1 skipped, 1 xpassed |
| ruff check | clean |
| mypy --strict mcdm/ | clean (10 файлів) |
| frontend `tsc --noEmit` | clean |
| frontend vitest | 127 passed (24 файли) |
| frontend `vite build` | OK |
| uvicorn | стартує, віддає всі роути |
| матриця обох профілів | 9×9, crisp-діагональ, CR ≤ 0.10 |

### 1.5. Перезбірка Docker-середовища (окремий крок після мержу)

Симптом: UI показував старі 10 критеріїв. Причина подвійна – (1) образи запікають код на етапі build (`COPY . .`, без volume-mount), тож backend крутив старий `defaults.py`; (2) volume `postgres_data` зберігав стару БД із 10 критеріями.

Зроблено:

1. **Перезібрано образи** `backend` і `frontend` (`docker compose up -d --build`).
2. **Міграція БД in-place** (без видалення volume, щоб зберегти дані): видалено `Revenue`/`Env_qual` (+24 `criterion_values`), додано `Sat_dist` (+12 значень для наявних 12 локацій). Збережено 12 локацій і 53 `evaluation_runs`.

Перевірено після перезбірки: `/api/criteria` = 9; `/api/profiles/{id}` = 9×9 для обох профілів; `criterion_values` = 108 (рівно 9 на локацію); frontend `:5173` → HTTP 200.

---

## 2. Що варто врахувати

1. **Нульові ваги FAHP не вирішені.** Рефакторинг складу критеріїв НЕ усуває нулі, які дає метод Чанга – вони залежать від методу агрегації, а не від набору критеріїв. На n=9 Чанг усе одно дасть нулі. Перехід Чанг → Buckley – окрема задача (поза скоупом цього плану).

2. **Чистий reseed dev-БД.** `seed` використовує `INSERT … ON CONFLICT DO NOTHING` + guard на кількість рядків, тож просте повторне сидження НЕ видаляє старі критерії. Важливо: `make db-down` (без `-v`) зберігає volume. Варіанти:
   - повне скидання: `docker compose down -v && docker compose up -d --build && make migrate && make seed` – але це **втрачає локації** (репозиторій не має скрипта сидингу локацій);
   - in-place SQL-міграція (як застосовано тут) – зберігає локації й історію.

3. **План недооцінив перелік тест-файлів (фаза 4).** Реально торкнулися більше файлів, ніж було в плані (зокрема `test_defaults.py`, `test_api_routes.py`, `test_api_locations.py`, `test_api_profiles.py`, `test_api_comparison_export.py`, `conftest.py`). Для подібних рефакторів надалі – шукати за патернами (`== 10`, коди критеріїв, `_identity_pairwise_matrix(10)`, «10 criteria»), а не за наперед заданим списком файлів.

4. **`CLAUDE.md` злегка застарів.** Рядок «Поточний стан проєкту» містить «seed для 2/10/12» – тепер має бути «2/9/12». Не входило в скоуп плану; варто оновити окремо.

5. **Значення `Sat_dist` – синтетичні placeholder.** Зараз згенеровані рівномірно в [0.2, 5.0] км. Реальні відстані – через PostGIS `ST_Distance` / KNN (`<->`) між `Location.geom` та `ExistingStation.geom` (Розділ 3). Наразі `existing_stations` порожня (0 рядків) → реальний `Sat_dist` неможливо порахувати без завантаження наявних станцій Києва.

6. **Старі `evaluation_runs` (53 шт.) збережено.** Пораховані на 10 критеріях; лишаються в БД як історія. Нові обчислення – на 9 критеріях. Перегляд старого запису покаже старий склад ваг.

7. **Docker запікає код у образ.** Будь-яка зміна коду `backend`/`frontend` потребує перезбірки образу – прапорець `--reload` у backend не допомагає, бо файли всередині образу не змінюються. Якщо код міняється часто, варто додати dev volume-mount для HMR замість перезбірки.

8. **Pre-existing / untracked зміни не торкалися.** `docs/sources/EV Charging.bib` (був модифікований ще до сесії), каталог `docs/plans/`, RAND-PDF – лишені користувачу для самостійного коміту.

9. **`chapter3` / Таблиця 3.3 ще не створені.** Писати одразу з 9 критеріями (включно з `Sat_dist`).

10. **Текст курсової (Розділи 1–2) правок не потребував.** Опис системи символьний (n, m); згадки «критеріїв насиченості» у 2.2.1 / 2.2.3 тепер мають критерій-відповідник (`Sat_dist`) – попередню неузгодженість «текст ↔ модель» усунено без редагування тексту.

---

## 3. Команди для відтворення (Docker-частина)

```bash
# 1. Перезбірка образів із новим кодом
docker compose up -d --build backend frontend

# 2. In-place міграція БД (зберігає локації та історію)
docker exec -i ev-charging-dss-db-1 psql -U postgres -d ev_charging -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DELETE FROM criterion_values
 WHERE criterion_id IN (SELECT id FROM criteria WHERE code IN ('Revenue','Env_qual'));
DELETE FROM criteria WHERE code IN ('Revenue','Env_qual');
INSERT INTO criteria (code, name, unit, optimization_type, scale)
VALUES ('Sat_dist', 'Відстань до найближчої наявної станції', 'km', 'max', 'ratio')
ON CONFLICT (code) DO NOTHING;
INSERT INTO criterion_values (location_id, criterion_id, value)
SELECT l.id, c.id, round((0.2 + random() * 4.8)::numeric, 4)
  FROM locations l CROSS JOIN criteria c
 WHERE c.code = 'Sat_dist'
   AND NOT EXISTS (SELECT 1 FROM criterion_values cv
                    WHERE cv.location_id = l.id AND cv.criterion_id = c.id);
COMMIT;
SQL

# 3. Після цього – hard-refresh вкладки на http://localhost:5173 (Cmd+Shift+R)
```
