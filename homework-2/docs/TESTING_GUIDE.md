# Testing Guide (QA Engineers)

This guide explains how to run the automated test suite, where to find sample import files, what to manually verify in the API, and what performance expectations exist.

## Test Pyramid

```mermaid
flowchart TB
  A[End-to-end & Workflow Tests\nSmallest layer\nHigh confidence, slower] --> B[Integration / API Tests\nMedium layer\nRoutes + storage + parsing] --> C[Unit Tests\nLargest layer\nSchemas, parsers, classifiers]

  C --- C1[Zod validation\n(ticket model)]
  C --- C2[CSV/JSON/XML parsers]
  C --- C3[Classification rules]

  B --- B1[/tickets CRUD via Supertest]
  B --- B2[/tickets/import parsing + summary]
  B --- B3[/tickets/:id/auto-classify]

  A --- A1[Ticket lifecycle workflow]
  A --- A2[Import + auto-classify verification]
  A --- A3[Concurrency scenarios]
```

## How to Run Tests

### Prerequisites

- Node.js 18+ (Node 20/22 recommended)
- Dependencies installed: `npm install`

### Run the full suite (with coverage)

```bash
npm test
```

- Produces a coverage report under `coverage/`.
- Enforces global coverage thresholds (85% branches/functions/lines/statements) via Jest config.

### Run tests in watch mode

```bash
npm run test:watch
```

### Run a single test file

```bash
npx jest tests/ticket_api.test.ts
```

### Run a single test by name

```bash
npx jest -t "Performance Tests"
```

### Run “all” checks (unit/integration + load)

```bash
npm run test:all
```

## Sample Test Data Locations

### Import fixtures used by automated tests

- Valid samples:
  - [tests/fixtures/valid_tickets.csv](tests/fixtures/valid_tickets.csv)
  - [tests/fixtures/valid_tickets.json](tests/fixtures/valid_tickets.json)
  - [tests/fixtures/valid_tickets.xml](tests/fixtures/valid_tickets.xml)
- Invalid samples (schema/field errors):
  - [tests/fixtures/invalid_tickets.csv](tests/fixtures/invalid_tickets.csv)
  - [tests/fixtures/invalid_tickets.json](tests/fixtures/invalid_tickets.json)
  - [tests/fixtures/invalid_tickets.xml](tests/fixtures/invalid_tickets.xml)
- Malformed samples (parse errors):
  - [tests/fixtures/malformed.csv](tests/fixtures/malformed.csv)
  - [tests/fixtures/malformed.json](tests/fixtures/malformed.json)
  - [tests/fixtures/malformed.xml](tests/fixtures/malformed.xml)

### Postman collection (optional, for manual checks)

- [postman/support-system.postman_collection.json](postman/support-system.postman_collection.json)
- [postman/support-system.postman_environment.json](postman/support-system.postman_environment.json)

## Manual Testing Checklist

Use this checklist for quick API sanity checks outside of Jest.

### Setup

1. Start the API:

```bash
npm run dev
```

2. Confirm service is up:

```bash
curl http://localhost:3000/health
```

Expected: `200`.

### Ticket CRUD

- Create ticket (`POST /tickets`)
  - Expected: `201`, response includes `id`, `created_at`, `updated_at`
- Read ticket (`GET /tickets/:id`)
  - Expected: `200` and correct persisted values
- Update ticket (`PUT /tickets/:id`)
  - Update `status` (e.g., `in_progress`) and verify `updated_at` changes
- Delete ticket (`DELETE /tickets/:id`)
  - Expected: `204`
  - Follow-up `GET /tickets/:id` should return `404`

### Validation / Error handling

- Send invalid email in `customer_email`
  - Expected: `400` with validation details
- Send too-short `description` (< 10 chars)
  - Expected: `400`
- Send invalid enums (e.g., `priority: "super-high"`)
  - Expected: `400`
- Request a non-existing ID
  - Expected: `404`

### Filtering

- Create multiple tickets across different categories/priorities
- List tickets with filtering (`GET /tickets?category=technical_issue&priority=high`)
  - Expected: `200`, `total` matches and items satisfy filters

### Bulk import (CSV/JSON/XML)

- Import a valid file via `POST /tickets/import` (multipart form-data)
  - Expected: `201` with summary: `total`, `successful`, `failed` and per-record errors
- Import invalid data (schema errors)
  - Expected: `201` summary shows failures with clear reasons
- Import malformed data (broken CSV/JSON/XML)
  - Expected: `400` with a meaningful parse error message

### Auto-classification

- Create a ticket with classification keywords in the text (e.g., “can’t access”, “critical”, “refund”)
- Call `POST /tickets/:id/auto-classify`
  - Expected: `200` and response includes:
    - `category`, `priority`
    - `confidence` (0..1)
    - `reasoning`, `keywords`
- Verify the stored ticket reflects classification output (if the implementation persists it)

## Performance Benchmarks

These benchmarks are encoded in the automated tests. Use them as *regression guards* (if they fail, treat it as a performance regression or a noisy environment).

| Benchmark | Where | How to run | Pass criteria | Notes |
|---|---|---|---|---|
| Create 100 tickets | [tests/performance.test.ts](tests/performance.test.ts) | `npx jest tests/performance.test.ts` | < 5s total | Runs in-process via Supertest |
| Filtered list latency | [tests/performance.test.ts](tests/performance.test.ts) | `npx jest tests/performance.test.ts` | < 100ms | `GET /tickets?category=...` |
| Rapid updates | [tests/performance.test.ts](tests/performance.test.ts) | `npx jest tests/performance.test.ts` | < 1s total | 20 concurrent `PUT` requests |
| List 200 tickets | [tests/performance.test.ts](tests/performance.test.ts) | `npx jest tests/performance.test.ts` | < 200ms | Validates response `total = 200` |
| Load test (autocannon) | [tests/load/concurrent.load.ts](tests/load/concurrent.load.ts) | `npm run test:load` | p99 < 200ms (20 conns), 0 errors | Writes logs under `logs/` |

Load test options:

```bash
npm run test:load -- --duration=15
```

If a benchmark is flaky on CI or a slower laptop, rerun once and compare results in the generated load-test log file.
