/**
 * Test suite for month-year-generator utility functions
 * @jest-environment node
 */

import {
  generateMonthYearOptions,
  parseMonthYear,
  getCurrentMonthYear,
  validateMonthYear,
  THAI_MONTHS
} from '../month-year-generator';

// Mock Date for consistent testing
const mockDate = new Date('2025-06-15'); // June 15, 2025
global.Date = class extends Date {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(mockDate);
    } else {
      super(...args);
    }
  }
  
  static now() {
    return mockDate.getTime();
  }
} as any;

describe('month-year-generator', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS;
    delete process.env.NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS;
  });

  describe('generateMonthYearOptions', () => {
    it('should generate options with default settings (Buddhist era)', () => {
      const options = generateMonthYearOptions();
      
      // Should include current year (2568) plus 2 years future (2570) and 2 years past (2566)
      // Total: 5 years × 12 months = 60 options
      expect(options).toHaveLength(60);
      
      // Should start with most recent (desc order)
      expect(options[0]).toBe('มกราคม 2570');
      expect(options[11]).toBe('ธันวาคม 2570');
      
      // Should end with oldest
      expect(options[options.length - 1]).toBe('ธันวาคม 2566');
    });

    it('should respect environment variables', () => {
      process.env.NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS = '1';
      process.env.NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS = '1';
      
      const options = generateMonthYearOptions();
      
      // Should include 3 years × 12 months = 36 options
      expect(options).toHaveLength(36);
      expect(options[0]).toBe('มกราคม 2569');
      expect(options[options.length - 1]).toBe('ธันวาคม 2567');
    });

    it('should support ascending order', () => {
      const options = generateMonthYearOptions({ sortOrder: 'asc' });
      
      expect(options[0]).toBe('มกราคม 2566');
      expect(options[options.length - 1]).toBe('ธันวาคม 2570');
    });

    it('should support Christian era', () => {
      const options = generateMonthYearOptions({ 
        useBuddhistEra: false,
        yearsInFuture: 1,
        yearsInPast: 1
      });
      
      expect(options).toHaveLength(36);
      expect(options[0]).toBe('มกราคม 2026');
      expect(options[options.length - 1]).toBe('ธันวาคม 2024');
    });

    it('should handle custom year ranges', () => {
      const options = generateMonthYearOptions({
        yearsInFuture: 0,
        yearsInPast: 1
      });
      
      // Should include current year (2568) and 1 year past (2567) = 24 options
      expect(options).toHaveLength(24);
      expect(options[0]).toBe('มกราคม 2568');
      expect(options[options.length - 1]).toBe('ธันวาคม 2567');
    });
  });

  describe('parseMonthYear', () => {
    it('should parse valid month/year strings', () => {
      const result = parseMonthYear('มกราคม 2568');
      
      expect(result).toEqual({
        month: 'มกราคม',
        year: 2568,
        monthIndex: 0
      });
    });

    it('should handle all Thai months', () => {
      THAI_MONTHS.forEach((month, index) => {
        const result = parseMonthYear(`${month} 2568`);
        expect(result?.monthIndex).toBe(index);
      });
    });

    it('should return null for invalid formats', () => {
      expect(parseMonthYear('มกราคม')).toBeNull();
      expect(parseMonthYear('2568')).toBeNull();
      expect(parseMonthYear('January 2568')).toBeNull();
      expect(parseMonthYear('มกราคม abc')).toBeNull();
      expect(parseMonthYear('')).toBeNull();
    });
  });

  describe('getCurrentMonthYear', () => {
    it('should return current month/year in Buddhist era', () => {
      const result = getCurrentMonthYear(true);
      expect(result).toBe('มิถุนายน 2568'); // June 2025 in Buddhist era
    });

    it('should return current month/year in Christian era', () => {
      const result = getCurrentMonthYear(false);
      expect(result).toBe('มิถุนายน 2025'); // June 2025
    });
  });

  describe('validateMonthYear', () => {
    it('should validate months within acceptable range', () => {
      const result = validateMonthYear('มกราคม 2568');
      expect(result.isValid).toBe(true);
    });

    it('should reject months outside range', () => {
      const result = validateMonthYear('มกราคม 2580'); // Too far in future
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('ปีต้องอยู่ในช่วง');
    });

    it('should reject invalid formats', () => {
      const result = validateMonthYear('Invalid 2568');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('รูปแบบเดือน/ปี ไม่ถูกต้อง');
    });

    it('should respect custom ranges', () => {
      const result = validateMonthYear('มกราคม 2570', {
        yearsInFuture: 1,
        yearsInPast: 1
      });
      expect(result.isValid).toBe(false);
    });
  });
});