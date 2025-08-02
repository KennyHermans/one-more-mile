import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, User } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  sender_type: 'customer' | 'sensei';
  message_text: string;
  created_at: string;
  sender_name?: string;
}

interface TripMessagingProps {
  tripId: string;
  tripTitle: string;
  userType: 'customer' | 'sensei';
  onClose?: () => void;
}

export const TripMessaging: React.FC<TripMessagingProps> = ({
  tripId,
  tripTitle,
  userType,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [participantNames, setParticipantNames] = useState<{[userId: string]: string}>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeChat();
  }, [tripId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch messages
      await fetchMessages();
      
      // Fetch participant names
      await fetchParticipantNames();

      // Set up realtime subscription
      const channel = supabase
        .channel(`trip-messages-${tripId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to load chat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchParticipantNames = async () => {
    try {
      // Get unique sender IDs from messages
      const { data: messages } = await supabase
        .from('trip_messages')
        .select('sender_id, sender_type')
        .eq('trip_id', tripId);

      if (!messages) return;

      const uniqueSenders = messages.reduce((acc, msg) => {
        if (!acc.find(s => s.sender_id === msg.sender_id)) {
          acc.push(msg);
        }
        return acc;
      }, [] as Array<{sender_id: string, sender_type: string}>);

      const names: {[userId: string]: string} = {};

      for (const sender of uniqueSenders) {
        if (sender.sender_type === 'customer') {
          const { data } = await supabase
            .from('customer_profiles')
            .select('full_name')
            .eq('user_id', sender.sender_id)
            .single();
          
          if (data) {
            names[sender.sender_id] = data.full_name;
          }
        } else {
          const { data } = await supabase
            .from('sensei_profiles')
            .select('name')
            .eq('user_id', sender.sender_id)
            .single();
          
          if (data) {
            names[sender.sender_id] = data.name;
          }
        }
      }

      setParticipantNames(names);
    } catch (error) {
      console.error('Error fetching participant names:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !currentUser) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: tripId,
          sender_id: currentUser.id,
          sender_type: userType,
          message_text: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSenderName = (message: Message): string => {
    if (message.sender_id === currentUser?.id) {
      return 'You';
    }
    return participantNames[message.sender_id] || 
           (message.sender_type === 'sensei' ? 'Sensei' : 'Participant');
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p>Loading chat...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {tripTitle} - Trip Chat
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 p-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 mb-4 pr-4" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === currentUser?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {getSenderName(message)}
                      </span>
                      <Badge
                        variant={message.sender_type === 'sensei' ? 'default' : 'secondary'}
                        className="text-xs px-1 py-0"
                      >
                        {message.sender_type === 'sensei' ? 'Sensei' : 'Customer'}
                      </Badge>
                    </div>
                    <p className="text-sm">{message.message_text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};