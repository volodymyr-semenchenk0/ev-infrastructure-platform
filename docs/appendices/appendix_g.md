## ДОДАТОК Г

### Повний опис атрибутів таблиць бази даних

Таблиця Г.1. – Опис атрибутів таблиці `profiles`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `id` | INTEGER | NOT NULL, PK | Унікальний внутрішній ідентифікатор профілю |
| `code` | VARCHAR(16) | NOT NULL, UNIQUE | Машинний код профілю (`municipal`, `investor`) |
| `name` | VARCHAR(128) | NOT NULL | Повна назва профілю ОПР |
| `description` | TEXT | NULL | Текстовий опис специфіки профілю |

Таблиця Г.2. – Опис атрибутів таблиці `criteria`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `id` | INTEGER | NOT NULL, PK | Унікальний внутрішній ідентифікатор критерію |
| `code` | VARCHAR(32) | NOT NULL, UNIQUE | Машинний код критерію (наприклад, `POP_DENS`, `TRAFFIC`) |
| `name` | VARCHAR(128) | NOT NULL | Повна назва критерію |
| `unit` | VARCHAR(32) | NULL | Одиниця вимірювання значення критерію |
| `optimization_type` | VARCHAR(4) | NOT NULL, CHECK у `{'max', 'min'}` | Тип оптимізації: максимізація або мінімізація |
| `scale` | VARCHAR(16) | NOT NULL | Тип шкали вимірювання критерію |

Таблиця Г.3. – Опис атрибутів таблиці `pairwise_matrices`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `profile_id` | INTEGER | NOT NULL, PK, FK | Посилання на профіль ОПР, для якого зафіксовано судження |
| `criterion_i` | INTEGER | NOT NULL, PK, FK | Індекс критерію-рядка матриці попарних порівнянь |
| `criterion_j` | INTEGER | NOT NULL, PK, FK | Індекс критерію-стовпця матриці попарних порівнянь |
| `l` | NUMERIC(6,3) | NOT NULL, CHECK (`l > 0`) | Нижня межа трикутного нечіткого числа $(l_{ij}, m_{ij}, u_{ij})$ |
| `m` | NUMERIC(6,3) | NOT NULL, CHECK (`m ≥ l`) | Модальне значення трикутного нечіткого числа |
| `u` | NUMERIC(6,3) | NOT NULL, CHECK (`u ≥ m`) | Верхня межа трикутного нечіткого числа |

Таблиця Г.4. – Опис атрибутів таблиці `locations`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `id` | INTEGER | NOT NULL, PK | Унікальний внутрішній ідентифікатор локації-кандидата |
| `name` | VARCHAR(128) | NOT NULL | Стисла назва або топонім локації |
| `address` | VARCHAR(256) | NULL | Повна поштова адреса |
| `district` | VARCHAR(64) | NOT NULL | Адміністративний район м. Київ |
| `geom` | GEOMETRY(Point, 4326) | NOT NULL | Геометрія розташування у системі координат WGS-84; індексується GiST |

Таблиця Г.5. – Опис атрибутів таблиці `existing_stations`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `id` | INTEGER | NOT NULL, PK | Унікальний внутрішній ідентифікатор наявної станції |
| `name` | VARCHAR(128) | NOT NULL | Назва або ідентифікатор зарядної станції |
| `power_kw` | NUMERIC(6,2) | NULL | Потужність зарядки у кіловатах |
| `connector_type` | VARCHAR(32) | NULL | Тип роз'єму (наприклад, CCS, CHAdeMO, Type 2) |
| `geom` | GEOMETRY(Point, 4326) | NOT NULL | Геометрія розташування у системі координат WGS-84; індексується GiST |

Таблиця Г.6. – Опис атрибутів таблиці `evaluation_runs`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `id` | INTEGER | NOT NULL, PK | Ідентифікатор обчислювального сеансу |
| `profile_id` | INTEGER | NOT NULL, FK | Профіль ОПР, що використовувався у сеансі |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | Момент створення запису |
| `status` | VARCHAR(16) | NOT NULL, CHECK у `{'completed', 'failed'}` | Стан виконання обчислювального сеансу |
| `weights_vector` | JSON-документ | NOT NULL | Обчислений вектор ваг $W$ у вигляді ключ–значення (результат FAHP) |
| `execution_time_ms` | INTEGER | NOT NULL, CHECK (`> 0`) | Виміряна тривалість обчислення у мілісекундах |

Таблиця Г.7. – Опис атрибутів таблиці `ranking_items`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `evaluation_id` | INTEGER | NOT NULL, PK, FK | Посилання на обчислювальний сеанс |
| `location_id` | INTEGER | NOT NULL, PK, FK | Посилання на локацію-кандидата |
| `rank` | SMALLINT | NOT NULL, CHECK (`≥ 1`) | Порядкове місце локації у ранжуванні |
| `closeness_coefficient` | NUMERIC(8,6) | NOT NULL, CHECK у `[0, 1]` | Коефіцієнт близькості $C_i^*$ за (1.14) |
| `distance_to_positive` | NUMERIC(8,6) | NOT NULL, CHECK (`≥ 0`) | Відстань до ідеального рішення $S_i^+$ за (1.13) |
| `distance_to_negative` | NUMERIC(8,6) | NOT NULL, CHECK (`≥ 0`) | Відстань до анти-ідеального рішення $S_i^-$ за (1.13) |

Таблиця Г.8. – Опис атрибутів таблиці `sensitivity_records`

| Атрибут | Тип даних | Обмеження | Семантичне призначення |
|---|---|---|---|
| `evaluation_id` | INTEGER | NOT NULL, PK, FK, ON DELETE CASCADE | Ідентифікатор сеансу, до якого належить запис чутливості |
| `iterations` | INTEGER | NOT NULL, CHECK (`> 0`) | Кількість ітерацій Монте-Карло ($N = 10\,000$) |
| `perturbation` | NUMERIC(4,3) | NOT NULL, CHECK (`> 0`) | Параметр збурення $\delta = 0{,}15$ рівномірного розподілу $U(-\delta, +\delta)$ |
| `stability_matrix` | JSON-документ | NOT NULL | Матриця частот влучання у top-$k$: $p_i(k)$ для $k = 1, \ldots, K_{\max}$, $K_{\max} = 5$ |
| `confidence_intervals` | JSON-документ | NOT NULL | Percentile bootstrap довірчі інтервали для $C_i^*$ топ-3 локацій |
