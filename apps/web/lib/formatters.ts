export function formatCurrency(value: number | null | undefined, currency: string) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '—';
  }

  const formatter = new Intl.NumberFormat('en-ZW', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 0
  });

  return formatter.format(value);
}
