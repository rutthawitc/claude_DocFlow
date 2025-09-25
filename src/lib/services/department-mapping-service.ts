/**
 * Department Mapping Service
 *
 * Maps user job_name to specific department branches within BA1059 district
 * Provides centralized department-to-branch code mapping for authentication
 */

export interface DepartmentMapping {
  jobName: string;
  departmentName: string;
  branchCode: number;
  baCode: number;
}

export interface UserDepartmentInfo {
  branchCode: number;
  departmentName: string;
  fullName: string;
}

// Department mapping for BA1059 district
export const BA1059_DEPARTMENT_MAPPING: DepartmentMapping[] = [
  {
    jobName: 'งานพัสดุ',
    departmentName: 'งานพัสดุ',
    branchCode: 105901,
    baCode: 105901,
  },
  {
    jobName: 'งานธุรการ',
    departmentName: 'งานธุรการ',
    branchCode: 105902,
    baCode: 105902,
  },
  {
    jobName: 'งานบัญชีเจ้าหนี้',
    departmentName: 'งานบัญชีเจ้าหนี้',
    branchCode: 105903,
    baCode: 105903,
  },
  {
    jobName: 'งานการเงิน',
    departmentName: 'งานการเงิน',
    branchCode: 105904,
    baCode: 105904,
  },
  {
    jobName: 'งานบุคคล',
    departmentName: 'งานบุคคล',
    branchCode: 105905,
    baCode: 105905,
  },
];

/**
 * Get department info based on user's job_name
 */
export function getDepartmentByJobName(jobName: string): UserDepartmentInfo | null {
  const mapping = BA1059_DEPARTMENT_MAPPING.find(
    (dept) => dept.jobName === jobName
  );

  if (!mapping) {
    return null;
  }

  return {
    branchCode: mapping.branchCode,
    departmentName: mapping.departmentName,
    fullName: `กปภ.เขต 6 - ${mapping.departmentName}`,
  };
}

/**
 * Check if user belongs to BA1059 district based on their BA code
 */
export function isBA1059District(userBA: string | number): boolean {
  const baNumber = typeof userBA === 'string' ? parseInt(userBA) : userBA;
  return baNumber === 1059;
}

/**
 * Get all department branch codes for BA1059 district
 */
export function getBA1059DepartmentBranchCodes(): number[] {
  return BA1059_DEPARTMENT_MAPPING.map(dept => dept.branchCode);
}

/**
 * Check if a branch code belongs to BA1059 departments
 */
export function isBA1059DepartmentBranch(branchCode: number): boolean {
  return getBA1059DepartmentBranchCodes().includes(branchCode);
}

/**
 * Get department name by branch code
 */
export function getDepartmentNameByBranchCode(branchCode: number): string | null {
  const mapping = BA1059_DEPARTMENT_MAPPING.find(
    (dept) => dept.branchCode === branchCode
  );

  return mapping ? mapping.departmentName : null;
}

/**
 * Get all available job names for department mapping
 */
export function getAvailableJobNames(): string[] {
  return BA1059_DEPARTMENT_MAPPING.map(dept => dept.jobName);
}

export default {
  getDepartmentByJobName,
  isBA1059District,
  getBA1059DepartmentBranchCodes,
  isBA1059DepartmentBranch,
  getDepartmentNameByBranchCode,
  getAvailableJobNames,
  BA1059_DEPARTMENT_MAPPING,
};