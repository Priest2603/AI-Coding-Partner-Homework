# API Reference (Customer Support Tickets)

This document describes the public REST API for managing customer support tickets.

## Base URL

- Default (local): `http://localhost:3000`
- All endpoints below are relative to the base URL.

## Content Types

- JSON endpoints use:
  - Request: `Content-Type: application/json`
  - Response: `application/json`
- File upload uses:
  - Request: `multipart/form-data`

## Errors

All error responses are JSON.

### Standard error format

```json
{
  "error": "Human readable message",
  "details": "Optional, any type"
}
```

### Validation error format

When request body validation fails (e.g., invalid email, wrong enum value), the API returns `400`:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "customer_email", "message": "Invalid email format" },
    { "field": "description", "message": "description must be at least 10 characters" }
  ]
}
```

### Common status codes

| Status | Meaning |
|-------:|---------|
| 200 | Success |
| 201 | Created (including bulk import) |
| 204 | Deleted (no response body) |
| 400 | Invalid request / validation failed |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Data Models

### Enums

**Category**
- `account_access`
- `technical_issue`
- `billing_question`
- `feature_request`
- `bug_report`
- `other`

**Priority**
- `urgent`
- `high`
- `medium`
- `low`

**Status**
- `new`
- `in_progress`
- `waiting_customer`
- `resolved`
- `closed`

**Metadata.source**
- `web_form`
- `email`
- `api`
- `chat`
- `phone`

**Metadata.device_type**
- `desktop`
- `mobile`
- `tablet`

### Metadata

```json
{
  "source": "api",
  "browser": "Chrome/120.0",
  "device_type": "desktop"
}
```

- `source` is required if `metadata` is provided.
- `browser` is optional.
- `device_type` is optional.

### CreateTicket (request body)

```json
{
  "customer_id": "cust_123",
  "customer_email": "alex@example.com",
  "customer_name": "Alex Johnson",
  "subject": "Can’t access my account",
  "description": "I can’t log in after enabling 2FA. Please help.",
  "tags": ["login", "2fa"],
  "metadata": { "source": "api", "device_type": "desktop" }
}
```

Validation rules (high-level):

- `customer_id`, `customer_name`: non-empty strings
- `customer_email`: valid email format
- `subject`: 1–200 characters
- `description`: 10–2000 characters
- `category`, `priority`: optional (can be auto-assigned)
- `status`: defaults to `new` if omitted
- `tags`: defaults to `[]` if omitted
- `assigned_to`: optional, may be `null`

### Ticket (response object)

A ticket returned by the API includes server-generated fields:

```json
{
  "id": "3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2",
  "subject": "Can’t access my account",
  "category": "account_access",
  "priority": "urgent",
  "status": "new",
  "created_at": "2026-02-02T12:34:56.789Z",
  "updated_at": "2026-02-02T12:34:56.789Z",
  "resolved_at": null
}
```

Notes:
- `created_at` and `updated_at` are ISO-8601 datetimes.
- `resolved_at` is set automatically when `status` becomes `resolved` or `closed`.

---

## Endpoints

### Health

#### GET /health

Checks if the service is running.

**Response (200)**

```json
{ "status": "ok" }
```

**cURL**

```bash
curl -s http://localhost:3000/health
```

---

### Tickets

#### POST /tickets

Create a new ticket.

**Query parameters**

| Name | Type | Description |
|------|------|-------------|
| `auto_classify` | boolean | If `true`, forces automatic category/priority assignment (even if you provided them). |

Automatic classification behavior:
- If `auto_classify=true`, the API classifies the ticket using the provided `subject` + `description`.
- If `category` or `priority` is missing, the API also classifies and fills them in.
- When auto-classification runs, the response includes `classification_confidence` and `classification_reasoning`.

**Request body**: CreateTicket (see model above)

**Response (201)**

If auto-classification runs:

```json
{
  "id": "3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2",
  "subject": "Can’t access my account",
  "category": "account_access",
  "priority": "urgent",
  "status": "new",
  "created_at": "2026-02-02T12:34:56.789Z",
  "updated_at": "2026-02-02T12:34:56.789Z",
  "resolved_at": null,
  "classification_confidence": 0.75,
  "classification_reasoning": "Detected keywords: 'login', '2fa', 'can\u2019t access'"
}
```

**cURL (basic create)**

```bash
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{
    "customer_id":"cust_123",
    "customer_email":"alex@example.com",
    "customer_name":"Alex Johnson",
    "subject":"Invoice charged twice",
    "description":"I was charged twice for the same invoice. Please refund.",
    "category":"billing_question",
    "priority":"high",
    "status":"new",
    "tags":["billing","refund"],
    "metadata":{"source":"api","device_type":"desktop"}
  }'
```

**cURL (force auto-classify)**

```bash
curl -s -X POST 'http://localhost:3000/tickets?auto_classify=true' \
  -H 'Content-Type: application/json' \
  -d '{
    "customer_id":"cust_999",
    "customer_email":"sam@example.com",
    "customer_name":"Sam Lee",
    "subject":"Can\u0027t access my account",
    "description":"After enabling 2FA I am locked out. This is urgent."
  }'
```

---

#### GET /tickets

List tickets, optionally filtered.

**Query parameters**

| Name | Type | Description |
|------|------|-------------|
| `category` | Category | Filter by category |
| `priority` | Priority | Filter by priority |
| `status` | Status | Filter by status |

**Response (200)**

```json
{
  "total": 2,
  "tickets": [
    {
      "id": "3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2",
      "subject": "Can’t access my account",
      "category": "account_access",
      "priority": "urgent",
      "status": "new",
      "created_at": "2026-02-02T12:34:56.789Z",
      "updated_at": "2026-02-02T12:34:56.789Z",
      "resolved_at": null
    }
  ]
}
```

**cURL (no filters)**

```bash
curl -s http://localhost:3000/tickets
```

**cURL (with filters)**

```bash
curl -s 'http://localhost:3000/tickets?category=account_access&priority=urgent&status=new'
```

---

#### GET /tickets/:id

Get a single ticket by id.

**Response (200)**: Ticket

**Response (404)**

```json
{ "error": "Ticket with id '...' not found" }
```

**cURL**

```bash
curl -s http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2
```

---

#### PUT /tickets/:id

Update a ticket.

- Body supports the same fields as CreateTicket, but all fields are optional.
- Values are validated the same way as on creation.
- If you set `status` to `resolved` or `closed`, `resolved_at` is set automatically (if it was previously empty).

**Request body example**

```json
{
  "status": "in_progress",
  "assigned_to": "agent_17",
  "tags": ["login", "2fa", "vip"]
}
```

**Response (200)**: updated Ticket

**cURL**

```bash
curl -s -X PUT http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2 \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress","assigned_to":"agent_17"}'
```

---

#### DELETE /tickets/:id

Delete a ticket.

**Response (204)**: no body

**cURL**

```bash
curl -i -X DELETE http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2
```

---

#### POST /tickets/:id/auto-classify

Auto-classify an existing ticket (updates its `category` and `priority`).

**Response (200)**

```json
{
  "ticket": {
    "id": "3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2",
    "subject": "Can’t access my account",
    "category": "account_access",
    "priority": "urgent",
    "status": "new",
    "created_at": "2026-02-02T12:34:56.789Z",
    "updated_at": "2026-02-02T12:36:10.000Z",
    "resolved_at": null
  },
  "classification": {
    "category": "account_access",
    "priority": "urgent",
    "confidence": 0.75,
    "reasoning": "Detected keywords: 'login', '2fa', 'can\u2019t access'",
    "keywords_found": ["login", "2fa", "can\u2019t access"]
  }
}
```

**cURL**

```bash
curl -s -X POST http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2/auto-classify
```

---

### Bulk Import

#### POST /tickets/import

Upload a CSV/JSON/XML file and import multiple tickets at once.

**Request**

- `multipart/form-data`
- Field name: `file`
- Supported filename extensions: `.csv`, `.json`, `.xml`
- File size limit: 10MB

**Response (201)**

Always returns a summary, including partial failures:

```json
{
  "total": 3,
  "successful": 2,
  "failed": 1,
  "errors": [
    {
      "line": 4,
      "record": {"customer_email":"not-an-email"},
      "reason": "Invalid email format"
    }
  ],
  "tickets": [
    { "id": "...", "customer_id": "...", "subject": "...", "created_at": "...", "updated_at": "...", "resolved_at": null }
  ]
}
```

**cURL (CSV)**

```bash
curl -s -X POST http://localhost:3000/tickets/import \
  -F 'file=@./tests/fixtures/valid_tickets.csv'
```

**cURL (JSON)**

```bash
curl -s -X POST http://localhost:3000/tickets/import \
  -F 'file=@./tests/fixtures/valid_tickets.json'
```

**cURL (XML)**

```bash
curl -s -X POST http://localhost:3000/tickets/import \
  -F 'file=@./tests/fixtures/valid_tickets.xml'
```

##### Import file formats

**CSV**

- Required columns:
  - `customer_id`, `customer_email`, `customer_name`, `subject`, `description`, `category`, `priority`, `status`
- Optional columns:
  - `assigned_to`, `tags`
  - Metadata fields (any of these names):
    - `metadata_source` or `source`
    - `metadata_browser` or `browser`
    - `metadata_device_type` or `device_type`
- `tags` can be a pipe-separated string, e.g. `login|2fa|vip` (it will be converted into an array).

**JSON**

- Accepts either:
  - a single ticket object, or
  - an array of ticket objects
- Each object must match the CreateTicket model.

**XML**

- Accepts either of these root structures:
  - `<tickets><ticket>...</ticket></tickets>`
  - `<ticket>...</ticket>`
- Tags can be provided as:
  - `<tags><tag>a</tag><tag>b</tag></tags>`

---

## Examples: Common Failures

### Invalid filter value

Request:

```bash
curl -s 'http://localhost:3000/tickets?priority=super-high'
```

Response (400):

```json
{ "error": "Invalid priority filter: super-high" }
```

### Missing import file

Request:

```bash
curl -s -X POST http://localhost:3000/tickets/import
```

Response (400):

```json
{ "error": "No file uploaded. Please provide a file with field name \"file\"" }
```
