# Research Notes: Framework Investigation with context7 MCP

## Query 1: Decimal.js for Monetary Arithmetic

**Search Query:** monetary arithmetic with Decimal.js - rounding modes, toFixed, Decimal.js usage for banking transactions

**context7 Library ID:** `/mikemcl/decimal.js`

**Library Metadata:**
- Source Reputation: High
- Benchmark Score: 85.75
- Code Snippets: 167
- Description: An arbitrary-precision Decimal type for JavaScript that handles integers, floats, and various number bases, replicating many Number.prototype and Math methods.

**Attempted Docs Topic:** rounding modes toFixed monetary formatting and comparison operations for financial calculations

**Applied Pattern:**
- All monetary amounts parsed via `new Decimal(amount)` instead of `parseFloat` or `Number()`
- All monetary output formatted via `.toFixed(2)` for 2-decimal consistency
- Arithmetic operations: `.mul()`, `.plus()`, `.minus()` for fee calculations and currency conversion
- Comparison operations: `.gt()`, `.gte()`, `.lt()` for fraud scoring thresholds (e.g., `amount.gt(10000)`)
- Decimal constants for exchange rates and fee percentages to maintain precision

---

## Query 2: Zod for Schema Validation

**Search Query:** runtime validation with Zod - schemas, safeParse, error handling for TypeScript data validation

**context7 Library ID:** `/colinhacks/zod`

**Library Metadata:**
- Source Reputation: High
- Benchmark Score: 88.68
- Code Snippets: 520
- Project Version: ^3.22.4
- Description: Zod is a TypeScript-first schema validation library that provides static type inference for strongly typed, validated data.

**Attempted Docs Topic:** safeParse error handling and schema validation without throwing exceptions

**Applied Pattern:**
- Define schemas for raw transaction input using `z.object()`, `z.string()`, `z.number()` primitives
- Use `.safeParse()` instead of `.parse()` to avoid throwing exceptions
- Pattern: `const result = schema.safeParse(data); if (!result.success) { /* handle errors */ }`
- Infer TypeScript types from Zod schemas using `z.infer<typeof schema>`
- Enables "agents never throw" design: validation failures return rejected results, not exceptions

---

## Implementation Strategy

1. **Decimal.js** foundation for all monetary calculations (fraud detection thresholds, currency conversion, fee arithmetic)
2. **Zod** foundation for all input validation with safe error handling (no exceptions thrown by agents)
3. Both libraries support the core design principle: **agents return results, never throw**
