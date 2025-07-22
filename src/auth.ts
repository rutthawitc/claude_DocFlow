// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb } from '@/db';
import { users, roles, userRoles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';

// ประเภทข้อมูลสำหรับผู้ใช้งาน PWA
interface PWAUserData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  costCenter: string;
  ba: string;
  part: string;
  area: string;
  jobName: string;
  level: string;
  divName: string;
  depName: string;
  orgName: string;
  position: string;
  roles: string[];
  permissions: string[];
}

// ขยายประเภทข้อมูล User ของ Auth.js
declare module 'next-auth' {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    pwa?: PWAUserData;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      pwa?: PWAUserData;
    };
  }
}

// ขยายประเภทข้อมูล JWT
// @ts-expect-error - ใช้เพื่อให้ TypeScript ไม่แสดงข้อผิดพลาดเกี่ยวกับโมดูล 'next-auth/jwt' ที่ไม่พบ
declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    pwa?: PWAUserData;
  }
}

// หาบทบาทและสิทธิ์ผู้ใช้ (ยังไม่ใช้งานในตอนนี้)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getUserRolesAndPermissions(userId: string) {
  try {
    // เข้าถึง db ผ่านฟังก์ชัน getDb() ซึ่งจะทำงานเฉพาะบน server
    const db = await getDb();
    if (!db) {
      console.error('Database client not available');
      return { roles: ['user'], permissions: [] };
    }
    
    // หาบทบาทของผู้ใช้
    // แปลง userId จาก string เป็น number เพื่อให้ตรงกับประเภทของคอลัมน์ในฐานข้อมูล
    const userIdNum = parseInt(userId, 10);
    const userRolesData = await db.query.userRoles.findMany({
      where: (ur: any, { eq }: any) => eq(ur.userId, userIdNum),
      with: {
        role: true
      }
    });

    const roles = userRolesData.map((ur: any) => ur.role.name);
    
    // หาสิทธิ์ที่เกี่ยวข้องกับบทบาท
    const permissions: string[] = [];
    
    for (const userRole of userRolesData) {
      const rolePerms = await db.query.rolePermissions.findMany({
        where: (rp: any, { eq }: any) => eq(rp.roleId, userRole.roleId),
        with: {
          permission: true
        }
      });
      
      for (const rp of rolePerms) {
        if (rp.permission?.name && !permissions.includes(rp.permission.name)) {
          permissions.push(rp.permission.name);
        }
      }
    }
    
    return { roles, permissions };
  } catch (error) {
    console.error('Error getting user roles and permissions:', error);
    return { roles: ['user'], permissions: [] };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/api/auth',
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
  providers: [
    Credentials({
      name: 'PWA Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        pwd: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Check if PWA_AUTH_URL is set
        if (!process.env.PWA_AUTH_URL) {
          console.error('PWA_AUTH_URL is not defined in .env file');
          throw new Error('PWA_AUTH_URL is not defined. Please check your environment variables.');
        }

        // ตรวจสอบข้อมูลที่ได้รับมา
        const username = credentials?.username;
        const password = credentials?.pwd;

        if (!username || !password) {
          console.log('Username or password missing');
          return null;
        }

        try {
          // เรียก API เพื่อตรวจสอบการเข้าสู่ระบบ
          const response = await fetch(process.env.PWA_AUTH_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username,
              pwd: password,
            }),
          });

          if (!response.ok) {
            console.error('API error, status:', response.status);
            return null;
          }

          const data = await response.json();
          console.log('PWA API response:', JSON.stringify(data, null, 2));
          
          // ตรวจสอบผลตอบกลับจาก API
          if (!data || data.status !== 'success') {
            console.error('Login failed or no user data returned from API');
            return null;
          }

          console.log('API login success');
          
          // Create or update user in database
          const userId = data.username.toString();
          const userEmail = data.email || '';
          
          try {
            // เข้าถึง db ผ่านฟังก์ชัน getDb()
            const db = await getDb();
            if (!db) {
              console.error('Database client not available');
              throw new Error('Database connection failed');
            }
            
            // ถ้าพบ userId ในฐานข้อมูล ให้อัปเดตข้อมูลผู้ใช้
            const existingUser = await db.query.users.findFirst({
              where: (users: any, { eq }: any) => eq(users.username, userId)
            });
            
            if (existingUser) {
              // อัปเดตข้อมูลผู้ใช้ที่มีอยู่
              await db.update(users).set({
                email: userEmail || '',
                firstName: data.firstname || '',
                lastName: data.lastname || '',
                costCenter: data.costcenter || '',
                ba: data.ba || '',
                part: data.part || '',
                area: data.area || '',
                jobName: data.job_name || '',
                level: data.level || '',
                divName: data.div_name || '',
                depName: data.dep_name || '',
                orgName: data.org_name || '',
                position: data.position || '',
                updatedAt: new Date()
              }).where(eq(users.username, userId));
              
              console.log('User updated successfully in database');
            } else {
              // สร้างผู้ใช้ใหม่ถ้ายังไม่มี
              console.log('Creating new user in database');
              const insertResult = await db.insert(users).values({
                username: userId,
                email: userEmail || '',
                firstName: data.firstname || '',
                lastName: data.lastname || '',
                costCenter: data.costcenter || '',
                ba: data.ba || '',
                part: data.part || '',
                area: data.area || '',
                jobName: data.job_name || '',
                level: data.level || '',
                divName: data.div_name || '',
                depName: data.dep_name || '',
                orgName: data.org_name || '',
                position: data.position || '',
                createdAt: new Date(),
                updatedAt: new Date()
              }).returning();
              
              // ตรวจสอบว่ามีการสร้างผู้ใช้ใหม่สำเร็จหรือไม่
              const newUser = insertResult[0];
              
              // Assign default 'user' role if it exists
              if (newUser) {
                try {
                  const defaultRole = await db.query.roles.findFirst({
                    where: eq(roles.name, 'user')
                  });

                  if (defaultRole && newUser && newUser.id) {
                    // The user_roles table only needs userId and roleId
                    // The primary key is a composite of both columns
                    await db.insert(userRoles).values({
                      userId: newUser.id,
                      roleId: defaultRole.id
                    });
                    console.log('Default user role assigned successfully');
                  } else {
                    console.warn('Default "user" role not found in the database');
                  }
                } catch (roleError) {
                  console.error('Error assigning default role:', roleError);
                  // Don't fail user creation if role assignment fails
                }
              }
              
              // Auto-assign DocFlow roles to new user
              try {
                const pwaData: PWAUserData = {
                  username: userId,
                  firstName: data.firstname || '',
                  lastName: data.lastname || '',
                  email: userEmail || '',
                  costCenter: data.costcenter || '',
                  ba: data.ba || '',
                  part: data.part || '',
                  area: data.area || '',
                  jobName: data.job_name || '',
                  level: data.level || '',
                  divName: data.div_name || '',
                  depName: data.dep_name || '',
                  orgName: data.org_name || '',
                  position: data.position || '',
                  roles: ['user'],
                  permissions: []
                };
                
                await DocFlowAuth.autoAssignDocFlowRoles(newUser.id, pwaData);
                console.log('DocFlow roles assigned to new user');
              } catch (docFlowError) {
                console.error('Error assigning DocFlow roles:', docFlowError);
                // Don't fail user creation if DocFlow role assignment fails
              }
            }
            
            // Also auto-assign DocFlow roles to existing users on login
            if (existingUser) {
              try {
                const pwaData: PWAUserData = {
                  username: userId,
                  firstName: data.firstname || '',
                  lastName: data.lastname || '',
                  email: userEmail || '',
                  costCenter: data.costcenter || '',
                  ba: data.ba || '',
                  part: data.part || '',
                  area: data.area || '',
                  jobName: data.job_name || '',
                  level: data.level || '',
                  divName: data.div_name || '',
                  depName: data.dep_name || '',
                  orgName: data.org_name || '',
                  position: data.position || '',
                  roles: ['user'],
                  permissions: []
                };
                
                await DocFlowAuth.autoAssignDocFlowRoles(existingUser.id, pwaData);
                console.log('DocFlow roles updated for existing user');
              } catch (docFlowError) {
                console.error('Error updating DocFlow roles for existing user:', docFlowError);
                // Don't fail auth if DocFlow role update fails
              }
            }
            
            // Get user's actual roles and permissions from database
            let userRoles = ['user'];
            let userPermissions = ['dashboard:access', 'reports:read', 'users:read'];
            
            try {
              const existingUserForRoles = existingUser || await db.query.users.findFirst({
                where: (users: any, { eq }: any) => eq(users.username, userId)
              });
              
              console.log('Looking up roles for user:', userId, 'found user:', existingUserForRoles?.id);
              
              if (existingUserForRoles) {
                const rolesAndPermissions = await DocFlowAuth.getUserRolesAndPermissions(existingUserForRoles.id);
                console.log('Got roles and permissions:', rolesAndPermissions);
                userRoles = rolesAndPermissions.roles.length > 0 ? rolesAndPermissions.roles : ['user'];
                userPermissions = rolesAndPermissions.permissions.length > 0 ? rolesAndPermissions.permissions : ['dashboard:access', 'reports:read', 'users:read'];
                console.log('Final roles for session:', userRoles);
              } else {
                console.log('No user found for roles lookup');
              }
            } catch (roleError) {
              console.error('Error getting user roles for session:', roleError);
              // Use defaults if error
            }
            
            // Create user data for session with actual roles
            const userData = {
              id: userId,
              name: `${data.firstname || ''} ${data.lastname || ''}`.trim(),  // สร้าง display name จาก firstName และ lastName
              email: userEmail,
              image: null,
              pwa: {
                username: userId,
                firstName: data.firstname || '',
                lastName: data.lastname || '',
                email: userEmail,
                costCenter: data.costcenter || '',
                ba: data.ba || '',
                part: data.part || '',
                area: data.area || '',
                jobName: data.job_name || '',
                level: data.level || '',
                divName: data.div_name || '',
                depName: data.dep_name || '',
                orgName: data.org_name || '',
                position: data.position || '',
                roles: userRoles,
                permissions: userPermissions,
              }
            };
            
            return userData;
          } catch (dbError) {
            console.error('Error saving user to database:', dbError);
            // Return fallback userData if DB operations fail
            return {
              id: userId,
              name: `${data.firstname || ''} ${data.lastname || ''}`.trim(),
              email: userEmail,
              image: null,
              pwa: {
                username: userId,
                firstName: data.firstname || '',
                lastName: data.lastname || '',
                email: userEmail,
                costCenter: data.costcenter || '',
                ba: data.ba || '',
                part: data.part || '',
                area: data.area || '',
                jobName: data.job_name || '',
                level: data.level || '',
                divName: data.div_name || '',
                depName: data.dep_name || '',
                orgName: data.org_name || '',
                position: data.position || '',
                roles: ['user'],
                permissions: ['dashboard:access', 'reports:read', 'users:read'],
              }
            };
          }
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // ใช้ nullish coalescing operator (??) เพื่อกำหนดค่าเริ่มต้นสำหรับตัวแปรที่อาจเป็น undefined หรือ null
        token.sub = user.id ?? '';
        token.name = user.name ?? null; // สามารถเป็น null ได้ตาม interface JWT
        token.email = user.email ?? null; // สามารถเป็น null ได้ตาม interface JWT
        token.picture = user.image ?? null; // สามารถเป็น null ได้ตาม interface JWT
        token.pwa = user.pwa;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // ใช้ type assertion เพื่อหลีกเลี่ยง TypeScript error
        const user = session.user as {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
          pwa?: PWAUserData;
        };
        
        // กำหนดค่าให้กับ user ที่มี type ถูกต้องแล้ว
        user.id = token.sub || '';
        user.name = token.name ?? null;
        user.email = token.email ?? null;
        user.image = token.picture ?? null;
        user.pwa = token.pwa as PWAUserData;
      }
      return session;
    }
  }
});
