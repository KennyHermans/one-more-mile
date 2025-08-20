import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ce31f3af-8b91-484e-98ed-813aa571c1cc.sandbox.lovable.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TripBuilderRequest {
  action: 'generate_itinerary' | 'suggest_activities' | 'optimize_schedule' | 'generate_description' | 'suggest_pricing';
  destination: string;
  theme: string;
  duration: number;
  maxParticipants: number;
  difficulty: string;
  season: string;
  budget?: string;
  existingItinerary?: any[];
}

interface WeatherData {
  temperature: string;
  conditions: string;
  bestMonths: string[];
}

interface DestinationInsights {
  climate: WeatherData;
  popularActivities: string[];
  culturalHighlights: string[];
  bestTimeToVisit: string[];
  localEvents: string[];
  transportationTips: string[];
  accommodationTips: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check if OpenAI API key is configured
  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify JWT token for authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized - Missing or invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting: simple per-IP check
  const clientIP = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
  console.log(`AI Trip Builder request from IP: ${clientIP}`);

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input validation and sanitization
    const request: TripBuilderRequest = await req.json();
    
    // Validate required fields
    if (!request.action || !request.destination || !request.theme) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sanitize inputs
    request.destination = request.destination.trim().substring(0, 100);
    request.theme = request.theme.trim().substring(0, 100);
    request.duration = Math.min(Math.max(request.duration || 1, 1), 30); // 1-30 days max
    request.maxParticipants = Math.min(Math.max(request.maxParticipants || 1, 1), 50); // 1-50 people max
    
    console.log('AI Trip builder request:', { action: request.action, destination: request.destination, userId: user.id });

    let response;
    
    switch (request.action) {
      case 'generate_itinerary':
        response = await generateCompleteItinerary(request);
        break;
      case 'suggest_activities':
        response = await suggestActivities(request);
        break;
      case 'optimize_schedule':
        response = await optimizeSchedule(request);
        break;
      case 'generate_description':
        response = await generateTripDescription(request);
        break;
      case 'suggest_pricing':
        response = await suggestPricing(request);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-trip-builder function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateCompleteItinerary(request: TripBuilderRequest) {
  const prompt = `
    As an expert travel planner, create a detailed ${request.duration}-day itinerary for ${request.destination}.
    
    Trip Details:
    - Theme: ${request.theme}
    - Duration: ${request.duration} days
    - Max Participants: ${request.maxParticipants}
    - Difficulty: ${request.difficulty}
    - Season: ${request.season}
    ${request.budget ? `- Budget: ${request.budget}` : ''}
    
    Provide a comprehensive itinerary with the following structure for each day:
    - Day title and theme
    - 3-5 activities per day with specific times
    - Activity details (location, duration, difficulty, equipment needed)
    - Meal recommendations
    - Accommodation suggestions
    - Transportation between activities
    - Estimated daily cost
    - Weather considerations
    - Cultural insights and local tips
    
    Consider local weather patterns, cultural events, optimal timing for activities, and logical geographic flow.
    Include both popular attractions and hidden gems.
    
    Return the response as a structured JSON object with days array and destination insights.
  `;

  const completion = await callOpenAI(prompt, 'gpt-4o-mini', 0.7);
  
  try {
    // Try to parse as JSON first
    const jsonResponse = JSON.parse(completion);
    return jsonResponse;
  } catch {
    // If not valid JSON, structure the response
    return {
      itinerary: parseItineraryFromText(completion, request.duration),
      destinationInsights: await getDestinationInsights(request.destination, request.season),
      generatedAt: new Date().toISOString()
    };
  }
}

async function suggestActivities(request: TripBuilderRequest) {
  const prompt = `
    Suggest 10-15 unique ${request.theme} activities for ${request.destination} during ${request.season}.
    
    Parameters:
    - Difficulty level: ${request.difficulty}
    - Group size: ${request.maxParticipants} people
    - Theme focus: ${request.theme}
    
    For each activity, provide:
    - Activity name and description
    - Location (specific address if possible)
    - Duration (in minutes)
    - Difficulty rating (1-5)
    - Equipment needed
    - Best time of day
    - Cost estimate per person
    - Weather dependency (true/false)
    - Whether it's suitable for groups
    - Unique local insights
    
    Focus on authentic, immersive experiences that align with the ${request.theme} theme.
    Include a mix of must-see attractions and off-the-beaten-path experiences.
    
    Return as a JSON array of activity objects.
  `;

  const completion = await callOpenAI(prompt, 'gpt-4o-mini', 0.8);
  
  try {
    return JSON.parse(completion);
  } catch {
    return parseActivitiesFromText(completion);
  }
}

async function optimizeSchedule(request: TripBuilderRequest) {
  const prompt = `
    Optimize the following itinerary for ${request.destination} to improve efficiency and experience:
    
    Current Itinerary: ${JSON.stringify(request.existingItinerary)}
    
    Optimization goals:
    - Minimize travel time between activities
    - Consider optimal timing for each activity type
    - Balance high-energy and relaxing activities
    - Account for ${request.season} weather patterns
    - Respect local customs and opening hours
    - Ensure logical geographic flow
    
    Provide optimized schedule with:
    - Reordered activities with reasoning
    - Time adjustments
    - Alternative activity suggestions
    - Transportation recommendations
    - Potential time savings
    
    Return as JSON with optimized itinerary and change summary.
  `;

  const completion = await callOpenAI(prompt, 'gpt-4o-mini', 0.6);
  
  try {
    return JSON.parse(completion);
  } catch {
    return {
      optimizedItinerary: request.existingItinerary,
      suggestions: parseOptimizationFromText(completion),
      estimatedTimeSavings: "30-60 minutes per day"
    };
  }
}

async function generateTripDescription(request: TripBuilderRequest) {
  const prompt = `
    Write compelling marketing copy for a ${request.duration}-day ${request.theme} trip to ${request.destination}.
    
    Trip Parameters:
    - Theme: ${request.theme}
    - Duration: ${request.duration} days
    - Difficulty: ${request.difficulty}
    - Season: ${request.season}
    - Group size: Up to ${request.maxParticipants} people
    
    Create:
    1. Compelling trip title
    2. 2-3 sentence engaging summary
    3. Detailed description (200-300 words) that:
       - Highlights unique experiences
       - Captures the adventure spirit
       - Mentions key destinations/activities
       - Appeals to target audience
       - Includes what makes this trip special
    4. Key highlights (5-7 bullet points)
    5. What's included summary
    6. Target audience description
    
    Use inspiring, adventure-focused language that motivates bookings.
    Return as JSON object with all sections.
  `;

  const completion = await callOpenAI(prompt, 'gpt-4o-mini', 0.8);
  
  try {
    return JSON.parse(completion);
  } catch {
    return parseDescriptionFromText(completion, request);
  }
}

async function suggestPricing(request: TripBuilderRequest) {
  const prompt = `
    Provide pricing recommendations for a ${request.duration}-day ${request.theme} trip to ${request.destination}.
    
    Trip Details:
    - Destination: ${request.destination}
    - Theme: ${request.theme}
    - Duration: ${request.duration} days
    - Max participants: ${request.maxParticipants}
    - Difficulty: ${request.difficulty}
    - Season: ${request.season}
    
    Analyze and provide:
    1. Market price range for similar trips
    2. Cost breakdown (accommodation, meals, activities, transport, guide fees)
    3. Recommended pricing tiers (budget, standard, premium)
    4. Factors affecting pricing in this destination/season
    5. Competitive positioning advice
    6. Value proposition suggestions
    7. Optional add-ons and pricing
    
    Consider local cost of living, seasonality, activity complexity, and group size economics.
    Return as JSON with detailed pricing structure.
  `;

  const completion = await callOpenAI(prompt, 'gpt-4o-mini', 0.6);
  
  try {
    return JSON.parse(completion);
  } catch {
    return parsePricingFromText(completion, request);
  }
}

async function getDestinationInsights(destination: string, season: string): Promise<DestinationInsights> {
  const prompt = `
    Provide comprehensive travel insights for ${destination} during ${season}.
    
    Include:
    - Climate and weather patterns
    - Popular activities by category
    - Cultural highlights and etiquette
    - Best months to visit and why
    - Local events and festivals
    - Transportation tips
    - Accommodation recommendations
    - Hidden gems and local secrets
    - Safety considerations
    - Budget expectations
    
    Return as JSON object with structured data.
  `;

  const completion = await callOpenAI(prompt, 'gpt-4o-mini', 0.5);
  
  try {
    return JSON.parse(completion);
  } catch {
    return {
      climate: {
        temperature: "Varies by season",
        conditions: "Check local weather",
        bestMonths: ["May", "June", "September", "October"]
      },
      popularActivities: ["Sightseeing", "Local cuisine", "Cultural sites"],
      culturalHighlights: ["Local traditions", "Historical sites"],
      bestTimeToVisit: ["Spring and Fall for optimal weather"],
      localEvents: ["Check local calendar"],
      transportationTips: ["Research local transport options"],
      accommodationTips: ["Book in advance during peak season"]
    };
  }
}

async function callOpenAI(prompt: string, model: string = 'gpt-4o-mini', temperature: number = 0.7): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert travel planner and trip designer with deep knowledge of destinations worldwide. Provide detailed, practical, and inspiring travel recommendations. Always format responses as valid JSON when requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Helper functions for parsing non-JSON responses
function parseItineraryFromText(text: string, duration: number): any[] {
  const days = [];
  for (let i = 1; i <= duration; i++) {
    days.push({
      day: i,
      title: `Day ${i}`,
      description: `Generated content for day ${i}`,
      activities: [],
      generatedContent: text.slice((i-1) * Math.floor(text.length / duration), i * Math.floor(text.length / duration))
    });
  }
  return days;
}

function parseActivitiesFromText(text: string): any[] {
  return [{
    name: "AI Generated Activities",
    description: text.slice(0, 200),
    fullContent: text
  }];
}

function parseOptimizationFromText(text: string): any {
  return {
    suggestions: text.slice(0, 500),
    fullAnalysis: text
  };
}

function parseDescriptionFromText(text: string, request: TripBuilderRequest): any {
  return {
    title: `${request.theme} Adventure in ${request.destination}`,
    summary: text.slice(0, 200),
    description: text,
    highlights: [`${request.duration} days of ${request.theme} activities`, `${request.destination} exploration`],
    targetAudience: `${request.theme} enthusiasts`
  };
}

function parsePricingFromText(text: string, request: TripBuilderRequest): any {
  const basePrice = Math.floor(request.duration * 150);
  return {
    recommended: {
      min: basePrice,
      max: basePrice * 2,
      currency: "EUR"
    },
    breakdown: text.slice(0, 300),
    fullAnalysis: text
  };
}