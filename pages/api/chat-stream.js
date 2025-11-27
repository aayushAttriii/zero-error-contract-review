/**
 * Streaming Chat API Endpoint
 * Uses Server-Sent Events (SSE) to stream responses word-by-word
 */

import OpenAI from 'openai';

// Initialize Azure OpenAI client
const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview' },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
  timeout: 60000,
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

export const config = {
  api: {
    bodyParser: true,
  },
  // Vercel serverless function config for streaming
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, contractText, chatHistory = [] } = req.body;

    // Validate inputs
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Invalid question',
        message: 'Please provide a valid question.'
      });
    }

    if (!contractText || typeof contractText !== 'string') {
      return res.status(400).json({
        error: 'Missing contract',
        message: 'No contract text available. Please upload a document first.'
      });
    }

    // Check if Azure OpenAI is configured
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'Azure OpenAI is not configured.'
      });
    }

    // Limit contract text
    const maxContractLength = 6000;
    const sanitizedContract = contractText.slice(0, maxContractLength);

    // Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the contract text to analyze:\n\n---CONTRACT START---\n${sanitizedContract}\n---CONTRACT END---\n\nPlease answer questions about this contract.`
      },
      { role: 'assistant', content: 'I\'ve reviewed the contract. What would you like to know about it?' }
    ];

    // Add chat history
    const recentHistory = chatHistory.slice(-12);
    for (const msg of recentHistory) {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: String(msg.content).slice(0, 500)
        });
      }
    }

    // Add current question
    messages.push({ role: 'user', content: question.slice(0, 500) });

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Create streaming completion
    const stream = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages,
      max_completion_tokens: 2000,
      stream: true,
    });

    // Stream the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        // Send each chunk as SSE event
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }

      // Check if stream is finished
      if (chunk.choices[0]?.finish_reason) {
        res.write(`data: ${JSON.stringify({ done: true, finish_reason: chunk.choices[0].finish_reason })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Streaming chat error:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      cause: error.cause
    });

    // Classify the error for better user feedback
    let userMessage = 'An error occurred while processing your request.';
    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      userMessage = 'The request timed out. Please try again.';
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      userMessage = 'Service is busy. Please wait a moment and try again.';
    } else if (error.status === 401 || error.status === 403) {
      userMessage = 'Authentication error. Please check API configuration.';
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      userMessage = 'Connection error. Unable to reach the AI service.';
    }

    // If headers haven't been sent, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Stream failed',
        message: userMessage
      });
    }

    // If streaming already started, send error as SSE
    res.write(`data: ${JSON.stringify({ error: true, message: userMessage })}\n\n`);
    res.end();
  }
}
