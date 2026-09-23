// Keep the API self-contained: Render deploys only the server directory.
export function calculateRenewalDate(start, end, manual) {
  if (manual) return new Date(manual).toISOString().slice(0, 10);
  if (end) return new Date(end).toISOString().slice(0, 10);
  if (!start) return '';
  const date = new Date(start);
  if (!Number.isFinite(date.getTime())) return '';
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 2);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}
