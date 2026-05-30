---
name: engineering-documentation
description: Write technical documentation for the codebase (README, docstrings in mcdm/, FastAPI OpenAPI descriptions, runbook for docker-compose). Trigger with "document this function", "write README", "API docs", "напиши docstring". NOT for the academic coursework text — that has its own structure under docs/chapter*/ and is governed by ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md.
argument-hint: "<функція, модуль, або тип документа>"
---

# /engineering-documentation

Технічна документація **коду** проєкту. Не плутати з академічним текстом курсової (він живе у `docs/chapter*/`, `docs/вступ.md`, `docs/висновки.md`, `docs/appendices/`).

## Дві паралельні документації

```
КОД (цей скіл)                       КУРСОВА (інша зона)
─────────────────────                ─────────────────────
README.md                            docs/chapter1/  – огляд
docstrings у mcdm/                   docs/chapter2/  – математика
FastAPI OpenAPI                      docs/chapter3/  – реалізація
docs/adr/*.md (architecture)         docs/appendices/
runbook у README                     docs/висновки.md
                                     ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md
```

Цей скіл займається **лівою колонкою**.

## Типи документів і шаблони

### 1. README

Структура (вже існує у `README.md`, можна доповнювати):

```markdown
# Назва проєкту

Одна-дві строки що це і навіщо.

## Швидкий старт
docker compose up --build → :8000, :5173

## Архітектура
коротка діаграма (4–5 рядків ASCII)

## Команди
| make ... | що робить |

## Структура каталогів
дерево

## Залежності
посилання на pyproject.toml / package.json

## Ліцензія / автор
курсова, ЧНУ, 2026
```

Не дублювати CLAUDE.md (правила розробки – туди).

### 2. Docstrings у `mcdm/` – Google-style

**Обов'язковий формат** для всіх публічних функцій математичного ядра:

```python
def fahp_weights(matrix: np.ndarray) -> np.ndarray:
    """Compute criteria weights via fuzzy AHP (Buckley geometric mean).

    Aggregates each row of the fuzzy pairwise comparison matrix by the
    fuzzy geometric mean, then defuzzifies with the centroid and
    normalizes the resulting weight vector.

    Args:
        matrix: Square matrix of triangular fuzzy numbers of shape
            (n, n, 3), where each cell (i, j) is (l, m, u).

    Returns:
        Normalized weight vector of shape (n,) summing to 1.

    Raises:
        ValueError: If the matrix is not square or its consistency
            ratio exceeds the accepted threshold.

    References:
        <Author> (<year>), <видання>. BibTeX: <ключ із docs/sources/EV Charging.bib>

    Example:
        >>> matrix = np.array([[...]])  # (n, n, 3)
        >>> weights = fahp_weights(matrix)
        >>> float(weights.sum())
        1.0
    """
```

**Правила:**

– Перший рядок – одне речення в наказовому стилі: «Compute…», «Normalize…», «Sample…».
– Завжди секція `References:` з BibTeX-ключем, узятим із `docs/sources/EV Charging.bib` (не вписувати ключ з памʼяті — звірити з файлом).
– Заборонені епітети (CLAUDE.md): «Robust», «Production-ready», «Comprehensive», «Elegant».
– Англійська, лаконічно.

### 3. FastAPI / OpenAPI

Кожен роутер має:

```python
@router.post(
    "/score",
    response_model=ScoreResponse,
    summary="Compute TOPSIS ranking",
    description=(
        "Run FAHP + TOPSIS pipeline on the supplied candidate sites "
        "and criteria weights. Returns ranking sorted by closeness "
        "coefficient. See ADR-0002 for method choice rationale."
    ),
    responses={
        422: {"description": "Invalid input matrix or weights"},
    },
)
async def score(payload: ScoreRequest) -> ScoreResponse:
    ...
```

Swagger UI підхопить це автоматично на `/api/docs`.

### 4. Runbook (для самого себе перед демо)

Файл `docs/runbook.md`:

```markdown
# Runbook – запуск перед демо

## Перед демонстрацією
1. `git checkout master && git pull`
2. `docker compose down -v && docker compose up --build`
3. Перевірити :8000/health → status: ok
4. Відкрити :5173, натиснути «Розрахувати» з тестовим набором
5. Скріншоти у `docs/appendices/screenshots/`

## Якщо щось не працює
| Симптом | Швидкий фікс |
|---|---|
| API не піднімається | `docker compose logs api`, перевірити .env |
| Frontend білий екран | `npm run build` локально, дивитись `console` |
| Карта порожня | Перевірити mapStyle URL у `frontend/src/lib/map.ts` |
```

### 5. ADR

Не цей скіл – викликати `engineering-architecture`.

## Принципи

1. **Аудиторія перша.** README – для нового розробника. Docstring – для людини, яка читає код через 6 місяців. OpenAPI – для фронтенд-розробника або зовнішнього клієнта.
2. **Не дублювати.** Якщо інформація є у CLAUDE.md – посилання, не копія.
3. **Приклади > опис.** Один робочий `>>> python` важливіший за абзац опису.
4. **Зв'язок з літературою.** У docstring `mcdm/` – обов'язково BibTeX-ключ.
5. **Не плутати з курсовою.** Якщо запит «опиши метод FAHP» – не пиши docstring, питай: текст для курсової (розділ 2) чи для коду?

## Що **не** робити

– Не писати README англійською і українською одночасно – вибрати одну (для цього проєкту README – українська, бо це курсова).
– Не описувати очевидне: `def add(a, b): """Add a to b."""` – даремно.
– Не вставляти емоджі і маркетинговий тон.
– Не писати «це передова система» – це курсова, не релізна доповідь.

## Команди

```bash
# Перевірити що docstrings присутні у всіх публічних функціях mcdm/
grep -L '"""' app/backend/mcdm/*.py

# Згенерувати OpenAPI JSON для перевірки
curl http://localhost:8000/openapi.json | jq '.paths | keys'
```

## Якщо запит – «напиши документацію»

1. Уточнити: який тип? README / docstring / OpenAPI / runbook / щось ще.
2. Якщо docstring у `mcdm/` – одразу зі секцією `References:`. Без BibTeX-ключа писати **відмовлятись**.
3. Якщо це насправді про текст курсової – передати в зону `docs/chapter*/` (там працюють інші правила з `ВИМОГИ_ОФОРМЛЕННЯ_ДОКУМЕНТА.md`).
