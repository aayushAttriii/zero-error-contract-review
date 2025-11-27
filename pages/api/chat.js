/**
 * Contract Q&A Chatbot API Endpoint
 * Uses Azure OpenAI to answer questions about uploaded contracts
 */

import OpenAI from 'openai';

// Initialize Azure OpenAI client
const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview' },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, contractText, chatHistory = [] } = req.body;

    if (!question || !contractText) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both question and contractText are required'
      });
    }

    // Check if Azure OpenAI is configured
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'Azure OpenAI is not configured. Please set up environment variables.'
      });
    }

    // Build messages array with chat history
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the contract text to analyze:\n\n---CONTRACT START---\n${contractText.slice(0, 15000)}\n---CONTRACT END---\n\nPlease answer questions about this contract.`
      },
      { role: 'assistant', content: 'I\'ve reviewed the contract. What would you like to know about it?' }
    ];

    // Add chat history (last 10 exchanges to manage context window)
    const recentHistory = chatHistory.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add current question
    messages.push({ role: 'user', content: question });

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages,
      max_completion_tokens: 1000,
    });

    const answer = response.choices[0].message.content;

    return res.status(200).json({
      answer,
      usage: response.usage
    });

  } catch (error) {
    console.error('Chat API error:', error);

    return res.status(500).json({
      error: 'Chat failed',
      message: error.message
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
