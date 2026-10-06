/** Area choice takes precedence over arrival time, including when sorting newest first. */
export function compareApplicationOrder(
  a: { id: string; firstChoiceArea: string; arrivedAt: string },
  b: { id: string; firstChoiceArea: string; arrivedAt: string },
  area: string,
  newestFirst = false,
): number {
  if (area) {
    const priority = Number(b.firstChoiceArea === area) - Number(a.firstChoiceArea === area);
    if (priority) return priority;
  }
  const arrival = Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt);
  return (newestFirst ? -arrival : arrival) || a.id.localeCompare(b.id);
}
