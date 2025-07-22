// scripts/seed-roles.ts
import { getDb } from '../src/db/index';
import * as schema from '../src/db/schema';
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

  console.log('Seeding complete!');
}

seedRolesAndPermissions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });