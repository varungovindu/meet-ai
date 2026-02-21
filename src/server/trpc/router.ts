/**
 * Application Router
 * 
 * Main tRPC router that combines all feature routers.
 */

import { router } from './root';
import { meetingsRouter } from './routers/meetings';
import { agentsRouter } from './routers/agents';
import { streamRouter } from './routers/stream';
import { aiRouter } from './routers/ai';

/**
 * Application router
 * 
 * Combines all nested routers:
 * - meetings: Meeting management (create, list, complete, etc.)
 * - agents: AI agent management (CRUD operations)
 * - stream: Stream Video SDK token generation
 * - ai: AI voice agent interactions
 */
export const appRouter = router({
  meetings: meetingsRouter,
  agents: agentsRouter,
  stream: streamRouter,
  ai: aiRouter,
});

/**
 * Export type for client-side type inference
 */
export type AppRouter = typeof appRouter;
