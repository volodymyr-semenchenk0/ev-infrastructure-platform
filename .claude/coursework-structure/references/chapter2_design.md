# Reference: Chapter 2 — Design

This reference covers Chapter 2 of the coursework. Read this when the user works on system architecture, data model, or algorithm design.

## Critical scope rule for Chapter 2

Chapter 2 is **concept-level only**. It describes what is being designed, not what tools build it. Concretely:

**Belongs in Chapter 2:**
- Architectural styles (client-server, three-layer)
- UML diagrams (use case, class, sequence, communication, deployment)
- ER diagrams, table schemas (logical, conceptual)
- Algorithm flow (Activity Diagrams, pseudocode)
- API contract specification (endpoint paths, methods, request/response shapes — without naming framework)

**Does NOT belong in Chapter 2:**
- Specific library names (FastAPI, React, pymcdm, GeoAlchemy2)
- Specific hosting platforms (Vercel, Railway, Supabase)
- Code fragments
- Justification of technology choices
- Configuration files, environment variables
- Tooling decisions (Vite, ESLint, Alembic)

When drafting 2.1.1 ("Структурна схема"), describe the architecture as "клієнт-серверна з REST API" — not "FastAPI бекенд + React-фронтенд". The framework names appear in 3.1.1.

## Section title

The methodology's exact title for Chapter 2 is **"ПРОЕКТУВАННЯ СИСТЕМИ ДЛЯ ДОСЛІДЖЕННЯ ПРОЦЕСІВ ЗА ТЕМОЮ КУРСОВОЇ РОБОТИ"**. The recommended adaptation for this topic is:

**"ПРОЕКТУВАННЯ СИСТЕМИ ДЛЯ ДОСЛІДЖЕННЯ ПРОЦЕСІВ ВИБОРУ ЛОКАЦІЙ ЗАРЯДНИХ СТАНЦІЙ"**

## 2.1. Структура системи, що проектується (~5 pages)

Six recommended subsections:

- **2.1.1.** Структурна схема системи. A high-level block diagram showing presentation layer ↔ business logic layer ↔ data layer, with the connections labeled (REST API between client and server, ORM between server and DB). Describe the rationale for layered separation.

- **2.1.2.** Use Case Diagram. Two primary actors: the city (Муніципалітет) and the investor (Інвестор), plus an Administrator. Around 8–10 use cases: Choose profile, Configure pairwise matrix, Compute weights, Compute ranking, View map, Run sensitivity analysis, Compare methods, Export results, Manage locations, Manage criteria.

- **2.1.3.** Class Diagram. 8–10 classes covering domain entities (Location, Criterion, Profile, Evaluation), services (FAHPCalculator, TOPSISRanker, MonteCarloAnalyzer), and IO (DataLoader, ResultExporter). Show relationships (associations, dependencies). Do **not** name specific frameworks here.

- **2.1.4.** Sequence Diagram for the main scenario. The "evaluate locations" flow: User → UI → REST API → backend service → DB → backend service → REST API → UI → user. Show the time-axis interaction explicitly.

- **2.1.5.** Communication Diagram. UML Communication (formerly Collaboration) Diagram showing the same scenario but emphasizing object linkages and message numbering rather than time. The methodology specifically lists this diagram type.

- **2.1.6.** Specifikація REST API. Table format with columns: метод (GET/POST), шлях, призначення, формат запиту, формат відповіді. Around 8–10 endpoints. Mention REST as the architectural style without naming FastAPI.

Diagrams that don't fit on one page go to appendices (Додаток Г).

## 2.2. Опис інформаційного забезпечення (~3–4 pages)

Required because the system has a database. Four subsections:

- **2.2.1.** Концептуальна модель даних. ER-diagram with entities (Profile, Criterion, Location, Evaluation, ExistingStation, RankingResult, SensitivityResult) and their relationships.

- **2.2.2.** Логічна модель БД. Schema of tables with primary keys, foreign keys, and spatial indexes (GiST on geometry columns). Describe the relational schema in normalized form.

- **2.2.3.** Опис атрибутів таблиць. For each table, list columns with: name, type (e.g., INTEGER, VARCHAR(128), GEOMETRY(Point, 4326), JSONB), constraints, semantics. Use a table format.

- **2.2.4.** Зовнішні джерела даних. Describe the data flow:
  - Geospatial data on roads, POIs, substations from OpenStreetMap (loaded as conceptual data flow);
  - Existing charging station data from OpenChargeMap (REST API);
  - Demographic data from Держстат;
  - Describe the ETL pipeline at concept level: extract → transform → load into spatial database with GiST indexing.

Don't say "loaded via osmnx" — that's implementation. Say "geospatial data from OpenStreetMap is imported into the spatial database".

## 2.3. Розробка алгоритмів функціонування системи (~7 pages)

Five recommended subsections, all using UML Activity Diagrams or block-schemes per ДСТУ:

- **2.3.1.** Алгоритм Fuzzy AHP. Activity Diagram with steps: input pairwise matrix → check consistency CR → compute fuzzy synthetic extent → degree of possibility comparison → defuzzification → output crisp weights vector.

- **2.3.2.** Алгоритм TOPSIS. Activity Diagram with steps: input decision matrix + weights → vector normalization → weighted normalized matrix → identify A⁺ and A⁻ → compute distances S⁺ᵢ, S⁻ᵢ → compute Cᵢ* → sort and output ranking.

- **2.3.3.** Алгоритм Монте-Карло. Activity Diagram with steps: input base weights and ±perturbation parameter → loop N times {perturb weights, run TOPSIS, record ranking} → aggregate frequencies → output robustness metric.

- **2.3.4.** Загальний алгоритм функціонування системи. Activity Diagram covering the full user session from profile selection through results export. This ties together the previous algorithms.

- **2.3.5.** Deployment Diagram. Conceptual deployment showing client device, web server, application server, database server, and external API endpoints. Use generic node names (Web Client, Application Server, Database Server) — do not name Vercel/Railway/Supabase here. Concrete platform names go in 3.1.6.

Large diagrams that exceed page size go into appendices.

## What does NOT go in Chapter 2

If any of these come up in user drafts, route them to Chapter 3:

| Topic | Belongs in |
|---|---|
| Why FastAPI was chosen | 3.1.1 |
| Backend folder structure | 3.1.2 |
| React component tree | 3.1.3 |
| Code snippets | 3.1.2–3.1.4 |
| Supabase configuration | 3.1.4 |
| Vercel deployment steps | 3.1.6 |
| Tailwind classes used | 3.1.3 |
| asyncpg connection string format | 3.1.4 |
| Choice of pymcdm vs custom implementation | 3.1.2 |
| Choice of TanStack Query vs SWR | 3.1.3 |
| Choice of SQLAlchemy ORM | 3.1.1 or 3.1.4 |

## Common errors to prevent in Chapter 2

- Calling architecture "FastAPI + React архітектура" — use "клієнт-серверна архітектура з REST API".
- Naming PostgreSQL/PostGIS in 2.2 — say "реляційна БД з підтримкою геопросторових типів".
- Including code in Activity Diagrams — only graphic notation.
- Combining 2.2 with 2.3 (the methodology allows merging them only if there's no DB; here there is one).
- Putting Deployment Diagram in 2.1 instead of 2.3 — the methodology lists it under 2.3 алгоритми/UML.
- Skipping Communication Diagram — it's specifically listed in the methodology for 2.1.
