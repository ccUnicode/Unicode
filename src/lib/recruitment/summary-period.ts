type Period = { enabled: boolean; opensAt: string | null; closesAt: string | null };

export const limaDay = (value: string | number | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(value));

export function registrationOpen(period: Period, now = Date.now()) {
  return period.enabled && (!period.opensAt || now >= Date.parse(period.opensAt)) && (!period.closesAt || now < Date.parse(period.closesAt));
}

export function registrationDays(opensAt: string | null, closesAt: string | null, submissions: string[], now = Date.now()) {
  // Closing is exclusive. A midnight deadline has no registration time on that day.
  const end = limaDay(closesAt ? Math.min(now, Date.parse(closesAt) - 1) : now);
  let start = opensAt ? limaDay(opensAt) : null;
  for (const value of submissions) {
    const day = limaDay(value);
    if (!start || day < start) start = day;
  }
  if (!start) start = limaDay(new Date(Date.parse(`${end}T12:00:00-05:00`) - 13 * 86_400_000));
  if (start > end) return [];
  const days: string[] = [];
  for (let cursor = Date.parse(`${start}T12:00:00-05:00`); days.length < 365; cursor += 86_400_000) {
    const day = limaDay(cursor);
    if (day > end) break;
    days.push(day);
  }
  return days;
}
