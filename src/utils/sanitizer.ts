/**
 * Formats a number as USD currency.
 */
export function formatCurrency(value: number): string {
  if (isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Clamps a numeric value (e.g., ROI multiplier) to a valid range (min 0)
 * and rounds it to 2 decimal places.
 */
export function clampPercent(value: number): number {
  if (isNaN(value)) return 0;
  return Math.max(0, value);
}

/**
 * Rounds a decimal percentage value (e.g., 0.8543 -> 85.43%) to 2 decimal places
 * and returns it as a formatted string. Clamps to minimum 0%.
 */
export function formatPercent(value: number): string {
  const clamped = clampPercent(value);
  const percentage = clamped * 100;
  return `${percentage.toFixed(2)}%`;
}
