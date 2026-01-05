# super-duper
dtc test form service
=======
SuperApp Monorepo – Developer Onboarding

This repository contains the SuperApp monorepo, built with pnpm, Turborepo, Vite, Vue, Fastify, and Postgres.

It includes:

1. multiple frontend portals
2. a backend API
3. a background worker
4. shared UI and config packages

This README explains how the repo is structured, how environment variables work, and how to run everything locally without surprises.

I. Repository Structure
.
├── apps/
│   ├── api/              # Fastify API (Node + TypeScript)
│   ├── tenant-portal/    # Vue + Vite app (agents / tenants)
│   ├── admin-portal/     # Vue + Vite app (admin users)
│   ├── marketing-site/   # Vue + Vite marketing site
│   └── worker/           # Background job worker (Postgres-backed)
│
├── packages/
│   ├── ui/               # Shared UI components
│   └── config/           # Shared config (eslint, tailwind, etc.)
│
├── .github/              # CI workflows
├── .husky/               # Git hooks
├── turbo.json            # Turborepo pipeline config
├── pnpm-workspace.yaml   # pnpm workspace definition
├── package.json          # Root scripts
└── README.md

II. Prerequisites

You’ll need:
1. Node.js (version defined in .nvmrc)
2. pnpm (v9+ recommended)
3. Postgres (local or remote)
4. (optional) Git Bash or WSL on Windows
5. (optional) VS Code with TypeScript + Vue extensions

III. Getting Started:

1. Install dependencies
- From the repo root: 
- pnpm install

2. Configure environment variables:
- Root environment file

3. Create a local .env file at the repo root:
- cp .env.example .env
- This file is not committed
- The root .env is the single source of truth for:

	a. API ports
	b. frontend dev ports
	c. shared base URLs
	d. database connection
	e. auth configuration

Example (simplified):

NODE_ENV=development

API_PORT=3002
API_HOST=0.0.0.0
API_BASE_URL=http://localhost:3002
VITE_API_BASE_URL=http://localhost:3002

ADMIN_PORTAL_PORT=5171
MARKETING_SITE_PORT=5172
TENANT_PORTAL_PORT=5173

DATABASE_URL=postgres://postgres:postgres@localhost:5432/superapp


⚠️ Do not commit .env.
Use .env.example for documentation only.

3. Start the main dev stack

This runs:

API

tenant portal

admin portal

marketing site

pnpm run dev


Default local URLs:

API: http://localhost:3002

Tenant Portal: http://localhost:5173

Admin Portal: http://localhost:5171

Marketing Site: http://localhost:5172

Ports are strict. If a port is in use, the app will fail fast instead of silently changing ports.

Resetting the Dev Environment (Windows)

If ports get stuck due to orphaned Node processes:

pnpm run kill:node
pnpm run dev


This is safe during development and often the fastest fix.

Running Individual Apps
API only
pnpm --filter=api dev

Tenant Portal only
pnpm --filter=tenant-portal dev

Worker only
pnpm --filter=worker dev


The worker does not run automatically with pnpm run dev by design.

Worker Architecture

The worker:

polls a Postgres jobs table

atomically claims jobs using FOR UPDATE SKIP LOCKED

processes one job at a time

supports multiple concurrent workers safely

shuts down cleanly on SIGINT / SIGTERM

Job lifecycle:

queued → running → completed | failed


The worker loads environment variables from the root .env via DOTENV_CONFIG_PATH.

Common Scripts
Dev
pnpm run dev

Reset dev (Windows)
pnpm run dev:reset:win

Build everything
pnpm run build

Typecheck everything
pnpm run typecheck

Lint
pnpm run lint

Environment Variable Conventions

Root .env
Shared configuration for all apps.

App-level .env files
Allowed only for app-specific overrides.
Never committed.

Vite apps
Only variables prefixed with VITE_ are exposed to browser code.

Turbo & pnpm Notes

All apps live under apps/* and are included in the pnpm workspace.

Turbo tasks are defined in turbo.json.

dev tasks are long-running and uncached.

build, typecheck, lint, and test are pipeline-aware.

Troubleshooting
“Port already in use”

Run pnpm run kill:node

Restart dev

API can’t see env vars

Confirm .env exists at repo root

Confirm API is started via pnpm (not manually with node)

Worker not picking up jobs

Confirm DATABASE_URL

Confirm jobs exist with state='queued'

Check worker logs for claim attempts

Contributing Guidelines

Do not commit .env

Keep scripts consistent across apps

Prefer adding no-op scripts (lint, typecheck) rather than omitting them

Keep ports and URLs centralized in root .env

Questions / Help

If you’re unsure where something lives:

check apps/ vs packages/

search for the env var in .env.example

ask before deleting files — this repo is intentionally modular
