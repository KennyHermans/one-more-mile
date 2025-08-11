import { useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    toast
  } = useToast();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('send-contact-email', {
        body: formData
      });
      if (error) throw error;
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you within 24 hours."
      });

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
      });
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again or contact us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20">
        <div className="absolute inset-0">
          <img 
            src="/images/contact-hero.jpg"
            alt="Epic travel landscape background for Contact page"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
        </div>
        <div className="container relative text-center text-white">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">
            Get in Touch
          </h1>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <div className="mb-8">
                <Badge variant="secondary" className="mb-4">Contact Form</Badge>
                <h2 className="font-serif text-3xl font-bold text-foreground mb-4">
                  Send Us a Message
                </h2>
                <p className="font-sans text-muted-foreground leading-relaxed">
                  Have questions about our trips, want to discuss custom adventures, or need help choosing 
                  the right experience? Fill out the form below and we'll get back to you within 24 hours.
                </p>
              </div>

              <Card className="shadow-lg">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          First Name *
                        </label>
                        <Input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Your first name" className="font-sans" required />
                      </div>
                      <div>
                        <label className="font-sans font-medium text-foreground mb-2 block">
                          Last Name *
                        </label>
                        <Input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Your last name" className="font-sans" required />
                      </div>
                    </div>
                    
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Email Address *
                      </label>
                      <Input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="your.email@example.com" className="font-sans" required />
                    </div>
                    
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Phone Number
                      </label>
                      <Input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+1 (555) 123-4567" className="font-sans" />
                    </div>
                    
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Subject *
                      </label>
                      <select name="subject" value={formData.subject} onChange={handleInputChange} className="w-full px-3 py-2 border border-border rounded-lg font-sans" required>
                        <option value="">Select a topic</option>
                        <option value="general">General Inquiry</option>
                        <option value="booking">Trip Booking</option>
                        <option value="custom">Custom Adventure</option>
                        <option value="sensei">Become a Sensei</option>
                        <option value="group">Group Booking</option>
                        <option value="support">Customer Support</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Message *
                      </label>
                      <Textarea name="message" value={formData.message} onChange={handleInputChange} placeholder="Tell us about your travel interests, questions, or how we can help you..." className="font-sans min-h-[120px]" required />
                    </div>
                    
                    <Button type="submit" className="w-full font-sans font-medium" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sending Message...
                        </> : <>
                          <Send className="mr-2 h-5 w-5" />
                          Send Message
                        </>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div>
              <div className="mb-8">
                <Badge variant="secondary" className="mb-4">Contact Information</Badge>
                <h2 className="font-serif text-3xl font-bold text-foreground mb-4">
                  Let's Connect
                </h2>
                <p className="font-sans text-muted-foreground leading-relaxed">
                  Prefer to reach out directly? Here are all the ways you can get in touch with our team.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-6">
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-sans font-semibold text-foreground">Email Us</h3>
                        <p className="font-sans text-muted-foreground">kenny_hermans93@hotmail.com</p>
                        
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-sans font-semibold text-foreground">Call Us</h3>
                        <p className="font-sans text-muted-foreground">+32 484868056</p>
                        <p className="font-sans text-sm text-muted-foreground">Mon-Fri, 9AM-6PM PST</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-sans font-semibold text-foreground">Visit Us</h3>
                        <p className="font-sans text-muted-foreground">
                          Busleidengang 1A<br />
                          3000 Leuven
                        </p>
                        <p className="font-sans text-sm text-muted-foreground">By appointment only</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-sans font-semibold text-foreground">Office Hours</h3>
                        <p className="font-sans text-muted-foreground">
                          Monday - Friday: 9:00 AM - 6:00 PM PST<br />
                          Saturday: 10:00 AM - 4:00 PM PST<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* FAQ Link */}
              <div className="mt-8 p-6 bg-secondary/20 rounded-lg">
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                  Have Questions?
                </h3>
                <p className="font-sans text-muted-foreground mb-4">
                  Check out our frequently asked questions for quick answers about booking, 
                  cancellations, and what to expect on your adventure.
                </p>
                <Button variant="outline" className="font-sans font-medium">
                  View FAQ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>;
};
export default Contact;