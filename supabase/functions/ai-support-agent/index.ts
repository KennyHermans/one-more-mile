import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AiMessage { role: 'user' | 'assistant' | 'system'; content: string }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, role, pagePath, history = [] } = await req.json();

    if (!message || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: message, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o';

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not set. Add it via Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roleInstructions = role === 'sensei'
      ? 'You are a helpful assistant for professional trip leaders (Senseis). Provide concise, actionable guidance about trip creation, managing availability, backup assignments, and best practices. If asked about account-specific data, remind them you can only answer generally.'
      : 'You are a friendly travel assistant for customers (Travelers). Provide clear, reassuring guidance about trips, booking steps, payments, cancellations, and platform usage. Do not claim to access private data.';

    const systemPrompt = `
      You are the platform AI assistant. Answer concisely. If the user asks for actions that require account access or real data, respond with general guidance and suggest where in the app to go. Include steps tailored to the current page when helpful.
      Current page: ${pagePath || '/'}
      User role: ${role}
    `;

    const messages: AiMessage[] = [
      { role: 'system', content: roleInstructions },
      { role: 'system', content: systemPrompt },
      ...history.filter(h => h.role === 'user' || h.role === 'assistant').slice(-8),
      { role: 'user', content: message },
    ];

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error', errText);
      return new Response(JSON.stringify({ error: 'AI provider error', details: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await openaiRes.json();
    const reply = result?.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return new Response(
      JSON.stringify({ reply, usage: result?.usage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('AI function error', e);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
