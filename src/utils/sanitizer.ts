/**
 * Formats a number as USD currency.
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Validates a percentage multiplier and returns it.
 * Allows negative percentages to reflect financial losses.
 */
export function clampPercent(value: number): number {
  if (isNaN(value) || value === undefined) return 0;
  return value;
}

/**
 * Rounds a decimal percentage value (e.g., 0.8543 -> 85.43%) to 2 decimal places
 * and returns it as a formatted string. Supports negative values.
 */
export function formatPercent(value: number): string {
  const normalized = clampPercent(value);
  const percentage = normalized * 100;
  return `${percentage.toFixed(2)}%`;
}
