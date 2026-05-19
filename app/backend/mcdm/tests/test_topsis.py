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


def test_topsis_with_distances_hwang_yoon() -> None:
    """topsis_with_distances повертає узгоджені s_pos, s_neg, scores.

    Алгебраїчні інваріанти (Hwang & Yoon, 1981):
      - усі s_pos і s_neg невід'ємні (вимога CHECK у ranking_items);
      - closeness = s_neg / (s_pos + s_neg) поелементно;
      - результат (scores, ranking) збігається зі звичайним topsis();
      - найгірша альтернатива A4 (anti-ideal point) має s_neg = 0.
    """
    from mcdm.topsis import topsis_with_distances

    scores, ranking, s_pos, s_neg = topsis_with_distances(DECISION_MATRIX, WEIGHTS, TYPES)

    np.testing.assert_array_compare(np.greater_equal, s_pos, 0.0)
    np.testing.assert_array_compare(np.greater_equal, s_neg, 0.0)

    # Closeness реконструюється з відстаней.
    expected_scores = s_neg / (s_pos + s_neg)
    np.testing.assert_allclose(scores, expected_scores, atol=1e-12)

    # Узгодженість зі звичайним topsis().
    scores2, ranking2 = topsis(DECISION_MATRIX, WEIGHTS, TYPES)
    np.testing.assert_allclose(scores, scores2, atol=1e-12)
    np.testing.assert_array_equal(ranking, ranking2)

    # A2 (best) і A4 (anti-ideal: всі координати співпадають з v_neg).
    assert ranking[0] == EXPECTED_BEST_INDEX
    assert s_neg[3] == 0.0, f"A4 sits at the anti-ideal point, expected s_neg=0, got {s_neg[3]}"
