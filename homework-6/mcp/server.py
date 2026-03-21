"""FastMCP server for querying banking pipeline results."""

import json
import os
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("pipeline-status")

SHARED_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "shared")
RESULTS_DIR = os.path.join(SHARED_DIR, "results")


def _unwrap_envelope(raw: dict) -> dict:
    """Unwrap the message envelope to get transaction data.

    Result files use a message envelope: { message_id, data: { transaction: {...} } }
    Settled: data.transaction has all fields (status, fees, settled_amount, etc.)
    Rejected: data has status/reasons, data.transaction has the original transaction.
    """
    data = raw.get("data", raw)
    if "transaction" in data and isinstance(data["transaction"], dict):
        txn = data["transaction"]
        # For rejected: merge top-level data fields (status, reasons) onto txn
        if data.get("status") == "rejected":
            txn["status"] = "rejected"
            txn["reasons"] = data.get("reasons", [])
        return txn
    return data


def _read_result(transaction_id: str) -> dict | None:
    """Read a transaction result file from shared/results/."""
    results_path = os.path.join(RESULTS_DIR, f"{transaction_id}.json")
    if not os.path.exists(results_path):
        return None
    with open(results_path, "r") as f:
        raw = json.load(f)
    return _unwrap_envelope(raw)


def _list_all_results() -> list[dict]:
    """List all result files from shared/results/."""
    results = []
    if not os.path.exists(RESULTS_DIR):
        return results
    for filename in sorted(os.listdir(RESULTS_DIR)):
        if filename.endswith(".json"):
            filepath = os.path.join(RESULTS_DIR, filename)
            with open(filepath, "r") as f:
                raw = json.load(f)
            results.append(_unwrap_envelope(raw))
    return results


@mcp.tool()
def get_transaction_status(transaction_id: str) -> str:
    """Get the current status of a specific transaction by its ID.

    Args:
        transaction_id: The transaction ID to look up (e.g., "TXN001")

    Returns:
        JSON string with the transaction's current status and details
    """
    result = _read_result(transaction_id)
    if result is None:
        return json.dumps({"error": f"Transaction {transaction_id} not found in results"})
    return json.dumps(result, indent=2)


@mcp.tool()
def list_pipeline_results() -> str:
    """List a summary of all processed transactions.

    Returns:
        JSON string with summary counts and per-transaction status
    """
    results = _list_all_results()
    if not results:
        return json.dumps({"message": "No pipeline results found. Run the pipeline first."})

    summary = {
        "total": len(results),
        "settled": 0,
        "rejected": 0,
        "flagged_high_risk": 0,
        "transactions": [],
    }

    for result in results:
        raw_status = result.get("status", "unknown")
        # Settled transactions are written with status "validated" by the pipeline
        is_settled = raw_status == "validated" and "settled_amount" in result
        is_rejected = raw_status == "rejected"
        display_status = "settled" if is_settled else raw_status

        # Rejected transactions nest amount/currency under "transaction"
        txn_data = result if is_settled else result.get("transaction", result)
        txn_summary = {
            "transaction_id": result.get("transaction_id", "unknown"),
            "status": display_status,
            "amount": txn_data.get("amount", "0"),
            "currency": txn_data.get("currency", "unknown"),
        }

        if is_settled:
            summary["settled"] += 1
            txn_summary["settled_amount"] = result.get("settled_amount")
            txn_summary["total_fees"] = result.get("total_fees")
        elif is_rejected:
            summary["rejected"] += 1
            txn_summary["rejection_reasons"] = result.get("reasons", [])

        fraud_level = result.get("fraud_risk_level")
        if fraud_level == "HIGH":
            summary["flagged_high_risk"] += 1
            txn_summary["fraud_risk_level"] = fraud_level

        summary["transactions"].append(txn_summary)

    return json.dumps(summary, indent=2)


@mcp.resource("pipeline://summary")
def pipeline_summary() -> str:
    """Latest pipeline run summary as text."""
    results = _list_all_results()
    if not results:
        return "No pipeline results found. Run the pipeline first."

    settled = sum(1 for r in results if r.get("status") == "validated" and "settled_amount" in r)
    rejected = sum(1 for r in results if r.get("status") == "rejected")
    high_risk = sum(1 for r in results if r.get("fraud_risk_level") == "HIGH")

    lines = [
        "=== Banking Pipeline Summary ===",
        f"Total transactions: {len(results)}",
        f"Settled: {settled}",
        f"Rejected: {rejected}",
        f"High risk flagged: {high_risk}",
        "",
        "--- Per Transaction ---",
    ]

    for result in results:
        tid = result.get("transaction_id", "unknown")
        raw_status = result.get("status", "unknown")
        is_settled = raw_status == "validated" and "settled_amount" in result
        is_rejected = raw_status == "rejected"
        txn_data = result if is_settled else result.get("transaction", result)
        amount = txn_data.get("amount", "0")
        currency = txn_data.get("currency", "?")

        if is_settled:
            settled_amt = result.get("settled_amount", "?")
            fees = result.get("total_fees", "?")
            lines.append(f"  {tid}: settled | {amount} {currency} → ${settled_amt} USD (fees: ${fees})")
        elif is_rejected:
            reasons = ", ".join(result.get("reasons", ["unknown"]))
            lines.append(f"  {tid}: rejected | {amount} {currency} | Reason: {reasons}")
        else:
            lines.append(f"  {tid}: {raw_status} | {amount} {currency}")

    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run()
