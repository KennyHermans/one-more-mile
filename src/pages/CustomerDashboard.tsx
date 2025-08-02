import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { TripMessaging } from "@/components/ui/trip-messaging";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, MapPin, Calendar as CalendarIcon, CheckSquare, User, FileText, MessageCircle } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  dietary_restrictions: string;
  medical_conditions: string;
}

interface TripBooking {
  id: string;
  trip_id: string;
  booking_status: string;
  payment_status: string;
  booking_date: string;
  total_amount: number;
  payment_deadline?: string;
  trips: {
    title: string;
    destination: string;
    dates: string;
    image_url: string;
    sensei_name: string;
  };
}

interface Todo {
  id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
  created_by_admin: boolean;
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

const CustomerDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newTodo, setNewTodo] = useState({ title: "", description: "", due_date: "" });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      setUser(user);
      await Promise.all([
        fetchProfile(user.id),
        fetchBookings(user.id),
        fetchTodos(user.id),
        fetchDocuments(user.id)
      ]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    setProfile(data);
  };

  const fetchBookings = async (userId: string) => {
    const { data, error } = await supabase
      .from('trip_bookings')
      .select(`
        *,
        trips (
          title,
          destination,
          dates,
          image_url,
          sensei_name
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    setBookings(data || []);
  };

  const fetchTodos = async (userId: string) => {
    const { data, error } = await supabase
      .from('customer_todos')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    setTodos(data || []);
  };

  const fetchDocuments = async (userId: string) => {
    const { data, error } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    setDocuments(data || []);
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('customer_profiles')
        .upsert({
          user_id: user.id,
          ...profile
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTodo = async () => {
    if (!user || !newTodo.title) return;

    try {
      const { error } = await supabase
        .from('customer_todos')
        .insert({
          user_id: user.id,
          title: newTodo.title,
          description: newTodo.description,
          due_date: newTodo.due_date || null,
          created_by_admin: false
        });

      if (error) throw error;

      setNewTodo({ title: "", description: "", due_date: "" });
      await fetchTodos(user.id);
      toast({
        title: "Success",
        description: "Todo added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('customer_todos')
        .update({ completed })
        .eq('id', todoId);

      if (error) throw error;
      await fetchTodos(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('customer_documents')
        .insert({
          user_id: user.id,
          document_name: file.name,
          document_type: fileExt || 'unknown',
          file_url: publicUrl
        });

      if (dbError) throw dbError;

      await fetchDocuments(user.id);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('trip_bookings')
        .delete()
        .eq('id', bookingId)
        .eq('payment_status', 'pending'); // Only allow canceling unpaid reservations

      if (error) throw error;

      await fetchBookings(user.id);
      toast({
        title: "Success",
        description: "Reservation cancelled successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your trips, profile, and documents</p>
        </div>

        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="trips" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              My Trips
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              To-Do List
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Trips</CardTitle>
                <CardDescription>Your booked trips and their details</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground">No trips booked yet.</p>
                ) : (
                  <div className="grid gap-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="overflow-hidden">
                        <div className="flex">
                          <img 
                            src={booking.trips.image_url} 
                            alt={booking.trips.title}
                            className="w-32 h-32 object-cover"
                          />
                          <CardContent className="flex-1 p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{booking.trips.title}</h3>
                                <p className="text-muted-foreground">{booking.trips.destination}</p>
                                <p className="text-sm">{booking.trips.dates}</p>
                                <p className="text-sm">Sensei: {booking.trips.sensei_name}</p>
                              </div>
                               <div className="text-right space-y-2">
                                 <div className="flex flex-col items-end gap-2">
                                   <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                                     {booking.payment_status === 'paid' ? 'Paid' : 'Reserved'}
                                   </Badge>
                                   <p className="text-lg font-semibold">${booking.total_amount}</p>
                                   {booking.payment_deadline && booking.payment_status === 'pending' && (
                                     <p className="text-sm text-orange-600 font-medium">
                                       Payment due: {new Date(booking.payment_deadline).toLocaleDateString()}
                                     </p>
                                   )}
                                 </div>
                                
                                {booking.payment_status === 'pending' ? (
                                  <div className="flex gap-2 mt-2">
                                    <Button size="sm" variant="outline" onClick={() => cancelBooking(booking.id)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm">
                                      Pay Now
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    <Badge variant="outline" className="text-green-600">
                                      Confirmed
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Messages</CardTitle>
                <CardDescription>Communicate with your trip sensei for paid trips</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.filter(booking => booking.payment_status === 'paid').length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    You need to have a paid trip booking to message with your sensei.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {bookings
                      .filter(booking => booking.payment_status === 'paid')
                      .map((booking) => (
                        <Card key={booking.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{booking.trips.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {booking.trips.destination} • Sensei: {booking.trips.sensei_name}
                                </p>
                              </div>
                              <Badge variant="default">Paid</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <TripMessaging
                              tripId={booking.trip_id}
                              tripTitle={booking.trips.title}
                              userType="customer"
                            />
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>This information is visible to admin and your trip sensei</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile?.full_name || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile?.phone || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={profile?.emergency_contact_name || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, emergency_contact_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={profile?.emergency_contact_phone || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, emergency_contact_phone: e.target.value } : null)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
                  <Textarea
                    id="dietary_restrictions"
                    value={profile?.dietary_restrictions || ""}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, dietary_restrictions: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="medical_conditions">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={profile?.medical_conditions || ""}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, medical_conditions: e.target.value } : null)}
                  />
                </div>
                <Button onClick={updateProfile}>Save Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Calendar</CardTitle>
                <CardDescription>View your trip dates and important deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>To-Do List</CardTitle>
                <CardDescription>Track your trip preparation tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a new task..."
                    value={newTodo.title}
                    onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                  <Button onClick={addTodo}>Add</Button>
                </div>
                <div className="space-y-2">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center space-x-2 p-3 border rounded">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={(checked) => toggleTodo(todo.id, !!checked)}
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.title}
                        </p>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground">{todo.description}</p>
                        )}
                        {todo.due_date && (
                          <p className="text-xs text-muted-foreground">Due: {todo.due_date}</p>
                        )}
                      </div>
                      {todo.created_by_admin && (
                        <Badge variant="outline">Admin</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload important documents like passport, visa, etc.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    onChange={uploadDocument}
                    className="hidden"
                    id="document-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <Label htmlFor="document-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      {uploading ? "Uploading..." : "Click to upload documents"}
                    </p>
                  </Label>
                </div>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type.toUpperCase()} • {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDashboard;