/**
 * Database Connection
 * 
 * Initializes Drizzle ORM with SQLite via Turso (cloud)
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Get database URL with embedded token
const dbUrl = process.env.DATABASE_URL || '';

// Create Turso client
const client = createClient({
  url: dbUrl,
});

// Initialize Drizzle with schema
export const db = drizzle(client, { schema });
