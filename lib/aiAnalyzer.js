/**
 * AI Analyzer - Azure OpenAI Integration
 * Performs intelligent contract analysis using Azure OpenAI GPT-4
 */

import OpenAI from 'openai';

// Initialize Azure OpenAI client
const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview' },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
});

/**
 * Classify contract type
 */
async function classifyContract(text) {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: 'system',
        content: 'You are a legal document classifier. Classify the contract type and provide confidence score.'
      },
      {
        role: 'user',
        content: `Classify this contract and respond in JSON format with fields: type, subtype, confidence (0-1), description.\n\nContract text:\n${text.slice(0, 4000)}`
      }
    ],
    max_completion_tokens: 500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Extract entities from contract
 */
async function extractEntities(text) {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: 'system',
        content: 'You are a legal entity extractor. Extract all parties, people, organizations, dates, and monetary amounts from contracts.'
      },
      {
        role: 'user',
        content: `Extract entities from this contract. Respond in JSON format with fields: parties (array of {name, role, type}), people (array of names), organizations (array), dates (array of {date, context}), amounts (array of {value, currency, context}).\n\nContract text:\n${text.slice(0, 6000)}`
      }
    ],
    max_completion_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Identify obligations
 */
async function identifyObligations(text) {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in contractual obligations. Identify all obligations, duties, and commitments in contracts.'
      },
      {
        role: 'user',
        content: `Identify all obligations in this contract. Respond in JSON format with field: obligations (array of {party, obligation, type, deadline, penalty}).\n\nContract text:\n${text.slice(0, 6000)}`
      }
    ],
    max_completion_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Assess risks
 */
async function assessRisks(text) {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: 'system',
        content: 'You are a legal risk analyst. Identify potential risks, problematic clauses, and areas of concern in contracts.'
      },
      {
        role: 'user',
        content: `Assess risks in this contract. Respond in JSON format with fields: overallRiskScore (0-10), risks (array of {category, description, severity, recommendation, clause}).\n\nContract text:\n${text.slice(0, 6000)}`
      }
    ],
    max_completion_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Check compliance
 */
async function checkCompliance(text) {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: 'system',
        content: 'You are a compliance analyst. Check contracts for compliance with GDPR, HIPAA, CCPA, and other regulations.'
      },
      {
        role: 'user',
        content: `Check this contract for regulatory compliance. Respond in JSON format with fields: compliant (boolean), issues (array of {regulation, issue, severity, recommendation}), regulations (array of applicable regulations).\n\nContract text:\n${text.slice(0, 6000)}`
      }
    ],
    max_completion_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Generate summary
 */
async function generateSummary(text) {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: 'system',
        content: 'You are a legal document summarizer. Provide clear, concise summaries of contracts in plain language.'
      },
      {
        role: 'user',
        content: `Summarize this contract. Respond in JSON format with fields: summary (2-3 sentences), keyPoints (array of strings), effectiveDate, terminationDate, renewalTerms.\n\nContract text:\n${text.slice(0, 6000)}`
      }
    ],
    max_completion_tokens: 800,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Suggest additional redactions
 */
async function suggestRedactions(text, existingRedactions = []) {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: 'system',
        content: 'You are a privacy analyst. Identify sensitive information that should be redacted from contracts, including names, addresses, account numbers, and other PII/PHI.'
      },
      {
        role: 'user',
        content: `Identify additional sensitive information to redact. Existing redactions: ${JSON.stringify(existingRedactions.map(r => r.type))}. Respond in JSON format with field: suggestions (array of {text, type, reason, confidence}).\n\nContract text:\n${text.slice(0, 6000)}`
      }
    ],
    max_completion_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Perform full analysis
 */
export async function performFullAnalysis(text, options = {}) {
  const {
    includeEntities = true,
    includeObligations = true,
    includeRisks = true,
    includeCompliance = true,
    includeSummary = true,
    includeRedactionSuggestions = false,
    existingRedactions = []
  } = options;

  // Check if Azure OpenAI is configured
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    throw new Error('Azure OpenAI is not configured. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables.');
  }

  const results = {
    timestamp: new Date().toISOString()
  };

  // Run analyses in parallel where possible
  const analyses = [];

  // Always classify the contract first
  results.classification = await classifyContract(text);

  if (includeEntities) {
    analyses.push(extractEntities(text).then(r => results.entities = r));
  }

  if (includeObligations) {
    analyses.push(identifyObligations(text).then(r => results.obligations = r));
  }

  if (includeRisks) {
    analyses.push(assessRisks(text).then(r => results.risks = r));
  }

  if (includeCompliance) {
    analyses.push(checkCompliance(text).then(r => results.compliance = r));
  }

  if (includeSummary) {
    analyses.push(generateSummary(text).then(r => results.summary = r));
  }

  if (includeRedactionSuggestions) {
    analyses.push(suggestRedactions(text, existingRedactions).then(r => results.redactionSuggestions = r));
  }

  // Wait for all parallel analyses
  await Promise.all(analyses);

  return results;
}

/**
 * Test Azure OpenAI connection
 */
export async function testConnection() {
  try {
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [{ role: 'user', content: 'Hello' }],
      max_completion_tokens: 5
    });
    return { success: true, message: 'Azure OpenAI connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
