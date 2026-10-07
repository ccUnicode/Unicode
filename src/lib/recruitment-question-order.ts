/** Match the applicant's script: motivation first, collaboration second, stable within each group. */
export function orderVideoQuestions<T extends { category: string }>(questions: readonly T[]): T[] {
  const rank = (category: string) => category === 'motivation' ? 0 : category === 'collaboration' ? 1 : 2;
  return [...questions].sort((a, b) => rank(a.category) - rank(b.category));
}
