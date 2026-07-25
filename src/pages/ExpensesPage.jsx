import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Building,
  Smartphone,
  Coins,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { expenseService } from '../services/expenseService';
import { ProgressBar } from '../components/common/ProgressBar';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const ExpensesPage = () => {
  const { expenses, addTransaction, deleteTransaction } = useData();

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Food & Mess',
    accountId: 'acc-1',
    notes: ''
  });

  const summary = expenseService.getFinancialSummary();

  const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    addTransaction(form);
    setIsAddTxOpen(false);
    setForm({ title: '', amount: '', type: 'expense', category: 'Food & Mess', accountId: 'acc-1', notes: '' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-brand-500" />
            <span>Personal Expenses & Budget Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage physical wallet cash, bank accounts, bKash/Nagad mobile banking, and monthly mess budget
          </p>
        </div>

        <button
          onClick={() => setIsAddTxOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Transaction</span>
        </button>
      </div>

      {/* ACCOUNT BALANCES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-800 text-white shadow-lg shadow-brand-500/20">
          <span className="text-xs font-semibold text-brand-200 uppercase tracking-wider">Total Net Available Balance</span>
          <h3 className="text-3xl font-extrabold mt-2">
            ৳ {summary.totalBalance.toLocaleString()}
          </h3>
          <p className="text-xs text-brand-200 mt-1">Combined across all accounts</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">bKash Mobile Banking</span>
            <Smartphone className="w-4 h-4 text-pink-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ৳ {summary.mobileBalance.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">bKash / Nagad wallet</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Bank Account</span>
            <Building className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ৳ {summary.bankBalance.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Dutch-Bangla Bank</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Physical Wallet Cash</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ৳ {summary.cashBalance.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Cash in pocket</p>
        </div>
      </div>

      {/* MONTHLY BUDGET PROGRESS BAR BAR */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Student Expense Budget</h3>
            <p className="text-xs text-slate-500">
              Spent ৳{summary.monthlyExpense.toLocaleString()} of ৳{summary.budgetLimit.toLocaleString()} monthly target limit
            </p>
          </div>
          <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
            ৳ {summary.remainingBudget.toLocaleString()} Remaining
          </span>
        </div>

        <ProgressBar
          progress={summary.budgetUsedPercentage}
          color={summary.budgetUsedPercentage > 85 ? 'rose' : 'emerald'}
        />
      </div>

      {/* CATEGORY SPENDING PIE CHART & TRANSACTIONS LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Spending by Category</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {summary.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Financial Transactions</h3>
            <span className="text-xs font-semibold text-slate-400">Showing latest entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(expenses.transactions || []).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded-lg ${
                          tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {tx.type === 'income' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{tx.title}</p>
                          <span className="text-[10px] text-slate-400">{tx.notes}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><Badge variant="indigo">{tx.category}</Badge></td>
                    <td className={`py-3 px-3 font-extrabold ${
                      tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'} ৳ {tx.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{tx.date}</td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={() => deleteTransaction(tx.id)} className="p-1 text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD TRANSACTION MODAL */}
      <Modal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} title="Log Financial Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Title</label>
            <input
              type="text"
              placeholder="e.g. Mess Dining Bill"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (৳ BDT)</label>
              <input
                type="number"
                placeholder="500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="Food & Mess">Food & Mess</option>
                <option value="Academic Books">Academic Books</option>
                <option value="Internet & Bills">Internet & Bills</option>
                <option value="Travel & Bus">Travel & Bus</option>
                <option value="Tuition Income">Tuition Income</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account Source</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                {(expenses.accounts || []).map(a => (
                  <option key={a.id} value={a.id}>{a.name} (৳{a.balance})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsAddTxOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md">Save Transaction</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
