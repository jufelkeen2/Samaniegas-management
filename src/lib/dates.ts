export function monthRange(month?: string) {
  const valid = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = valid.split("-").map(Number);
  return { month: valid, start: new Date(Date.UTC(year, monthNumber - 1, 1)), end: new Date(Date.UTC(year, monthNumber, 1)) };
}

export function parseDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
