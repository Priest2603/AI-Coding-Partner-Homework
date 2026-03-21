Generate the technical specification for the banking transaction processing pipeline.

Steps:
1. Read `specification-TEMPLATE-hint.md` for the template structure
2. Read `sample-transactions.json` to analyze the 8 transactions
3. Identify edge cases: TXN006 (invalid currency "XYZ"), TXN007 (negative amount)
4. Generate `specification.md` with all 5 sections:
   - High-Level Objective
   - Mid-Level Objectives (5 testable requirements)
   - Implementation Notes (Decimal.js, Zod, Winston, PII masking)
   - Context (beginning and ending state)
   - Low-Level Tasks (one per pipeline agent with exact prompts)
5. Generate `agents.md` with project context
6. Report what was generated and summarize key decisions
