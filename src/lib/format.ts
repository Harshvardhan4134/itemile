/** Locale-aware formatting helpers for Itemile (US). */

export function formatCurrency(
  amount: number | undefined | null,
  options?: { maximumFractionDigits?: number }
): string {
  const value = amount ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(value);
}

export function formatCurrencyPerDay(amount: number | undefined | null): string {
  return `${formatCurrency(amount)} / day`;
}
