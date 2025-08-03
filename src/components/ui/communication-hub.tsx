import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Mail, 
  MessageSquare, 
  Send, 
  Search, 
  Filter,
  Plus,
  Archive,
  Star,
  Clock,
  User,
  Users,
  FileText as Template,
  Settings,
  Paperclip,
  Phone,
  Video,
  Calendar,
  CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: Date;
  type: 'email' | 'chat' | 'notification';
  status: 'unread' | 'read' | 'replied' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'general' | 'support' | 'booking' | 'payment' | 'feedback';
  attachments?: Array<{ name: string; url: string; type: string }>;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: string[];
}

export function CommunicationHub() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      from: "sensei@onemoremail.com",
      to: "admin@onemoremail.com",
      subject: "Question about upcoming trip logistics",
      content: "Hi, I have some questions about the transportation arrangements for the Mt. Fuji trip next week...",
      timestamp: new Date(),
      type: "email",
      status: "unread",
      priority: "normal",
      category: "general"
    },
    {
      id: "2", 
      from: "customer@email.com",
      to: "admin@onemoremail.com",
      subject: "Payment plan request",
      content: "I would like to discuss setting up a payment plan for my upcoming trip to Kyoto...",
      timestamp: new Date(Date.now() - 3600000),
      type: "email",
      status: "read",
      priority: "high",
      category: "payment"
    }
  ]);
  
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: "1",
      name: "Welcome New Sensei",
      subject: "Welcome to One More Mile!",
      content: "Dear {{sensei_name}}, welcome to our community! We're excited to have you join us...",
      category: "onboarding",
      variables: ["sensei_name", "application_date"]
    },
    {
      id: "2",
      name: "Trip Reminder",
      subject: "Your trip to {{destination}} is coming up!",
      content: "Hi {{customer_name}}, this is a reminder that your trip to {{destination}} starts on {{trip_date}}...",
      category: "reminders",
      variables: ["customer_name", "destination", "trip_date"]
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    content: "",
    priority: "normal",
    category: "general"
  });
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  const { toast } = useToast();

  // Filter messages based on search and filter criteria
  const filteredMessages = messages.filter(message => {
    const matchesSearch = searchQuery === "" || 
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.from.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === "all" || 
      message.status === selectedFilter ||
      message.category === selectedFilter ||
      message.priority === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const urgentCount = messages.filter(m => m.priority === 'urgent').length;

  const handleSendMessage = async () => {
    try {
      const newMessage: Message = {
        id: Date.now().toString(),
        from: "admin@onemoremail.com",
        to: composeData.to,
        subject: composeData.subject,
        content: composeData.content,
        timestamp: new Date(),
        type: "email",
        status: "read",
        priority: composeData.priority as any,
        category: composeData.category as any
      };

      setMessages(prev => [newMessage, ...prev]);
      setIsComposing(false);
      setComposeData({
        to: "",
        subject: "",
        content: "",
        priority: "normal",
        category: "general"
      });

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
    }
  };

  const applyTemplate = (template: Template) => {
    setComposeData(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content
    }));
    setIsTemplateDialogOpen(false);
    toast({
      title: "Template applied",
      description: `"${template.name}" template has been applied. Don't forget to replace variables.`
    });
  };

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status: 'read' as const } : msg
    ));
  };

  const markAsReplied = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status: 'replied' as const } : msg
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'support': return <MessageSquare className="h-4 w-4" />;
      case 'booking': return <Calendar className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'feedback': return <Star className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Hub</h2>
          <p className="text-muted-foreground">
            Manage all communications with senseis and customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
          {urgentCount > 0 && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              {urgentCount} urgent
            </Badge>
          )}
          <Button onClick={() => setIsComposing(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inbox">
            <Mail className="h-4 w-4 mr-2" />
            Inbox ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="h-4 w-4 mr-2" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Template className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Live Chat
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Messages List */}
          <div className="grid gap-4">
            {filteredMessages.map((message) => (
              <Card 
                key={message.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  message.status === 'unread' ? 'border-l-4 border-l-primary bg-muted/30' : ''
                }`}
                onClick={() => {
                  setSelectedMessage(message);
                  if (message.status === 'unread') {
                    markAsRead(message.id);
                  }
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(message.category)}
                        <span className="font-medium">{message.from}</span>
                        <Badge className={getPriorityColor(message.priority)}>
                          {message.priority}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="font-semibold mb-1">{message.subject}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {message.attachments && (
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="outline">{message.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Message Templates</h3>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
          
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{template.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Variables: {template.variables.join(', ')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Chat Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Real-time Chat Support</h3>
                <p className="text-muted-foreground mb-4">
                  Connect with senseis and customers in real-time
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button>
                    <Video className="h-4 w-4 mr-2" />
                    Start Video Call
                  </Button>
                  <Button variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    Voice Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Signature</label>
                <Textarea 
                  placeholder="Your email signature..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Auto-reply Message</label>
                <Textarea 
                  placeholder="Automatic reply message for new inquiries..."
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enable notifications</span>
                <input type="checkbox" className="rounded" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compose Dialog */}
      <Dialog open={isComposing} onOpenChange={setIsComposing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
            <DialogDescription>
              Send a message to senseis or customers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="To: email@example.com"
                value={composeData.to}
                onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTemplateDialogOpen(true)}
              >
                <Template className="h-4 w-4 mr-1" />
                Template
              </Button>
            </div>
            
            <Input
              placeholder="Subject"
              value={composeData.subject}
              onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
            />
            
            <div className="flex gap-2">
              <Select value={composeData.priority} onValueChange={(value) => 
                setComposeData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={composeData.category} onValueChange={(value) => 
                setComposeData(prev => ({ ...prev, category: value }))
              }>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              placeholder="Message content..."
              value={composeData.content}
              onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
              rows={8}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => applyTemplate(template)}
              >
                <CardContent className="pt-4">
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.subject}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}