# LANDZO Codex Working Rules

## Stack

- JavaScript only - no TypeScript
- MERN
- Node.js 24.x LTS
- pnpm
- Express 5.x
- MongoDB + Mongoose 9.x
- Zod
- Vitest + Supertest
- React + Vite
- API namespace `/api/v1`

## Architecture

- Use feature/domain-based modules.
- Backend flow is route -> controller -> service -> model.
- Keep controllers thin.
- Treat the backend as authoritative.
- Do not perform direct mass assignment from `req.body`.
- Reuse existing helpers and patterns before creating duplicates.

## Security

- Never expose or log secrets.
- Never copy `.env`, credentials, API keys, DB URIs, or tokens.
- Refresh token remains an HttpOnly cookie.
- Frontend access token remains memory-only.
- Public Property media and private documents are separate systems.
- Private data must never enter public DTOs.

## Reuse

When equivalent functionality exists in sibling Hiiiive projects such as YOGO TOURS or AMUDA:

- Inspect source read-only.
- Reuse compatible patterns where useful.
- Adapt to LANDZO.
- Never modify sibling projects.
- Never copy their secrets, `.env`, credentials, project data, or incompatible business logic.

## Property Rules

- Types: Land, House, Apartment, Commercial.
- Transaction types: Sale, Rent, Lease; multiple allowed.
- Property code/type are immutable after creation.
- Pricing currencies: LKR/USD.
- Hidden price may still exist internally.
- Location hierarchy: Province -> District -> City -> Area.
- Area may be optional where current contract allows.
- Exact map location is stored as GeoJSON `[lng, lat]`.
- `isPublic`, `exploreMapEnabled`, and `featured` remain separate concepts.
- Public Property images use Cloudinary.
- New Property uploads are optimized WebP.
- Property codes are never reused.

## RBAC

- Use permission capabilities.
- Do not hard-code role-based page/API access.
- Owner safeguards must remain intact.

## Quality

- Preserve previously passing behavior.
- Do not disable lint rules to silence errors.
- During implementation, run focused checks first.
- Run full regression only when the task specifically requires it.
- Do not repeatedly run expensive full suites unnecessarily.

## Scope

- Implement only the requested task.
- Do not expand scope.
- Do not begin the next numbered step automatically.
- Do not auto-commit Git changes.
- Stop after the requested report.
