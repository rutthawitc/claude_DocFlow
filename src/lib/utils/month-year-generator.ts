/**
 * Utility functions for generating month/year options for document forms
 */

export interface MonthYearConfig {
  /** Number of years to show in the future (default: 1) */
  yearsInFuture?: number;
  /** Number of years to show in the past (default: 1) */
  yearsInPast?: number;
  /** Whether to use Buddhist Era calendar (default: true) */
  useBuddhistEra?: boolean;
  /** Sort order: 'desc' for newest first, 'asc' for oldest first (default: 'desc') */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Thai month names
 */
export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
] as const;

/**
 * Generate month/year options dynamically based on configuration
 */
export function generateMonthYearOptions(config: MonthYearConfig = {}): string[] {
  const {
    yearsInFuture = parseInt(process.env.NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS || '1'),
    yearsInPast = parseInt(process.env.NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS || '1'),
    useBuddhistEra = true,
    sortOrder = 'desc'
  } = config;

  const currentYear = new Date().getFullYear();
  const baseYear = useBuddhistEra ? currentYear + 543 : currentYear;
  const options: string[] = [];

  // Calculate year range
  const startYear = baseYear - yearsInPast;
  const endYear = baseYear + yearsInFuture;

  // Generate options
  for (let year = startYear; year <= endYear; year++) {
    THAI_MONTHS.forEach(month => {
      options.push(`${month} ${year}`);
    });
  }

  // Sort based on preference
  if (sortOrder === 'desc') {
    options.reverse();
  }

  return options;
}

/**
 * Parse month/year string back to components
 */
export function parseMonthYear(monthYearString: string): {
  month: string;
  year: number;
  monthIndex: number; // 0-based index for JavaScript Date
} | null {
  const parts = monthYearString.trim().split(' ');
  if (parts.length !== 2) return null;

  const [month, yearStr] = parts;
  const year = parseInt(yearStr);
  
  if (isNaN(year)) return null;

  const monthIndex = THAI_MONTHS.indexOf(month as any);
  if (monthIndex === -1) return null;

  return {
    month,
    year,
    monthIndex
  };
}

/**
 * Get current month/year in Thai format
 */
export function getCurrentMonthYear(useBuddhistEra: boolean = true): string {
  const now = new Date();
  const year = useBuddhistEra ? now.getFullYear() + 543 : now.getFullYear();
  const month = THAI_MONTHS[now.getMonth()];
  
  return `${month} ${year}`;
}

/**
 * Validate if a month/year string is within acceptable range
 */
export function validateMonthYear(
  monthYearString: string, 
  config: MonthYearConfig = {}
): { isValid: boolean; message?: string } {
  const parsed = parseMonthYear(monthYearString);
  if (!parsed) {
    return { isValid: false, message: 'รูปแบบเดือน/ปี ไม่ถูกต้อง' };
  }

  const {
    yearsInFuture = parseInt(process.env.NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS || '1'),
    yearsInPast = parseInt(process.env.NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS || '1'),
    useBuddhistEra = true
  } = config;

  const currentYear = new Date().getFullYear();
  const baseYear = useBuddhistEra ? currentYear + 543 : currentYear;
  
  const minYear = baseYear - yearsInPast;
  const maxYear = baseYear + yearsInFuture;

  if (parsed.year < minYear || parsed.year > maxYear) {
    return { 
      isValid: false, 
      message: `ปีต้องอยู่ในช่วง ${minYear} - ${maxYear}` 
    };
  }

  return { isValid: true };
}