/**
 * AI Service
 * 
 * Handles all interactions with the local Ollama API.
 * This service must ONLY be called from server-side code (API routes, tRPC procedures).
 * Never expose this service to the client side.
 */

// Types for Ollama API
interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaErrorResponse {
  error: string;
}

// Service configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'phi3';
const REQUEST_TIMEOUT = 60000; // 60 seconds

/**
 * Generate AI response from Ollama
 */
export async function generateAIResponse(
  prompt: string,
  systemInstructions?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ success: true; response: string } | { success: false; error: string }> {
  try {
    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: 'Prompt cannot be empty',
      };
    }

    // Prepare request payload
    const requestBody: OllamaGenerateRequest = {
      model: options?.model || DEFAULT_MODEL,
      prompt: prompt.trim(),
      stream: false, // We want complete response, not streaming
      options: {
        temperature: options?.temperature ?? 0.7,
        ...(options?.maxTokens && { num_predict: options.maxTokens }),
      },
    };

    // Add system instructions if provided
    if (systemInstructions && systemInstructions.trim().length > 0) {
      requestBody.system = systemInstructions.trim();
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Call Ollama API
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as OllamaErrorResponse;
      return {
        success: false,
        error: errorData.error || `Ollama API error: ${response.status} ${response.statusText}`,
      };
    }

    // Parse response
    const data = (await response.json()) as OllamaGenerateResponse;

    // Validate response
    if (!data.response) {
      return {
        success: false,
        error: 'Ollama returned empty response',
      };
    }

    return {
      success: true,
      response: data.response.trim(),
    };
  } catch (error) {
    // Handle different error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Ollama may be slow or unresponsive.',
        };
      }

      // Handle fetch errors (network issues, connection refused, etc.)
      if (error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Failed to connect to Ollama. Is Ollama running on localhost:11434?',
        };
      }

      return {
        success: false,
        error: `AI generation failed: ${error.message}`,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred during AI generation',
    };
  }
}

/**
 * Generate meeting summary from transcript
 */
export async function generateMeetingSummary(
  transcript: string
): Promise<{ success: true; summary: string } | { success: false; error: string }> {
  const systemInstructions = `You are an AI assistant that creates concise meeting summaries. 
Extract key points, action items, and important decisions from meeting transcripts.
Format your response in a clear, professional manner with:
- Overview
- Key Discussion Points
- Action Items
- Decisions Made`;

  const prompt = `Please summarize the following meeting transcript:\n\n${transcript}`;

  const result = await generateAIResponse(prompt, systemInstructions, {
    temperature: 0.5, // Lower temperature for more focused summaries
    maxTokens: 1000,
  });

  if (result.success) {
    return { success: true, summary: result.response };
  }
  return result;
}

/**
 * Generate AI agent response for voice interaction
 */
export async function generateAgentResponse(
  userMessage: string,
  agentPersona: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ success: true; response: string } | { success: false; error: string }> {
  // Build conversation context
  let prompt = userMessage;

  if (conversationHistory && conversationHistory.length > 0) {
    const historyText = conversationHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    prompt = `${historyText}\nUser: ${userMessage}`;
  }

  return generateAIResponse(prompt, agentPersona, {
    temperature: 0.8, // Higher temperature for more natural conversation
    maxTokens: 500,
  });
}

/**
 * Check if Ollama is running and accessible
 */
export async function checkOllamaHealth(): Promise<{
  success: boolean;
  message: string;
  model?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        message: 'Ollama is running but returned an error',
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: 'Ollama is running and accessible',
      model: DEFAULT_MODEL,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Ollama is not accessible. Please ensure Ollama is running on localhost:11434',
    };
  }
}
