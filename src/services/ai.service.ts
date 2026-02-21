/**
 * AI Service
 * 
 * Handles AI interactions with Gemini (cloud) and Ollama (local fallback).
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

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

// Service configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'phi3';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
const REQUEST_TIMEOUT = 60000; // 60 seconds

type AIResult = { success: true; response: string } | { success: false; error: string };
type AIProvider = 'gemini' | 'ollama';

type AIResultWithProvider =
  | { success: true; response: string; provider: AIProvider }
  | { success: false; error: string };

function isAIError(result: AIResult): result is { success: false; error: string } {
  return result.success === false;
}

async function generateWithGemini(
  prompt: string,
  systemInstructions?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<AIResultWithProvider> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      error: 'Gemini API key is not configured',
    };
  }

  try {
    const model = options?.model || GEMINI_MODEL;
    const mergedPrompt = systemInstructions?.trim()
      ? `${systemInstructions.trim()}\n\nUser request:\n${prompt.trim()}`
      : prompt.trim();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: mergedPrompt }],
            },
          ],
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            ...(options?.maxTokens && { maxOutputTokens: options.maxTokens }),
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const data = (await response.json().catch(() => ({}))) as GeminiGenerateResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Gemini API error: ${response.status} ${response.statusText}`,
      };
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || '';

    if (!text) {
      return {
        success: false,
        error: 'Gemini returned empty response',
      };
    }

    return {
      success: true,
      response: text,
      provider: 'gemini',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Gemini request timed out',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? `Gemini request failed: ${error.message}` : 'Gemini request failed',
    };
  }
}

async function generateWithOllama(
  prompt: string,
  systemInstructions?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<AIResultWithProvider> {
  try {
    const requestBody: OllamaGenerateRequest = {
      model: options?.model || DEFAULT_MODEL,
      prompt: prompt.trim(),
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        ...(options?.maxTokens && { num_predict: options.maxTokens }),
      },
    };

    if (systemInstructions && systemInstructions.trim().length > 0) {
      requestBody.system = systemInstructions.trim();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as OllamaErrorResponse;
      return {
        success: false,
        error: errorData.error || `Ollama API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as OllamaGenerateResponse;

    if (!data.response) {
      return {
        success: false,
        error: 'Ollama returned empty response',
      };
    }

    return {
      success: true,
      response: data.response.trim(),
      provider: 'ollama',
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Ollama request timed out',
        };
      }

      return {
        success: false,
        error: `Ollama request failed: ${error.message}`,
      };
    }

    return {
      success: false,
      error: 'Unknown Ollama request error',
    };
  }
}

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
): Promise<{ success: true; response: string; provider: AIProvider } | { success: false; error: string }> {
  // Validate inputs
  if (!prompt || prompt.trim().length === 0) {
    return {
      success: false,
      error: 'Prompt cannot be empty',
    };
  }

  // Prefer Gemini in production/deployed environments when key is available.
  if (GEMINI_API_KEY) {
    const geminiResult = await generateWithGemini(prompt, systemInstructions, options);
    if (geminiResult.success) {
      return geminiResult;
    }

    const ollamaResult = await generateWithOllama(prompt, systemInstructions, options);
    if (ollamaResult.success) {
      return ollamaResult;
    }

    return {
      success: false,
      error: `Gemini failed: ${isAIError(geminiResult) ? geminiResult.error : 'Unknown error'}. Ollama fallback failed: ${
        isAIError(ollamaResult) ? ollamaResult.error : 'Unknown error'
      }`,
    };
  }

  return generateWithOllama(prompt, systemInstructions, options);
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
  return { success: false, error: isAIError(result) ? result.error : 'Summary generation failed' };
}

/**
 * Generate AI agent response for voice interaction
 */
export async function generateAgentResponse(
  userMessage: string,
  agentPersona: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ success: true; response: string; provider: AIProvider } | { success: false; error: string }> {
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
