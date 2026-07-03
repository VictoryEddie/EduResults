/**
 * Generates a list of academic years as dropdown options.
 * Format: "2021-2022", "2022-2023", etc.
 * Starts 5 years back from the current year and goes up to the current academic year.
 * Update START_YEAR when you want to change the earliest available year.
 */

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = CURRENT_YEAR - 5;

export const ACADEMIC_YEARS: string[] = Array.from(
  { length: CURRENT_YEAR - START_YEAR + 1 },
  (_, i) => {
    const year = START_YEAR + i;
    return `${year}-${year + 1}`;
  }
).reverse(); // Most recent first
