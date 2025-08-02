import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, User, Users, Lock } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  sender_type: 'customer' | 'sensei';
  message_text: string;
  message_context: 'private' | 'group';
  created_at: string;
  sender_name?: string;
}

interface Participant {
  user_id: string;
  full_name: string;
  phone?: string;
}

interface TripMessagingEnhancedProps {
  tripId: string;
  tripTitle: string;
  userType: 'customer' | 'sensei';
  onClose?: () => void;
}

export const TripMessagingEnhanced: React.FC<TripMessagingEnhancedProps> = ({
  tripId,
  tripTitle,
  userType,
  onClose
}) => {
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<{[userId: string]: Message[]}>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [senseiInfo, setSenseiInfo] = useState<{user_id: string, name: string} | null>(null);
  const [newGroupMessage, setNewGroupMessage] = useState('');
  const [newPrivateMessages, setNewPrivateMessages] = useState<{[userId: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('group');
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
  }, [groupMessages, privateMessages, activeTab]);

  const initializeChat = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch participants and sensei info
      await Promise.all([
        fetchParticipants(),
        fetchSenseiInfo(),
        fetchGroupMessages(),
        fetchPrivateMessages()
      ]);

      // Set up realtime subscription
      const channel = supabase
        .channel(`trip-messages-enhanced-${tripId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.message_context === 'group') {
            setGroupMessages(prev => [...prev, newMessage]);
          } else {
            // Private message
            const otherUserId = newMessage.sender_id === user?.id ? newMessage.recipient_id : newMessage.sender_id;
            if (otherUserId) {
              setPrivateMessages(prev => ({
                ...prev,
                [otherUserId]: [...(prev[otherUserId] || []), newMessage]
              }));
            }
          }
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

  const fetchParticipants = async () => {
    try {
      // Get paid participants for this trip
      const { data: bookings, error: bookingsError } = await supabase
        .from('trip_bookings')
        .select('user_id')
        .eq('trip_id', tripId)
        .eq('payment_status', 'paid');

      if (bookingsError) throw bookingsError;

      if (bookings && bookings.length > 0) {
        const userIds = bookings.map(b => b.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('customer_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        setParticipants(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchSenseiInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          sensei_id,
          sensei_profiles!trips_sensei_id_fkey(user_id, name)
        `)
        .eq('id', tripId)
        .single();

      if (error) throw error;
      
      if (data && data.sensei_profiles) {
        setSenseiInfo({
          user_id: data.sensei_profiles.user_id,
          name: data.sensei_profiles.name
        });
      }
    } catch (error) {
      console.error('Error fetching sensei info:', error);
    }
  };

  const fetchGroupMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .eq('message_context', 'group')
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setGroupMessages((data as Message[]) || []);
    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  };

  const fetchPrivateMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .eq('message_context', 'private')
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group private messages by conversation partner
      const messagesByUser: {[userId: string]: Message[]} = {};
      (data as Message[])?.forEach(message => {
        const otherUserId = message.sender_id === currentUser?.id ? message.recipient_id : message.sender_id;
        if (otherUserId) {
          if (!messagesByUser[otherUserId]) {
            messagesByUser[otherUserId] = [];
          }
          messagesByUser[otherUserId].push(message);
        }
      });

      setPrivateMessages(messagesByUser);
    } catch (error) {
      console.error('Error fetching private messages:', error);
    }
  };

  const sendGroupMessage = async () => {
    if (!newGroupMessage.trim() || sending || !currentUser) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: tripId,
          sender_id: currentUser.id,
          sender_type: userType,
          message_text: newGroupMessage.trim(),
          message_type: 'text',
          message_context: 'group'
        });

      if (error) throw error;

      setNewGroupMessage('');
      
      toast({
        title: "Message sent",
        description: "Your group message has been delivered.",
      });
    } catch (error) {
      console.error('Error sending group message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const sendPrivateMessage = async (recipientId: string) => {
    const messageText = newPrivateMessages[recipientId];
    if (!messageText?.trim() || sending || !currentUser) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: tripId,
          sender_id: currentUser.id,
          recipient_id: recipientId,
          sender_type: userType,
          message_text: messageText.trim(),
          message_type: 'text',
          message_context: 'private'
        });

      if (error) throw error;

      setNewPrivateMessages(prev => ({ ...prev, [recipientId]: '' }));
      
      toast({
        title: "Private message sent",
        description: "Your private message has been delivered.",
      });
    } catch (error) {
      console.error('Error sending private message:', error);
      toast({
        title: "Error",
        description: "Failed to send private message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getSenderName = (message: Message): string => {
    if (message.sender_id === currentUser?.id) {
      return 'You';
    }
    
    if (message.sender_type === 'sensei') {
      return senseiInfo?.name || 'Sensei';
    } else {
      const participant = participants.find(p => p.user_id === message.sender_id);
      return participant?.full_name || 'Participant';
    }
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const renderMessageList = (messages: Message[]) => (
    <ScrollArea className="h-64 mb-4 pr-4" ref={scrollAreaRef}>
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
  );

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
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {tripTitle} - Trip Communication
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Group Chat
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Private Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="group" className="flex flex-col flex-1 mt-0">
            {renderMessageList(groupMessages)}
            
            <div className="flex gap-2">
              <Input
                value={newGroupMessage}
                onChange={(e) => setNewGroupMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendGroupMessage();
                  }
                }}
                placeholder="Message everyone..."
                disabled={sending}
              />
              <Button
                onClick={sendGroupMessage}
                disabled={sending || !newGroupMessage.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="private" className="flex flex-col flex-1 mt-0">
            {userType === 'customer' && senseiInfo ? (
              // Customer can only message sensei privately
              <div>
                <div className="mb-3 p-2 bg-muted rounded">
                  <h4 className="font-medium">Private chat with {senseiInfo.name}</h4>
                </div>
                {renderMessageList(privateMessages[senseiInfo.user_id] || [])}
                
                <div className="flex gap-2">
                  <Input
                    value={newPrivateMessages[senseiInfo.user_id] || ''}
                    onChange={(e) => setNewPrivateMessages(prev => ({ 
                      ...prev, 
                      [senseiInfo.user_id]: e.target.value 
                    }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendPrivateMessage(senseiInfo.user_id);
                      }
                    }}
                    placeholder="Private message to sensei..."
                    disabled={sending}
                  />
                  <Button
                    onClick={() => sendPrivateMessage(senseiInfo.user_id)}
                    disabled={sending || !newPrivateMessages[senseiInfo.user_id]?.trim()}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              // Sensei can message any participant privately
              <div className="space-y-4">
                {participants.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No paid participants to message privately.
                  </p>
                ) : (
                  participants.map((participant) => (
                    <div key={participant.user_id} className="border rounded p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium">Private chat with {participant.full_name}</h4>
                        <Badge variant="outline">Customer</Badge>
                      </div>
                      
                      <div className="mb-3">
                        {renderMessageList(privateMessages[participant.user_id] || [])}
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          value={newPrivateMessages[participant.user_id] || ''}
                          onChange={(e) => setNewPrivateMessages(prev => ({ 
                            ...prev, 
                            [participant.user_id]: e.target.value 
                          }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendPrivateMessage(participant.user_id);
                            }
                          }}
                          placeholder={`Private message to ${participant.full_name}...`}
                          disabled={sending}
                        />
                        <Button
                          onClick={() => sendPrivateMessage(participant.user_id)}
                          disabled={sending || !newPrivateMessages[participant.user_id]?.trim()}
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};