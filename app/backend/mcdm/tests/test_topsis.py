"""Юніт-тест TOPSIS на еталонному числовому прикладі.

Джерело: Hwang, C.L. & Yoon, K. (1981). Multiple Attribute Decision Making:
Methods and Applications. Springer.

Приклад: вибір автомобіля – 4 альтернативи, 3 критерії.
Критерії: ціна (мін), пробіг на літр (макс), балова оцінка сервісу (макс).
Очікуваний оптимальний варіант – A2.

УВАГА: тест навмисно провалюється, поки не реалізовано topsis().
"""

import numpy as np

from mcdm.topsis import topsis

DECISION_MATRIX = np.array(
    [
        [25_000.0, 16.0, 8.0],  # A1
        [20_000.0, 20.0, 6.0],  # A2 – очікуваний найкращий
        [15_000.0, 12.0, 7.0],  # A3
        [30_000.0, 10.0, 5.0],  # A4
    ]
)

WEIGHTS = np.array([0.4, 0.3, 0.3])
TYPES = np.array([-1, 1, 1])  # -1 = мінімізація, 1 = максимізація

EXPECTED_BEST_INDEX = 1  # A2 (0-based) – еталон за Hwang & Yoon (1981)


def test_topsis_best_alternative() -> None:
    """Найкраща альтернатива за TOPSIS має відповідати еталонному прикладу."""
    scores, ranking = topsis(DECISION_MATRIX, WEIGHTS, TYPES)
    assert ranking[0] == EXPECTED_BEST_INDEX, (
        f"Очікується A{EXPECTED_BEST_INDEX + 1} на першому місці, "
        f"отримано A{ranking[0] + 1}. scores={scores}"
    )
