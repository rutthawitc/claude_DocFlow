"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsRelations = exports.rolePermissionsRelations = exports.permissionsRelations = exports.userRolesRelations = exports.rolesRelations = exports.usersRelations = exports.sessions = exports.rolePermissions = exports.permissions = exports.userRoles = exports.roles = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Users table
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    username: (0, pg_core_1.varchar)('username', { length: 255 }).notNull().unique(),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 255 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 255 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    costCenter: (0, pg_core_1.varchar)('cost_center', { length: 255 }),
    ba: (0, pg_core_1.varchar)('ba', { length: 255 }),
    part: (0, pg_core_1.varchar)('part', { length: 255 }),
    area: (0, pg_core_1.varchar)('area', { length: 255 }),
    jobName: (0, pg_core_1.varchar)('job_name', { length: 255 }),
    level: (0, pg_core_1.varchar)('level', { length: 255 }),
    divName: (0, pg_core_1.varchar)('div_name', { length: 255 }),
    depName: (0, pg_core_1.varchar)('dep_name', { length: 255 }),
    orgName: (0, pg_core_1.varchar)('org_name', { length: 255 }),
    position: (0, pg_core_1.varchar)('position', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Roles table
exports.roles = (0, pg_core_1.pgTable)('roles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 50 }).notNull().unique(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// User Roles (Many-to-Many) table
exports.userRoles = (0, pg_core_1.pgTable)('user_roles', {
    userId: (0, pg_core_1.integer)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    roleId: (0, pg_core_1.integer)('role_id').notNull().references(() => exports.roles.id, { onDelete: 'cascade' }),
}, (table) => {
    return {
        pk: (0, pg_core_1.primaryKey)({ columns: [table.userId, table.roleId] }),
    };
});
// Permissions table
exports.permissions = (0, pg_core_1.pgTable)('permissions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull().unique(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Role Permissions (Many-to-Many) table
exports.rolePermissions = (0, pg_core_1.pgTable)('role_permissions', {
    roleId: (0, pg_core_1.integer)('role_id').notNull().references(() => exports.roles.id, { onDelete: 'cascade' }),
    permissionId: (0, pg_core_1.integer)('permission_id').notNull().references(() => exports.permissions.id, { onDelete: 'cascade' }),
}, (table) => {
    return {
        pk: (0, pg_core_1.primaryKey)({ columns: [table.roleId, table.permissionId] }),
    };
});
// Sessions table for refresh tokens (unchanged)
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull(),
    refreshToken: (0, pg_core_1.text)('refresh_token').notNull(),
    expires: (0, pg_core_1.timestamp)('expires').notNull(),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Define relationships
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    sessions: many(exports.sessions),
    userRoles: many(exports.userRoles),
}));
exports.rolesRelations = (0, drizzle_orm_1.relations)(exports.roles, ({ many }) => ({
    userRoles: many(exports.userRoles),
    rolePermissions: many(exports.rolePermissions),
}));
exports.userRolesRelations = (0, drizzle_orm_1.relations)(exports.userRoles, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userRoles.userId],
        references: [exports.users.id],
    }),
    role: one(exports.roles, {
        fields: [exports.userRoles.roleId],
        references: [exports.roles.id],
    }),
}));
exports.permissionsRelations = (0, drizzle_orm_1.relations)(exports.permissions, ({ many }) => ({
    rolePermissions: many(exports.rolePermissions),
}));
exports.rolePermissionsRelations = (0, drizzle_orm_1.relations)(exports.rolePermissions, ({ one }) => ({
    role: one(exports.roles, {
        fields: [exports.rolePermissions.roleId],
        references: [exports.roles.id],
    }),
    permission: one(exports.permissions, {
        fields: [exports.rolePermissions.permissionId],
        references: [exports.permissions.id],
    }),
}));
exports.sessionsRelations = (0, drizzle_orm_1.relations)(exports.sessions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.sessions.userId],
        references: [exports.users.id],
    }),
}));
