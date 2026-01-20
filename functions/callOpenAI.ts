import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.20.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, response_json_schema, file_urls } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Initialize OpenAI client with backend secret
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    // Determine if we need vision model (if file_urls provided)
    const hasImages = file_urls && file_urls.length > 0;
    const model = hasImages ? 'gpt-4o' : 'gpt-4o-mini';

    // Build messages array
    const messages = [];
    
    if (hasImages) {
      // Vision mode - include images in the message
      const content = [
        { type: 'text', text: prompt }
      ];
      
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
      // Text-only mode
      messages.push({
        role: 'user',
        content: prompt
      });
    }

    // Build API call parameters
    const params = {
      model,
      messages
    };

    // Add JSON schema if provided
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

    // Call OpenAI
    const completion = await openai.chat.completions.create(params);
    const responseContent = completion.choices[0].message.content;

    // Parse JSON if schema was provided
    if (response_json_schema) {
      const parsed = JSON.parse(responseContent);
      return Response.json(parsed);
    }

    // Return plain text response
    return Response.json({ response: responseContent });

  } catch (error) {
    console.error('OpenAI error:', error);
    return Response.json({ 
      error: error.message || 'Failed to call OpenAI' 
    }, { status: 500 });
  }
});