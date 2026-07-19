# Attendly

Monorepo for Attendly — covers backend API (Node.js + Express + MongoDB) and the Angular admin portal. The Flutter mobile app is intentionally excluded from this scaffolding (per build plan, Phase 3 can be added later).

> **Status:** Scaffolding only. Folder structure, configurations, Mongoose schemas, route definitions, controller signatures, Joi validators, Angular feature components, guards, interceptors, and services are in place. **No business logic has been implemented yet** — every controller returns `501 Not Implemented` and every service throws `Error('… not implemented')`. This is intentional so the structure can be reviewed before any logic lands.


Email/Username: admin@attendly.com
Password: password123

## Tech Stack

| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| Backend API  | Node.js + Express + Mongoose + MongoDB    |
| Auth         | JWT (access + refresh) + RBAC middleware  |
| Validation   | Joi schemas on all routes                 |
| Admin portal | Angular 18 (standalone) + Angular Material |
| Charts       | Chart.js (planned for dashboard/analytics) |
| Maps         | Leaflet (planned for office-location picker) |
| Testing      | Jest + Supertest (API), Karma+Jasmine (Angular) |
| Container    | Docker Compose for local MongoDB          |

## Repository Layout

```
workforce-management/
├── apps/
│   ├── api/                            # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── config/                 # env + db connection
│   │   │   ├── models/                 # Mongoose schemas (6 collections)
│   │   │   ├── routes/                 # Express routers per feature
│   │   │   ├── controllers/            # HTTP handlers (stubs)
│   │   │   ├── services/               # business-logic layer (stubs)
│   │   │   ├── middlewares/            # auth, RBAC, validate, error, rateLimit
│   │   │   ├── validators/             # Joi schemas per feature
│   │   │   ├── utils/                  # haversine, time, apiResponse, logger
│   │   │   └── tests/
│   │   ├── tests/                      # Jest integration tests
│   │   ├── .env.example
│   │   ├── jest.config.js
│   │   └── package.json
│   │
│   └── admin-portal/                   # Angular admin portal
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/
│       │   │   │   ├── guards/         # authGuard, roleGuard
│       │   │   │   ├── interceptors/   # authInterceptor, errorInterceptor
│       │   │   │   ├── services/       # auth, employee, shift, attendance, report, settings
│       │   │   │   └── models/         # TypeScript domain models
│       │   │   ├── layout/
│       │   │   │   ├── main-layout/    # shell component
│       │   │   │   ├── header/
│       │   │   │   └── sidebar/
│       │   │   ├── features/
│       │   │   │   ├── auth/login/
│       │   │   │   ├── auth/forgot-password/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── employees/      # list + form
│       │   │   │   ├── shifts/
│       │   │   │   ├── attendance/
│       │   │   │   ├── reports/
│       │   │   │   └── settings/
│       │   │   ├── app.component.ts
│       │   │   ├── app.config.ts
│       │   │   └── app.routes.ts       # lazy-loaded feature routes
│       │   ├── environments/
│       │   ├── assets/
│       │   ├── index.html
│       │   ├── main.ts
│       │   └── styles.scss
│       ├── angular.json
│       ├── proxy.conf.json             # dev proxy → :4000
│       ├── tsconfig*.json
│       └── package.json
│
├── docker-compose.yml                  # MongoDB + Mongo Express
├── .editorconfig / .gitignore / .prettierrc.json
├── .env.example
└── package.json                        # npm workspaces root
```

## Getting Started

### 1. Install dependencies

```bash
cd workforce-management
npm install
```

### 2. Start MongoDB locally

```bash
docker compose up -d
# Mongo Express UI → http://localhost:8081
```

### 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
# Edit JWT secrets, SMTP credentials, etc.
```

### 4. Run the API

```bash
npm run api:dev          # http://localhost:4000
```

### 5. Run the admin portal

```bash
npm run portal:dev       # http://localhost:4200 (proxies /api → :4000)
```

## Useful Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run api:dev`   | Start API in dev mode (nodemon)          |
| `npm run api:test`  | Run Jest test suite                      |
| `npm run portal:dev`| Serve Angular app with HMR               |
| `npm run portal:build` | Production build                      |
| `npm run docker:up` | Start MongoDB via docker compose         |
| `npm run docker:down` | Stop MongoDB                            |

## What's Implemented vs. Pending

| Area                          | Status      | Notes                                                  |
| ----------------------------- | ----------- | ------------------------------------------------------ |
| Project + folder structure    | Done        | All folders and config files in place                  |
| Mongoose schemas + indexes    | Done        | All 6 collections + compound unique + TTL indexes     |
| Express app wiring            | Done        | helmet, cors, morgan, compression, error handler      |
| Route definitions             | Done        | All routes from §6 mounted with auth + RBAC            |
| Joi validators                | Done        | Per-feature schemas for body + query                   |
| Controller signatures         | Stub only   | Returns `501 Not Implemented`                          |
| Service layer                 | Stub only   | Throws `Error('… not implemented')`                    |
| Attendance engine             | Stub only   | `utils/time.js` has the formula in JSDoc, not yet coded |
| Report export (Excel/PDF/CSV) | Stub only   | `report.service.export` placeholder                    |
| Angular routes + lazy loading | Done        | All feature routes configured                          |
| Angular services + HTTP clients | Done      | Methods map 1:1 with backend endpoints                 |
| Angular UI shells             | Layout only | Login form, dashboard tiles, tables, filters — no live data |
| Auth token refresh flow       | Stub        | `error.interceptor.ts` has the TODO documented         |

## Next Steps (per build plan)

1. **Phase 1 — Backend foundation:** implement `auth.service`, `employee.service`, `attendance.service` (with haversine + timezone logic from `utils/time.js`), `report.service` (with exceljs/pdfkit/json2csv).
2. **Phase 2 — Admin portal:** wire services to component templates, build office-location map picker (Leaflet), add Chart.js widgets to dashboard.
3. **Phase 4 — QA:** Jest + Supertest integration tests for every endpoint, especially the attendance engine edge cases (grace-period boundary, midnight rollover, idempotent check-in, GPS boundary).

## See Also

- `workforce-management-build-plan.md` — the original plan this structure was scaffolded from (in `/upload/`).
