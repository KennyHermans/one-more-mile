import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { AiMessage, AiRequestBody, AiResponseBody, AiUserRole } from '@/types/ai';

export function useAiAssistant() {
  const location = useLocation();
  const [messages, setMessages] = React.useState<AiMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [role, setRole] = React.useState<AiUserRole>('traveler');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sendMessage = React.useCallback(async () => {
    if (!input.trim()) return;
    const userMsg: AiMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const payload: AiRequestBody = {
        message: userMsg.content,
        role,
        pagePath: location.pathname,
        history: messages.slice(-8),
      };

      const { data, error } = await supabase.functions.invoke<AiResponseBody>('ai-support-agent', {
        body: payload,
      });

      if (error) throw error;

      const reply = data?.reply || 'Sorry, I could not generate a response right now.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }] as AiMessage[]);
    } catch (e: any) {
      console.error('AI assistant error', e);
      setError(e?.message || 'Something went wrong. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: 'There was an error. Please try again shortly.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, role, location.pathname, messages]);

  const clear = React.useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    input,
    setInput,
    role,
    setRole,
    isLoading,
    error,
    sendMessage,
    clear,
  };
}
