import { pgTable, serial, text, timestamp, varchar, integer, primaryKey, boolean, bigint, date, jsonb, inet } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  password: text('password'), // For local admin users
  isLocalAdmin: boolean('is_local_admin').default(false), // Flag for local admin users
  costCenter: varchar('cost_center', { length: 255 }),
  ba: varchar('ba', { length: 255 }),
  part: varchar('part', { length: 255 }),
  area: varchar('area', { length: 255 }),
  jobName: varchar('job_name', { length: 255 }),
  level: varchar('level', { length: 255 }),
  divName: varchar('div_name', { length: 255 }),
  depName: varchar('dep_name', { length: 255 }),
  orgName: varchar('org_name', { length: 255 }),
  position: varchar('position', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Roles table
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Roles (Many-to-Many) table
export const userRoles = pgTable('user_roles', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  };
});

// Permissions table
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Role Permissions (Many-to-Many) table
export const rolePermissions = pgTable('role_permissions', {
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  };
});

// Sessions table for refresh tokens (unchanged)
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token').notNull(),
  expires: timestamp('expires').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// DocFlow Tables

// Branches table (22 R6 branches)
export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  baCode: integer('ba_code').notNull().unique(),
  branchCode: bigint('branch_code', { mode: 'number' }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  regionId: integer('region_id').notNull().default(6),
  regionCode: varchar('region_code', { length: 10 }).notNull().default('R6'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Documents table
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  fileSize: integer('file_size'),
  branchBaCode: integer('branch_ba_code').notNull().references(() => branches.baCode),
  uploadDate: date('upload_date').notNull(),
  mtNumber: varchar('mt_number', { length: 100 }).notNull(),
  mtDate: date('mt_date').notNull(),
  subject: text('subject').notNull(),
  monthYear: varchar('month_year', { length: 20 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('sent_to_branch'),
  uploaderId: integer('uploader_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Comments table
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

// Activity logs table (extended)
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  documentId: integer('document_id').references(() => documents.id),
  branchBaCode: integer('branch_ba_code').references(() => branches.baCode),
  details: jsonb('details'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Document status history
export const documentStatusHistory = pgTable('document_status_history', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  fromStatus: varchar('from_status', { length: 50 }),
  toStatus: varchar('to_status', { length: 50 }).notNull(),
  changedBy: integer('changed_by').notNull().references(() => users.id),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  userRoles: many(userRoles),
  documents: many(documents),
  comments: many(comments),
  activityLogs: many(activityLogs),
  documentStatusHistory: many(documentStatusHistory),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// DocFlow Relations
export const branchesRelations = relations(branches, ({ many }) => ({
  documents: many(documents),
  activityLogs: many(activityLogs),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  branch: one(branches, {
    fields: [documents.branchBaCode],
    references: [branches.baCode],
  }),
  uploader: one(users, {
    fields: [documents.uploaderId],
    references: [users.id],
  }),
  comments: many(comments),
  activityLogs: many(activityLogs),
  statusHistory: many(documentStatusHistory),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  document: one(documents, {
    fields: [comments.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [activityLogs.documentId],
    references: [documents.id],
  }),
  branch: one(branches, {
    fields: [activityLogs.branchBaCode],
    references: [branches.baCode],
  }),
}));

export const documentStatusHistoryRelations = relations(documentStatusHistory, ({ one }) => ({
  document: one(documents, {
    fields: [documentStatusHistory.documentId],
    references: [documents.id],
  }),
  changedByUser: one(users, {
    fields: [documentStatusHistory.changedBy],
    references: [users.id],
  }),
}));

// System Settings Table
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: text('setting_value').notNull(),
  settingType: varchar('setting_type', { length: 20 }).notNull().default('string'), // 'string', 'boolean', 'number', 'json'
  description: text('description'),
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));