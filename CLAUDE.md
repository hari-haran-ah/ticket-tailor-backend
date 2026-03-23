# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Talenta** is a multi-tenant SaaS ticketing platform. It consists of three sub-projects:

- `talenta-admin/` — Admin dashboard (React 19 + Vite + TailwindCSS)
- `talenta-backend/` — FastAPI Python backend (serverless via Vercel)
- `talenta-client-2/`, `talenta-client-3/` — Customer-facing ticket portals

## Commands

### Frontend (talenta-admin, talenta-client-2, talenta-client-3)

```bash
cd talenta-admin   # or talenta-client-2 / talenta-client-3
npm install
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (talenta-backend)

```bash
cd talenta-backend
pip install -r requirements.txt
pip install -r requirements-test.txt

uvicorn main:app --reload          # Start dev server (port 8000)

# Run all tests
pytest

# Run single test file
pytest tests/test_auth.py

# Run single test
pytest tests/test_auth.py::test_login

# Run with coverage
pytest --cov=. --cov-report=term-missing

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

## Architecture

### Backend

**Layered structure:**
- `api/` — FastAPI routers (endpoints only, thin layer)
- `schemas/` — Pydantic models for request/response validation
- `models/` — SQLAlchemy ORM models
- `core/` — Security, config (Pydantic Settings), dependency injection
- `db/` — SQLAlchemy session setup
- `alembic/` — Database migration versions

**Key patterns:**
- `core/deps.py` provides `get_current_admin()` as FastAPI dependency for all protected routes
- `core/security.py` handles JWT creation/decoding and HttpOnly cookie helpers (`set_auth_cookies`, `clear_auth_cookies`)
- CORS origins are **dynamic**: loaded from the clients table (each client's `domain_name`) plus static config — see `main.py`
- `api/index.py` is the Vercel serverless entry point
- Global exception handler in `main.py` returns tracebacks in dev, generic errors in prod

**Auth flow:** Login → access token (60 min) + refresh token (7 days) in HttpOnly cookies → auto-refresh on 401 → logout clears cookies.

**Multi-tenancy:** Each `Client` row stores its own `tt_api_key` (Ticket Tailor), `stripe_account_id`, and `platform_fee`. The `domain_name` is used for CORS and routing.

### Frontend (talenta-admin)

**API layer (`src/api/`):**
- `lib/api.js` — Axios instance with `withCredentials: true`, base URL from `VITE_API_URL`
- Request interceptor: injects `Authorization: Bearer {token}` from localStorage
- Response interceptor: auto-calls `/api/auth/refresh` on 401, redirects to `/login` on failure
- Feature modules: `auth.js`, `client.js`, `event.js`, `payment.js`, `analysis.js`

**State & routing:**
- `AuthContext` — global auth state (user, loading, login/logout)
- `ThemeContext` — dark/light mode via TailwindCSS `class` strategy
- Protected routes wrap pages using `AuthContext`
- React Router v7 handles all routing in `App.jsx`

**Styling:** TailwindCSS with custom dark theme (`#212121`, `#2f2f2f`), extended breakpoints (`3xl`, `4xl`), dark mode via `class`.

### Environment Variables

**Backend (`.env`):**
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL`, `FRONTEND_ORIGIN` — CORS origins
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` — Seed admin credentials
- `SMTP_*` — Gmail SMTP settings
- `APP_ENV` — `dev` or `prod` (affects error verbosity)

**Frontend (`.env`):**
- `VITE_API_URL` — Backend URL (defaults to `http://localhost:8000`)

### Deployment

All projects deploy to **Vercel**:
- Backend: `vercel.json` routes all requests to `api/index.py` (Python serverless)
- Frontends: `vercel.json` rewrites all routes to `index.html` (SPA)
