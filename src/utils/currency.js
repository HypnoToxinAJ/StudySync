/**
 * Centralized Currency Formatter for StudySync
 * Standard fixed application currency: Bangladeshi Taka (BDT, ৳)
 */

export const formatBDT = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '৳ 0';
  }
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return '৳ 0';

  return `৳ ${numericValue.toLocaleString('en-BD', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`;
};

export default {
  formatBDT
};
