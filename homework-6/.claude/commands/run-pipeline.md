Run the multi-agent banking pipeline end-to-end.

Steps:
1. Check that `sample-transactions.json` exists in the project root
2. Clear `shared/` directories (input/, processing/, output/, results/)
3. Run the pipeline: `npm run pipeline`
4. Show a summary of results from `shared/results/`
5. Report any transactions that were rejected and why
6. Display the final count: total, settled, rejected
