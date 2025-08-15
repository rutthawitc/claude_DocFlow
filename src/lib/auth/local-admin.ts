import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, roles, userRoles } from '@/db/schema';
import { DocFlowAuth, DOCFLOW_ROLES, DOCFLOW_PERMISSIONS } from './docflow-auth';
import bcrypt from 'bcryptjs';

export interface LocalAdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  isLocalAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocalAdminData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface UserRoleAssignment {
  userId: number;
  roleNames: string[];
}

export class LocalAdminService {
  /**
   * Create a local admin user with full permissions
   */
  static async createLocalAdmin(adminData: CreateLocalAdminData): Promise<LocalAdminUser | null> {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    try {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, adminData.username)
      });

      if (existingUser) {
        throw new Error(`User with username '${adminData.username}' already exists`);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 12);

      // Create user record
      const newUser = await db.insert(users).values({
        username: adminData.username,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        password: hashedPassword,
        isLocalAdmin: true,
        costCenter: 'LOCAL_ADMIN',
        ba: 'ADMIN',
        part: 'ADMIN',
        area: 'ADMIN',
        jobName: 'System Administrator',
        level: 'ADMIN',
        divName: 'IT',
        depName: 'System Administration',
        orgName: 'DocFlow System',
        position: 'Local Administrator',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const user = newUser[0];
      if (!user) throw new Error('Failed to create user');

      // Assign admin role
      await DocFlowAuth.assignRole(user.id, DOCFLOW_ROLES.ADMIN);
      
      // Get user with full data
      const userWithData = await this.getLocalAdminUser(user.id);
      
      console.log(`Local admin user created: ${adminData.username} (ID: ${user.id})`);
      return userWithData;
    } catch (error) {
      console.error('Error creating local admin:', error);
      throw error;
    }
  }

  /**
   * Get local admin user by ID
   */
  static async getLocalAdminUser(userId: number): Promise<LocalAdminUser | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) return null;

      const { roles, permissions } = await DocFlowAuth.getUserRolesAndPermissions(userId);

      return {
        id: user.id,
        username: user.username,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        roles,
        permissions,
        isLocalAdmin: user.isLocalAdmin || false,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };
    } catch (error) {
      console.error('Error getting local admin user:', error);
      return null;
    }
  }

  /**
   * List all users in the system
   */
  static async listAllUsers(): Promise<LocalAdminUser[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const allUsers = await db.query.users.findMany({
        orderBy: (users, { asc }) => [asc(users.createdAt)]
      });

      const usersWithRoles: LocalAdminUser[] = [];

      for (const user of allUsers) {
        const { roles, permissions } = await DocFlowAuth.getUserRolesAndPermissions(user.id);
        
        usersWithRoles.push({
          id: user.id,
          username: user.username,
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          roles,
          permissions,
          isLocalAdmin: user.isLocalAdmin || false,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date()
        });
      }

      return usersWithRoles;
    } catch (error) {
      console.error('Error listing users:', error);
      return [];
    }
  }

  /**
   * Assign roles to a user
   */
  static async assignRolesToUser(userId: number, roleNames: string[]): Promise<boolean> {
    try {
      // Remove all existing roles first
      await this.removeAllUserRoles(userId);

      // Assign new roles
      for (const roleName of roleNames) {
        const success = await DocFlowAuth.assignRole(userId, roleName);
        if (!success) {
          console.error(`Failed to assign role ${roleName} to user ${userId}`);
          return false;
        }
      }

      console.log(`Assigned roles [${roleNames.join(', ')}] to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      return false;
    }
  }

  /**
   * Remove all roles from a user
   */
  static async removeAllUserRoles(userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db.delete(userRoles).where(eq(userRoles.userId, userId));
      console.log(`Removed all roles from user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error removing user roles:', error);
      return false;
    }
  }

  /**
   * Get all available roles
   */
  static async getAllRoles(): Promise<{ id: number; name: string; description: string }[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const allRoles = await db.query.roles.findMany({
        orderBy: (roles, { asc }) => [asc(roles.name)]
      });

      return allRoles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description || ''
      }));
    } catch (error) {
      console.error('Error getting all roles:', error);
      return [];
    }
  }

  /**
   * Update user basic information
   */
  static async updateUser(userId: number, updateData: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db.update(users)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`Updated user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  /**
   * Delete a user (only non-admin users)
   */
  static async deleteUser(userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      // Check if user is admin
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isLocalAdmin) {
        throw new Error('Cannot delete local admin users');
      }

      // Remove user roles first
      await this.removeAllUserRoles(userId);

      // Delete user
      await db.delete(users).where(eq(users.id, userId));

      console.log(`Deleted user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Check if user is local admin
   */
  static async isLocalAdmin(userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      return user?.isLocalAdmin || false;
    } catch (error) {
      console.error('Error checking local admin status:', error);
      return false;
    }
  }

  /**
   * Authenticate local admin user
   */
  static async authenticateLocalAdmin(username: string, password: string): Promise<LocalAdminUser | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.username, username),
          eq(users.isLocalAdmin, true)
        )
      });

      if (!user || !user.password) return null;

      // Check if password is already hashed (bcrypt hashes are 60 characters)
      let isValidPassword = false;
      
      if (user.password.length === 60 && user.password.startsWith('$2')) {
        // Password is already hashed, use bcrypt compare
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Password is plain text (transition period), compare directly and hash it
        if (user.password === password) {
          isValidPassword = true;
          
          // Update to hashed password for security
          try {
            const hashedPassword = await bcrypt.hash(password, 12);
            await db.update(users)
              .set({ 
                password: hashedPassword,
                updatedAt: new Date()
              })
              .where(eq(users.id, user.id));
            console.log(`Updated plain text password to hashed for user: ${username}`);
          } catch (hashError) {
            console.error('Error updating password hash:', hashError);
            // Continue with authentication even if hash update fails
          }
        }
      }
      
      if (!isValidPassword) return null;

      return await this.getLocalAdminUser(user.id);
    } catch (error) {
      console.error('Error authenticating local admin:', error);
      return null;
    }
  }

  /**
   * Change local admin password
   */
  static async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await db.update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`Password changed for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }
}