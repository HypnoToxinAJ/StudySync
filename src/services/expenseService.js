import { storageService } from './storageService';

export const expenseService = {
  getData: () => {
    return storageService.get(storageService.KEYS.EXPENSES, { budgetLimit: 12000, accounts: [], transactions: [] });
  },

  saveData: (data) => {
    storageService.set(storageService.KEYS.EXPENSES, data);
  },

  addTransaction: (txData) => {
    const data = expenseService.getData();
    const newTx = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...txData,
      amount: Number(txData.amount || 0)
    };

    // Update target account balance
    const accIndex = data.accounts.findIndex(a => a.id === newTx.accountId);
    if (accIndex !== -1) {
      if (newTx.type === 'income') {
        data.accounts[accIndex].balance += newTx.amount;
      } else if (newTx.type === 'expense') {
        data.accounts[accIndex].balance -= newTx.amount;
      }
    }

    data.transactions.unshift(newTx);
    expenseService.saveData(data);
    return newTx;
  },

  deleteTransaction: (id) => {
    const data = expenseService.getData();
    const tx = data.transactions.find(t => t.id === id);
    if (tx) {
      // Revert account balance
      const accIndex = data.accounts.findIndex(a => a.id === tx.accountId);
      if (accIndex !== -1) {
        if (tx.type === 'income') {
          data.accounts[accIndex].balance -= tx.amount;
        } else if (tx.type === 'expense') {
          data.accounts[accIndex].balance += tx.amount;
        }
      }
      data.transactions = data.transactions.filter(t => t.id !== id);
      expenseService.saveData(data);
    }
  },

  getFinancialSummary: () => {
    const data = expenseService.getData();
    let totalBalance = 0;
    let cashBalance = 0;
    let bankBalance = 0;
    let cardBalance = 0;
    let mobileBalance = 0;

    (data.accounts || []).forEach(acc => {
      totalBalance += acc.balance;
      if (acc.type === 'cash') cashBalance += acc.balance;
      else if (acc.type === 'bank') bankBalance += acc.balance;
      else if (acc.type === 'card') cardBalance += acc.balance;
      else if (acc.type === 'mobile_banking') mobileBalance += acc.balance;
    });

    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    let monthlyExpense = 0;
    let monthlyIncome = 0;
    const categoryTotals = {};

    (data.transactions || []).forEach(tx => {
      if (tx.date.startsWith(currentMonth)) {
        if (tx.type === 'expense') {
          monthlyExpense += tx.amount;
          categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        } else if (tx.type === 'income') {
          monthlyIncome += tx.amount;
        }
      }
    });

    const budgetLimit = Number(data.budgetLimit || 12000);
    const remainingBudget = Math.max(0, budgetLimit - monthlyExpense);
    const budgetUsedPercentage = budgetLimit > 0 ? Math.min(100, Math.round((monthlyExpense / budgetLimit) * 100)) : 0;

    const categoryBreakdown = Object.keys(categoryTotals).map(cat => ({
      name: cat,
      value: categoryTotals[cat]
    }));

    return {
      totalBalance,
      cashBalance,
      bankBalance,
      cardBalance,
      mobileBalance,
      monthlyExpense,
      monthlyIncome,
      budgetLimit,
      remainingBudget,
      budgetUsedPercentage,
      categoryBreakdown
    };
  }
};
