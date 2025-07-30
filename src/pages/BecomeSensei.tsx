import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, Users, Globe, Heart, Star } from "lucide-react";

const BecomeSensei = () => {
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1920&h=1080&fit=crop" 
            alt="Inspiring landscape"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40"></div>
        </div>
        <div className="relative z-10 container text-white">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20">
              Join Our Team
            </Badge>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Become a Sensei
            </h1>
            <p className="font-sans text-xl leading-relaxed mb-8">
              Share your passion and expertise by leading transformative journeys around the world. 
              Help others discover new cultures, skills, and perspectives while growing personally and professionally.
            </p>
            <Button asChild size="lg" className="font-sans font-medium bg-accent hover:bg-accent/90">
              <a href="#application">Apply Now</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Become a Sensei */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Become a Sensei?
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
              Join a community of experts who are passionate about sharing knowledge and creating meaningful travel experiences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center border-0 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <benefit.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-3">
                    {benefit.title}
                  </h3>
                  <p className="font-sans text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What We're Looking For */}
      <section className="py-16 bg-secondary/20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6">
                What We're Looking For
              </h2>
              <p className="font-sans text-lg text-muted-foreground leading-relaxed mb-8">
                We seek passionate experts who can create transformative experiences across our four main themes:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="font-sans font-medium text-foreground">Sports & Nutrition</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="font-sans font-medium text-foreground">Culinary Adventures</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="font-sans font-medium text-foreground">Wellness & Mindfulness</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="font-sans font-medium text-foreground">Cultural Immersion</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-serif text-xl font-bold text-foreground">Requirements:</h3>
                {requirements.map((requirement, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="font-sans text-muted-foreground">{requirement}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=600&h=400&fit=crop" 
                alt="Sensei teaching"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="application" className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
                Application Form
              </h2>
              <p className="font-sans text-lg text-muted-foreground">
                Ready to join our community of expert guides? Fill out the application below and we'll be in touch within 48 hours.
              </p>
            </div>

            <Card className="shadow-xl">
              <CardContent className="p-8">
                <form className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          First Name *
                        </label>
                        <Input placeholder="Your first name" className="font-sans" />
                      </div>
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Last Name *
                        </label>
                        <Input placeholder="Your last name" className="font-sans" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Email Address *
                        </label>
                        <Input type="email" placeholder="your.email@example.com" className="font-sans" />
                      </div>
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Phone Number *
                        </label>
                        <Input type="tel" placeholder="+1 (555) 123-4567" className="font-sans" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Location *
                      </label>
                      <Input placeholder="City, Country where you're based" className="font-sans" />
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
                        <select className="w-full px-3 py-2 border border-border rounded-lg font-sans">
                          <option value="">Select your primary expertise</option>
                          <option value="sports">Sports & Nutrition</option>
                          <option value="culinary">Culinary Adventures</option>
                          <option value="wellness">Wellness & Mindfulness</option>
                          <option value="cultural">Cultural Immersion</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Years of Experience *
                        </label>
                        <select className="w-full px-3 py-2 border border-border rounded-lg font-sans">
                          <option value="">Select experience level</option>
                          <option value="3-5">3-5 years</option>
                          <option value="6-10">6-10 years</option>
                          <option value="11-15">11-15 years</option>
                          <option value="15+">15+ years</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Specific Skills & Certifications
                      </label>
                      <Input placeholder="e.g., Certified Yoga Instructor, Michelin Star Experience, Mountain Guide License" className="font-sans" />
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
                        placeholder="Share your background, expertise, and what makes you passionate about your field. What unique perspective would you bring to One More Mile adventures?"
                        className="font-sans min-h-[120px]"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Why do you want to become a Sensei? *
                      </label>
                      <Textarea 
                        placeholder="What motivates you to share your expertise through travel? How do you envision creating transformative experiences for travelers?"
                        className="font-sans min-h-[120px]"
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
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="font-sans text-muted-foreground">
                            Drag and drop your CV here, or <span className="text-primary cursor-pointer">browse files</span>
                          </p>
                          <p className="font-sans text-sm text-muted-foreground mt-1">PDF, DOC, or DOCX (max 5MB)</p>
                        </div>
                      </div>

                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Video Introduction (Optional but Recommended)
                        </label>
                        <Input 
                          placeholder="Paste a link to your video introduction (YouTube, Vimeo, etc.)" 
                          className="font-sans" 
                        />
                        <p className="font-sans text-sm text-muted-foreground mt-1">
                          2-3 minute video introducing yourself and your passion for your field
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full font-sans font-medium" size="lg">
                    Submit Application
                  </Button>
                </form>
              </CardContent>
            </Card>
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