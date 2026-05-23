---
name: coursework-structure
description: Provides the canonical structure of a Master's-level coursework (курсова робота) for the discipline "Системи підтримки прийняття рішень" (Decision Support Systems) at Cherkasy National University, applied to the topic "Система підтримки прийняття рішень в сфері розвитку інфраструктури для електромобілів" (DSS for EV charging infrastructure development). Use this skill whenever the user works on this coursework — drafting any chapter, asking about chapter ordering, deciding what goes in section 2 vs 3, what the introduction must contain, how to title the appendices, what to include in conclusions, how many pages each subsection should be, or whether a particular topic (e.g. tech stack justification, math derivation, experimental results) belongs to a given section. Trigger this skill even when the user only mentions the coursework, the topic, or asks general questions like "what should I write next" or "is this in the right place" — the skill prevents the most common error of putting technology choices into Chapter 2 (design) instead of Chapter 3 (implementation), and ensures every section matches the official Chemerys 2024 methodology.
---

# Coursework Structure — DSS for EV Charging Infrastructure

This skill encodes the **official structure** of the Master's coursework for the Decision Support Systems discipline at Cherkasy National University (CNU), as specified by Chemerys M. M. methodology (2024), applied to the specific topic of a DSS for EV charging infrastructure planning in Kyiv.

## When to apply this skill

Apply this skill whenever the user is working on the coursework — even tangentially. Specifically:

- The user asks "what goes in Chapter X" or "is this in the right section?"
- The user drafts content for any subsection
- The user asks about the page budget, ordering of sections, or whether a topic belongs in design vs implementation
- The user pastes a draft for review against the methodology
- The user wonders whether to add a section that the methodology does not require (e.g., "перелік умовних скорочень", "висновки до розділу", "наукова новизна")

## Core principle: design vs implementation separation

The single most common structural error is mixing **design (Chapter 2)** with **implementation (Chapter 3)**. The official methodology is strict about this:

- **Chapter 2** is concept-level: *what* the system is, *how* it is structured, *what* algorithms drive it. Use UML, ER, structural schemes. **Do NOT name specific frameworks, libraries, or hosting platforms here.**
- **Chapter 3** is the level of *concrete tools*: FastAPI, React+TS, PostgreSQL+PostGIS, Supabase, pymcdm, deployment platforms. Technology justification belongs here, not in Chapter 2.

When the user proposes putting "обґрунтування вибору FastAPI" or "структура backend-проєкту" into 2.1 — push back firmly and route it to 3.1.

## Document skeleton (canonical order)

```
Титульний лист (Додаток А методички)
Зміст
ВСТУП                                                  ~1 стор.
1. ТЕОРЕТИЧНИЙ АНАЛІЗ ПРОБЛЕМИ                         ~17 стор.
   1.1. Аналіз напрямків (перспектив) використання     до 7 стор.
        досліджуваних процесів за темою курсової роботи
   1.2. Математичний алгоритм, моделі та методи        до 7 стор.
        прийняття рішень за темою курсової роботи
   1.3. Постановка завдання                            до 3 стор.
2. ПРОЕКТУВАННЯ СИСТЕМИ ДЛЯ ДОСЛІДЖЕННЯ ПРОЦЕСІВ        ~12 стор.
   ВИБОРУ ЛОКАЦІЙ ЗАРЯДНИХ СТАНЦІЙ
   2.1. Структура системи, що проектується             ~5 стор.
   2.2. Опис інформаційного забезпечення               ~3–4 стор.
   2.3. Розробка алгоритмів функціонування системи     ~7 стор.
3. РЕАЛІЗАЦІЯ СИСТЕМИ ЗА ТЕМОЮ КУРСОВОЇ РОБОТИ          ~14 стор.
   3.1. Реалізація інтерфейсу та функцій               ~7 стор.
   3.2. Тестування та аналіз результатів роботи        ~7 стор.
ВИСНОВКИ                                               ~1 стор.
СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ                             ~3–4 стор.
ДОДАТКИ
```

**Total without appendices:** 40–50 pages. Going over is treated as inability to write concisely and is penalized.

## Critical rules from the methodology

1. **No "Перелік умовних скорочень"** — the methodology of the coursework does not include this section (it exists in MDR, not coursework). Do not add it even if it seems useful.
2. **No "Висновки до розділу"** — the methodology of the coursework does not require per-chapter conclusions. Final ВИСНОВКИ only.
3. **Introduction has 5 elements**, not 6 — мета, завдання, предмет, об'єкт, методи. "Актуальність" is not a separately-titled element (can be a brief opening paragraph without a heading).
4. **Conclusions have 3 mandatory points**, not 5 — перелік результатів, можливості продукту, ефективність. The MDR-style "обмеження + напрямки подальших досліджень" is not required.
5. **Appendix forbidden letters** (specific to coursework methodology): Є, С, З, Ї, Е, І, Й, О, Ч, Ь. Allowed sequence: **А, Б, В, Г, Д, Ж, К, Л, М, Н, П, Р, Т, У, Ф, Х, Ш, Щ, Ю, Я**. Note: this differs from the MDR list — pay attention.
6. **Every subsection starts on a new page.** The coursework methodology explicitly states: «Кожен підрозділ ПЗ починається з нового листа» (Chemerys, 2024, p. 9). This means 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2 — each on its own new page. This differs from the MDR convention where only chapters break.
7. **Listing of all source code goes into Appendices, not into the main text.** Section 3.1 may include short code fragments only (10–25 lines).
8. **Section numbers carry a period** that separates them from the title: `1. ТЕОРЕТИЧНИЙ АНАЛІЗ ПРОБЛЕМИ`, `1.1. Аналіз напрямків...`, `1.2.3. Параметри методу TOPSIS`. The methodology says: «Номер розділу і підрозділу ставлять перед найменуванням і відокремлюють його крапкою». This differs from MDR which omits the trailing period after the number.
9. **Volume limit is hard**: 40–50 pages of body text (without appendices). Exceeding 50 is treated as inability to write concisely and is penalized.
10. **3 credits ECTS** — the coursework is graded as a separate discipline.

## Section-by-section guidance

For deep guidance on what each chapter must contain, consult the references in this skill:

- **For ВСТУП and Chapter 1** (theory, math, problem statement) — read `references/intro_and_chapter1.md`
- **For Chapter 2** (design: structure, data, algorithms — concept-level only) — read `references/chapter2_design.md`
- **For Chapter 3 + ВИСНОВКИ + ДОДАТКИ** (implementation, testing, conclusions, appendices) — read `references/chapter3_and_conclusions.md`

Read the reference relevant to the section the user is currently working on. Do not preload all three.

## Topic-specific decisions already made

The following decisions are settled for this coursework — do not revisit them unless the user explicitly asks:

| Aspect | Decision |
|---|---|
| Sub-task | Optimal **siting** of new EV charging stations (not type selection, not routing) |
| Decision-maker (ОПР) | **Dual-profile**: city (municipality) and investor — selectable at runtime |
| Method for weighting criteria | **Fuzzy AHP** (Chang's extent analysis with triangular fuzzy numbers) |
| Method for ranking alternatives | **TOPSIS** |
| Robustness analysis | **Monte Carlo sensitivity** (1000 iterations, ±15% weight perturbation) |
| Baseline for comparison | **WSM** (Weighted Sum Model) |
| Backend stack | Python + **FastAPI** + Pydantic v2 + SQLAlchemy 2.0 + GeoAlchemy2 + Alembic + pymcdm |
| Frontend stack | **TypeScript** + React 18 + Vite + TanStack Query + react-leaflet + Recharts |
| Database | **PostgreSQL 17 + PostGIS** on Supabase (free tier) |
| Hosting | Vercel (frontend) + Railway/Render (backend) + Supabase (DB) |
| Case study | **Kyiv** (candidate locations within city limits) |
| Number of criteria | **10 criteria** (economic, technical, social, transport, environmental) |
| Defense format | **Live demo** of web app + 5–7 min English presentation |
| This coursework feeds into | Master's thesis (МДР) next year — architecture must be МДР-ready |

If the user proposes a change that contradicts these decisions, ask whether they want to revisit the decision before drafting accordingly.

## Examples of routing decisions

**Example 1.**
User: "Куди описати, чому я обрав FastAPI замість Flask?"
Response: This is technology justification → goes into **3.1.1** (обґрунтування вибору технологічного стеку), not into Chapter 2. Chapter 2 stays at the level "client-server architecture with REST API" without naming the framework.

**Example 2.**
User: "Я додав підрозділ 1.4 'Висновки до розділу 1'. Це нормально?"
Response: The coursework methodology does not require per-chapter conclusions. If you want a brief closing paragraph, it's fine without a heading. Don't add it as a numbered subsection — that's an MDR convention, not coursework.

**Example 3.**
User: "Я хочу описати схему таблиць БД у 3.1."
Response: Database schema (ER, logical model, table attributes) belongs in **2.2** (інформаційне забезпечення) — that's design. In 3.1.4 you describe how the schema is *implemented* (PostgreSQL + PostGIS extension on Supabase, GiST indexes, ORM mapping with GeoAlchemy2). Don't duplicate the schema.

**Example 4.**
User: "Чи можу я використати літеру Е для додатка?"
Response: No — the coursework methodology forbids Є, С, З, Ї, **Е**, І, Й, О, Ч, Ь. After Д the next allowed letter is Ж. Use Додаток Ж.

**Example 5.**
User: "Скільки сторінок має бути в розділі 1.2?"
Response: Up to 7 pages. Across all of Chapter 1 — about 17 pages total (1.1: до 7, 1.2: до 7, 1.3: до 3).

## Defense and grading anchors

Total grade = 100 points. The largest single category is **algorithmic, mathematical, and functional complexity (50 points)** — meaning the FAHP+TOPSIS+Monte Carlo math and the working software prototype. Optimize work effort accordingly: math depth in 1.2 and 3.2 experiments are worth more than perfect formatting of 1.1.

- Defense: 5–7 min in English with .pptx/.pdf presentation.
- Submit to supervisor at least 3 days before defense.
- Plagiarism check: PDF without appendices uploaded to Google Classroom (Unicheck).
