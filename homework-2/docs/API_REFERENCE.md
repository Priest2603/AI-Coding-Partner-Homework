# API Reference (Customer Support Tickets)

This document describes the public REST API for managing customer support tickets.

## Table of Contents

- [Base URL](#base-url)
- [Content Types](#content-types)
- [Error Handling](#error-handling)
- [Data Models](#data-models)
  - [Enums](#enums)
  - [Metadata](#metadata)
  - [CreateTicket](#createticket-request-body)
  - [Ticket](#ticket-response-object)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Ticket Operations](#ticket-operations)
  - [Bulk Import](#bulk-import)
- [Common Failures](#common-failures)

---

## Base URL

- **Local Development**: `http://localhost:3000`
- All endpoints below are relative to the base URL

## Content Types

**JSON Endpoints:**
- Request: `Content-Type: application/json`
- Response: `application/json`

**File Upload:**
- Request: `multipart/form-data`

---

## Error Handling

All error responses return JSON with a consistent structure.

### Standard Error Format

```json
{
  "error": "Human readable message",
  "details": "Optional, any type"
}
```

### Validation Error Format

When request body validation fails (e.g., invalid email, wrong enum value), the API returns HTTP `400`:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "customer_email", "message": "Invalid email format" },
    { "field": "description", "message": "description must be at least 10 characters" }
  ]
}
```

### HTTP Status Codes

| Status Code | Meaning |
|------------:|---------|
| **200** | Success |
| **201** | Created (including bulk import) |
| **204** | Deleted (no response body) |
| **400** | Invalid request / validation failed |
| **404** | Resource not found |
| **500** | Internal server error |

---

## Data Models

### Enums

#### Category

```
account_access | technical_issue | billing_question | feature_request | bug_report | other
```

#### Priority

```
urgent | high | medium | low
```

#### Status

```
new | in_progress | waiting_customer | resolved | closed
```

#### Metadata.source

```
web_form | email | api | chat | phone
```

#### Metadata.device_type

```
desktop | mobile | tablet
```

### Metadata

Optional metadata object for tracking ticket source and context:

```json
{
  "source": "api",
  "browser": "Chrome/120.0",
  "device_type": "desktop"
}
```

**Fields:**
- `source` *(required if metadata is provided)* - Origin of the ticket
- `browser` *(optional)* - Browser information
- `device_type` *(optional)* - Type of device used

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

### Ticket (Response Object)

Complete ticket object returned by the API, includes all fields from [CreateTicket](#createticket-request-body) plus server-generated fields:

```json
{
  "id": "3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2",
  "subject": "Can't access my account",
  "category": "account_access",
  "priority": "urgent",
  "status": "new",
  "created_at": "2026-02-02T12:34:56.789Z",
  "updated_at": "2026-02-02T12:34:56.789Z",
  "resolved_at": null
}
```

#### Server-Generated Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique ticket identifier |
| `created_at` | string (ISO-8601) | Ticket creation timestamp |
| `updated_at` | string (ISO-8601) | Last update timestamp |
| `resolved_at` | string (ISO-8601) \| null | Set automatically when status becomes `resolved` or `closed` |

---

## API Endpoints

### Health Check

#### `GET /health`

Checks if the service is running.

**Response (`200`)**

```json
{ "status": "ok" }
```

**Example Request**

```bash
curl -s http://localhost:3000/health
```

---

### Ticket Operations

#### `POST /tickets`

Create a new ticket.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `auto_classify` | boolean | If `true`, forces automatic [category](#category)/[priority](#priority) assignment (even if provided in request body) |

**Auto-classification Behavior:**
- When `auto_classify=true`: API classifies the ticket using `subject` + `description`
- When `category` or `priority` is missing: API auto-classifies and fills them in
- When auto-classification runs: Response includes `classification_confidence` and `classification_reasoning`

**Request Body**: [CreateTicket](#createticket-request-body)

**Response (`201`)**

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

**Example Request (Basic Create)**

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

**Example Request (Force Auto-classify)**

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

#### `GET /tickets`

List tickets, optionally filtered.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | [Category](#category) | Filter by category |
| `priority` | [Priority](#priority) | Filter by priority |
| `status` | [Status](#status) | Filter by status |

**Response (`200`)**

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

**Example Request (No Filters)**

```bash
curl -s http://localhost:3000/tickets
```

**Example Request (With Filters)**

```bash
curl -s 'http://localhost:3000/tickets?category=account_access&priority=urgent&status=new'
```

---

#### `GET /tickets/:id`

Get a single ticket by ID.

**Response (`200`)**: [Ticket](#ticket-response-object)

**Response (`404`)**

```json
{ "error": "Ticket with id '...' not found" }
```

**Example Request**

```bash
curl -s http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2
```

---

#### `PUT /tickets/:id`

Update an existing ticket.

**Request Body**

Supports the same fields as [CreateTicket](#createticket-request-body), but all fields are optional:
- Values are validated the same way as on creation
- Setting `status` to `resolved` or `closed` automatically sets `resolved_at` (if previously empty)

**Request Body Example**

```json
{
  "status": "in_progress",
  "assigned_to": "agent_17",
  "tags": ["login", "2fa", "vip"]
}
```

**Response (`200`)**: Updated [Ticket](#ticket-response-object)

**Example Request**

```bash
curl -s -X PUT http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2 \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress","assigned_to":"agent_17"}'
```

---

#### `DELETE /tickets/:id`

Delete a ticket.

**Response (`204`)**: No content

**Example Request**

```bash
curl -i -X DELETE http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2
```

---

#### `POST /tickets/:id/auto-classify`

Automatically classify an existing ticket (updates its [category](#category) and [priority](#priority)).

**Response (`200`)**

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

**Example Request**

```bash
curl -s -X POST http://localhost:3000/tickets/3b5b7a3e-0b1e-4d76-a2f7-7fd0c2d4f9a2/auto-classify
```

---

### Bulk Import

#### `POST /tickets/import`

Upload a CSV/JSON/XML file and import multiple tickets at once.

**Request Format**

- Content-Type: `multipart/form-data`
- Field name: `file`
- Supported extensions: `.csv`, `.json`, `.xml`
- File size limit: **10MB**

**Response (`201`)**

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

**Example Request (CSV)**

```bash
curl -s -X POST http://localhost:3000/tickets/import \
  -F 'file=@./tests/fixtures/valid_tickets.csv'
```

**Example Request (JSON)**

```bash
curl -s -X POST http://localhost:3000/tickets/import \
  -F 'file=@./tests/fixtures/valid_tickets.json'
```

**Example Request (XML)**

```bash
curl -s -X POST http://localhost:3000/tickets/import \
  -F 'file=@./tests/fixtures/valid_tickets.xml'
```

#### Import File Formats

##### CSV Format

**Required Columns:**
- `customer_id`, `customer_email`, `customer_name`
- `subject`, `description`
- `category`, `priority`, `status`

**Optional Columns:**
- `assigned_to`
- `tags` (pipe-separated string, e.g., `login|2fa|vip`)
- Metadata fields:
  - `metadata_source` or `source`
  - `metadata_browser` or `browser`
  - `metadata_device_type` or `device_type`

##### JSON Format

Accepts either:
- A single ticket object, or
- An array of ticket objects

Each object must match the [CreateTicket](#createticket-request-body) schema.

##### XML Format

Accepts either root structure:
- `<tickets><ticket>...</ticket></tickets>` (multiple tickets)
- `<ticket>...</ticket>` (single ticket)

Tags can be provided as:
- `<tags><tag>a</tag><tag>b</tag></tags>`

---

## Common Failures

### Invalid Filter Value

**Request:**

```bash
curl -s 'http://localhost:3000/tickets?priority=super-high'
```

**Response (`400`):**

```json
{ "error": "Invalid priority filter: super-high" }
```

### Missing Import File

**Request:**

```bash
curl -s -X POST http://localhost:3000/tickets/import
```

**Response (`400`):**

```json
{ "error": "No file uploaded. Please provide a file with field name \"file\"" }
```
