/**
 * Contract Q&A Chatbot API Endpoint
 * Uses Azure OpenAI to answer questions about uploaded contracts
 * Features: Retry logic, timeout handling, robust error handling
 */

import OpenAI from 'openai';

// Initialize Azure OpenAI client with timeout
const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview' },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
  timeout: 60000, // 60 second timeout
  maxRetries: 3, // Built-in retry for transient errors
});

const SYSTEM_PROMPT = `You are an expert legal contract analyst assistant. Your role is to help users understand contracts by answering their questions clearly and accurately.

Guidelines:
1. Answer questions based ONLY on the contract text provided. If the information isn't in the contract, say so clearly.
2. Use plain, simple language that non-lawyers can understand.
3. When citing specific sections or clauses, quote the relevant text.
4. If a question is ambiguous, ask for clarification.
5. Highlight any risks or concerns related to the question.
6. Be concise but thorough - aim for helpful, actionable answers.
7. If asked about legal advice, remind the user you're an AI assistant and recommend consulting a lawyer for legal decisions.

Format your responses with:
- Clear, direct answers first
- Supporting details or quotes from the contract
- Any relevant warnings or considerations`;

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;

      console.log(`Chat API attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Classify error type for better user feedback
 */
function classifyError(error) {
  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.statusCode;

  if (status === 429 || message.includes('rate limit')) {
    return {
      type: 'RATE_LIMIT',
      userMessage: 'The service is currently busy. Please wait a moment and try again.',
      retryable: true
    };
  }

  if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('api key')) {
    return {
      type: 'AUTH_ERROR',
      userMessage: 'Authentication error. Please check the API configuration.',
      retryable: false
    };
  }

  if (message.includes('timeout') || message.includes('timed out') || error.code === 'ETIMEDOUT') {
    return {
      type: 'TIMEOUT',
      userMessage: 'The request timed out. Please try asking a shorter question or try again.',
      retryable: true
    };
  }

  if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
    return {
      type: 'NETWORK_ERROR',
      userMessage: 'Network connection error. Please check your internet connection and try again.',
      retryable: true
    };
  }

  if (status >= 500 || message.includes('server error')) {
    return {
      type: 'SERVER_ERROR',
      userMessage: 'The AI service is temporarily unavailable. Please try again in a moment.',
      retryable: true
    };
  }

  if (message.includes('content filter') || message.includes('content management')) {
    return {
      type: 'CONTENT_FILTER',
      userMessage: 'Your question was filtered by content safety. Please rephrase your question.',
      retryable: false
    };
  }

  return {
    type: 'UNKNOWN',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { question, contractText, chatHistory = [] } = req.body;

    // Validate inputs
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Invalid question',
        message: 'Please provide a valid question.',
        retryable: false
      });
    }

    if (!contractText || typeof contractText !== 'string') {
      return res.status(400).json({
        error: 'Missing contract',
        message: 'No contract text available. Please upload a document first.',
        retryable: false
      });
    }

    // Check if Azure OpenAI is configured
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'Azure OpenAI is not configured. Please set up environment variables.',
        retryable: false
      });
    }

    // Sanitize and limit contract text to avoid token limits
    // Azure OpenAI has strict limits - keep contract under 6000 chars (~1500 tokens)
    const maxContractLength = 6000;
    const sanitizedContract = contractText.slice(0, maxContractLength);

    // Build messages array with chat history
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the contract text to analyze:\n\n---CONTRACT START---\n${sanitizedContract}\n---CONTRACT END---\n\nPlease answer questions about this contract.`
      },
      { role: 'assistant', content: 'I\'ve reviewed the contract. What would you like to know about it?' }
    ];

    // Add chat history (last 6 exchanges to manage context window)
    const recentHistory = chatHistory.slice(-12);
    for (const msg of recentHistory) {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: String(msg.content).slice(0, 500) // Limit individual message length
        });
      }
    }

    // Add current question
    messages.push({ role: 'user', content: question.slice(0, 500) });

    // Make API call with retry
    const response = await withRetry(async () => {
      return await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages,
        max_completion_tokens: 2000,
      });
    }, 3, 1000);

    // Validate response
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      console.error('Invalid API response structure:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response from AI service');
    }

    let answer = response.choices[0].message.content;

    // Handle empty or null responses
    if (!answer || answer.trim().length === 0) {
      // Check if there's a finish_reason that explains the empty response
      const finishReason = response.choices[0].finish_reason;
      console.warn('Empty response from AI. Finish reason:', finishReason);

      if (finishReason === 'content_filter') {
        answer = "I'm sorry, but I couldn't generate a response due to content filtering. Please try rephrasing your question.";
      } else if (finishReason === 'length') {
        answer = "The response was too long to complete. Please try asking a more specific question.";
      } else {
        // Provide a helpful fallback response
        answer = "I apologize, but I couldn't generate a response for your question. This might be due to the complexity of the query or a temporary service issue. Please try:\n\n1. Asking a more specific question\n2. Breaking down complex questions into simpler parts\n3. Trying again in a moment";
      }
    }

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      answer,
      usage: response.usage,
      processingTime,
      retryable: false
    });

  } catch (error) {
    console.error('Chat API error:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });

    const errorInfo = classifyError(error);
    const processingTime = Date.now() - startTime;

    return res.status(error.status || 500).json({
      error: errorInfo.type,
      message: errorInfo.userMessage,
      retryable: errorInfo.retryable,
      processingTime
    });
  }
}

/**
 * Suggested questions generator
 */
export function generateSuggestedQuestions(contractType) {
  const commonQuestions = [
    "What are the key obligations for each party?",
    "What is the termination clause?",
    "Are there any penalties or liabilities?",
    "What is the effective date and duration?",
    "What are the payment terms?"
  ];

  const typeSpecificQuestions = {
    'Employment': [
      "What is the compensation structure?",
      "Are there non-compete clauses?",
      "What benefits are included?",
      "What are the grounds for termination?"
    ],
    'NDA': [
      "What information is considered confidential?",
      "How long does confidentiality last?",
      "What are the exceptions to confidentiality?",
      "What happens if there's a breach?"
    ],
    'Service Agreement': [
      "What services are being provided?",
      "What are the deliverables and timelines?",
      "Who owns the intellectual property?",
      "What warranties are provided?"
    ],
    'Lease': [
      "What is the monthly rent?",
      "What is the security deposit?",
      "What maintenance is tenant responsible for?",
      "Can the lease be renewed?"
    ]
  };

  return typeSpecificQuestions[contractType] || commonQuestions;
}
