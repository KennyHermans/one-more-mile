import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Globe, Users, Compass } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Heart,
      title: "Purpose-Driven",
      description: "Every journey is designed to create meaningful connections and lasting personal growth."
    },
    {
      icon: Globe,
      title: "Cultural Respect",
      description: "We honor and celebrate the rich traditions and communities we visit around the world."
    },
    {
      icon: Users,
      title: "Expert Guidance",
      description: "Our Senseis are passionate specialists who share their knowledge and wisdom authentically."
    },
    {
      icon: Compass,
      title: "Transformative Experiences",
      description: "We believe travel should challenge, inspire, and expand your perspective on life."
    }
  ];

  const team = [
    {
      name: "Kenny Hermans",
      role: "Founder & CEO",
      bio: "Former travel journalist who discovered the transformative power of purposeful travel after a life-changing trek in the Himalayas.",
      image: "/lovable-uploads/0654a4fb-8308-4c54-a2ec-031f19de96db.png"
    },
    {
      name: "Marcus Thompson",
      role: "Head of Sensei Relations",
      bio: "Cultural anthropologist and former Peace Corps volunteer with deep expertise in cross-cultural experiences.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face"
    },
    {
      name: "Yuki Nakamura",
      role: "Experience Designer",
      bio: "Former adventure guide who crafts itineraries that balance challenge, beauty, and meaningful cultural exchange.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1920&h=1080&fit=crop" 
            alt="Mountain landscape"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40"></div>
        </div>
        <div className="relative z-10 container text-white">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20">
              Our Story
            </Badge>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Travel That Transforms Lives
            </h1>
            <p className="font-sans text-xl leading-relaxed">
              Founded on the belief that travel should be more than sightseeing, One More Mile creates 
              experiences that challenge, inspire, and connect people across cultures and continents.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6">
                Our Mission
              </h2>
              <p className="font-sans text-lg text-muted-foreground leading-relaxed mb-6">
                We exist to create transformative travel experiences that foster personal growth, 
                cultural understanding, and meaningful connections. Every journey with One More Mile 
                is designed to push boundaries, challenge perspectives, and inspire positive change.
              </p>
              <p className="font-sans text-lg text-muted-foreground leading-relaxed">
                Through expert guidance from our Senseis and carefully curated adventures, we help 
                travelers discover not just new places, but new dimensions of themselves.
              </p>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=600&h=400&fit=crop" 
                alt="Travelers on adventure"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-secondary/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide every adventure we create and every relationship we build
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center border-0 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <value.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="font-sans text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet Our Team
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
              Passionate travel experts dedicated to creating extraordinary experiences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                  />
                  <CardTitle className="font-serif text-xl text-foreground">
                    {member.name}
                  </CardTitle>
                  <Badge variant="secondary" className="mx-auto">
                    {member.role}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-muted-foreground leading-relaxed">
                    {member.bio}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-8">
            Our Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="font-serif text-5xl font-bold mb-2">500+</div>
              <div className="font-sans text-lg">Transformative Adventures</div>
            </div>
            <div>
              <div className="font-serif text-5xl font-bold mb-2">2000+</div>
              <div className="font-sans text-lg">Lives Changed</div>
            </div>
            <div>
              <div className="font-serif text-5xl font-bold mb-2">35+</div>
              <div className="font-sans text-lg">Countries Explored</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready for Your Next Adventure?
          </h2>
          <p className="font-sans text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of travelers who've discovered the transformative power of purposeful exploration
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="font-sans font-medium">
              <a href="/explore">Explore Trips</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-sans font-medium">
              <a href="/contact">Contact Us</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;