import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface WishlistItem {
  id: string;
  notes: string | null;
  created_at: string;
  trip_id: string;
  trips: {
    id: string;
    title: string;
    destination: string;
    theme: string;
    price: string;
    dates: string;
    image_url: string | null;
    group_size: string;
  } | null;
}

interface CustomerWishlistProps {
  userId: string;
}

export function CustomerWishlist({ userId }: CustomerWishlistProps) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchWishlistItems();
  }, [userId]);

  const fetchWishlistItems = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_wishlists')
        .select(`
          *,
          trips (
            id,
            title,
            destination,
            theme,
            price,
            dates,
            image_url,
            group_size
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlistItems((data || []) as any);
    } catch (error: any) {
      toast({
        title: "Error loading wishlist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('customer_wishlists')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Removed from wishlist",
        description: "Trip removed from your wishlist",
      });
    } catch (error: any) {
      toast({
        title: "Error removing from wishlist",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateNotes = async (itemId: string, newNotes: string) => {
    try {
      const { error } = await supabase
        .from('customer_wishlists')
        .update({ notes: newNotes })
        .eq('id', itemId);

      if (error) throw error;

      setWishlistItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, notes: newNotes } : item
        )
      );
      
      setEditingNotes(null);
      toast({
        title: "Notes updated",
        description: "Your notes have been saved",
      });
    } catch (error: any) {
      toast({
        title: "Error updating notes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-muted rounded-t-lg" />
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Your wishlist is empty</CardTitle>
          <CardDescription className="mb-4">
            Start exploring trips and save your favorites to build your wishlist
          </CardDescription>
          <Button asChild>
            <Link to="/explore">Explore Trips</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Wishlist</h2>
          <p className="text-muted-foreground">
            {wishlistItems.length} saved trip{wishlistItems.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {wishlistItems.map((item) => (
          <Card key={item.id} className="group hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={item.trips?.image_url || "/placeholder.svg"}
                alt={item.trips?.title || "Trip"}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <Badge 
                variant="secondary" 
                className="absolute top-4 left-4 bg-white/90"
              >
                {item.trips?.theme}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-red-500"
                onClick={() => removeFromWishlist(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{item.trips?.title}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {item.trips?.destination}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-primary">{item.trips?.price}</span>
                  <span className="text-muted-foreground">{item.trips?.dates}</span>
                </div>

                {item.notes || editingNotes === item.id ? (
                  <div className="space-y-2">
                    {editingNotes === item.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add your notes about this trip..."
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateNotes(item.id, notes)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingNotes(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{item.notes}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingNotes(item.id);
                            setNotes(item.notes || '');
                          }}
                        >
                          Edit Notes
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingNotes(item.id);
                      setNotes('');
                    }}
                  >
                    Add Notes
                  </Button>
                )}

                <Button asChild className="w-full">
                  <Link to={`/trip/${item.trips?.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Trip
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}