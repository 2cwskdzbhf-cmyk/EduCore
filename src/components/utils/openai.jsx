import OpenAI from 'openai';

/**
 * OpenAI client for AI Tutor
 * Uses the OPENAI_API_KEY secret configured in the app
 */
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

/**
 * Call OpenAI with text prompt
 * @param {string} prompt - The prompt to send
 * @param {object} jsonSchema - Optional JSON schema for structured output
 * @param {string[]} imageUrls - Optional image URLs for vision
 * @returns {Promise<string|object>} - Response text or parsed JSON
 */
export async function callOpenAI(prompt, jsonSchema = null, imageUrls = null) {
  try {
    const messages = [];
    
    // If images provided, use vision model
    if (imageUrls && imageUrls.length > 0) {
      const content = [
        { type: 'text', text: prompt }
      ];
      
      imageUrls.forEach(url => {
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

    // If JSON schema provided, use structured output
    if (jsonSchema) {
      const completion = await openai.chat.completions.create({
        model: imageUrls ? 'gpt-4o' : 'gpt-4o-mini',
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            strict: true,
            schema: jsonSchema
          }
        },
        temperature: 0.7
      });

      return JSON.parse(completion.choices[0].message.content);
    } else {
      // Regular text response
      const completion = await openai.chat.completions.create({
        model: imageUrls ? 'gpt-4o' : 'gpt-4o-mini',
        messages,
        temperature: 0.7
      });

      return completion.choices[0].message.content;
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}