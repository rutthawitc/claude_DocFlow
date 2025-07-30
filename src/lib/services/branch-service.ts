import { eq, count, and, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { branches, documents } from '@/db/schema';
import { Branch, BranchWithDocumentCounts, PWAUserData, DocumentCounts, R6_BRANCHES } from '@/lib/types';
import { CacheService } from '@/lib/cache/cache-service';
import { CacheUtils } from '@/lib/cache/cache-middleware';

export class BranchService {
  private static cache = CacheService.getInstance();

  /**
   * Get all branches
   */
  static async getAllBranches(): Promise<Branch[]> {
    return this.cache.withCache(
      'all_branches',
      async () => {
        const db = await getDb();
        return await db.select().from(branches).where(eq(branches.isActive, true));
      },
      {
        ttl: 3600, // 1 hour - branches don't change often
        tags: CacheUtils.generateBranchTags(),
        prefix: 'branches'
      }
    );
  }

  /**
   * Get branch by BA code
   */
  static async getBranchByBaCode(baCode: number): Promise<Branch | null> {
    return this.cache.withCache(
      CacheUtils.generateBranchKey(baCode),
      async () => {
        const db = await getDb();
        const result = await db
          .select()
          .from(branches)
          .where(and(eq(branches.baCode, baCode), eq(branches.isActive, true)))
          .limit(1);
        
        return result[0] || null;
      },
      {
        ttl: 3600, // 1 hour
        tags: CacheUtils.generateBranchTags(),
        prefix: 'branches'
      }
    );
  }

  /**
   * Get branch by ID
   */
  static async getBranchById(id: number): Promise<Branch | null> {
    const db = await getDb();
    const result = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, id), eq(branches.isActive, true)))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Map PWA user data to branch
   */
  static async getUserBranch(user: PWAUserData): Promise<Branch | null> {
    // Method 1: Use user.ba field (primary)
    if (user.ba) {
      const baCode = parseInt(user.ba);
      if (!isNaN(baCode)) {
        return await this.getBranchByBaCode(baCode);
      }
    }
    
    // Method 2: Use user.costCenter as fallback
    if (user.costCenter) {
      const costCenterNum = parseInt(user.costCenter);
      if (!isNaN(costCenterNum)) {
        return await this.getBranchByBaCode(costCenterNum);
      }
    }
    
    // Method 3: Fuzzy matching by name (if needed)
    if (user.orgName || user.depName) {
      return await this.findBranchByName(user.orgName || user.depName || '');
    }
    
    return null;
  }

  /**
   * Find branch by fuzzy name matching
   */
  static async findBranchByName(searchName: string): Promise<Branch | null> {
    const db = await getDb();
    const allBranches = await db.select().from(branches).where(eq(branches.isActive, true));
    
    // Simple fuzzy matching - can be enhanced with better algorithms
    const normalizedSearch = searchName.toLowerCase().replace(/\s+/g, '');
    
    for (const branch of allBranches) {
      const normalizedBranchName = branch.name.toLowerCase().replace(/\s+/g, '');
      if (normalizedBranchName.includes(normalizedSearch) || 
          normalizedSearch.includes(normalizedBranchName)) {
        return branch;
      }
    }
    
    return null;
  }

  /**
   * Get document counts for a branch (excluding draft documents)
   */
  static async getBranchDocumentCounts(branchBaCode: number): Promise<DocumentCounts> {
    const db = await getDb();
    
    // Get counts by status, excluding draft documents
    const statusCounts = await db
      .select({
        status: documents.status,
        count: count()
      })
      .from(documents)
      .where(and(
        eq(documents.branchBaCode, branchBaCode),
        ne(documents.status, 'draft')
      ))
      .groupBy(documents.status);

    // Initialize counts
    const counts: DocumentCounts = {
      total: 0,
      draft: 0,
      sent_to_branch: 0,
      acknowledged: 0,
      sent_back_to_district: 0
    };

    // Aggregate results
    statusCounts.forEach(({ status, count: statusCount }) => {
      counts.total += statusCount;
      if (status in counts) {
        counts[status as keyof DocumentCounts] = statusCount;
      }
    });

    return counts;
  }

  /**
   * Get branch with document counts
   */
  static async getBranchWithCounts(branchBaCode: number): Promise<BranchWithDocumentCounts | null> {
    const branch = await this.getBranchByBaCode(branchBaCode);
    if (!branch) return null;

    const documentCounts = await this.getBranchDocumentCounts(branchBaCode);

    return {
      ...branch,
      documentCounts
    };
  }

  /**
   * Get all branches with document counts
   */
  static async getAllBranchesWithCounts(): Promise<BranchWithDocumentCounts[]> {
    const allBranches = await this.getAllBranches();
    
    const branchesWithCounts = await Promise.all(
      allBranches.map(async (branch) => {
        const documentCounts = await this.getBranchDocumentCounts(branch.baCode);
        return {
          ...branch,
          documentCounts
        };
      })
    );

    return branchesWithCounts;
  }

  /**
   * Initialize branches from R6 data
   */
  static async initializeBranchesFromData(): Promise<void> {
    const db = await getDb();
    
    try {
      // Check if branches already exist
      const existingBranches = await db.select().from(branches).limit(1);
      if (existingBranches.length > 0) {
        console.log('Branches already initialized');
        return;
      }

      // Insert all R6 branches
      await db.insert(branches).values(R6_BRANCHES);
      console.log(`Initialized ${R6_BRANCHES.length} branches`);
    } catch (error) {
      console.error('Error initializing branches:', error);
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  static async createBranch(branchData: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Branch> {
    const db = await getDb();
    
    const result = await db
      .insert(branches)
      .values(branchData)
      .returning();
    
    return result[0];
  }

  /**
   * Update branch
   */
  static async updateBranch(id: number, updates: Partial<Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Branch | null> {
    const db = await getDb();
    
    const result = await db
      .update(branches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Deactivate branch (soft delete)
   */
  static async deactivateBranch(id: number): Promise<boolean> {
    const db = await getDb();
    
    const result = await db
      .update(branches)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    
    return result.length > 0;
  }

  /**
   * Search branches by name
   */
  static async searchBranches(searchTerm: string): Promise<Branch[]> {
    const db = await getDb();
    const allBranches = await db.select().from(branches).where(eq(branches.isActive, true));
    
    if (!searchTerm.trim()) {
      return allBranches;
    }
    
    const normalizedSearch = searchTerm.toLowerCase();
    
    return allBranches.filter(branch => 
      branch.name.toLowerCase().includes(normalizedSearch) ||
      branch.baCode.toString().includes(searchTerm) ||
      branch.branchCode.toString().includes(searchTerm)
    );
  }

  /**
   * Validate branch access for user
   */
  static async validateBranchAccess(userId: number, branchBaCode: number, userRoles: string[]): Promise<boolean> {
    // Admin can access all branches
    if (userRoles.includes('admin')) {
      return true;
    }

    // Branch managers can access all branches in their region (R6)
    if (userRoles.includes('branch_manager')) {
      const branch = await this.getBranchByBaCode(branchBaCode);
      return branch?.regionCode === 'R6';
    }

    // Branch users and uploaders need specific branch access
    // This would need to be implemented based on user-branch mapping
    return false;
  }
}