# Specification: AI-Powered Multi-Agent Banking Transaction Pipeline

## 1. High-Level Objective

Build a 3-agent TypeScript pipeline (Transaction Validator, Fraud Detector, Settlement Processor) that validates, scores for fraud risk, and settles banking transactions using file-based JSON message passing through shared directories.

## 2. Mid-Level Objectives

1. **Validation rejects malformed transactions with specific reasons** -- Transactions with non-positive amounts are rejected with reason `INVALID_AMOUNT`; transactions with currency codes not in the ISO 4217 whitelist are rejected with reason `INVALID_CURRENCY`; transactions missing any required field are rejected with reason `MISSING_FIELD:{field_name}`. Rejected transactions are written to `shared/results/` with `status: "rejected"` and do not proceed to downstream agents.

2. **Fraud scoring assigns cumulative risk scores on a 0-10 scale** -- Valid transactions receive a `fraud_risk_score` (0-10) and `fraud_risk_level` (`LOW`/`MEDIUM`/`HIGH`) based on cumulative triggers: amount > $10,000 (+3 pts), amount > $50,000 (+4 additional pts), transaction hour 02:00-04:59 UTC (+2 pts), source country not "US" (+1 pt). Risk levels: LOW (0-2), MEDIUM (3-6), HIGH (7-10).

3. **Settlement calculates fees and converts currencies with exact decimal math** -- All monetary calculations use Decimal.js (never floating-point). Currencies are converted to USD using fixed exchange rates. Fees are computed as 0.1% domestic / 0.5% cross-border, with a +$25 surcharge for `wire_transfer` type. The `settled_amount` equals `converted_amount - total_fees`, formatted to 2 decimal places.

4. **The pipeline processes all 8 sample transactions end-to-end** -- Running `npm run pipeline` reads `sample-transactions.json`, passes each transaction through all 3 agents in sequence, and writes exactly 8 result files to `shared/results/` (6 settled, 2 rejected). Each result is a valid JSON file containing the full processing history.

5. **All agent operations produce an auditable log trail with PII protection** -- Every agent logs each processing step via Winston with ISO 8601 timestamps, agent name, transaction_id, and outcome. Account numbers are masked in all log output (e.g., `ACC-1001` becomes `ACC-****`).

## 3. Implementation Notes

### Monetary Calculations
- Use **Decimal.js** for all monetary arithmetic -- never use native JavaScript floating-point
- All output amounts must use `.toFixed(2)` for consistent 2-decimal formatting
- Amounts in transaction messages are strings (e.g., `"1500.00"`) to preserve precision

### Currency Validation
- ISO 4217 whitelist: `USD`, `EUR`, `GBP`, `JPY`, `CHF`, `CAD`, `AUD`
- Any currency not in this list results in immediate rejection with `INVALID_CURRENCY`

### Exchange Rates (to USD)
| Currency | Rate to USD |
|----------|-------------|
| USD      | 1.00        |
| EUR      | 1.08        |
| GBP      | 1.27        |
| JPY      | 0.0067      |
| CHF      | 1.13        |
| CAD      | 0.74        |
| AUD      | 0.65        |

### Fee Schedule
| Condition | Fee |
|-----------|-----|
| Domestic transfer | 0.1% of converted amount |
| Cross-border transfer | 0.5% of converted amount |
| Wire transfer surcharge | +$25.00 flat |

- **Cross-border** is determined by `metadata.country !== "US"`
- `settled_amount = converted_amount - total_fees`

### Schema Validation
- Use **Zod** for runtime validation of all incoming transaction data and inter-agent messages
- Define schemas for: raw transaction input, agent message envelope, validation result, fraud result, settlement result

### Logging
- Use **Winston** with structured JSON format
- Every log entry includes: ISO 8601 timestamp, agent name, transaction_id, outcome/action
- **PII masking**: account numbers are masked before logging (e.g., `ACC-1001` -> `ACC-****`)
- Log levels: `info` for normal processing, `warn` for fraud flags, `error` for rejections

### File-Based Communication
```
shared/
  input/       -- integrator drops initial messages here
  processing/  -- agent moves message here while working
  output/      -- agent writes result here for next agent
  results/     -- final outcomes land here
```

### Message Envelope Format
```json
{
  "message_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "source_agent": "agent_name",
  "target_agent": "next_agent_name",
  "message_type": "transaction",
  "data": { }
}
```

### Testing
- **Jest** with `ts-jest` preset
- Coverage threshold: 80% minimum (gate), target 90%+
- Tests isolated from real `shared/` directory (use temp directories)

## 4. Context

### Beginning State
- `sample-transactions.json` exists with 8 raw transaction records (varying currencies, amounts, validity)
- `package.json`, `tsconfig.json`, and `jest.config.js` are configured with all dependencies (Decimal.js, Zod, Winston, Jest)
- No `src/` agent code exists. No `shared/` directories exist. No tests exist.

### Ending State
- Three agent modules in `src/agents/`: `transactionValidator.ts`, `fraudDetector.ts`, `settlementProcessor.ts`
- An integrator/orchestrator at `src/integrator.ts` that runs the full pipeline
- `shared/results/` contains 8 JSON result files (6 settled, 2 rejected)
- `tests/` directory with unit tests per agent + integration test for the full pipeline
- Test coverage >= 80% (gate) with target >= 90%
- Winston logs written with PII masking
- README.md and HOWTORUN.md complete

## 5. Low-Level Tasks

---

### Task 1: Transaction Validator

**Prompt**:
```
Context: You are building a TypeScript banking pipeline. The project uses Decimal.js
for monetary math, Zod for schema validation, and Winston for logging. The file
structure follows src/agents/ for agent modules. Inter-agent communication uses
JSON files in shared/ directories with a standard message envelope
(message_id, timestamp, source_agent, target_agent, message_type, data).

Task: Create the Transaction Validator agent at src/agents/transactionValidator.ts.
Export a function processMessage(message: TransactionMessage): ValidationResult
that validates incoming transactions.

Rules:
- Required fields: transaction_id, timestamp, source_account, destination_account,
  amount, currency, transaction_type. If any field is missing, reject with
  reason "MISSING_FIELD:{field_name}" (check fields in the order listed above;
  report the first missing field found).
- Amount must be a valid positive number (use Decimal.js to parse; reject with
  "INVALID_AMOUNT" if not parseable or <= 0).
- Currency must be in the ISO 4217 whitelist: USD, EUR, GBP, JPY, CHF, CAD, AUD.
  Reject with "INVALID_CURRENCY" if not in the list.
- Use Zod to define and validate the incoming transaction schema.
- Log every validation decision via Winston with agent name "transaction_validator",
  transaction_id, and outcome. Mask account numbers in logs (replace last 4 chars
  with "****", e.g., ACC-**** for ACC-1001).
- Return an object with status "validated" or "rejected", the original transaction
  data, and a reasons array (empty if valid, populated with rejection codes if invalid).

Examples:
- Input: {amount: "1500.00", currency: "USD", ...all fields} -> status: "validated"
- Input: {amount: "-100.00", currency: "GBP", ...} -> status: "rejected", reasons: ["INVALID_AMOUNT"]
- Input: {amount: "200.00", currency: "XYZ", ...} -> status: "rejected", reasons: ["INVALID_CURRENCY"]

Output: A single TypeScript module exporting processMessage and all Zod schemas.
Also export the VALID_CURRENCIES array and maskAccountNumber utility.
```

**File to CREATE**: `src/agents/transactionValidator.ts`

**Function to CREATE**: `processMessage(message: TransactionMessage): ValidationResult`

**Details**:
- Define Zod schemas for raw transaction input (`RawTransactionSchema`) and validated output
- Required fields (in validation order): `transaction_id`, `timestamp`, `source_account`, `destination_account`, `amount`, `currency`, `transaction_type`
- Amount validation: parse with `new Decimal(amount)` -- reject if throws or `<= 0`
- Currency validation: check against `VALID_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"]`
- Multiple validation failures: collect ALL applicable reasons (e.g., a transaction could have both INVALID_AMOUNT and INVALID_CURRENCY)
- Return `{ status: "validated" | "rejected", transaction: {...}, reasons: string[] }`
- Export `maskAccountNumber(account: string): string` utility for PII protection
- Log with Winston: `info` for validated, `warn` for rejected

---

### Task 2: Fraud Detector

**Prompt**:
```
Context: You are building a TypeScript banking pipeline. The Transaction Validator
(src/agents/transactionValidator.ts) has already been created and produces
validated transaction messages. The project uses Decimal.js for monetary math
and Winston for logging with PII masking. Only validated transactions
(status: "validated") reach this agent.

Task: Create the Fraud Detector agent at src/agents/fraudDetector.ts. Export a
function processMessage(message: ValidatedTransaction): FraudResult that scores
each transaction for fraud risk on a cumulative 0-10 scale.

Rules:
- Scoring (cumulative, start at 0):
  * Amount > $10,000 (use Decimal comparison): +3 points
  * Amount > $50,000 (use Decimal comparison): +4 ADDITIONAL points (so >$50k = +7 total)
  * Transaction hour between 02:00-04:59 UTC (inclusive): +2 points
  * Source country (metadata.country) is not "US": +1 point
  * Cap total score at 10
- For cross-currency comparison, convert amount to USD first using rates:
  EUR=1.08, GBP=1.27, JPY=0.0067, CHF=1.13, CAD=0.74, AUD=0.65
- Risk levels based on final score:
  * LOW: 0-2
  * MEDIUM: 3-6
  * HIGH: 7-10
- Use Decimal.js for all amount comparisons (never parseFloat)
- Log each fraud check via Winston with agent name "fraud_detector",
  transaction_id, individual triggers that fired, final score, and risk level.
  Mask account numbers in all logs.
- Return the transaction data enriched with: fraud_risk_score, fraud_risk_level,
  and fraud_triggers (array of strings describing which rules fired).

Examples:
- TXN001: $1,500, US, 09:00 UTC -> score=0, level=LOW, triggers=[]
- TXN002: $25,000, US, 09:15 UTC -> score=3, level=MEDIUM, triggers=["amount_above_10000"]
- TXN004: EUR 500, DE, 02:47 UTC -> score=3, level=MEDIUM, triggers=["unusual_hour", "cross_border"]
- TXN005: $75,000, US, 10:00 UTC -> score=7, level=HIGH, triggers=["amount_above_10000", "amount_above_50000"]

Output: A single TypeScript module exporting processMessage, the scoring constants,
and the FraudResult type.
```

**File to CREATE**: `src/agents/fraudDetector.ts`

**Function to CREATE**: `processMessage(message: ValidatedTransaction): FraudResult`

**Details**:
- Parse timestamp to extract UTC hour: `new Date(timestamp).getUTCHours()`
- Scoring triggers (cumulative):
  - `amount_above_10000`: USD-equivalent amount > 10,000 → +3
  - `amount_above_50000`: USD-equivalent amount > 50,000 → +4 additional
  - `unusual_hour`: UTC hour >= 2 AND UTC hour <= 4 → +2
  - `cross_border`: `metadata.country !== "US"` → +1
- Cap score at 10
- Risk level thresholds: LOW (0-2), MEDIUM (3-6), HIGH (7-10)
- Return `{ ...transaction, fraud_risk_score, fraud_risk_level, fraud_triggers }`
- Export `EXCHANGE_RATES`, `convertToUSD(amount: Decimal, currency: string): Decimal`
- Log with Winston: `info` for LOW, `warn` for MEDIUM/HIGH

---

### Task 3: Settlement Processor

**Prompt**:
```
Context: You are building a TypeScript banking pipeline. The Fraud Detector
(src/agents/fraudDetector.ts) has already been created and produces transactions
enriched with fraud_risk_score, fraud_risk_level, and fraud_triggers. The project
uses Decimal.js for ALL monetary math (never floating-point). Winston is used for
logging with PII masking. This is the final agent in the pipeline.

Task: Create the Settlement Processor agent at src/agents/settlementProcessor.ts.
Export a function processMessage(message: FraudScoredTransaction): SettlementResult
that converts currencies, calculates fees, and produces the final settled amount.

Rules:
- Currency conversion to USD using exact Decimal.js rates:
  USD=1.00, EUR=1.08, GBP=1.27, JPY=0.0067, CHF=1.13, CAD=0.74, AUD=0.65
- Fee calculation:
  * Domestic (metadata.country === "US"): 0.1% of converted amount
  * Cross-border (metadata.country !== "US"): 0.5% of converted amount
  * Wire transfer surcharge: if transaction_type === "wire_transfer", add $25.00 flat
  * total_fees = percentage_fee + wire_surcharge
- Settlement:
  * converted_amount = original_amount * exchange_rate
  * settled_amount = converted_amount - total_fees
  * All output amounts use .toFixed(2)
- Use Decimal.js for every calculation. Never use Number arithmetic for money.
- Log each settlement via Winston with agent name "settlement_processor",
  transaction_id, original_amount, converted_amount, fee breakdown, and
  settled_amount. Mask account numbers in all logs.
- Return the full enriched transaction with: converted_amount, original_currency,
  settlement_currency ("USD"), fee_percentage, fee_amount, wire_surcharge,
  total_fees, settled_amount, settled_at (ISO 8601 timestamp).

Examples:
- TXN001: $1,500 USD domestic transfer ->
    converted=1500.00, fee=0.1%=1.50, wire=0, total_fees=1.50, settled=1498.50
- TXN002: $25,000 USD domestic wire ->
    converted=25000.00, fee=0.1%=25.00, wire=25.00, total_fees=50.00, settled=24950.00
- TXN004: EUR 500 cross-border transfer ->
    converted=540.00, fee=0.5%=2.70, wire=0, total_fees=2.70, settled=537.30
- TXN005: $75,000 USD domestic wire ->
    converted=75000.00, fee=0.1%=75.00, wire=25.00, total_fees=100.00, settled=74900.00

Output: A single TypeScript module exporting processMessage, EXCHANGE_RATES,
calculateFees, and the SettlementResult type. All monetary values in output
must be strings from Decimal.toFixed(2).
```

**File to CREATE**: `src/agents/settlementProcessor.ts`

**Function to CREATE**: `processMessage(message: FraudScoredTransaction): SettlementResult`

**Details**:
- Exchange rates (Decimal constants): `{ USD: "1.00", EUR: "1.08", GBP: "1.27", JPY: "0.0067", CHF: "1.13", CAD: "0.74", AUD: "0.65" }`
- Fee logic:
  - `is_cross_border = metadata.country !== "US"`
  - `fee_rate = is_cross_border ? new Decimal("0.005") : new Decimal("0.001")`
  - `fee_amount = converted_amount.mul(fee_rate)`
  - `wire_surcharge = transaction_type === "wire_transfer" ? new Decimal("25.00") : new Decimal("0")`
  - `total_fees = fee_amount.plus(wire_surcharge)`
  - `settled_amount = converted_amount.minus(total_fees)`
- All output amounts are strings via `.toFixed(2)`
- Return the complete settlement record including all fields from previous agents plus settlement data
- Log with Winston: `info` for each settlement, include full fee breakdown

---

### Task 4: Pipeline Integrator

**Prompt**:
```
Context: You have three TypeScript agents:
1. src/agents/transactionValidator.ts -- validates and rejects invalid transactions
2. src/agents/fraudDetector.ts -- scores valid transactions for fraud risk
3. src/agents/settlementProcessor.ts -- converts currencies and calculates fees
Each agent exports a processMessage() function. The project uses file-based JSON
communication through shared/ directories and Winston for logging.

Task: Create the pipeline integrator at src/integrator.ts that orchestrates
the full pipeline end-to-end.

Rules:
- Create shared/ directory structure: input/, processing/, output/, results/
- Read sample-transactions.json and wrap each transaction in a message envelope:
  { message_id (uuid v4), timestamp (ISO 8601), source_agent, target_agent,
    message_type: "transaction", data: {transaction} }
- Process each transaction sequentially through the 3 agents:
  1. Write to shared/input/ -> Transaction Validator reads & validates
  2. If rejected: write result to shared/results/ and stop
  3. If validated: write to shared/output/ -> Fraud Detector scores
  4. Write scored transaction to shared/output/ -> Settlement Processor settles
  5. Write final result to shared/results/
- Move messages through shared/processing/ while each agent works
- After all transactions: print a summary table showing transaction_id, status,
  fraud_risk_level (if applicable), settled_amount (if applicable)
- Support --validate-only flag that only runs the validator agent
- Handle errors gracefully: catch and log any agent failures, continue pipeline

Output: A single TypeScript module that can be run with ts-node. It should work
with "npm run pipeline" and "npm run pipeline:validate".
```

**File to CREATE**: `src/integrator.ts`

**Details**:
- Ensure `shared/{input,processing,output,results}` directories exist (create if not)
- Load `sample-transactions.json` from project root
- For each transaction: wrap in message envelope with `uuid.v4()` message_id
- Pipeline flow: validator -> fraud detector -> settlement processor
- Write intermediate JSON files to appropriate shared/ directories
- Write final result JSON to `shared/results/{transaction_id}.json`
- Print summary table at end with totals (processed, rejected, by risk level)
- Support `--validate-only` CLI flag via `process.argv`
- Log pipeline start/end with Winston

---

### Expected Results for Sample Transactions

| TXN | Status | Fraud Score | Risk Level | Settled Amount (USD) |
|-----|--------|-------------|------------|---------------------|
| TXN001 | settled | 0 | LOW | 1498.50 |
| TXN002 | settled | 3 | MEDIUM | 24950.00 |
| TXN003 | settled | 0 | LOW | 9989.99 |
| TXN004 | settled | 3 | MEDIUM | 537.30 |
| TXN005 | settled | 7 | HIGH | 74900.00 |
| TXN006 | rejected | -- | -- | -- |
| TXN007 | rejected | -- | -- | -- |
| TXN008 | settled | 0 | LOW | 3196.80 |
