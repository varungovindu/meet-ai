/**
 * Stream Video SDK Server Integration
 * 
 * Creates Stream client for server-side operations and token generation.
 */

import { StreamClient } from '@stream-io/node-sdk';

if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
  throw new Error('NEXT_PUBLIC_STREAM_API_KEY is not set');
}

if (!process.env.STREAM_API_SECRET) {
  throw new Error('STREAM_API_SECRET is not set');
}

export const streamClient = new StreamClient(
  process.env.NEXT_PUBLIC_STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

/**
 * Generate Stream user token for client-side SDK
 */
export function generateStreamToken(userId: string): string {
  return streamClient.generateUserToken({ user_id: userId });
}

/**
 * Create or update Stream user
 */
export async function createStreamUser(userId: string, name: string) {
  try {
    await streamClient.upsertUsers([
      {
        id: userId,
        name,
        role: 'user',
      },
    ]);
  } catch (error) {
    console.error('Error creating Stream user:', error);
    throw error;
  }
}
