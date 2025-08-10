import * as React from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAiAssistant } from '@/hooks/use-ai-assistant';

export function AiAssistant() {
  const [open, setOpen] = React.useState(false);
  const { messages, input, setInput, role, setRole, isLoading, error, sendMessage, clear } = useAiAssistant();
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage();
  };

  return (
    <>
      {/* Floating toggle button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button size="lg" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}>
          <MessageSquare className="h-5 w-5 mr-2" />
          AI Assistant
        </Button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[360px] max-w-[92vw]">
          <Card className="shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Travel AI Assistant
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Button size="sm" variant={role === 'traveler' ? 'default' : 'secondary'} onClick={() => setRole('traveler')}>Traveler</Button>
                  <Button size="sm" variant={role === 'sensei' ? 'default' : 'secondary'} onClick={() => setRole('sensei')}>Sensei</Button>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="h-64 rounded-md border p-3 bg-background/50">
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Ask anything about trips, bookings, availability, or how to use the platform.
                    </div>
                  )}
                  {messages.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {m.role === 'assistant' ? (
                        <Bot className="h-4 w-4 mt-1 text-muted-foreground" />
                      ) : (
                        <User className="h-4 w-4 mt-1 text-muted-foreground" />
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                  )}
                </div>
              </ScrollArea>

              {error && (
                <div className="text-xs text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask the AI as a ${role}...`}
                  className="min-h-[48px] max-h-32"
                />
                <Button type="submit" disabled={isLoading || !input.trim()} aria-label="Send message">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>

              <div className="flex items-center justify-between">
                <Badge variant="outline">Beta</Badge>
                <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
