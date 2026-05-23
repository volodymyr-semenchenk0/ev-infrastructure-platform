# Reference: Chapter 3, ВИСНОВКИ, and ДОДАТКИ

This reference covers the implementation chapter, the conclusions section, and appendices. Read this when the user works on tech stack justification, code, testing, results, conclusions, or appendix planning.

## Critical scope rule for Chapter 3

Chapter 3 is **the place for everything concrete about implementation**. This is where:
- Technology choices are justified;
- Specific frameworks, libraries, and platforms are named;
- Code fragments appear (full listings still go to appendices);
- Screenshots of the running system appear;
- Experimental results with real numbers are presented.

If the user has been holding off on naming FastAPI, React, Supabase, etc. in Chapter 2 — Chapter 3 is where all of that lands.

## Section title

The methodology's exact title is **"РЕАЛІЗАЦІЯ СИСТЕМИ ЗА ТЕМОЮ КУРСОВОЇ РОБОТИ"**. Use this verbatim.

## 3.1. Реалізація інтерфейсу та функцій програмного продукту (~7 pages)

Seven recommended subsections:

- **3.1.1.** Обґрунтування вибору технологічного стеку. The most important block in this chapter. Three comparative justifications:
  - Web framework: Streamlit vs Flask+Jinja vs **FastAPI + React + TypeScript** → chosen because of (a) type safety end-to-end, (b) clean separation of concerns, (c) MDR-readiness, (d) user's existing experience with Python+TS.
  - Database: SQLite vs Neon vs Railway vs **PostgreSQL+PostGIS on Supabase** → chosen because of native geospatial types, GiST indexes, free tier with PostGIS pre-installed, MDR-readiness without migration.
  - Data access: raw SQL vs **SQLAlchemy 2.0 + GeoAlchemy2 with hybrid raw-SQL escape hatch for PostGIS queries** → chosen for type safety, Alembic migrations, schema-as-code, with raw SQL reserved for spatial-heavy queries where ORM overhead doesn't pay off.

- **3.1.2.** Засоби реалізації серверної частини. Cover:
  - Backend project structure (api/v1, schemas, models, services, db, core);
  - Key libraries: FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), GeoAlchemy2, Alembic, asyncpg, pymcdm, httpx;
  - Code fragment: the author's implementation of Fuzzy AHP (Chang's method, ~50–80 lines) — this is where authorship matters most;
  - Code fragment: the TOPSIS service wrapping pymcdm.

- **3.1.3.** Засоби реалізації клієнтської частини. Cover:
  - Frontend project structure (pages, components, api, hooks, store, types);
  - Key libraries: React 18, Vite, TypeScript, TanStack Query, react-leaflet, Recharts, Tailwind CSS, axios, Zustand;
  - Code fragment: the interactive AHP pairwise comparison matrix component — ideally with on-the-fly Consistency Ratio computation.

- **3.1.4.** Засоби реалізації бази даних. Cover:
  - PostgreSQL 17 + PostGIS extension on Supabase;
  - GiST spatial indexes on geometry columns;
  - The hybrid ORM + raw SQL pattern: ORM for CRUD, raw SQL for spatial queries (ST_Distance, ST_DWithin, <-> operator, ST_ClusterDBSCAN);
  - Alembic migrations for schema versioning;
  - Mention the connection string format (without exposing real credentials).

- **3.1.5.** Опис структури інтерфейсу системи. Walk through the screens with screenshots:
  - Profile selection (City vs Investor);
  - Locations entry / view;
  - AHP pairwise matrix with CR indicator;
  - Results page with map + ranking table;
  - Sensitivity analysis page with box plots;
  - Method comparison page.

- **3.1.6.** Розгортання прототипу. Concrete deployment topology: frontend on Vercel (auto-deploy from GitHub), backend on Railway/Render (auto-deploy from GitHub), database on Supabase. Mention CORS configuration, environment variables, the public URL of the live demo for the defense.

- **3.1.7.** Перелік звітних форм. Methodology requires this explicitly. List 5–7 output forms with references to appendices:
  - Ф1. Таблиця ранжування з коефіцієнтами TOPSIS — Додаток Д;
  - Ф2. Карта з топ-3 локаціями — Додаток К;
  - Ф3. Графік чутливості Монте-Карло — Додаток Ж;
  - Ф4. Порівняльна таблиця методів — Додаток Д;
  - Ф5. Excel-експорт повних результатів — Додаток К.

**Code fragments** (subsections 3.1.2, 3.1.3) — keep them to 10–25 lines each, focused on the most interesting algorithmic parts. Always note "повний лістинг — у Додатку А (backend) / Додатку Б (frontend)".

## 3.2. Тестування та аналіз результатів (~7 pages)

Seven recommended subsections:

- **3.2.1.** Експериментальна база. candidate locations across Kyiv districts (within city limits). Real coordinates, real addresses, real values for criteria sourced from OSM, OpenChargeMap, and Держстат. Present as a table with all 10 criteria values.

- **3.2.2.** Ranking with City profile. Present:
  - Computed weights vector (radar chart or bar chart);
  - Full ranking with closeness coefficients;
  - Map with color-coded markers (top-3 highlighted);
  - Brief interpretation: which districts dominate.

- **3.2.3.** Ranking with Investor profile. Same outputs as 3.2.2 but with investor-profile weights. The two top-3 lists should differ noticeably — that's the key research finding.

- **3.2.4.** Comparative analysis of two profiles. Spearman rank correlation coefficient between the two rankings. Discussion: ρ = X.XX indicates the degree of misalignment between municipal and investor priorities, which justifies separate planning strategies.

- **3.2.5.** Sensitivity analysis. Monte Carlo with 1000 iterations, ±15% perturbation. Output: frequency of each location appearing in top-3 (bar chart). Locations with high frequency are robust recommendations; those with low frequency are sensitive to weight choices.

- **3.2.6.** Method comparison FAHP-TOPSIS vs WSM. Run WSM with the same crisp weights, compare rankings using rank correlation. Discussion: where do the methods agree, where do they diverge, and why.

- **3.2.7.** Узагальнення результатів. Test cases table per the methodology's Table 4.1 example: column 1 = function, column 2 = expected result, column 3 = actual result. Include 8–12 test cases covering main scenarios.

## ВИСНОВКИ — exact composition

Volume: ~1 page. **Continuous prose** (no subheadings). Three mandatory points per the methodology, in this order:

1. **Перелік результатів дослідження.** One paragraph or one sentence per task from the introduction (six tasks → 6 sentences). Concrete results, including numbers from 3.2 where applicable.

2. **Можливості розробленого програмного продукту.** One paragraph describing what the prototype can do in practical terms (whom it serves, what input it accepts, what output it produces, where it can be deployed).

3. **Заключення про ефективність застосування.** One paragraph. Make a confident, evidence-based statement about how the proposed FAHP-TOPSIS-MC scheme outperforms the WSM baseline (cite the rank correlation result), and how the prototype demonstrates the feasibility of two-profile DSS for EV infrastructure planning.

Do **not** add separate sections for "обмеження дослідження" or "напрямки подальших досліджень" — these are MDR conventions, not coursework. If you want to mention limitations or future work, integrate them as a single closing sentence in point 3.

## ДОДАТКИ — composition and naming

Place a separate sheet with the word **ДОДАТКИ** (uppercase, centered, no page number) before the first appendix.

**Mandatory:**
- Додаток А. Лістинг ключових модулів backend (FastAPI, ORM models, FAHP, TOPSIS, Monte Carlo).
- Додаток Б. Лістинг ключових модулів frontend (React+TS components, API client).

**Recommended given the topic:**
- Додаток В. SQL-скрипти ініціалізації БД та Alembic-міграції.
- Додаток Г. Розширені UML-діаграми великого формату.
- Додаток Д. Повна таблиця експериментальних даних (локації × 10 критеріїв) + результати ранжувань.
- Додаток Ж. Графіки аналізу чутливості Монте-Карло.
- Додаток К. Додаткові скріншоти інтерфейсу системи.

**Forbidden letters (specific to coursework methodology):** Є, С, З, Ї, Е, І, Й, О, Ч, Ь.

**Allowed sequence (memorize this):** А, Б, В, Г, Д, **Ж**, **К**, Л, М, Н, П, Р, Т, У, Ф, Х, Ш, Щ, Ю, Я.

After Д, the next allowed letter is Ж (Е is forbidden).

**Numbering inside appendices:** figures, tables, formulas use the appendix letter as prefix:
- Рис. А.1, Рис. А.2 — figures in Appendix А;
- Таблиця Б.1 — tables in Appendix Б;
- (Г.1) — formulas in Appendix Г.

**Code listing format:** Courier New 10 pt, single line spacing. Per the methodology, source code goes in appendices, not in the main text.

## Common errors to prevent in Chapter 3, conclusions, and appendices

- Putting full source code listings in 3.1 main text. Only fragments allowed.
- Numbering an appendix Е (forbidden). Skip from Д to Ж.
- Numbering an appendix З (forbidden). Skip from Ж to К (also skip Е, І, Й).
- Adding sections "Обмеження" and "Напрямки подальших досліджень" to ВИСНОВКИ as MDR-style headings.
- Splitting ВИСНОВКИ into numbered subsections. The methodology requires continuous prose.
- Forgetting the test cases table in 3.2.7 — it's specifically illustrated in the methodology's Table 4.1 example.
- Forgetting the explicit "перелік звітних форм" in 3.1 — it's mandatory per methodology.
- Forgetting screenshots in 3.1.5 — the live demo defense expects visual material.
