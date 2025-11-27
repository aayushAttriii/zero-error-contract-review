// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock environment variables for tests (Azure OpenAI)
process.env.AZURE_OPENAI_API_KEY = 'test-key-mock';
process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
process.env.AZURE_OPENAI_API_VERSION = '2024-12-01-preview';
process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4';
process.env.NODE_ENV = 'test';