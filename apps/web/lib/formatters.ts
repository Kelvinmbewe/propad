export function formatCurrency(value: number | null | undefined, currency: string = 'USD') {
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

export function formatFriendlyDate(value: string | Date | null | undefined) {
  if (!value) {
    return 'soon';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'soon';
  }

  return new Intl.DateTimeFormat('en-ZW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
