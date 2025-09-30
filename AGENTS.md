# Repository Guidelines

## Project Structure & Module Organization
- `src/app` stores App Router routes; segment flows (e.g. `src/app/(admin)`).
- `src/actions`, `src/lib`, and `src/context` host server actions, utilities, and providers; use the `@/` alias.
- Shared UI lives in `src/components`; group feature widgets and reuse Tailwind patterns.
- Database schemas and migrations sit in `drizzle/`; keep outputs in sync with `drizzle.config.ts`.
- Static assets go in `public/`; operational guides and scripts live in `docs/` and `scripts/`.

## Build, Test, and Development Commands
- `pnpm install` – install dependencies (Corepack pins pnpm@10).
- `pnpm dev` / `pnpm docflow:dev` – launch Turbopack; the latter seeds data.
- `pnpm build` / `pnpm start` – create the production bundle.
- `pnpm lint` – execute ESLint with Next core-web-vitals rules.
- `pnpm db:generate`, `pnpm db:push`, `pnpm db:studio` – handle Drizzle migrations and schema review.
- Run `./scripts/test-production.sh` or `./scripts/load-test.sh` for deployment and load checks.

## Coding Style & Naming Conventions
- TypeScript-first with strict mode; keep 2-space indentation and favor explicit return types on server actions and shared utilities.
- React components are PascalCase, hooks camelCase, Drizzle tables snake_case to mirror SQL.
- Tailwind CSS v4 powers styling; consolidate classes with `tailwind-merge` or `clsx`.
- Run `pnpm lint` before opening a PR; it catches unused `server`/`client` directives and a11y issues.

## Testing Guidelines
- Unit tests live next to sources under `__tests__/` folders using Jest-style specs (see `src/lib/utils/__tests__/month-year-generator.test.ts`).
- Name new specs with the `.test.ts` suffix; keep fixtures typed and mock Dates or env vars inside each suite.
- For workflow validation, rely on the bash harnesses (`test-production.sh`, `test-reset-simple.sh`) to spin up Docker-backed environments.
- Note coverage or manual checks in PRs until Jest runs in CI.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `style:`) with present-tense summaries under 80 chars.
- Each PR should outline scope, testing evidence, and configuration or migration scripts touched; link issue IDs when available.
- Attach before/after screenshots for UI updates and flag scripts reviewers must run (e.g. `pnpm db:push`).
- Keep branches rebased on `main`; avoid force-pushing shared branches without agreement.

## Security & Configuration Tips
- Store environment secrets in `.env.local` and mirror required keys from `docs/DOCKER_DEPLOYMENT.md` without committing them.
- Run `pnpm db:seed-roles` after schema tweaks to keep RBAC data in sync.
- Keep sensitive fixtures in `uploads/` only during development and purge them after review.
