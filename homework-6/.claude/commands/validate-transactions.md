Validate all transactions in sample-transactions.json without processing the full pipeline.

Steps:
1. Run the validator in dry-run mode: `npm run pipeline:validate`
2. Report: total count, valid count, invalid count, reasons for rejection
3. Show a table of results with transaction ID, amount, currency, and validation status
