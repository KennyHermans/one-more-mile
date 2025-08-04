import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeAnalysisRequest {
  code: string;
  fileName: string;
  analysisType: 'security' | 'performance' | 'quality' | 'comprehensive';
}

interface CodeSuggestion {
  type: 'error' | 'warning' | 'suggestion' | 'improvement';
  category: string;
  line?: number;
  title: string;
  description: string;
  suggestion: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeExample?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Authenticate request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: adminRole } = await supabaseClient
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminRole) {
      throw new Error('Admin access required');
    }

    const { code, fileName, analysisType }: CodeAnalysisRequest = await req.json();

    const analysisPrompt = `
You are an expert code reviewer analyzing a ${fileName} file. 

Analyze this code for:
${analysisType === 'security' ? '- Security vulnerabilities and potential exploits' : ''}
${analysisType === 'performance' ? '- Performance bottlenecks and optimization opportunities' : ''}
${analysisType === 'quality' ? '- Code quality, maintainability, and best practices' : ''}
${analysisType === 'comprehensive' ? '- Security, performance, quality, and maintainability issues' : ''}

Code to analyze:
\`\`\`${fileName.split('.').pop()}
${code}
\`\`\`

Please provide a structured analysis with:
1. Overall code health score (1-10)
2. Critical issues that need immediate attention
3. Specific suggestions for improvement
4. Best practice recommendations

Focus on:
- React/TypeScript best practices
- Security vulnerabilities (XSS, injection, auth issues)
- Performance optimizations
- Code organization and maintainability
- Error handling improvements
- Accessibility concerns

Format your response as a JSON array of suggestions with this structure:
{
  "healthScore": number,
  "summary": "brief overview",
  "suggestions": [
    {
      "type": "error|warning|suggestion|improvement",
      "category": "security|performance|quality|accessibility|best-practices",
      "line": number (if applicable),
      "title": "brief title",
      "description": "detailed description",
      "suggestion": "specific improvement recommendation",
      "severity": "critical|high|medium|low",
      "codeExample": "example of improved code (if applicable)"
    }
  ]
}`;

    console.log('Sending code analysis request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer specializing in React, TypeScript, security, and performance optimization. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let analysisResult;

    try {
      // Try to parse the JSON response
      const content = data.choices[0].message.content;
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      
      // Fallback: create a structured response
      analysisResult = {
        healthScore: 7,
        summary: "Analysis completed but response format needs adjustment",
        suggestions: [
          {
            type: "warning",
            category: "analysis",
            title: "Analysis Format Issue",
            description: "The AI analysis was completed but returned in an unexpected format.",
            suggestion: "Manual review recommended for this file.",
            severity: "medium"
          }
        ]
      };
    }

    console.log('Code analysis completed successfully');

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-code-analyzer function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        healthScore: 0,
        suggestions: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});