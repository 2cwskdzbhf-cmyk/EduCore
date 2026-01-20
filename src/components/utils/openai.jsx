import OpenAI from 'openai';

/**
 * OpenAI Helper for AI Tutor
 * 
 * Provides a wrapper around OpenAI API with similar interface to base44.integrations.Core.InvokeLLM
 * Supports text prompts, vision (images), and structured JSON responses
 */

let openaiClient = null;

const getOpenAI = () => {
  if (!openaiClient) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured. Please add it in Settings > Secrets.');
    }
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }
  return openaiClient;
};

/**
 * Call OpenAI with prompt and optional vision/JSON schema
 * 
 * @param {Object} params
 * @param {string} params.prompt - The prompt to send to OpenAI
 * @param {string[]} [params.file_urls] - Optional image URLs for vision
 * @param {Object} [params.response_json_schema] - Optional JSON schema for structured output
 * @returns {Promise<string|Object>} - Returns string or parsed JSON based on response_json_schema
 */
export async function callOpenAI({ prompt, file_urls, response_json_schema }) {
  const openai = getOpenAI();

  // Build messages array
  const messages = [];
  
  // If we have images, use vision model
  if (file_urls && file_urls.length > 0) {
    const content = [
      { type: 'text', text: prompt }
    ];
    
    // Add images
    file_urls.forEach(url => {
      content.push({
        type: 'image_url',
        image_url: { url }
      });
    });
    
    messages.push({
      role: 'user',
      content
    });
  } else {
    messages.push({
      role: 'user',
      content: prompt
    });
  }

  // Choose model based on requirements
  const model = file_urls && file_urls.length > 0 
    ? 'gpt-4o' // Vision model
    : 'gpt-4o-mini'; // Standard model

  // Build request parameters
  const params = {
    model,
    messages
  };

  // If JSON schema requested, use structured output
  if (response_json_schema) {
    params.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        strict: true,
        schema: response_json_schema
      }
    };
  }

  // Make API call
  const completion = await openai.chat.completions.create(params);
  const responseText = completion.choices[0].message.content;

  // Parse JSON if schema was provided
  if (response_json_schema) {
    return JSON.parse(responseText);
  }

  return responseText;
}