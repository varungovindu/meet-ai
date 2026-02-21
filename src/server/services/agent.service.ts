/**
 * Agent Service
 * 
 * Handles business logic for AI agent operations (CRUD).
 * This service uses Drizzle ORM and should be called from tRPC procedures.
 */

import { db } from '@/server/db';
import { agents } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Create a new AI agent
 */
export async function createAgent(data: {
  name: string;
  userId: string;
  instructions: string;
}): Promise<{ success: true; agent: typeof agents.$inferSelect } | { success: false; error: string }> {
  try {
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'Agent name is required' };
    }

    if (!data.instructions || data.instructions.trim().length === 0) {
      return { success: false, error: 'Agent instructions are required' };
    }

    const [agent] = await db
      .insert(agents)
      .values({
        name: data.name.trim(),
        userId: data.userId,
        instructions: data.instructions.trim(),
      })
      .returning();

    if (!agent) {
      return { success: false, error: 'Failed to create agent' };
    }

    return { success: true, agent };
  } catch (error) {
    console.error('Error creating agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create agent',
    };
  }
}

/**
 * Get agent by ID
 */
export async function getAgentById(
  agentId: string,
  userId: string
): Promise<(typeof agents.$inferSelect) | null> {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
      .limit(1);

    return agent || null;
  } catch (error) {
    console.error('Error fetching agent:', error);
    return null;
  }
}

/**
 * Get all agents for a user
 */
export async function getAgentsByUserId(
  userId: string
): Promise<Array<typeof agents.$inferSelect>> {
  try {
    const userAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, userId))
      .orderBy(desc(agents.createdAt));

    return userAgents;
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
}

/**
 * Update an agent
 */
export async function updateAgent(
  agentId: string,
  userId: string,
  data: {
    name?: string;
    instructions?: string;
  }
): Promise<{ success: true; agent: typeof agents.$inferSelect } | { success: false; error: string }> {
  try {
    // Verify ownership
    const existingAgent = await getAgentById(agentId, userId);
    if (!existingAgent) {
      return { success: false, error: 'Agent not found' };
    }

    const updateData: Partial<typeof agents.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        return { success: false, error: 'Agent name cannot be empty' };
      }
      updateData.name = data.name.trim();
    }

    if (data.instructions !== undefined) {
      if (data.instructions.trim().length === 0) {
        return { success: false, error: 'Agent instructions cannot be empty' };
      }
      updateData.instructions = data.instructions.trim();
    }

    const [updatedAgent] = await db
      .update(agents)
      .set(updateData)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
      .returning();

    if (!updatedAgent) {
      return { success: false, error: 'Failed to update agent' };
    }

    return { success: true, agent: updatedAgent };
  } catch (error) {
    console.error('Error updating agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update agent',
    };
  }
}

/**
 * Delete an agent
 */
export async function deleteAgent(
  agentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify ownership
    const existingAgent = await getAgentById(agentId, userId);
    if (!existingAgent) {
      return { success: false, error: 'Agent not found' };
    }

    await db
      .delete(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error('Error deleting agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete agent',
    };
  }
}
