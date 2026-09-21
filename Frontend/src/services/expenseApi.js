/**
 * Expense API Service
 * Connects Expense Tracker frontend to Django backend and Supabase PostgreSQL.
 */
import { apiClient } from './apiClient';

const BASE_PATH = '/finance';

export const expenseApi = {
  /**
   * Retrieve current user's finance profile, accounts, transactions, and due records
   */
  getProfile: () => apiClient.get(`${BASE_PATH}/profile/`),

  /**
   * Partial update profile (budget limit, currency)
   */
  updateProfile: (data) => apiClient.patch(`${BASE_PATH}/profile/`, data),

  /**
   * Update monthly budget limit
   */
  updateBudget: (budgetLimit) => apiClient.patch(`${BASE_PATH}/budget/`, { budgetLimit }),

  /**
   * List all accounts
   */
  listAccounts: () => apiClient.get(`${BASE_PATH}/accounts/`),

  /**
   * Create account
   */
  createAccount: (data) => apiClient.post(`${BASE_PATH}/accounts/`, data),

  /**
   * Update account
   */
  updateAccount: (id, data) => apiClient.patch(`${BASE_PATH}/accounts/${id}/`, data),

  /**
   * Delete account
   */
  deleteAccount: (id) => apiClient.delete(`${BASE_PATH}/accounts/${id}/`),

  /**
   * List transactions with optional filters
   */
  listTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${BASE_PATH}/transactions/?${query}` : `${BASE_PATH}/transactions/`;
    return apiClient.get(url);
  },

  /**
   * Create a new transaction
   */
  createTransaction: (data) => apiClient.post(`${BASE_PATH}/transactions/`, data),

  /**
   * Update transaction
   */
  updateTransaction: (id, data) => apiClient.patch(`${BASE_PATH}/transactions/${id}/`, data),

  /**
   * Delete transaction
   */
  deleteTransaction: (id) => apiClient.delete(`${BASE_PATH}/transactions/${id}/`),

  /**
   * List due & borrow records
   */
  listDueBorrow: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${BASE_PATH}/due-borrow/?${query}` : `${BASE_PATH}/due-borrow/`;
    return apiClient.get(url);
  },

  /**
   * Create due/borrow record
   */
  createDueBorrow: (data) => apiClient.post(`${BASE_PATH}/due-borrow/`, data),

  /**
   * Update due/borrow record
   */
  updateDueBorrow: (id, data) => apiClient.patch(`${BASE_PATH}/due-borrow/${id}/`, data),

  /**
   * Delete due/borrow record
   */
  deleteDueBorrow: (id) => apiClient.delete(`${BASE_PATH}/due-borrow/${id}/`),

  /**
   * Settle part or all of a due/borrow record
   */
  settleDueBorrow: (id, payload) => apiClient.post(`${BASE_PATH}/due-borrow/${id}/settle/`, payload),

  /**
   * Reopen a settled or partially settled record
   */
  reopenDueBorrow: (id) => apiClient.post(`${BASE_PATH}/due-borrow/${id}/reopen/`),

  /**
   * Batch sync offline data to cloud database
   */
  syncBatch: (payload) => apiClient.post(`${BASE_PATH}/sync/`, payload),

  /**
   * Clear all transactions and due records
   */
  clearAll: () => apiClient.delete(`${BASE_PATH}/clear/`),
};
