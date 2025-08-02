import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast, toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { User } from '@supabase/supabase-js';
import { CheckCircle, Upload, Users, Globe, Heart, Star, LogIn } from "lucide-react";

const BecomeSensei = () => {
  const toastHook = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadingCV, setUploadingCV] = useState(false);

  useEffect(() => {
    // Check current auth status
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    checkAuth();

    return () => subscription.unsubscribe();
  }, []);

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      setUploadingCV(true);
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('cv-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data } = supabase.storage
        .from('cv-uploads')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload CV. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingCV(false);
    }
  };

  const handleCVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF, DOC, or DOCX file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setCvFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    console.log('=== STARTING APPLICATION SUBMISSION ===');

    try {
      // User is already checked to exist at this point
      if (!user) {
        console.log('ERROR: No user found');
        toast({
          title: "Authentication Error",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('User authenticated:', user.id);

      const formData = new FormData(e.currentTarget);
      const expertiseAreas = formData.getAll('expertise') as string[];
      const languages = formData.getAll('languages') as string[];

      console.log('Form data collected:', {
        expertiseAreas,
        languages,
        experience: formData.get('experience')
      });

      // Upload CV if provided
      let cvFileUrl = null;
      if (cvFile) {
        console.log('Uploading CV file:', cvFile.name);
        cvFileUrl = await handleFileUpload(cvFile);
        if (!cvFileUrl) {
          console.log('ERROR: CV upload failed');
          setIsSubmitting(false);
          return; // Stop submission if CV upload failed
        }
        console.log('CV uploaded successfully:', cvFileUrl);
      } else {
        console.log('No CV file to upload');
      }

      const applicationData = {
        user_id: user.id,
        email: formData.get('email') as string,
        full_name: formData.get('fullName') as string,
        phone: formData.get('phone') as string || null,
        location: formData.get('location') as string,
        expertise_areas: expertiseAreas,
        years_experience: parseInt(formData.get('experience') as string) || 0,
        languages: languages,
        bio: formData.get('bio') as string,
        why_sensei: formData.get('whySensei') as string,
        portfolio_url: formData.get('portfolio') as string || null,
        reference_text: formData.get('references') as string || null,
        availability: formData.get('availability') as string,
        cv_file_url: cvFileUrl,
      };

      console.log('=== SUBMITTING TO DATABASE ===');
      console.log('Application data:', applicationData);

      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select();

      console.log('Database response:', { data, error });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('=== SUCCESS! ===');
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you soon.",
      });

      // Reset form
      e.currentTarget.reset();
      setCvFile(null);
      console.log('Form reset completed');

    } catch (error) {
      console.error('=== ERROR IN SUBMISSION ===');
      console.error('Full error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('=== SUBMISSION PROCESS COMPLETED ===');
      setIsSubmitting(false);
    }
  };
  const benefits = [
    {
      icon: Globe,
      title: "Share Your Passion",
      description: "Turn your expertise into transformative experiences for fellow travelers"
    },
    {
      icon: Users,
      title: "Build Community", 
      description: "Connect with like-minded adventurers and create lasting relationships"
    },
    {
      icon: Heart,
      title: "Make Impact",
      description: "Help others discover new perspectives and personal growth through travel"
    },
    {
      icon: Star,
      title: "Professional Growth",
      description: "Develop your teaching and leadership skills while exploring the world"
    }
  ];

  const requirements = [
    "Minimum 3 years of professional experience in your field",
    "Passion for teaching and sharing knowledge with others",
    "Cultural sensitivity and respect for diverse backgrounds",
    "Physical fitness appropriate for adventure travel",
    "Fluency in English (additional languages are a plus)",
    "Flexibility to travel for 1-3 weeks per trip"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section - Minimalist Design */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop" 
            alt="Mountain path at sunset"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60"></div>
        </div>
        
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-light tracking-wider mb-8 leading-tight">
            ONE MORE MILE
          </h1>
          
          <div className="space-y-6 mb-12">
            <h2 className="font-heading text-2xl md:text-4xl font-light tracking-wide">
              SHARE, TRANSFORM, INSPIRE.
            </h2>
            <p className="font-body text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-light">
              Become a guide who creates inspiring travel experiences designed to elevate and empower others.
            </p>
          </div>
          
          <Button 
            asChild 
            size="lg" 
            className="font-body font-medium text-white bg-primary hover:bg-primary/90 px-8 py-4 text-lg tracking-wide border-0"
          >
            <a href="#application">GET STARTED</a>
          </Button>
        </div>
      </section>

      {/* Three Pillars Section - Minimalist */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl md:text-5xl font-light text-foreground mb-6 tracking-wide">
              THREE WAYS TO INSPIRE
            </h2>
            <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Guide transformative experiences across our core adventure themes
            </p>
          </div>
          
          {/* Three Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <div className="text-center">
              <div className="mb-6">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-heading text-2xl font-light tracking-wide text-foreground">
                  CULTURAL
                </h3>
              </div>
            </div>
            <div className="text-center">
              <div className="mb-6">
                <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-heading text-2xl font-light tracking-wide text-foreground">
                  ADVENTURE
                </h3>
              </div>
            </div>
            <div className="text-center">
              <div className="mb-6">
                <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-heading text-2xl font-light tracking-wide text-foreground">
                  WELLNESS
                </h3>
              </div>
            </div>
          </div>

          {/* Three Landscape Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="aspect-[4/3] rounded-lg overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop" 
                alt="Mountain landscape"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop" 
                alt="Forest landscape"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=600&h=400&fit=crop" 
                alt="Desert landscape"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section - Clean Layout */}
      <section className="py-20 bg-secondary/10">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-light text-foreground mb-8 tracking-wide">
              JOIN OUR COMMUNITY
            </h2>
            <p className="font-body text-lg text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
              We seek passionate experts who inspire transformation through authentic travel experiences
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {requirements.map((requirement, index) => (
                <div key={index} className="flex items-start space-x-4 text-left">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <span className="font-body text-foreground leading-relaxed">{requirement}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="application" className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-4xl md:text-5xl font-light text-foreground mb-6 tracking-wide">
                BEGIN YOUR JOURNEY
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Ready to inspire others through transformative travel? Submit your application and join our community of guides.
              </p>
            </div>

            {!user ? (
              <Card className="shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <LogIn className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-foreground mb-4">
                    Account Required
                  </h3>
                  <p className="font-sans text-muted-foreground mb-6 leading-relaxed">
                    To submit your Sensei application, you'll need to create an account first. This allows us to:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="font-sans text-sm text-muted-foreground">Track your application status</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="font-sans text-sm text-muted-foreground">Send you updates and notifications</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="font-sans text-sm text-muted-foreground">Manage your Sensei profile</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="font-sans text-sm text-muted-foreground">Access your applications history</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button asChild size="lg" className="w-full font-sans font-medium">
                      <a href="/auth">Create Account to Apply</a>
                    </Button>
                    <p className="font-sans text-sm text-muted-foreground">
                      Already have an account? <a href="/auth" className="text-primary hover:underline">Sign in here</a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (

            <Card className="shadow-xl">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          First Name *
                        </label>
                        <Input name="fullName" placeholder="Your first name" className="font-sans" required />
                      </div>
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Last Name *
                        </label>
                        <Input name="lastName" placeholder="Your last name" className="font-sans" required />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Email Address *
                        </label>
                        <Input name="email" type="email" placeholder="your.email@example.com" className="font-sans" required />
                      </div>
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Phone Number
                        </label>
                        <Input name="phone" type="tel" placeholder="+1 (555) 123-4567" className="font-sans" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Location *
                      </label>
                      <Input name="location" placeholder="City, Country where you're based" className="font-sans" required />
                    </div>
                  </div>

                  {/* Expertise */}
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-4">Area of Expertise</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Primary Theme *
                        </label>
                        <select name="expertise" className="w-full px-3 py-2 border border-border rounded-lg font-sans" required>
                          <option value="">Select your primary expertise</option>
                          <option value="Sports & Nutrition">Sports & Nutrition</option>
                          <option value="Culinary Adventures">Culinary Adventures</option>
                          <option value="Wellness & Mindfulness">Wellness & Mindfulness</option>
                          <option value="Cultural Immersion">Cultural Immersion</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Years of Experience *
                        </label>
                        <select name="experience" className="w-full px-3 py-2 border border-border rounded-lg font-sans" required>
                          <option value="">Select experience level</option>
                          <option value="0">No experience</option>
                          <option value="1">1-2 years</option>
                          <option value="3">3-5 years</option>
                          <option value="6">6-10 years</option>
                          <option value="10">10+ years</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Specific Skills & Certifications
                      </label>
                      <Input name="skills" placeholder="e.g., Certified Yoga Instructor, Michelin Star Experience, Mountain Guide License" className="font-sans" />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-4">Tell Us About Yourself</h3>
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Professional Bio *
                      </label>
                      <Textarea 
                        name="bio"
                        placeholder="Share your background, expertise, and what makes you passionate about your field. What unique perspective would you bring to One More Mile adventures?"
                        className="font-sans min-h-[120px]"
                        required
                      />
                    </div>

                    <div className="mt-4">
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Why do you want to become a Sensei? *
                      </label>
                      <Textarea 
                        name="whySensei"
                        placeholder="What motivates you to share your expertise through travel? How do you envision creating transformative experiences for travelers?"
                        className="font-sans min-h-[120px]"
                        required
                      />
                    </div>
                  </div>

                  {/* Files */}
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-4">Supporting Documents</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Upload CV/Resume *
                        </label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            id="cv-upload"
                            accept=".pdf,.doc,.docx"
                            onChange={handleCVFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="cv-upload"
                            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer block"
                          >
                            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            {cvFile ? (
                              <div>
                                <p className="font-sans text-foreground font-medium">{cvFile.name}</p>
                                <p className="font-sans text-sm text-muted-foreground">
                                  {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="font-sans text-muted-foreground">
                                  Drag and drop your CV here, or <span className="text-primary cursor-pointer">browse files</span>
                                </p>
                                <p className="font-sans text-sm text-muted-foreground mt-1">PDF, DOC, or DOCX (max 5MB)</p>
                              </>
                            )}
                          </label>
                          {uploadingCV && (
                            <p className="text-sm text-muted-foreground">Uploading CV...</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Video Introduction (Optional but Recommended)
                        </label>
                        <Input 
                          name="portfolio"
                          placeholder="Paste a link to your video introduction (YouTube, Vimeo, etc.)" 
                          className="font-sans" 
                        />
                        <p className="font-sans text-sm text-muted-foreground mt-1">
                          2-3 minute video introducing yourself and your passion for your field
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-sans font-medium text-foreground mb-2 block">
                      Availability *
                    </label>
                    <Textarea 
                      name="availability"
                      placeholder="When are you available to guide trips? (e.g., weekends only, flexible schedule, seasonal availability...)"
                      className="font-sans min-h-[80px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-sans font-medium text-foreground mb-2 block">
                      Languages Spoken *
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {["English", "Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Mandarin", "Arabic"].map((lang) => (
                        <label key={lang} className="flex items-center space-x-2">
                          <input type="checkbox" name="languages" value={lang} className="rounded" />
                          <span>{lang}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full font-sans font-medium" size="lg" type="submit" disabled={isSubmitting || uploadingCV}>
                    {isSubmitting ? "Submitting..." : uploadingCV ? "Uploading CV..." : "Submit Application"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </section>

      {/* What Happens Next */}
      <section className="py-16 bg-secondary/20">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-8">
            What Happens Next?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">Review</h3>
              <p className="font-sans text-muted-foreground">
                Our team will carefully review your application within 48 hours
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">Interview</h3>
              <p className="font-sans text-muted-foreground">
                Qualified candidates will be invited for a video interview
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">Welcome</h3>
              <p className="font-sans text-muted-foreground">
                Successful applicants join our Sensei onboarding program
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BecomeSensei;