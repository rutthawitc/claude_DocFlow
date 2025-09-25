/**
 * Business days utilities for calculating working days excluding weekends
 */

/**
 * Add business days to a date (excluding Saturday and Sunday)
 * @param startDate - The starting date
 * @param businessDays - Number of business days to add
 * @returns The resulting date after adding business days
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate);
  let daysToAdd = businessDays;

  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1);

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysToAdd--;
    }
  }

  return result;
}

/**
 * Get current date in Thailand timezone
 * @returns Current date in Thailand timezone
 */
export function getCurrentThaiDate(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
}

/**
 * Format date to YYYY-MM-DD string
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get default return dates for original document
 * @returns Object with sendBackDate (current date) and deadlineDate (5 business days later)
 */
export function getDefaultReturnDates() {
  const currentDate = getCurrentThaiDate();
  const deadline = addBusinessDays(currentDate, 5);

  return {
    sendBackDate: formatDateToString(currentDate),
    deadlineDate: formatDateToString(deadline)
  };
}

/**
 * Validate that second date is after first date
 * @param firstDate - First date string (YYYY-MM-DD)
 * @param secondDate - Second date string (YYYY-MM-DD)
 * @returns True if secondDate is after firstDate
 */
export function isSecondDateAfterFirst(firstDate: string, secondDate: string): boolean {
  if (!firstDate || !secondDate) return true; // Allow empty dates

  const date1 = new Date(firstDate);
  const date2 = new Date(secondDate);

  return date2 > date1;
}