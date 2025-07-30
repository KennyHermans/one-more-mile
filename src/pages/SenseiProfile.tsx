import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/ui/navigation";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Session } from '@supabase/supabase-js';
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SenseiProfile {
  id?: string;
  name: string;
  specialty: string;
  bio: string;
  image_url: string;
  experience: string;
  location: string;
  specialties: string[];
  rating?: number;
  trips_led?: number;
  is_active?: boolean;
}

const SenseiProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SenseiProfile>({
    name: "",
    specialty: "",
    bio: "",
    image_url: "",
    experience: "",
    location: "",
    specialties: []
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        } else {
          // Fetch existing profile data
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        toast({
          title: "Error",
          description: "Failed to fetch profile: " + error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setHasProfile(true);
        setProfile({
          id: data.id,
          name: data.name,
          specialty: data.specialty,
          bio: data.bio,
          image_url: data.image_url || "",
          experience: data.experience,
          location: data.location,
          specialties: data.specialties || [],
          rating: data.rating,
          trips_led: data.trips_led,
          is_active: data.is_active
        });
      } else {
        setHasProfile(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch profile: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      const profileData = {
        user_id: user.id,
        name: profile.name,
        specialty: profile.specialty,
        bio: profile.bio,
        image_url: profile.image_url || null,
        experience: profile.experience,
        location: profile.location,
        specialties: profile.specialties,
        is_active: profile.is_active ?? true
      };

      const { error } = profile.id 
        ? await supabase
            .from('sensei_profiles')
            .update(profileData)
            .eq('id', profile.id)
        : await supabase
            .from('sensei_profiles')
            .insert(profileData);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save profile: " + error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile saved successfully!",
        });
        if (!profile.id) {
          // Refresh to get the new profile ID
          fetchProfile(user.id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save profile: " + error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !profile.specialties.includes(newSpecialty.trim())) {
      setProfile(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20 text-center">
          <p className="font-sans text-lg text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Sensei Profile
            </h1>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>

          {!hasProfile ? (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Alert>
                  <AlertDescription>
                    You don't have a Sensei profile yet. This means your application might still be pending approval, 
                    or you haven't applied to become a Sensei yet. 
                    <a href="/become-sensei" className="text-primary hover:underline ml-1">Apply here</a> or 
                    <a href="/my-applications" className="text-primary hover:underline ml-1">check your applications</a>.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                {hasProfile ? "Edit Your Sensei Profile" : "Create Your Profile"}
              </CardTitle>
              {hasProfile && (
                <p className="text-muted-foreground">
                  Update your information that appears on the "Our Senseis" page
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="specialty">Main Specialty</Label>
                    <Input
                      id="specialty"
                      value={profile.specialty}
                      onChange={(e) => setProfile(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="e.g., Wellness & Mindfulness"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell visitors about your expertise, background, and what makes you a great Sensei..."
                    rows={5}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This bio will be displayed on the "Our Senseis" page
                  </p>
                </div>

                <div>
                  <Label htmlFor="image_url">Profile Image URL</Label>
                  <Input
                    id="image_url"
                    value={profile.image_url}
                    onChange={(e) => setProfile(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://example.com/your-image.jpg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experience">Experience</Label>
                    <Input
                      id="experience"
                      value={profile.experience}
                      onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="e.g., 15 years, Over a decade"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location/Base</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Based in Kathmandu, Nepal"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Areas of Expertise</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add your specialties and areas of expertise. These will be displayed as badges on your profile.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder="Add an area of expertise..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                    />
                    <Button type="button" onClick={addSpecialty} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {specialty}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeSpecialty(specialty)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {hasProfile && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Profile Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Rating:</span>
                        <span className="ml-2 font-medium">{profile.rating || '0.0'} ⭐</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trips Led:</span>
                        <span className="ml-2 font-medium">{profile.trips_led || 0}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Statistics are updated automatically based on your activity
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={saving || !hasProfile}>
                  {saving ? "Saving..." : hasProfile ? "Update Profile" : "Profile Not Available"}
                </Button>
                
                {!hasProfile && (
                  <p className="text-sm text-muted-foreground text-center">
                    You can only edit your profile after your Sensei application has been approved.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SenseiProfile;