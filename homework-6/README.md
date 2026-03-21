# Homework 6: AI-Powered Multi-Agent Banking Transaction Pipeline

> **Student Name**: Denys Usenko
> **Date Submitted**: March 21, 2026
> **AI Tools Used**: Claude Code

A 3-agent TypeScript pipeline that validates, fraud-scores, and settles banking transactions using file-based JSON message passing through shared directories. Built and orchestrated by four meta-agents (specification, code generation, testing, documentation).

The pipeline reads 8 raw transactions from `sample-transactions.json`, processes each through a Transaction Validator, Fraud Detector, and Settlement Processor, and writes results to `shared/results/` — 6 settled, 2 rejected. All monetary math uses Decimal.js (never floating-point), with Zod for schema validation and Winston for PII-masked logging.

## Pipeline Agents

| Agent | File | Responsibility |
|-------|------|----------------|
| **Transaction Validator** | `src/agents/transaction-validator.ts` | Validates required fields, positive amounts (Decimal.js), and ISO 4217 currency codes. Rejects with specific reason codes (`MISSING_FIELD:*`, `INVALID_AMOUNT`, `INVALID_CURRENCY`) |
| **Fraud Detector** | `src/agents/fraud-detector.ts` | Scores validated transactions 0-10: amount >$10k (+3), >$50k (+4 more), hours 02-04 UTC (+2), non-US origin (+1). Levels: LOW (0-2), MEDIUM (3-6), HIGH (7-10) |
| **Settlement Processor** | `src/agents/settlement-processor.ts` | Converts to USD via fixed rates, calculates fees (0.1% domestic / 0.5% cross-border + $25 wire surcharge), produces settled amount |

## Meta-Agents

| Agent | Command | Role |
|-------|---------|------|
| **Specification Writer** | `claude --agent spec-writer` | Produces `specification.md` and `agents.md`. Invokable via `/write-spec` skill |
| **Code Generator** | `claude --agent code-generator` | Implements pipeline agents and integrator. Uses context7 MCP for library research |
| **Test Writer** | `claude --agent test-writer` | Creates unit and integration tests in `tests/`. Coverage gate hook blocks push if <80% |
| **Documentation Generator** | `claude --agent doc-generator` | Produces this README and `HOWTORUN.md` with author attribution |

## Architecture

```
 sample-transactions.json (8 transactions)
              |
              v
    +-------------------+
    |    INTEGRATOR      |    src/integrator.ts
    |  (orchestrator)    |    Loads transactions, wraps in message envelopes,
    |                    |    manages shared/ directory lifecycle
    +-------------------+
              |
              | writes to shared/input/
              v
    +-------------------+
    |   TRANSACTION      |    src/agents/transaction-validator.ts
    |    VALIDATOR        |
    |                    |    Validates fields, amount, currency
    +-------------------+
         /          \
        /            \
   REJECTED        VALIDATED
      |                |
      v                | writes to shared/output/
 shared/results/       v
 (TXN006, TXN007)  +-------------------+
                    |   FRAUD            |    src/agents/fraud-detector.ts
                    |   DETECTOR         |
                    |                    |    Scores risk 0-10, assigns level
                    +-------------------+
                           |
                           | writes to shared/output/
                           v
                    +-------------------+
                    |   SETTLEMENT       |    src/agents/settlement-processor.ts
                    |   PROCESSOR        |
                    |                    |    Converts currency, calculates fees
                    +-------------------+
                           |
                           | writes to shared/results/
                           v
                    shared/results/
                    (TXN001-TXN005, TXN008)

 ============================================================
  RESULTS SUMMARY (8 transactions)
 ============================================================
  TXN001  SETTLED   LOW     $1,500 USD   -> $1,498.50
  TXN002  SETTLED   MEDIUM  $25,000 USD  -> $24,950.00
  TXN003  SETTLED   LOW     $9,999.99    -> $9,989.99
  TXN004  SETTLED   MEDIUM  EUR 500      -> $537.30
  TXN005  SETTLED   HIGH    $75,000 USD  -> $74,900.00
  TXN006  REJECTED  --      XYZ 200      (INVALID_CURRENCY)
  TXN007  REJECTED  --      GBP -100     (INVALID_AMOUNT)
  TXN008  SETTLED   LOW     $3,200 USD   -> $3,196.80
 ============================================================
```

### File-Based Message Passing

```
shared/
├── input/       ← Integrator drops initial message envelopes
├── processing/  ← Agent moves message here while working
├── output/      ← Agent writes result for the next agent
└── results/     ← Final outcomes (8 JSON files: 6 settled, 2 rejected)
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Primary language with strict type checking |
| Decimal.js | Precise monetary arithmetic (never floating-point) |
| Zod | Runtime schema validation for transactions and messages |
| Winston | Structured JSON logging with PII masking |
| Jest | Testing framework with ts-jest preset and coverage reporting |
| ts-node | TypeScript execution without pre-compilation |
| uuid | UUID v4 generation for message envelope IDs |
| Node.js | Runtime environment (>= 18) |
| FastMCP (Python) | Custom MCP server for querying pipeline results |
| context7 MCP | Library documentation lookup during code generation |

## Project Structure

```
homework-6/
├── sample-transactions.json     # 8 raw banking transactions (input)
├── specification.md             # Full technical specification
├── agents.md                    # Project context for AI agents
├── research-notes.md            # context7 MCP query documentation
├── package.json                 # Dependencies and npm scripts
├── tsconfig.json                # TypeScript configuration
├── jest.config.js               # Jest config (ts-jest, 80% coverage gate)
├── src/
│   ├── integrator.ts            # Pipeline orchestrator
│   ├── agents/
│   │   ├── transaction-validator.ts
│   │   ├── fraud-detector.ts
│   │   └── settlement-processor.ts
│   ├── types/
│   │   ├── transaction.ts       # Zod schemas & TypeScript interfaces
│   │   └── message.ts           # Message envelope types
│   └── utils/
│       ├── currencies.ts        # ISO 4217 whitelist & exchange rates
│       ├── decimal.ts           # Decimal.js wrappers for monetary math
│       ├── file-io.ts           # Shared directory file operations
│       └── logger.ts            # Winston logger with PII masking
├── tests/
│   ├── agents/                  # Unit tests per agent
│   ├── utils/                   # Unit tests for utilities
│   └── integration/             # End-to-end pipeline test
├── shared/                      # File-based inter-agent communication
│   ├── input/ | processing/ | output/ | results/
├── mcp/
│   ├── server.py                # FastMCP server (get_transaction_status, list_pipeline_results)
│   └── pyproject.toml           # Python dependencies (mcp[cli])
├── .claude/
│   ├── commands/                # Skills: run-pipeline, validate-transactions, write-spec
│   └── settings.json            # Hook: coverage gate blocks push if < 80%
└── docs/
    └── screenshots/             # Required screenshots for submission
```

## Quick Start

```bash
npm install                   # Install Node.js dependencies
pip install -e mcp/           # Install Python dependencies (MCP server)
npm run pipeline              # Run the full pipeline
npm test                      # Run tests with coverage
```

See [HOWTORUN.md](HOWTORUN.md) for full instructions, meta-agent usage, MCP setup, and skills.
