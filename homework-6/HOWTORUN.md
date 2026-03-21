# How to Run the Banking Transaction Pipeline

Step-by-step instructions for setting up and running the AI-Powered Multi-Agent Banking Pipeline.

---

## Prerequisites

1. **Node.js** >= 18 (check with `node --version`)
2. **npm** >= 9 (check with `npm --version`)
3. **Python 3.10+** (only needed for the MCP server; check with `python3 --version`)
4. **Claude Code CLI** (only needed for skills and meta-agents; install from https://docs.anthropic.com)

---

## 1. Installation

```bash
cd homework-6

# Install Node.js dependencies (pipeline, tests, TypeScript)
npm install

# Install Python dependencies (MCP server)
pip install -e mcp/
```

This installs:
- **Node.js**: TypeScript, Decimal.js, Zod, Winston, Jest, ts-node, uuid
- **Python**: `mcp[cli]` (FastMCP SDK for building the custom MCP server), defined in `mcp/pyproject.toml`

---

## 2. Running the Full Pipeline

```bash
npm run pipeline
```

This will:
- Create `shared/` directory structure (`input/`, `processing/`, `output/`, `results/`)
- Read all 8 transactions from `sample-transactions.json`
- Process each through: Transaction Validator -> Fraud Detector -> Settlement Processor
- Write results to `shared/results/{transaction_id}.json`
- Print a summary table showing status, risk level, and settled amount for each transaction

**Expected output:** 6 settled transactions, 2 rejected (TXN006 for `INVALID_CURRENCY`, TXN007 for `INVALID_AMOUNT`).

---

## 3. Running Validation Only

```bash
npm run pipeline:validate
```

This runs only the Transaction Validator agent (no fraud detection or settlement). Useful for checking which transactions would be accepted or rejected before full processing.

---

## 4. Running Tests

```bash
# Run all tests with coverage report
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

The test suite includes:
- Unit tests for each agent (`transaction-validator`, `fraud-detector`, `settlement-processor`)
- Unit tests for utilities (`currencies`, `decimal`, `file-io`, `logger`)
- Integration test for the full pipeline

Coverage gate: tests must maintain >= 80% coverage (configured in `jest.config.js`). A pre-push hook blocks pushes if coverage falls below this threshold.

---

## 5. Using the Claude Code Skills

If you have Claude Code installed, two custom skills are available:

### /run-pipeline

```
/run-pipeline
```

Runs the full pipeline end-to-end via Claude Code:
1. Checks that `sample-transactions.json` exists
2. Clears `shared/` directories
3. Runs `npm run pipeline`
4. Shows a summary of results from `shared/results/`
5. Reports any rejected transactions and why

### /validate-transactions

```
/validate-transactions
```

Validates all transactions without running the full pipeline:
1. Runs the validator in dry-run mode (`npm run pipeline:validate`)
2. Reports: total count, valid count, invalid count, reasons for rejection
3. Shows a table of results

---

## 6. Using the Meta-Agents

The project was built with four meta-agents. Each can be re-run from the `homework-6` directory:

### Agent 1 -- Specification Writer

```bash
claude --agent spec-writer
```

Produces `specification.md` and `agents.md`. Review them -- the spec shapes everything downstream.

### Agent 2 -- Code Generator

```bash
claude --agent code-generator
```

Generates all `src/` pipeline code and `research-notes.md` (using context7 MCP for library research). After it finishes, verify the pipeline works:

```bash
npm run pipeline
```

You should see 8 transactions: 6 settled, 2 rejected (TXN006 invalid currency, TXN007 negative amount).

### Agent 3 -- Test Writer

```bash
claude --agent test-writer
```

Writes all unit and integration test files in `tests/`. After it finishes, run the tests to verify:

```bash
npm test
```

### Agent 4 -- Documentation Generator

```bash
claude --agent doc-generator
```

Produces `README.md` (with "Created by Denys Usenko") and `HOWTORUN.md`.

---

## 7. Using the MCP Server

### Install Python dependencies

If you haven't already during installation:

```bash
pip install -e mcp/
```

This reads `mcp/pyproject.toml` and installs the `mcp[cli]` package which provides FastMCP (`mcp.server.fastmcp`).

### Custom pipeline-status server

The MCP server is configured in `.mcp.json` and starts automatically in Claude Code sessions. It can also be run manually:

```bash
python3 mcp/server.py
```

The server exposes:
- **Tool: `get_transaction_status`** -- Look up a specific transaction by ID (e.g., `"Use the get_transaction_status tool to check TXN005"`)
- **Tool: `list_pipeline_results`** -- Get a summary of all processed transactions
- **Resource: `pipeline://summary`** -- Latest pipeline run summary as text

### context7 MCP

Also configured in `.mcp.json`. Used during code generation to look up library documentation (e.g., Decimal.js, Zod). In a Claude Code session, you can query context7 for any library docs.

### MCP configuration (`.mcp.json`)

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "pipeline-status": {
      "command": "python3",
      "args": ["mcp/server.py"]
    }
  }
}
```

When using Claude Code, both servers are available automatically.

---

## 8. Sample Expected Output

After running `npm run pipeline`, you should see output similar to:

```
╔══════════════════════════════════════════════════════════════════════╗
║                    PIPELINE EXECUTION SUMMARY                      ║
╠══════════════════════════════════════════════════════════════════════╣
║ TXN ID     │ Status    │ Risk Level │ Fraud Score │ Settled Amount ║
╠══════════════════════════════════════════════════════════════════════╣
║ TXN001     │ SETTLED   │ LOW        │ 0           │ 1498.50        ║
║ TXN002     │ SETTLED   │ MEDIUM     │ 3           │ 24950.00       ║
║ TXN003     │ SETTLED   │ LOW        │ 0           │ 9989.99        ║
║ TXN004     │ SETTLED   │ MEDIUM     │ 3           │ 537.30         ║
║ TXN005     │ SETTLED   │ HIGH       │ 7           │ 74900.00       ║
║ TXN006     │ REJECTED  │ --         │ --          │ --             ║
║ TXN007     │ REJECTED  │ --         │ --          │ --             ║
║ TXN008     │ SETTLED   │ LOW        │ 0           │ 3196.80        ║
╠══════════════════════════════════════════════════════════════════════╣
║ TOTALS: Processed=8  Settled=6  Rejected=2                         ║
║ Risk: LOW=3  MEDIUM=2  HIGH=1                                      ║
╚══════════════════════════════════════════════════════════════════════╝

All 8 transactions processed.
Results written to: shared/results/
```

Each result file in `shared/results/` is a JSON file wrapped in a message envelope containing the full transaction processing history.
