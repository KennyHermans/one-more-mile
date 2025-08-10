// Types for the AI Assistant

export type AiUserRole = 'traveler' | 'sensei' | 'admin';

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiRequestBody {
  message: string;
  role: AiUserRole;
  pagePath?: string;
  tripId?: string;
  history?: AiMessage[];
}

export interface AiResponseBody {
  reply: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
