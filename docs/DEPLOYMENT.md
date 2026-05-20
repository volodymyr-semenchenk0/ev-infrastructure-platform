# Deployment

Production-розгортання СППР: PostgreSQL+PostGIS на Supabase, backend на
Railway, frontend на Vercel. Усі три сервіси мають безкоштовний tier,
достатній для демонстрації курсової.

```
Vercel (SPA)  ──HTTPS──>  Railway (FastAPI)  ──asyncpg──>  Supabase (PostGIS)
```

## 1. База даних — Supabase

1. Створити проєкт на https://supabase.com.
2. Project Settings → Database → Connection string → взяти URI.
3. Перетворити на asyncpg-формат для backend:
   `postgresql+asyncpg://postgres:<password>@<host>:5432/postgres`
4. PostGIS на Supabase увімкнено за замовчуванням; за потреби —
   Database → Extensions → увімкнути `postgis`.

## 2. Backend — Railway

1. Створити проєкт на https://railway.app → Deploy from GitHub repo.
2. Settings → Root Directory: `app/backend` (там лежить `Dockerfile`).
   Railway збере production-образ (uvicorn без `--reload`, 2 workers).
3. Variables:
   - `DATABASE_URL` — asyncpg-рядок з кроку 1
   - `CORS_ORIGINS` — домен Vercel із кроку 3, напр.
     `https://ev-charging-dss.vercel.app` (кілька — через кому)
4. Після першого deploy виконати в Railway shell (one-off):
   ```bash
   alembic upgrade head
   python -m db.seed_cli
   ```
5. Перевірити: `https://<railway-домен>/health` → `{"status":"ok","version":"0.2.0"}`.

## 3. Frontend — Vercel

1. Створити проєкт на https://vercel.com → Import GitHub repo.
2. Root Directory: `app/frontend`. Vercel підхопить `vercel.json`
   (Vite preset + SPA rewrite).
3. Environment Variables:
   - `VITE_API_BASE_URL` — `https://<railway-домен>/api`
4. Deploy. Auto-deploy з `master` і preview-deploy для PR вмикаються автоматично.

## 4. Замкнути CORS

Після того як Vercel видав фінальний домен — переконатися, що він є у
`CORS_ORIGINS` на Railway (крок 2.3). Інакше браузер заблокує запити.

## Чек-лист перевірки

- [ ] `GET https://<railway>/health` → 200, `version: 0.2.0`
- [ ] Vercel-сторінка відкривається без помилок у консолі
- [ ] DevTools → Network: запити на `/api/*` ідуть на Railway-домен, без CORS-помилок
- [ ] Наскрізний сценарій: профіль → розрахунок → результати → карта →
      чутливість → порівняння → експорт CSV/JSON

## Локальний production-прогін (опційно)

```bash
cp .env.example .env          # заповнити DATABASE_URL за потреби
docker compose up --build     # db + backend (prod-образ) + frontend
```
