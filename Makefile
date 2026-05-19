.PHONY: install install-skills dev-backend dev-frontend test lint typecheck all

# ─── Залежності ───────────────────────────────────────────────
install:
	cd app/backend && pip install -e ".[dev]"
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
	cd app/backend && uvicorn main:app --reload

dev-frontend:
	cd app/frontend && npm run dev

# ─── Якість коду ──────────────────────────────────────────────
test:
	cd app/backend && pytest -v

lint:
	cd app/backend && ruff check .

typecheck:
	cd app/backend && mypy mcdm/ --strict

all: lint typecheck test
