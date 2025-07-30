import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, X } from "lucide-react";

const BecomeSensei = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('cv-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("File upload error:", error);
        toast({
          title: "Upload Error",
          description: "Failed to upload the file. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('cv-uploads')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error("Unexpected error during file upload:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred during file upload.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setCvFile(file);
    }
  };

  const removeCvFile = () => {
    setCvFile(null);
    const fileInput = document.getElementById('cv') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
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
        email: user.email,
        full_name: formData.get('fullName') as string,
        phone: formData.get('phone') as string,
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
        variant: "default",
      });
      
      // Reset form using ref instead of event target
      if (formRef.current) {
        formRef.current.reset();
        setCvFile(null);
        console.log('Form reset completed');
      }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Become a <span className="text-blue-600">Sensei</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Join our community of expert guides and share your passion with travelers from around the world. 
              Turn your expertise into meaningful connections and unforgettable experiences.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Earn Income</h3>
              <p className="text-gray-600">
                Monetize your expertise by guiding travelers on personalized journeys. Set your own rates and schedule.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Build Community</h3>
              <p className="text-gray-600">
                Connect with like-minded travelers and create lasting relationships while sharing your passion.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Share Expertise</h3>
              <p className="text-gray-600">
                Use your unique skills and local knowledge to create transformative experiences for others.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className="bg-white rounded-lg p-8 shadow-lg max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Start Your Journey as a Sensei?
              </h2>
              <p className="text-gray-600 mb-6">
                Join our community of passionate guides and start making a difference in travelers' lives today.
              </p>
              <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="/auth">Get Started</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <a href="/senseis">Meet Our Senseis</a>
                </Button>
              </div>
            </div>
          </div>

          {/* Requirements Preview */}
          <div className="mt-16 bg-white rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              What We're Looking For
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Experience & Expertise</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Specialized knowledge in your field
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Proven track record of success
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Passion for teaching and mentoring
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Qualities</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Excellent communication skills
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Cultural sensitivity and adaptability
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Commitment to creating great experiences
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show application form for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Become a Sensei
          </h1>
          <p className="text-lg text-gray-600">
            Share your expertise and guide others on their journey
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" name="fullName" type="text" required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" type="text" required />
              </div>
              <div>
                <Label>Areas of Expertise</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="space-x-2">
                    <Checkbox id="expertise-1" name="expertise" value="Web Development" />
                    <Label htmlFor="expertise-1">Web Development</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="expertise-2" name="expertise" value="Mobile Development" />
                    <Label htmlFor="expertise-2">Mobile Development</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="expertise-3" name="expertise" value="Data Science" />
                    <Label htmlFor="expertise-3">Data Science</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="expertise-4" name="expertise" value="Machine Learning" />
                    <Label htmlFor="expertise-4">Machine Learning</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="expertise-5" name="expertise" value="UI/UX Design" />
                    <Label htmlFor="expertise-5">UI/UX Design</Label>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Select name="experience">
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Year</SelectItem>
                    <SelectItem value="2">2 Years</SelectItem>
                    <SelectItem value="3">3 Years</SelectItem>
                    <SelectItem value="4">4 Years</SelectItem>
                    <SelectItem value="5">5+ Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Languages You Speak</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="space-x-2">
                    <Checkbox id="language-1" name="languages" value="English" />
                    <Label htmlFor="language-1">English</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="language-2" name="languages" value="Spanish" />
                    <Label htmlFor="language-2">Spanish</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="language-3" name="languages" value="French" />
                    <Label htmlFor="language-3">French</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="language-4" name="languages" value="German" />
                    <Label htmlFor="language-4">German</Label>
                  </div>
                  <div className="space-x-2">
                    <Checkbox id="language-5" name="languages" value="Chinese" />
                    <Label htmlFor="language-5">Chinese</Label>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" placeholder="Tell us about yourself" required />
              </div>
              <div>
                <Label htmlFor="whySensei">Why do you want to be a Sensei?</Label>
                <Textarea id="whySensei" name="whySensei" placeholder="Share your motivation" required />
              </div>
              <div>
                <Label htmlFor="portfolio">Portfolio URL</Label>
                <Input id="portfolio" name="portfolio" type="url" placeholder="Link to your portfolio" />
              </div>
              <div>
                <Label htmlFor="references">References</Label>
                <Textarea id="references" name="references" placeholder="Provide references (optional)" />
              </div>
              <div>
                <Label htmlFor="availability">Availability</Label>
                <Textarea id="availability" name="availability" placeholder="Describe your availability" required />
              </div>
              <div>
                <Label htmlFor="cv">CV/Resume Upload (Max 10MB)</Label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Input
                      type="file"
                      id="cv"
                      name="cv"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Label htmlFor="cv" className="inline-flex items-center space-x-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50">
                      <Upload className="w-4 h-4" />
                      <span>Upload file</span>
                    </Label>
                  </div>
                  {cvFile && (
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span>{cvFile.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={removeCvFile}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomeSensei;
