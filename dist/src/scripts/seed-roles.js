"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../db/index.js");
const schema = __importStar(require("../db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
async function seedRolesAndPermissions() {
    console.log('Seeding roles and permissions...');
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
        const existingRole = await index_js_1.db.query.roles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.roles.name, role.name)
        });
        if (!existingRole) {
            await index_js_1.db.insert(schema.roles).values(role);
            console.log(`Role created: ${role.name}`);
        }
        else {
            console.log(`Role already exists: ${role.name}`);
        }
    }
    // Insert permissions
    for (const permission of defaultPermissions) {
        const existingPermission = await index_js_1.db.query.permissions.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.permissions.name, permission.name)
        });
        if (!existingPermission) {
            await index_js_1.db.insert(schema.permissions).values(permission);
            console.log(`Permission created: ${permission.name}`);
        }
        else {
            console.log(`Permission already exists: ${permission.name}`);
        }
    }
    // Assign permissions to roles
    const adminRole = await index_js_1.db.query.roles.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.roles.name, 'admin')
    });
    const managerRole = await index_js_1.db.query.roles.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.roles.name, 'manager')
    });
    const userRole = await index_js_1.db.query.roles.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.roles.name, 'user')
    });
    const guestRole = await index_js_1.db.query.roles.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.roles.name, 'guest')
    });
    if (adminRole) {
        // Admin gets all permissions
        const allPermissions = await index_js_1.db.query.permissions.findMany();
        for (const permission of allPermissions) {
            const exists = await index_js_1.db.query.rolePermissions.findFirst({
                where: (rp) => (0, drizzle_orm_1.eq)(rp.roleId, adminRole.id) &&
                    (0, drizzle_orm_1.eq)(rp.permissionId, permission.id)
            });
            if (!exists) {
                await index_js_1.db.insert(schema.rolePermissions).values({
                    roleId: adminRole.id,
                    permissionId: permission.id
                });
            }
        }
        console.log('Assigned all permissions to admin role');
    }
    if (managerRole) {
        // Manager gets specific permissions
        const managerPermissions = await index_js_1.db.query.permissions.findMany({
            where: (p) => (0, drizzle_orm_1.eq)(p.name, 'users:read') ||
                (0, drizzle_orm_1.eq)(p.name, 'users:update') ||
                (0, drizzle_orm_1.eq)(p.name, 'dashboard:access') ||
                (0, drizzle_orm_1.eq)(p.name, 'reports:read') ||
                (0, drizzle_orm_1.eq)(p.name, 'reports:create')
        });
        for (const permission of managerPermissions) {
            const exists = await index_js_1.db.query.rolePermissions.findFirst({
                where: (rp) => (0, drizzle_orm_1.eq)(rp.roleId, managerRole.id) &&
                    (0, drizzle_orm_1.eq)(rp.permissionId, permission.id)
            });
            if (!exists) {
                await index_js_1.db.insert(schema.rolePermissions).values({
                    roleId: managerRole.id,
                    permissionId: permission.id
                });
            }
        }
        console.log('Assigned permissions to manager role');
    }
    if (userRole) {
        // User gets basic permissions
        const userPermissions = await index_js_1.db.query.permissions.findMany({
            where: (p) => (0, drizzle_orm_1.eq)(p.name, 'dashboard:access') ||
                (0, drizzle_orm_1.eq)(p.name, 'reports:read')
        });
        for (const permission of userPermissions) {
            const exists = await index_js_1.db.query.rolePermissions.findFirst({
                where: (rp) => (0, drizzle_orm_1.eq)(rp.roleId, userRole.id) &&
                    (0, drizzle_orm_1.eq)(rp.permissionId, permission.id)
            });
            if (!exists) {
                await index_js_1.db.insert(schema.rolePermissions).values({
                    roleId: userRole.id,
                    permissionId: permission.id
                });
            }
        }
        console.log('Assigned permissions to user role');
    }
    if (guestRole) {
        // Guest gets minimal permissions
        const guestPermissions = await index_js_1.db.query.permissions.findMany({
            where: (p) => (0, drizzle_orm_1.eq)(p.name, 'dashboard:access')
        });
        for (const permission of guestPermissions) {
            const exists = await index_js_1.db.query.rolePermissions.findFirst({
                where: (rp) => (0, drizzle_orm_1.eq)(rp.roleId, guestRole.id) &&
                    (0, drizzle_orm_1.eq)(rp.permissionId, permission.id)
            });
            if (!exists) {
                await index_js_1.db.insert(schema.rolePermissions).values({
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
