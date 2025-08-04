import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/lib/error-handler';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Clock,
  CheckCheck,
  Search,
  MoreVertical
} from 'lucide-react';

interface Message {
  id: string;
  message_text: string;
  sender_id: string;
  sender_type: 'customer' | 'sensei' | 'admin';
  recipient_id?: string;
  trip_id: string;
  message_context: 'group' | 'private';
  message_type: 'text' | 'file';
  file_url?: string;
  created_at: string;
  read_at?: string;
  is_deleted: boolean;
}

interface Conversation {
  trip_id: string;
  trip_title: string;
  trip_destination: string;
  sensei_name: string;
  sensei_avatar?: string;
  last_message?: Message;
  unread_count: number;
  participants_count: number;
}

interface CommunicationHubProps {
  userId: string;
  className?: string;
}

export function CommunicationHub({ userId, className }: CommunicationHubProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageContext, setMessageContext] = useState<'group' | 'private'>('group');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
    setupRealtimeSubscription();
  }, [userId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      // Get user's paid bookings with trip details
      const { data: bookings, error: bookingsError } = await supabase
        .from('trip_bookings')
        .select(`
          trip_id,
          trips (
            title,
            destination,
            sensei_name,
            sensei_id,
            sensei_profiles!trips_sensei_id_fkey (
              image_url
            )
          )
        `)
        .eq('user_id', userId)
        .eq('payment_status', 'paid');

      if (bookingsError) throw bookingsError;

      // Get message statistics for each trip
      const conversationsData = await Promise.all(
        (bookings || []).map(async (booking) => {
          const tripId = booking.trip_id;
          
          // Get last message
          const { data: lastMessage } = await supabase
            .from('trip_messages')
            .select('*')
            .eq('trip_id', tripId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('trip_messages')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', tripId)
            .neq('sender_id', userId)
            .is('read_at', null)
            .eq('is_deleted', false);

          // Get participants count
          const { count: participantsCount } = await supabase
            .from('trip_bookings')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', tripId)
            .eq('payment_status', 'paid');

          return {
            trip_id: tripId,
            trip_title: booking.trips?.title || 'Unknown Trip',
            trip_destination: booking.trips?.destination || '',
            sensei_name: booking.trips?.sensei_name || 'Unknown Sensei',
            sensei_avatar: booking.trips?.sensei_profiles?.image_url,
            last_message: lastMessage ? {
              ...lastMessage,
              sender_type: lastMessage.sender_type as 'customer' | 'sensei' | 'admin',
              message_context: lastMessage.message_context as 'group' | 'private',
              message_type: lastMessage.message_type as 'text' | 'file'
            } : undefined,
            unread_count: unreadCount || 0,
            participants_count: participantsCount || 0,
          };
        })
      );

      // Sort by last message time
      conversationsData.sort((a, b) => {
        const aTime = a.last_message?.created_at || '0';
        const bTime = b.last_message?.created_at || '0';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationsData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const typedMessages = (data || []).map(msg => ({
        ...msg,
        sender_type: msg.sender_type as 'customer' | 'sensei' | 'admin',
        message_context: msg.message_context as 'group' | 'private',
        message_type: msg.message_type as 'text' | 'file'
      }));
      
      setMessages(typedMessages);

      // Mark messages as read
      await markMessagesAsRead(tripId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const markMessagesAsRead = async (tripId: string) => {
    try {
      await supabase
        .from('trip_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('trip_id', tripId)
        .neq('sender_id', userId)
        .is('read_at', null);

      // Update unread count in conversations
      setConversations(prev =>
        prev.map(conv =>
          conv.trip_id === tripId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error: any) {
      handleError(error, {
        component: 'CommunicationHub',
        action: 'markAsRead',
        tripId: tripId
      }, false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Update messages if it's for the current conversation
          if (newMessage.trip_id === selectedConversation) {
            setMessages(prev => [...prev, newMessage]);
            markMessagesAsRead(newMessage.trip_id);
          }
          
          // Update conversations
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: selectedConversation,
          sender_id: userId,
          sender_type: 'customer',
          message_text: newMessage,
          message_context: messageContext,
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Success",
        description: "Message sent",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.trip_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.trip_destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.sensei_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.trip_id === selectedConversation);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
        <CardDescription>
          Communicate with your sensei and fellow travelers
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-96">
          {/* Conversations List */}
          <div className="w-1/3 border-r">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="h-80">
              <div className="space-y-1 p-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.trip_id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation === conversation.trip_id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedConversation(conversation.trip_id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.sensei_avatar} />
                          <AvatarFallback>
                            {conversation.sensei_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {conversation.trip_title}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.trip_destination}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {conversation.participants_count} participants
                            </span>
                          </div>
                          {conversation.last_message && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {conversation.last_message.message_text}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedConv?.sensei_avatar} />
                        <AvatarFallback>
                          {selectedConv?.sensei_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{selectedConv?.trip_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedConv?.trip_destination}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tabs value={messageContext} onValueChange={(value) => setMessageContext(value as 'group' | 'private')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="group" className="text-xs">Group</TabsTrigger>
                          <TabsTrigger value="private" className="text-xs">Private</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === userId ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_id === userId
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.message_text}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-70">
                                {formatMessageTime(message.created_at)}
                              </span>
                              {message.sender_id === userId && message.read_at && (
                                <CheckCheck className="h-3 w-3 opacity-70" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={`Type a ${messageContext} message...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}