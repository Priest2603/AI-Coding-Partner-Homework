# Project Context: Banking Transaction Pipeline

## Author
**Denys Usenko**

## Project Overview
AI-Powered Multi-Agent Banking Transaction Processing Pipeline -- a 3-agent TypeScript system that validates, fraud-scores, and settles banking transactions using file-based JSON message passing.

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| TypeScript | Primary language | ^5.3.2 |
| Decimal.js | Precise monetary arithmetic (never floating-point) | ^10.4.3 |
| Zod | Runtime schema validation for transactions and messages | ^3.22.4 |
| Winston | Structured JSON logging with PII masking | ^3.11.0 |
| Jest | Testing framework with ts-jest preset | ^29.7.0 |
| ts-node | TypeScript execution without pre-compilation | ^10.9.2 |
| uuid | Message envelope ID generation (v4) | ^9.0.0 |
| Node.js | Runtime environment | >= 18 |

## Directory Layout

```
homework-6/
  sample-transactions.json      # 8 raw banking transactions (input data)
  specification.md              # Full technical specification
  agents.md                     # This file -- project context
  package.json                  # Dependencies and scripts
  tsconfig.json                 # TypeScript config (ES2022, strict)
  jest.config.js                # Jest config (ts-jest, 80% coverage gate)
  src/
    integrator.ts               # Pipeline orchestrator -- loads transactions, runs agents
    agents/
      transactionValidator.ts   # Agent 1: validates fields, amounts, currencies
      fraudDetector.ts          # Agent 2: scores fraud risk (0-10 scale)
      settlementProcessor.ts    # Agent 3: currency conversion, fees, settlement
  tests/
    transactionValidator.test.ts
    fraudDetector.test.ts
    settlementProcessor.test.ts
    integration.test.ts         # End-to-end pipeline test
  shared/                       # File-based inter-agent communication
    input/                      # Integrator drops initial messages
    processing/                 # Agent working directory
    output/                     # Agent writes results for next agent
    results/                    # Final outcomes (8 JSON files)
  mcp/
    server.py                   # Custom MCP server (get_transaction_status, list_pipeline_results)
  .claude/
    commands/
      write-spec.md             # Skill: generate specification from template
      run-pipeline.md           # Skill: run full pipeline end-to-end
      validate-transactions.md  # Skill: validate transactions without full processing
    settings.json               # Hook: coverage gate blocks push if < 80%
  docs/
    screenshots/                # Required screenshots for submission
  research-notes.md             # context7 MCP queries documentation
```

## Conventions

### Code Style
- All source files in `src/`, all tests in `tests/`
- Each agent is a single TypeScript module exporting a `processMessage()` function
- Agents are pure functions (no side effects beyond logging) -- file I/O is handled by the integrator
- Use `interface` for type definitions, `const` for constants
- Export types, schemas, and utility functions for testability

### Monetary Values
- Always represented as strings in JSON (e.g., `"1500.00"`)
- Always parsed with `new Decimal(value)` -- never `parseFloat` or `Number()`
- Always formatted with `.toFixed(2)` for output
- Exchange rates and fee percentages are Decimal constants

### Logging
- Winston with JSON format, console transport
- Every log includes: `{ agent, transaction_id, action, outcome }`
- Account numbers masked: `ACC-1001` -> `ACC-****`
- Log levels: `info` (normal), `warn` (fraud flags, rejections), `error` (failures)

### Message Passing
- Standard envelope: `{ message_id, timestamp, source_agent, target_agent, message_type, data }`
- `message_id` is UUID v4
- Files named `{transaction_id}.json` in shared directories
- Integrator manages file lifecycle (write, move, read, cleanup)

### Testing
- Jest with ts-jest, test files match `**/*.test.ts`
- Coverage gate: 80% (branches, functions, lines, statements)
- Tests use temporary directories, never real `shared/`
- Each agent has isolated unit tests; one integration test covers the full pipeline

### Scripts
- `npm run build` -- compile TypeScript
- `npm run pipeline` -- run full pipeline via ts-node
- `npm run pipeline:validate` -- run validator only
- `npm test` -- run tests with coverage
- `npm run test:watch` -- watch mode
