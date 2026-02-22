/**
 * Database Schema
 * 
 * Drizzle ORM schema definitions for SQLite.
 * Includes agents and meetings tables.
 * Authentication tables (user, session, account, verification) are created by Better Auth.
 */

import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Users table - managed by Better Auth
 * Using camelCase column names to match Better Auth expectations
 * All fields as TEXT to avoid SQLite serialization issues
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
});

/**
 * Sessions table - Better Auth
 * Using camelCase column names to match Better Auth expectations
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
});

/**
 * Accounts table - Better Auth (for OAuth)
 * Using camelCase column names to match Better Auth expectations
 */
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  provider: text('provider').default('credential').notNull(),
  providerAccountId: text('providerAccountId')
    .default('credential')
    .notNull(),
  refreshToken: text('refreshToken'),
  accessToken: text('accessToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
});

/**
 * Verifications table - Better Auth
 * Using camelCase column names to match Better Auth expectations
 */
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
});

/**
 * AI Agents table
 */
export const agents = sqliteTable('agents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  instructions: text('instructions').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

/**
 * Meetings table
 */
export const meetings = sqliteTable('meetings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, {
    onDelete: 'set null',
  }),
  status: text('status').default('upcoming').notNull(),
  transcript: text('transcript'),
  summary: text('summary'),
  transcriptUrl: text('transcript_url'),
  recordingUrl: text('recording_url'),
  startTime: integer('start_time', { mode: 'timestamp_ms' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

/**
 * AI Agent conversation messages
 */
export const aiAgentMessages = sqliteTable('ai_agent_messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  provider: text('provider'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

/**
 * Relations
 */
export const agentsRelations = relations(agents, ({ one, many }) => ({
  meetings: many(meetings),
  messages: many(aiAgentMessages),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  agent: one(agents, {
    fields: [meetings.agentId],
    references: [agents.id],
  }),
}));

export const aiAgentMessagesRelations = relations(aiAgentMessages, ({ one }) => ({
  agent: one(agents, {
    fields: [aiAgentMessages.agentId],
    references: [agents.id],
  }),
  user: one(users, {
    fields: [aiAgentMessages.userId],
    references: [users.id],
  }),
}));
