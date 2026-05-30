---
name: engineering-testing-strategy
description: Plan tests for the EV-charging DSS coursework. Trigger with "написати тести", "test plan", "як тестувати", "what tests do we need", or before adding a new function in mcdm/ (TDD requires the test first). Covers reference-based unit tests for FAHP/TOPSIS/MC, API integration tests, and frontend tests.
argument-hint: "<функція / модуль / фіча>"
---

# /engineering-testing-strategy

Планування тестів для проєкту СППР. Скіл викликається **до** написання реалізації (red → green → refactor).

## Тестова піраміда проєкту

```
              ┌──────────────────────┐
              │  E2E (опціонально)   │   ручні через Swagger UI / браузер
              └──────────────────────┘
           ┌────────────────────────────┐
           │  API integration (httpx)   │   FastAPI TestClient, БД у Docker
           └────────────────────────────┘
       ┌──────────────────────────────────┐
       │  Unit tests mcdm/ – ЯДРО ПРОЄКТУ │   еталонні числа з літератури
       └──────────────────────────────────┘
```

## Категорія A: Unit-тести `app/backend/mcdm/` (50/100 балів курсової)

### Залізне правило TDD

Загальна механіка red → green → refactor — у симлінк-скілі `test-driven-development` (зовнішній; не редагувати). Тут лише проєктна дельта для `mcdm/`:

1. Скіл генерує **падаючий тест** з еталонним числом із літератури (bib-ключ) або з таблиць Розділу 3.
2. Тест комітиться окремо (`test(mcdm): ...`), реалізація — наступним комітом (`feat(mcdm): ...`).
3. Жодних mock-ів. Жодних рандомних `np.random.rand()` без `default_rng(seed)`.

### Джерела еталонних чисел

Кожен числовий еталон має документоване джерело — рецензований пейпер або таблицю Розділу 3. Bib-ключі НЕ перелічуються тут (вони протухають): актуальний ключ брати з `docs/sources/EV Charging.bib` за автором і роком методу (FAHP, TOPSIS, AHP-шкала, узгодженість). Чинний числовий оракул FAHP — у `app/backend/mcdm/tests/test_fahp.py`; нові тести рівнятися на нього, а не на копію чисел в інструкції.

Кожен тест має у docstring посилання на джерело + bib-ключ із `.bib`:

```python
def test_<method>_<source><year>_example() -> None:
    """Reference: <Author> (<year>), <видання>, <сторінка/таблиця>.

    BibTeX: <ключ із docs/sources/EV Charging.bib>
    """
```

### Що **обов'язково** покрити для кожного методу

– **Happy path** із літературним еталоном (точність `np.allclose(..., atol=1e-4)`).
– **Виродженi випадки**: одна альтернатива, одна вага = 1.0, ідентичні рядки матриці.
– **Помилки введення**: матриця не квадратна, ваги не сумують до 1, від'ємні елементи у векторній нормалізації.
– **Узгодженість FAHP**: тест з CR > 0.1 повинен повертати warning або raise.
– **Детермінізм Monte Carlo**: два запуски з тим самим `seed` дають однаковий результат.

### Що **не тестувати** в mcdm/

– Швидкість (це не бенчмарк).
– Помилки I/O (це не зона відповідальності mcdm/).
– Геометричні розрахунки PostGIS (це окремий шар).

### Шаблон тесту

```python
# app/backend/mcdm/tests/test_<method>.py
from __future__ import annotations

import numpy as np
import pytest

from mcdm.<method> import <function>


def test_<method>_<source><year>_example() -> None:
    """Reference: <Author>, <Year>, <Journal>, p. <page>.

    BibTeX: <key>
    """
    # вхід з літератури
    input_matrix = np.array([...])
    expected = np.array([...])

    result = <function>(input_matrix)

    np.testing.assert_allclose(result, expected, atol=1e-4)


def test_<method>_raises_on_invalid_input() -> None:
    with pytest.raises(ValueError, match="<reason>"):
        <function>(np.array([[1.0]]))


@pytest.mark.parametrize("seed", [0, 42, 12345])
def test_<method>_is_deterministic(seed: int) -> None:
    rng1 = np.random.default_rng(seed)
    rng2 = np.random.default_rng(seed)
    assert np.array_equal(<function>(rng=rng1), <function>(rng=rng2))
```

## Категорія B: Integration-тести API (`app/backend/tests/`)

– `FastAPI TestClient` через `httpx.AsyncClient`.
– Реальна БД у Docker (PostGIS), **без mock-ів** SQLAlchemy.
– Кожен endpoint мінімум: 200 happy path, 422 validation, 404 not found.
– Параметризовані тести по перерізах сценаріїв.

```python
@pytest.mark.asyncio
async def test_score_endpoint_returns_topsis_ranking(client, db):
    resp = await client.post("/api/score", json={...})
    assert resp.status_code == 200
    assert sorted(resp.json()["ranking"], key=lambda x: x["score"], reverse=True) == ...
```

## Категорія C: Фронтенд-тести (поки що низький пріоритет)

– Не блокує курсову; можна додати після того, як готова MCDM-форма.
– Якщо додавати – Vitest + Testing Library, focus на:
  – Форма ваг сумує до 1.
  – Карта отримує маркери з API і не падає при порожній відповіді.

## Покриття – цілі для курсової

| Шар | Цільове покриття | Як виміряти |
|---|---|---|
| `mcdm/` | 100% по гілках (`branch coverage`) | `pytest --cov=mcdm --cov-branch` |
| `api/` | ≥ 80% по рядках | `pytest --cov=api` |
| `frontend/` | – (не блокує) | – |

## Як описати тестування у курсовій (розділ 3)

Підрозділ 3.2.x «Тестування системи» повинен містити:

– Таблицю «Метод → джерело еталона → BibTeX-ключ → відхилення від еталона».
– Скріншот або вивід `pytest -v` для блоку mcdm/.
– Згадку про детермінізм Monte Carlo (фіксований `seed`) як ознаку відтворюваності експерименту.

## Команди

```bash
make test                                # повний пакет pytest
cd app/backend && pytest mcdm/tests/ -v  # лише math-ядро
cd app/backend && pytest mcdm/tests/test_fahp.py -v --no-header
cd app/backend && pytest --cov=mcdm --cov-branch --cov-report=term-missing
```

## Якщо завдання – «напиши тест на функцію Х»

1. Запитати: яке джерело еталона (BibTeX-ключ)?
2. Якщо джерела немає – **не писати** тест. Запропонувати знайти джерело або викликати скіл `engineering-architecture` для рішення «чи прийнятно реалізовувати без літературного еталона».
3. Якщо джерело є – згенерувати падаючий тест за шаблоном вище.
4. Не реалізовувати функцію в цьому ж кроці.
