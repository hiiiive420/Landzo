# LANDZO Technical Decisions

## Locked Baseline

```text
Language: JavaScript
Module system: ES Modules / ESM
Package manager: pnpm
Node runtime: Node.js 24.x LTS
Backend framework: Express.js 5.x
Database ODM: Mongoose 9.x
Request/environment validation direction: Zod
Testing direction: Vitest + Supertest
Linting: ESLint
Formatting: Prettier
API base namespace: /api/v1
```

LANDZO is a JavaScript MERN project. It is not a TypeScript project.

Do not create `.ts`, `.tsx`, or `tsconfig.json` unless explicitly requested in a future step.


## Storage Decisions

```text
Public image/media provider: Cloudinary - LOCKED; integration deferred until Media implementation
Private document storage: DEFERRED - resolve before Private Documents implementation
```

Cloudinary applies later to public media such as property images, thumbnails, blog images, homepage/CMS images, and staff/profile images.

Cloudinary integration is not part of Step 1. Do not install or configure Cloudinary until the Media module implementation.

Private property documents require a stricter authenticated or signed-delivery design and must not be assumed to use public Cloudinary delivery.

## JavaScript File Conventions

Future backend code should use JavaScript files.

Examples:

```text
app.js
server.js
auth.routes.js
auth.controller.js
auth.service.js
property.model.js
property.routes.js
property.controller.js
property.service.js
property.validator.js
property.serializer.js
```

Prefer clear domain-specific filenames over vague filenames such as `controller.js`, `service.js`, or `model.js` when that improves maintainability.

## ESM Convention

Use modern ES Module syntax when executable development begins:

```js
import express from "express";
import mongoose from "mongoose";

export default router;
```

Do not use CommonJS as the default unless a future technical constraint requires reassessment.

## Type Checking Status

```text
typecheck: N/A - JavaScript project
```

Do not introduce TypeScript solely to obtain type checking.

## Package And Runtime Baseline

The repository should use:

- `.nvmrc` with `24`
- pnpm when package management begins

Do not create `package.json` or install dependencies in Step 0.1.

## API Namespace

All backend APIs should be planned under:

```text
/api/v1
```

Future separation should remain possible:

```text
/api/v1/admin/...
/api/v1/public/...
```

Exact endpoint contracts will be defined during their relevant implementation steps.

## Staff Authentication Decision

Step 2 implements internal staff authentication with JWT access tokens, opaque refresh tokens stored as HMAC hashes, HttpOnly refresh cookies, refresh rotation, server-side revocation, failed-login lockout, and explicit staff DTOs.

Password hashing uses `bcryptjs` with cost factor 12, aligned with the inspected YOGO implementation. Native `bcrypt` was not retained because pnpm blocked its native build script in this environment; `bcryptjs` avoids that build dependency while preserving a bcrypt-compatible hashing approach.

Password reset email delivery is deferred until an email provider is approved.