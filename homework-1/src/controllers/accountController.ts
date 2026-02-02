import { TransactionType } from '../models/transaction';
import { BalanceResponse, AccountSummary } from '../models/balance';
import { getTransactionsByAccount } from '../utils/dataStore';

/**
 * Calculate account balance from transactions
 */
export function calculateAccountBalance(accountId: string): BalanceResponse {
  const transactions = getTransactionsByAccount(accountId);

  // Track balances per currency to avoid mixing currencies
  const balancesByCurrency: Record<string, number> = {};

  for (const transaction of transactions) {
    const currency = transaction.currency;
    
    // Initialize currency balance if not present
    if (!(currency in balancesByCurrency)) {
      balancesByCurrency[currency] = 0;
    }

    switch (transaction.type) {
      case TransactionType.DEPOSIT:
        // Deposits add to the account
        if (transaction.toAccount === accountId) {
          balancesByCurrency[currency] += transaction.amount;
        }
        break;

      case TransactionType.WITHDRAWAL:
        // Withdrawals subtract from the account
        if (transaction.fromAccount === accountId) {
          balancesByCurrency[currency] -= transaction.amount;
        }
        break;

      case TransactionType.TRANSFER:
        // Transfers out subtract, transfers in add
        if (transaction.fromAccount === accountId) {
          balancesByCurrency[currency] -= transaction.amount;
        }
        if (transaction.toAccount === accountId) {
          balancesByCurrency[currency] += transaction.amount;
        }
        break;
    }
  }

  // Round all balances to 2 decimal places
  for (const currency in balancesByCurrency) {
    balancesByCurrency[currency] = Math.round(balancesByCurrency[currency] * 100) / 100;
  }

  const currencies = Object.keys(balancesByCurrency);

  // If account has only one currency, return simple response
  if (currencies.length === 1) {
    return {
      accountId,
      balance: balancesByCurrency[currencies[0]],
      currency: currencies[0],
      transactionCount: transactions.length
    };
  }

  // If multiple currencies, use the first one but this indicates a design issue
  // In a real system, you'd want to update BalanceResponse to support multiple currencies
  // For now, reject mixed-currency accounts with an error
  if (currencies.length > 1) {
    throw new Error(`Account ${accountId} has transactions in multiple currencies (${currencies.join(', ')}). Please use the summary endpoint for multi-currency accounts.`);
  }

  // No transactions case
  return {
    accountId,
    balance: 0,
    currency: 'USD', // Default currency
    transactionCount: 0
  };
}

/**
 * Get account transaction summary with aggregated statistics
 */
export function getAccountSummary(accountId: string): AccountSummary {
  const transactions = getTransactionsByAccount(accountId);

  // Initialize aggregates
  const totalDeposits: Record<string, number> = {};
  const totalWithdrawals: Record<string, number> = {};
  let mostRecentTransactionDate: string | null = null;

  for (const transaction of transactions) {
    const currency = transaction.currency;

    // Track most recent transaction
    if (!mostRecentTransactionDate || transaction.timestamp > mostRecentTransactionDate) {
      mostRecentTransactionDate = transaction.timestamp;
    }

    switch (transaction.type) {
      case TransactionType.DEPOSIT:
        // Deposits add to the account (all statuses)
        if (transaction.toAccount === accountId) {
          totalDeposits[currency] = (totalDeposits[currency] || 0) + transaction.amount;
        }
        break;

      case TransactionType.WITHDRAWAL:
        // Withdrawals subtract from the account (all statuses)
        if (transaction.fromAccount === accountId) {
          totalWithdrawals[currency] = (totalWithdrawals[currency] || 0) + transaction.amount;
        }
        break;

      case TransactionType.TRANSFER:
        // Transfers: track separately for deposits and withdrawals
        if (transaction.fromAccount === accountId) {
          totalWithdrawals[currency] = (totalWithdrawals[currency] || 0) + transaction.amount;
        }
        if (transaction.toAccount === accountId) {
          totalDeposits[currency] = (totalDeposits[currency] || 0) + transaction.amount;
        }
        break;
    }
  }

  // Round all amounts to 2 decimal places
  for (const currency in totalDeposits) {
    totalDeposits[currency] = Math.round(totalDeposits[currency] * 100) / 100;
  }
  for (const currency in totalWithdrawals) {
    totalWithdrawals[currency] = Math.round(totalWithdrawals[currency] * 100) / 100;
  }

  return {
    accountId,
    totalDeposits,
    totalWithdrawals,
    transactionCount: transactions.length,
    mostRecentTransactionDate
  };
}
