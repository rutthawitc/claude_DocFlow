/**
 * Database client for server-side usage
 *
 * This file is a safe reference module that can be imported anywhere
 * without triggering bundling errors during build.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Define type for our database client
type DbType = PostgresJsDatabase<typeof schema>;

// Create placeholder variables that will be lazily initialized on the server
export let db: DbType | undefined = undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let client: any = undefined;

// This function gets the database client safely
export async function getDb() {
  // Skip DB initialization during build or on client
  if (typeof window !== 'undefined') {
    // We're on the client side, return a dummy object or undefined
    console.warn('Attempted to access DB client on client side');
    return undefined;
  }

  // On server side, dynamically import the server module
  try {
    // Next.js 13+ internal detection to avoid importing on client
    if (db === undefined) {
      // Dynamic import of the server-only module using postgres.js instead of pg
      const server = await import('./server-pg');
      db = server.db;
      client = server.client;
    }
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return undefined;
  }
}

// Export everything from the schema
export * from './schema';