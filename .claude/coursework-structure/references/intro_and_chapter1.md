# Reference: ВСТУП and Chapter 1

This reference covers the introduction and the entire theoretical-analysis chapter of the coursework. Read this when the user works on the introduction or any subsection of Chapter 1.

## ВСТУП — exact composition

Volume: ~1 page. No sub-headings. Five mandatory elements, each as a bolded inline label followed by content:

1. **Мета курсової роботи** — research the specific decision-process behind locating EV charging stations and the means of implementing it in a DSS. Stay close to the methodology's template formulation.

2. **Завдання курсової роботи** — exactly six items, mapping verbatim to the methodology:
   1. аналіз галузі застосування та перспектив використання досліджуваних технологій;
   2. дослідження існуючих математичних алгоритмів та програмних засобів реалізації процесів;
   3. проектування інформаційної системи для підтримки прийняття рішень в обраній предметній області;
   4. визначення інформаційного забезпечення системи;
   5. розробка алгоритмічної моделі функціонування програмного комплексу;
   6. реалізація системи та узагальнення результатів дослідження.

3. **Предмет дослідження** — методи, моделі, алгоритми та програмні засоби багатокритеріального оцінювання локацій ЗС. Adapt the methodology's template to this topic.

4. **Об'єкт дослідження** — процес вибору та обґрунтування оптимальних локацій зарядних станцій у сучасних інформаційних системах.

5. **Методи дослідження** — exactly the methodology wording: монографічні, аналітичні, математичні, графічні, методи об'єктно-орієнтованого проектування та програмування.

Optional opening paragraph (no heading) covering актуальність — EV market growth in Ukraine, AFIR regulation, infrastructure gap, lack of public planning tools. Keep to 4–6 sentences.

Do **not** add separate headed sections for "Актуальність", "Наукова новизна", "Практичне значення", "Зв'язок з науковими програмами" — these are MDR elements, not coursework.

## 1.1. Аналіз напрямків використання — what to write

Up to 7 pages. Five recommended subsections:

- **1.1.1.** Базові концепції формалізації прийняття рішень у задачах розміщення ЗС. Define the decision problem formally: dataset of candidate locations, criteria vector, weights, ranking function. Cite Saaty (1980) and Hwang & Yoon (1981) as the foundation of MCDM.

- **1.1.2.** Стан та перспективи ринку EV у світі, ЄС та Україні. Use IEA Global EV Outlook (latest), EU AFIR 2023/1804 regulation, Укравтопром statistics for Ukraine, market consolidation moves (e.g. ОККО+TOKA 2025). Concrete numbers: EV registrations, charging station density, tariffs.

- **1.1.3.** Класифікація зарядної інфраструктури. IEC 61851 standard: Mode 1 to Mode 4. Connector types (Type 2, CCS, CHAdeMO). Power levels (slow AC up to 22 kW, fast DC 50–150 kW, ultra-fast 150+ kW).

- **1.1.4.** Аналіз існуючих систем. Two layers:
  - Public services: PlugShare, ABRP (A Better Routeplanner), TOKA Network, EVnoon, EnergyUP.
  - Academic prototypes from the systematic review literature (cite the 2025 PRISMA review of 43 papers as the structural reference).

- **1.1.5.** Виявлені обмеження аналогів. The research gap: existing public services help drivers find existing stations; existing academic prototypes are mostly single-profile (city only) and use classical AHP without uncertainty modeling. The coursework prototype addresses both gaps.

## 1.2. Математичний апарат — what to write

Up to 7 pages. This is the section graded most heavily (math complexity = part of the 50-point block).

Recommended subsections:

- **1.2.1.** Класифікація MCDM-методів. Three groups: subjective weighting (AHP, FAHP, BWM), objective weighting (Entropy, CRITIC), ranking methods (WSM, TOPSIS, VIKOR, PROMETHEE, ELECTRE).

- **1.2.2.** Порівняльний аналіз методів зважування. Comparison table with columns: метод, автор, переваги, недоліки, придатність для siting ЗС. Explicitly justify why FAHP is chosen.

- **1.2.3.** Порівняльний аналіз методів ранжування. Same table format. Justify TOPSIS — geometric intuitiveness, full ranking, zero ОПР-tunable parameters.

- **1.2.4.** Математичний апарат Fuzzy AHP (метод Чанга). Full derivation:
  - Triangular fuzzy numbers (l, m, u);
  - Fuzzy pairwise comparison matrix;
  - Fuzzy synthetic extent values;
  - Degree of possibility comparison;
  - Defuzzification to crisp weights;
  - Consistency check (CR ≤ 0.1).

- **1.2.5.** Математичний апарат TOPSIS. Full derivation:
  - Vector normalization;
  - Weighted normalized matrix;
  - Positive ideal solution A⁺ and negative ideal solution A⁻;
  - Distance measures S⁺ᵢ, S⁻ᵢ;
  - Closeness coefficient Cᵢ* = S⁻ᵢ / (S⁺ᵢ + S⁻ᵢ);
  - Ranking by Cᵢ*.

- **1.2.6.** Метод аналізу чутливості Монте-Карло. Algorithm: random perturbation of weights ±15% over N=1000 iterations, recompute ranking each iteration, count frequency of each location appearing in top-K, output stability metric.

- **1.2.7.** Обґрунтування гібридної схеми FAHP–TOPSIS–MC. One-page summary: why this specific combination matches the topic's properties (multicriteria, mixed quantitative/qualitative, expert uncertainty, robustness requirement).

All formulas use the methodology's "де" convention (no colon after "де"), one variable per line, period after the last variable. Numbering: (1.1), (1.2), ..., per chapter.

## 1.3. Постановка завдання — what to write

Up to 3 pages. Six required subsections, mapping to the methodology:

- **1.3.1.** Мета створення програмного комплексу. One paragraph stating the goal of the software being built.

- **1.3.2.** Основні функції системи. Bulleted list of 8–10 functions: load candidates, configure profile, build AHP matrix, compute weights, run TOPSIS, visualize on map, run sensitivity, export results, etc.

- **1.3.3.** Вимоги до апаратного забезпечення. Minimum specs for client (modern browser, 4 GB RAM) and server (1 vCPU, 512 MB RAM for the FastAPI process). Note that the prototype runs on free-tier cloud platforms.

- **1.3.4.** Структура вхідних інформаційних масивів. Tables of fields for: locations (id, coordinates, district, address), criteria (id, code, name, type, unit), pairwise comparison matrix (NxN of fuzzy triples), profile selection.

- **1.3.5.** Структура вихідних інформаційних масивів. Tables of fields for: weights vector, ranking results (location, rank, closeness coefficient), sensitivity frequencies, comparison metrics.

- **1.3.6.** Обмеження та нефункціональні вимоги. Performance (< 5s for 12×10 ranking), reliability, usability (intuitive UX), scalability (designed for migration to PostgreSQL with PostGIS — already done — and capacity for 1000+ locations in MDR phase). State explicitly what is NOT in scope: dynamic demand forecasting, grid load modeling, real-time pricing — these are deferred to MDR.

## Common errors to prevent in Chapter 1

- Putting concrete library names (pymcdm, scikit-criteria) into 1.2 — these belong in 3.1, not the math chapter.
- Writing 1.1 as a market report without connecting to the DSS research problem.
- Skipping the comparison tables in 1.2.2 and 1.2.3 — they are essential evidence for method choice.
- Treating 1.3 as a free-form description — it must follow the six-point template.
- Listing "actuality" and "scientific novelty" as numbered subsections in the introduction.
