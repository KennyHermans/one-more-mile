import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
};

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  endpoint: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// In-memory rate limit store (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  'ai-trip-builder': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 AI requests per 15 minutes
    endpoint: 'ai-trip-builder'
  },
  'create-payment-plan': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 payment creations per hour
    endpoint: 'create-payment-plan'
  },
  'send-contact-email': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 emails per 15 minutes
    endpoint: 'send-contact-email'
  },
  'process-installment-payment': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 payment processes per hour
    endpoint: 'process-installment-payment'
  },
  'default': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    endpoint: 'default'
  }
};

function getRateLimitKey(userId: string, endpoint: string): string {
  return `${endpoint}:${userId}`;
}

function checkRateLimit(userId: string, endpoint: string): {
  allowed: boolean;
  info: {
    limit: number;
    remaining: number;
    reset: number;
    retryAfter?: number;
  }
} {
  const config = rateLimitConfigs[endpoint] || rateLimitConfigs['default'];
  const key = getRateLimitKey(userId, endpoint);
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Clean up expired entries
  if (entry && now >= entry.resetTime) {
    rateLimitStore.delete(key);
    entry = undefined;
  }
  
  // Create new entry if doesn't exist
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      firstRequest: now
    };
  }
  
  const info = {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    reset: Math.ceil(entry.resetTime / 1000)
  };
  
  // Check if rate limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      info: {
        ...info,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      }
    };
  }
  
  // Increment count and store
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    info: {
      ...info,
      remaining: Math.max(0, config.maxRequests - entry.count)
    }
  };
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract endpoint from request body or headers
    const requestBody = await req.json().catch(() => ({}));
    const endpoint = requestBody.endpoint || req.headers.get('x-endpoint') || 'default';
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(user.id, endpoint);
    
    // Add rate limit headers
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': rateLimitResult.info.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.info.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.info.reset.toString(),
    };
    
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests for endpoint ${endpoint}. Please try again later.`,
        retryAfter: rateLimitResult.info.retryAfter
      }), {
        status: 429,
        headers: {
          ...responseHeaders,
          'Retry-After': rateLimitResult.info.retryAfter?.toString() || '60'
        }
      });
    }

    // Rate limit check passed
    return new Response(JSON.stringify({
      success: true,
      rateLimit: rateLimitResult.info,
      userId: user.id,
      endpoint
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error('Rate limit middleware error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);