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
import { X } from "lucide-react";

interface SenseiProfile {
  id?: string;
  name: string;
  specialty: string;
  bio: string;
  image_url: string;
  experience: string;
  location: string;
  specialties: string[];
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

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
        setError('Error fetching profile: ' + error.message);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          name: data.name,
          specialty: data.specialty,
          bio: data.bio,
          image_url: data.image_url || "",
          experience: data.experience,
          location: data.location,
          specialties: data.specialties || []
        });
      }
    } catch (error: any) {
      setError('Error fetching profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const profileData = {
        user_id: user.id,
        name: profile.name,
        specialty: profile.specialty,
        bio: profile.bio,
        image_url: profile.image_url || null,
        experience: profile.experience,
        location: profile.location,
        specialties: profile.specialties
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
        setError('Error saving profile: ' + error.message);
      } else {
        setSuccess('Profile saved successfully!');
        if (!profile.id) {
          // Refresh to get the new profile ID
          fetchProfile(user.id);
        }
      }
    } catch (error: any) {
      setError('Error saving profile: ' + error.message);
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

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                {profile.id ? "Edit Your Profile" : "Create Your Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

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
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself and your expertise..."
                    rows={4}
                    required
                  />
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
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input
                      id="experience"
                      value={profile.experience}
                      onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="e.g., 15 years"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Based in Nepal"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Specialties</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder="Add a specialty..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                    />
                    <Button type="button" onClick={addSpecialty}>
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

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SenseiProfile;