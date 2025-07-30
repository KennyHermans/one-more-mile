import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-20">
        <div className="container text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">
            Get in Touch
          </h1>
          <p className="font-sans text-xl max-w-2xl mx-auto leading-relaxed">
            Ready to start your transformative journey? We're here to help you find the perfect adventure
          </p>
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
                  <form className="space-y-6">
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
                    
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Email Address *
                      </label>
                      <Input type="email" placeholder="your.email@example.com" className="font-sans" />
                    </div>
                    
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Phone Number
                      </label>
                      <Input type="tel" placeholder="+1 (555) 123-4567" className="font-sans" />
                    </div>
                    
                    <div>
                      <label className="font-sans font-medium text-foreground mb-2 block">
                        Subject *
                      </label>
                      <select className="w-full px-3 py-2 border border-border rounded-lg font-sans">
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
                      <Textarea 
                        placeholder="Tell us about your travel interests, questions, or how we can help you..."
                        className="font-sans min-h-[120px]"
                      />
                    </div>
                    
                    <Button className="w-full font-sans font-medium" size="lg">
                      <Send className="mr-2 h-5 w-5" />
                      Send Message
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
                        <p className="font-sans text-muted-foreground">adventures@onemoremile.com</p>
                        <p className="font-sans text-sm text-muted-foreground">We respond within 24 hours</p>
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
                        <p className="font-sans text-muted-foreground">+1 (555) 123-MILE</p>
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
                          123 Adventure Way<br />
                          San Francisco, CA 94102
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

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Adventure?
          </h2>
          <p className="font-sans text-lg mb-8 max-w-2xl mx-auto">
            Don't wait for the perfect moment. The perfect moment is now.
          </p>
          <Button asChild size="lg" variant="secondary" className="font-sans font-medium bg-white text-primary hover:bg-white/90">
            <a href="/explore">Explore Adventures</a>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Contact;