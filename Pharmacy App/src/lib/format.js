const money = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount) {
  return `₦${money.format(amount || 0)}`;
}

export function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(isoDate, time) {
  return `${formatDate(isoDate)} · ${time || ''}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

export function daysUntil(isoDate, fromISO = todayISO()) {
  const target = new Date(`${isoDate}T00:00:00`);
  const from = new Date(`${fromISO}T00:00:00`);
  return Math.round((target - from) / 86400000);
}
