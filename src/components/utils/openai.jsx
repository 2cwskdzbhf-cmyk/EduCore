import { base44 } from '@/api/base44Client';

/**
 * Call OpenAI via secure backend function
 * This keeps the API key safe on the server side
 * 
 * @param {Object} options
 * @param {string} options.prompt - The prompt text
 * @param {Object} [options.response_json_schema] - Optional JSON schema for structured output
 * @param {string|string[]} [options.file_urls] - Optional file URLs for vision
 * @returns {Promise<Object|string>} - Parsed JSON object if schema provided, otherwise string
 */
export async function callOpenAI({ prompt, response_json_schema, file_urls }) {
  try {
    // Call backend function which securely uses the OpenAI API key
    const response = await base44.functions.invoke('callOpenAI', {
      prompt,
      response_json_schema,
      file_urls
    });

    // If JSON schema was provided, response.data is already the parsed object
    if (response_json_schema) {
      return response.data;
    }

    // Otherwise, return the response text
    return response.data.response;
  } catch (error) {
    console.error('OpenAI call failed:', error);
    throw new Error(`AI call failed: ${error.message}`);
  }
}