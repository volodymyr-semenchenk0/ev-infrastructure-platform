---
name: engineering-system-design
description: Design new components or features for the EV-charging DSS — API endpoints, DB schema additions, frontend features, mcdm/ extensions. Trigger with "design", "як спроєктувати", "what's the right architecture for this feature". Produces a structured plan with API contract, data model, test stubs, and decides whether an ADR is needed.
argument-hint: "<фіча або компонент>"
---

# /engineering-system-design

Проєктування нових компонентів СППР. На відміну від `engineering-architecture` (що фіксує одне рішення), цей скіл планує **повну фічу** наскрізь: API → схема БД → математика → фронтенд → тести.

## Карта залежностей у проєкті

```
Frontend (React + Zustand)
    │ HTTP / JSON
    ▼
FastAPI router (app/backend/api/)
    │ викликає
    ▼
Service layer (app/backend/services/)
    │ оркеструє
    ├──► mcdm/ (математика – ізольовано)
    └──► db/  (PostgreSQL + PostGIS)
```

## Послідовність проєктування

### 1. Вимоги

– **Функціональні**: що фіча робить.
– **Нефункціональні**: скільки кандидатів-локацій (до 10 тис.?), час відповіді (< 2 с для FAHP+TOPSIS на 100 локацій?), детермінізм (Monte Carlo з фіксованим seed).
– **Обмеження**: стек проєкту, заборонені методи (LSTM, GA), один розробник, дедлайн червень 2026.

### 2. Точки контакту

Заповнити таблицю – які шари зачіпає фіча:

| Шар | Зачіпає? | Що саме |
|---|---|---|
| `app/backend/mcdm/` | – | – |
| `app/backend/api/` | – | – |
| `app/backend/services/` | – | – |
| `app/backend/schemas/` | – | – |
| `app/backend/db/` (моделі + міграція) | – | – |
| `app/frontend/src/features/` | – | – |
| `app/frontend/src/types/` | – | – |
| Документація курсової (`docs/chapter3/`) | – | – |

**Правило**: якщо зачіпається `mcdm/` – обов'язково ADR через `engineering-architecture` і TDD через `engineering-testing-strategy`.

### 3. Контракти

#### API endpoint

```
POST /api/<resource>
Content-Type: application/json

Request:  ScoreRequest schema
Response: ScoreResponse schema
Errors:   422 (validation), 500 (math failure – не повинно бути в нормі)
```

Описати у Pydantic у `app/backend/schemas/<name>.py`:

```python
class ScoreRequest(BaseModel):
    candidates: list[Candidate]
    weights: dict[CriterionId, float] = Field(..., description="Sum to 1.0")
    method: Literal["topsis", "vikor"] = "topsis"
    monte_carlo_iterations: int = Field(default=0, ge=0, le=10_000)
    seed: int | None = None
```

Дзеркалити у TypeScript `app/frontend/src/types/<name>.ts`.

#### Схема БД (якщо потрібно)

```python
# app/backend/db/models/<name>.py
class CandidateSite(Base):
    __tablename__ = "candidate_sites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    geom: Mapped[WKBElement] = mapped_column(Geometry("POINT", srid=4326))
    # …
```

Міграція через Alembic:
```bash
cd app/backend && alembic revision --autogenerate -m "add candidate_sites"
alembic upgrade head
```

### 4. Послідовність реалізації

```
1. Якщо зачіпає mcdm/ → engineering-architecture (ADR)
2. engineering-testing-strategy (план тестів)
3. Написати падаючі тести (mcdm/tests/ + tests/)
4. Pydantic-схеми
5. Реалізація у mcdm/ (якщо math) → тести зеленіють
6. Сервіс-шар у services/
7. Роутер у api/, додати у main.py
8. Міграція БД (якщо нова таблиця)
9. Фронтенд: типи → store → компонент
10. Інтеграційний тест API
11. engineering-code-review перед мержем
12. Згадка у docs/chapter3/ (підрозділ опису реалізації)
```

### 5. Trade-offs

Завжди явно: що пожертвувано і чому.

| Альтернатива | Чому не обрано |
|---|---|
| – | – |

### 6. Як описати у курсовій

Розділ 3 (опис реалізації) повинен містити:

– Підрозділ із діаграмою компонента (PlantUML, як у chapter2).
– Опис API-контракту таблицею.
– Скрипт міграції в Додатки (якщо нова таблиця).
– Скріншот UI (для фронтенд-фіч).

## Шаблон вихідного документа скілу

```markdown
# Design: <Назва фічі>

## Вимоги
**FR:** …
**NFR:** …
**Constraints:** …

## Touch points
[таблиця]

## API contract
[Request/Response/Errors]

## Data model
[SQL / SQLAlchemy / міграція]

## Math (якщо є)
- Метод: …
- Джерело: <BibTeX-key>
- Чи потрібен ADR? Так/ні. Тема ADR.

## Implementation steps
1. …
2. …

## Tests
- Unit (mcdm/): …
- Integration (tests/): …
- Manual: …

## Trade-offs / Open questions
- …

## Where it appears in the coursework
docs/chapter3/X_Y_Z.md – підрозділ «…»
```

## Приклади можливих фіч (для контексту)

– `POST /api/score` – основний endpoint розрахунку (TOPSIS-ранжування).
– `POST /api/sensitivity` – Monte Carlo навколо точки рішення.
– `GET /api/candidates` – список кандидат-локацій з PostGIS.
– `POST /api/criteria` – CRUD критеріїв.
– Експорт результатів у XLSX (через скіл `xlsx`).
– Експорт мапи у PNG.

## Поради

1. **Math first.** Якщо фіча зачіпає mcdm/ – дизайн починається з джерела літератури, а не з UI.
2. **Не проектувати «на майбутнє».** Курсова має дедлайн. Замість «extensible plugin architecture» – мінімально достатня реалізація.
3. **Завжди питати про обсяг даних.** 100 локацій – одна архітектура. 100 000 – зовсім інша. Для курсової реалістично 50–500.
4. **Не пропустити ADR.** Кожне нетривіальне рішення – запис у `docs/adr/`.
