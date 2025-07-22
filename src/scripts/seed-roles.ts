import { getDb } from '../db/index.js';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

async function seedRolesAndPermissions() {
  console.log('Seeding roles and permissions...');
  
  // เข้าถึงฐานข้อมูล
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  // Define default roles
  const defaultRoles = [
    { name: 'admin', description: 'Administrator with full access' },
    { name: 'manager', description: 'Manager with administrative access' },
    { name: 'user', description: 'Regular user with limited access' },
    { name: 'guest', description: 'Guest user with minimal access' }
  ];

  // Define default permissions
  const defaultPermissions = [
    { name: 'users:read', description: 'Can view users' },
    { name: 'users:create', description: 'Can create users' },
    { name: 'users:update', description: 'Can update users' },
    { name: 'users:delete', description: 'Can delete users' },
    { name: 'roles:read', description: 'Can view roles' },
    { name: 'roles:create', description: 'Can create roles' },
    { name: 'roles:update', description: 'Can update roles' },
    { name: 'roles:delete', description: 'Can delete roles' },
    { name: 'dashboard:access', description: 'Can access dashboard' },
    { name: 'reports:read', description: 'Can view reports' },
    { name: 'reports:create', description: 'Can create reports' }
  ];

  // Insert roles
  for (const role of defaultRoles) {
    const existingRole = await db.query.roles.findFirst({
      where: eq(schema.roles.name, role.name)
    });

    if (!existingRole) {
      await db.insert(schema.roles).values(role);
      console.log(`Role created: ${role.name}`);
    } else {
      console.log(`Role already exists: ${role.name}`);
    }
  }

  // Insert permissions
  for (const permission of defaultPermissions) {
    const existingPermission = await db.query.permissions.findFirst({
      where: eq(schema.permissions.name, permission.name)
    });

    if (!existingPermission) {
      await db.insert(schema.permissions).values(permission);
      console.log(`Permission created: ${permission.name}`);
    } else {
      console.log(`Permission already exists: ${permission.name}`);
    }
  }

  // Assign permissions to roles
  const adminRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'admin')
  });

  const managerRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'manager')
  });

  const userRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'user')
  });

  const guestRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'guest')
  });

  if (adminRole) {
    // Admin gets all permissions
    const allPermissions = await db.query.permissions.findMany();
    for (const permission of allPermissions) {
      const exists = await db.query.rolePermissions.findFirst({
        where: (rp) => 
          eq(rp.roleId, adminRole.id) && 
          eq(rp.permissionId, permission.id)
      });

      if (!exists) {
        await db.insert(schema.rolePermissions).values({
          roleId: adminRole.id,
          permissionId: permission.id
        });
      }
    }
    console.log('Assigned all permissions to admin role');
  }

  if (managerRole) {
    // Manager gets specific permissions
    const managerPermissions = await db.query.permissions.findMany({
      where: (p) => 
        eq(p.name, 'users:read') || 
        eq(p.name, 'users:update') ||
        eq(p.name, 'dashboard:access') ||
        eq(p.name, 'reports:read') ||
        eq(p.name, 'reports:create')
    });

    for (const permission of managerPermissions) {
      const exists = await db.query.rolePermissions.findFirst({
        where: (rp) => 
          eq(rp.roleId, managerRole.id) && 
          eq(rp.permissionId, permission.id)
      });

      if (!exists) {
        await db.insert(schema.rolePermissions).values({
          roleId: managerRole.id,
          permissionId: permission.id
        });
      }
    }
    console.log('Assigned permissions to manager role');
  }

  if (userRole) {
    // User gets basic permissions
    const userPermissions = await db.query.permissions.findMany({
      where: (p) =>
        eq(p.name, 'dashboard:access') ||
        eq(p.name, 'reports:read')
    });

    for (const permission of userPermissions) {
      const exists = await db.query.rolePermissions.findFirst({
        where: (rp) => 
          eq(rp.roleId, userRole.id) && 
          eq(rp.permissionId, permission.id)
      });

      if (!exists) {
        await db.insert(schema.rolePermissions).values({
          roleId: userRole.id,
          permissionId: permission.id
        });
      }
    }
    console.log('Assigned permissions to user role');
  }

  if (guestRole) {
    // Guest gets minimal permissions
    const guestPermissions = await db.query.permissions.findMany({
      where: (p) => eq(p.name, 'dashboard:access')
    });

    for (const permission of guestPermissions) {
      const exists = await db.query.rolePermissions.findFirst({
        where: (rp) => 
          eq(rp.roleId, guestRole.id) && 
          eq(rp.permissionId, permission.id)
      });

      if (!exists) {
        await db.insert(schema.rolePermissions).values({
          roleId: guestRole.id,
          permissionId: permission.id
        });
      }
    }
    console.log('Assigned permissions to guest role');
  }

  console.log('Roles and permissions seeding completed');
}

// Run the seed function
seedRolesAndPermissions()
  .then(() => {
    console.log('Database seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  });