.PHONY: install install-skills dev-backend dev-frontend test lint typecheck all db-up db-down migrate seed \
        frontend-install frontend-test frontend-lint frontend-typecheck frontend-build frontend-types

# ─── Venv paths (Makefile uses absolute venv binaries; no activate needed) ───
VENV     := app/backend/.venv
PY       := $(VENV)/bin/python
PIP      := $(VENV)/bin/pip
RUFF     := $(VENV)/bin/ruff
MYPY     := $(VENV)/bin/mypy
PYTEST   := $(VENV)/bin/pytest
ALEMBIC  := $(VENV)/bin/alembic
UVICORN  := $(VENV)/bin/uvicorn

# ─── Залежності ───────────────────────────────────────────────
install:
	$(PIP) install -e "app/backend[dev]"
	cd app/frontend && npm install
	pre-commit install

install-skills:
	npx skills add https://github.com/obra/superpowers \
		--skill using-superpowers \
		--skill writing-plans \
		--skill brainstorming \
		--skill dispatching-parallel-agents \
		--skill executing-plans \
		--skill finishing-a-development-branch \
		--skill systematic-debugging \
		--skill test-driven-development \
		--skill verification-before-completion
	npx skills add https://github.com/anthropics/skills \
		--skill skill-creator \
		--skill webapp-testing \
		--skill frontend-design \
		--skill docx \
		--skill xlsx
	npx skills add https://github.com/juliusbrussee/caveman \
		--skill caveman \
		--skill caveman-commit

# ─── Розробка ─────────────────────────────────────────────────
dev-backend:
	cd app/backend && ../../$(UVICORN) main:app --reload

dev-frontend:
	cd app/frontend && npm run dev

# ─── Якість коду ──────────────────────────────────────────────
test:
	cd app/backend && ../../$(PYTEST) -v

lint:
	cd app/backend && ../../$(RUFF) check .

typecheck:
	cd app/backend && ../../$(MYPY) mcdm/ --strict
	cd app/backend && ../../$(MYPY) schemas/
	cd app/backend && ../../$(MYPY) services/
	cd app/backend && ../../$(MYPY) api/

all: lint typecheck test frontend-lint frontend-typecheck frontend-test

# ─── Frontend ────────────────────────────────────────────────
frontend-install:
	cd app/frontend && npm install

frontend-test:
	cd app/frontend && npm test

frontend-lint:
	cd app/frontend && npm run lint

frontend-typecheck:
	cd app/frontend && npm run typecheck

frontend-build:
	cd app/frontend && npm run build

frontend-types:
	cd app/frontend && npm run types:generate

# ─── База даних ───────────────────────────────────────────────
db-up:
	docker compose up -d db

db-down:
	docker compose down

migrate:
	cd app/backend && ../../$(ALEMBIC) upgrade head

seed:
	cd app/backend && ../../$(PY) -m db.seed_cli
