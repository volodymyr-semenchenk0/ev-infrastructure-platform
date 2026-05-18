# Звіт про збірку чернетки курсової (Розділи 1 + 2)

**Файл:** `EV_charging_DSS_coursework.docx`
**Версія:** v5 — pandoc OMML формули + правильні таблиці + 13 PlantUML PNG-діаграм + skill `coursework-docx-build` зі скриптами у `build/scripts/`

## Структура

| # | Частина | Стан |
|---|---|---|
| 1 | ВСТУП | З `docs/вступ.md` |
| 2 | РОЗДІЛ 1. ТЕОРЕТИЧНИЙ АНАЛІЗ ПРОБЛЕМИ | 13 підрозділів |
| 3 | РОЗДІЛ 2. ПРОЕКТУВАННЯ СИСТЕМИ | 14 підрозділів, 13 PlantUML PNG |
| 4 | СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ | 31 джерело, нумерація за появою в тексті |
| 5 | ДОДАТКИ | Окрема сторінка |
| 6 | Додаток А | Атрибути таблиць БД |

## Технічні характеристики

- **548 OMML-формул** (нативні Word equations через pandoc)
- **22 таблиці** з межами 0.5pt, повна ширина сторінки
- **14 PNG-рисунків** вставлено (fig_1_2 + fig_2_1…fig_2_13)
- **17 нумерованих формул** (1.1)–(1.17)
- Поля 25/15/20/20 мм, TNR 14pt, інтервал 1.5, абз. відступ 1.27 см
- ~107 сторінок (з усіма рисунками і додатком)

## Цитування

- 90 позицій → 31 унікальне джерело (0 «сиріт» / 0 невикористаних)
- Сторінки верифіковані з реальних PDF у `docs/sources/files/N/`:
  - `sarda_review_2024` → с. 5681 (PDF p.11)
  - `kahraman_fuzzy_2008` → с. 69, 70, 71
  - `lassey_comparative_2025` → с. 4
  - `mazurek_monte_2022` → с. 11
  - `abuabara_multicriteria_2025` → с. 15

## Pipeline (для майбутніх збірок)

```bash
cd ev-charging-dss
bash build/scripts/build_docx.sh
```

Виконує:
1. (Опційно) `build/render_plantuml.sh` — рендерить .puml у .png
2. `build/scripts/make_reference_docx.py` — створює `build/reference.docx` зі стилями методички
3. `build/scripts/build_master_md.py` — збирає `build/master.md` з усіма виправленнями
4. `pandoc` → `build/EV_charging_DSS_coursework.docx`

Деталі в скілі `.claude/coursework-docx-build/SKILL.md`.

## TODO (для ручної правки)

### Сторінки 3 джерел не верифіковано (PDF недоступний)
- `chang_applications_1996` (HTML без формул) → у docx стоїть `[27]`
- `hwang_multiple_2012` (файл відсутній) → у docx стоїть `[1]`
- `noauthor_executive_nodate` IEA (HTML без пагінації) → у docx стоїть `[4]`

### Рисунки Розділу 1 — 7 з 8 потребують підготовки (плейсхолдери):
- ✓ fig_1_2_ev_ukraine.png
- ✗ fig_1_1_madm_scheme.png
- ✗ fig_1_3_connectors.png
- ✗ fig_1_4_* (TFN операції)
- ✗ fig_1_5_triangular_fuzzy_number.png
- ✗ fig_1_6_degree_of_possibility.png
- ✗ fig_1_7_topsis_geometry.png
- ✗ fig_1_8_monte_carlo_algorithm.png

### Косметика
- Нумерація формул `(1.X)` — span hack лишається. У Word можна замінити на right-tab.
- Page count >50 ст. — методичка вимагає 40–50. Розширені формули FAHP і таблиці Розділу 1 з'їдають місце. Скорочення: 1.1.4 (повтори) і деякі формули у 1.2.4 → додаток.
